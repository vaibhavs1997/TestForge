import type { PlanTestStrategy } from './PlanTestStrategy';
import type { GenerateTestDesigns } from './GenerateTestDesigns';
import type { GenerateTestDesignWithAI } from './GenerateTestDesignWithAI';
import type { PlanExecution } from './PlanExecution';
import type { TestDesignRepository } from '../../domain/requirements/TestDesignRepository';
import type { ApiOperationRepository } from '../../domain/api/ApiOperationRepository';
import type { RequirementRepository } from '../../domain/requirements/RequirementRepository';
import type { TestStrategyRepository } from '../../domain/requirements/TestStrategyRepository';
import {
  pickOperationForCategory,
  rankOperationsForRequirement,
  buildPayloadForScenario,
  getOperationMatchDiagnostics,
  mappingConfidencePercent,
} from './RequirementOperationMatcher';
import type { ApiOperationEntity } from '../../domain/api/ApiOperationEntity';
import type { TestDesignEntity } from '../../domain/requirements/TestDesignEntity';
import type { TestStrategyEntity, StrategyCategory } from '../../domain/requirements/TestStrategyEntity';

export interface GenerateRequirementTestCasesRequest {
  projectId: string;
  requirementId: string;
  providerId?: string;
  useAi?: boolean;
  buildRunPlan?: boolean;
  replaceExisting?: boolean;
}

export interface GenerateRequirementTestCasesResult {
  designs: TestDesignEntity[];
  executionPlanIds: string[];
  usedAi: boolean;
  warnings: string[];
}

export class GenerateRequirementTestCases {
  constructor(
    private readonly requirementRepository: RequirementRepository,
    private readonly testStrategyRepository: TestStrategyRepository,
    private readonly testDesignRepository: TestDesignRepository,
    private readonly apiOperationRepository: ApiOperationRepository,
    private readonly planTestStrategy: PlanTestStrategy,
    private readonly generateTestDesigns: GenerateTestDesigns,
    private readonly generateTestDesignWithAI: GenerateTestDesignWithAI,
    private readonly planExecution: PlanExecution,
  ) {}

  async execute(request: GenerateRequirementTestCasesRequest): Promise<GenerateRequirementTestCasesResult> {
    const warnings: string[] = [];
    const requirement = await this.requirementRepository.findById(request.requirementId);
    if (!requirement) {
      throw new Error(`Requirement with id ${request.requirementId} not found`);
    }

    if (request.replaceExisting !== false) {
      const existing = await this.testDesignRepository.findByRequirement(request.requirementId);
      for (const design of existing) {
        await this.testDesignRepository.delete(design.id);
      }
      const existingStrategy = await this.testStrategyRepository.findByRequirement(request.requirementId);
      if (existingStrategy?.id) {
        await this.testStrategyRepository.delete(existingStrategy.id);
      }
    }

    await this.planTestStrategy.execute(request.requirementId);

    let usedAi = false;
    if (request.useAi && request.providerId) {
      try {
        const aiResult = await this.generateTestDesignWithAI.execute({
          projectId: request.projectId,
          requirementId: request.requirementId,
          providerId: request.providerId,
          previewOnly: false,
        });
        warnings.push(...(aiResult.warnings ?? []));
        usedAi = true;
        // A provider can return valid text that does not contain the expected
        // design JSON. Keep the workflow useful instead of showing an empty
        // test-case panel after a seemingly successful generation.
        if (!aiResult.designs || aiResult.designs.length === 0) {
          warnings.push('AI returned no usable test cases. Using the built-in generator.');
          await this.generateTestDesigns.execute(request.requirementId);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        warnings.push(`AI generation failed (${msg}). Using built-in generator.`);
        await this.generateTestDesigns.execute(request.requirementId);
      }
    } else {
      await this.generateTestDesigns.execute(request.requirementId);
    }

    const designs = await this.enrichDesignMappings(request.requirementId, requirement.projectId);
    if (requirement.generationPending && designs.length === 0) {
      await this.requirementRepository.delete(requirement.id);
      throw new Error('No test cases could be generated for this requirement.');
    }
    const executionPlanIds: string[] = [];

    if (request.buildRunPlan && designs.some((d) => d.status !== 'Disabled')) {
      try {
        const plans = await this.planExecution.execute(request.requirementId);
        executionPlanIds.push(...plans.map((p) => p.id));
      } catch (err: unknown) {
        warnings.push(err instanceof Error ? err.message : 'Failed to build run plan');
      }
    }

    const projectOperations = await this.apiOperationRepository.findByProject(requirement.projectId);
    const ranked = rankOperationsForRequirement(requirement, projectOperations);
    const diagnostics = getOperationMatchDiagnostics(requirement, projectOperations);
    if (diagnostics.lowConfidence && projectOperations.length > 0) {
      warnings.push(
        'API mapping confidence is low for this requirement. Review each test case’s mapped operation before approving.',
      );
    }
    const mappingPercent = mappingConfidencePercent(diagnostics, projectOperations.length);
    await this.requirementRepository.update(requirement.id, {
      confidence: mappingPercent,
    } as Partial<typeof requirement>);
    if (ranked.length > 0 && requirement.relatedOperations.length === 0) {
      await this.requirementRepository.update(requirement.id, {
        relatedOperations: ranked.slice(0, 5).map((o) => o.id),
      } as Partial<typeof requirement>);
    }

    if (requirement.generationPending) {
      await this.requirementRepository.update(requirement.id, {
        approvalStatus: 'Suggested',
        reviewStatus: 'Reviewed',
        generationPending: false,
        generationExpiresAt: null,
      } as Partial<typeof requirement>);
    }

    return { designs, executionPlanIds, usedAi, warnings };
  }

  private async enrichDesignMappings(
    requirementId: string,
    projectId: string,
  ): Promise<TestDesignEntity[]> {
    const requirement = await this.requirementRepository.findById(requirementId);
    if (!requirement) return [];

    const operations: ApiOperationEntity[] = await this.apiOperationRepository.findByProject(projectId);
    const strategy = (await this.testStrategyRepository.findByRequirement(requirementId)) as TestStrategyEntity | null;
    const designs = await this.testDesignRepository.findByRequirement(requirementId);

    for (const design of designs) {
      let operationId = design.operationId;
      let category: StrategyCategory = 'Positive';
      if (strategy) {
        for (const section of strategy.sections) {
          const item = section.items.find((i) => i.id === design.strategyItemId);
          if (item) {
            category = section.category;
            break;
          }
        }
      }

      // Validate every AI or strategy-provided operation against the guarded
      // matcher. A valid ID can still be semantically unrelated to the case.
      const mappedOperationId = pickOperationForCategory(requirement, operations, category);
      operationId = mappedOperationId;

      const operation = operations.find((o) => o.id === operationId);
      const { category: scenarioCategory, focusFieldId, scenarioKind } = this.resolveStrategyContext(design, strategy);
      const body = buildPayloadForScenario(scenarioCategory, operation, { focusFieldId, scenarioKind });
      const requestOverrides = {
        ...design.requestOverrides,
        body: Object.keys(body).length > 0 ? body : design.requestOverrides?.body,
      };

      if (operationId !== design.operationId || requestOverrides.body !== design.requestOverrides?.body) {
        await this.testDesignRepository.update(design.id, {
          operationId: operationId || design.operationId,
          requestOverrides,
        } as Partial<TestDesignEntity>);
      }
    }

    return this.testDesignRepository.findByRequirement(requirementId);
  }

  private resolveStrategyContext(
    design: TestDesignEntity,
    strategy: TestStrategyEntity | null,
  ): {
    category: StrategyCategory;
    focusFieldId?: string;
    scenarioKind?: 'missing_field' | 'invalid_field' | 'duplicate' | 'default';
  } {
    if (!strategy) return { category: 'Positive' };
    for (const section of strategy.sections) {
      const item = section.items.find((i) => i.id === design.strategyItemId);
      if (item) {
        return {
          category: section.category,
          focusFieldId: item.focusFieldId,
          scenarioKind: item.scenarioKind,
        };
      }
    }
    return { category: 'Positive' };
  }
}

export default GenerateRequirementTestCases;
