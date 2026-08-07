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
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        warnings.push(`AI generation failed (${msg}). Using built-in generator.`);
        await this.generateTestDesigns.execute(request.requirementId);
      }
    } else {
      await this.generateTestDesigns.execute(request.requirementId);
    }

    const designs = await this.enrichDesignMappings(request.requirementId, requirement.projectId);
    const executionPlanIds: string[] = [];

    if (request.buildRunPlan && designs.some((d) => d.status !== 'Disabled')) {
      try {
        const plans = await this.planExecution.execute(request.requirementId);
        executionPlanIds.push(...plans.map((p) => p.id));
      } catch (err: unknown) {
        warnings.push(err instanceof Error ? err.message : 'Failed to build run plan');
      }
    }

    const ranked = rankOperationsForRequirement(
      requirement,
      await this.apiOperationRepository.findByProject(requirement.projectId),
    );
    if (ranked.length > 0 && requirement.relatedOperations.length === 0) {
      await this.requirementRepository.update(requirement.id, {
        relatedOperations: ranked.slice(0, 5).map((o) => o.id),
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
      const opExists = operationId && operations.some((o) => o.id === operationId);
      if (!opExists) {
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
        operationId = pickOperationForCategory(requirement, operations, category);
      }

      const operation = operations.find((o) => o.id === operationId);
      const category = this.inferCategory(design, strategy);
      const body = buildPayloadForScenario(category, operation);
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

  private inferCategory(design: TestDesignEntity, strategy: TestStrategyEntity | null): StrategyCategory {
    if (!strategy) return 'Positive';
    for (const section of strategy.sections) {
      if (section.items.some((i) => i.id === design.strategyItemId)) {
        return section.category;
      }
    }
    return 'Positive';
  }
}

export default GenerateRequirementTestCases;
