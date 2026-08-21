import type { PlanTestStrategy } from './PlanTestStrategy.js';
import type { GenerateTestDesigns } from './GenerateTestDesigns.js';
import type { GenerateTestDesignWithAI } from './GenerateTestDesignWithAI.js';
import type { PlanExecution } from './PlanExecution.js';
import type { TestDesignRepository } from '../../domain/requirements/TestDesignRepository.js';
import type { ApiOperationRepository } from '../../domain/api/ApiOperationRepository.js';
import type { RequirementRepository } from '../../domain/requirements/RequirementRepository.js';
import type { TestStrategyRepository } from '../../domain/requirements/TestStrategyRepository.js';
import {
  rankOperationsForRequirement,
  buildPayloadForScenario,
  getOperationMatchDiagnostics,
  mappingConfidencePercent,
} from './RequirementOperationMatcher.js';
import type { ApiOperationEntity } from '../../domain/api/ApiOperationEntity.js';
import type { TestDesignEntity } from '../../domain/requirements/TestDesignEntity.js';
import type { TestStrategyEntity, StrategyCategory } from '../../domain/requirements/TestStrategyEntity.js';
import { requirementEndpointMappingService } from './RequirementEndpointMappingService.js';
import type { KnowledgeFlowRepository } from '../../domain/knowledge/KnowledgeFlowRepository.js';
import type { RuntimeVariableRepository } from '../../domain/knowledge/RuntimeVariableRepository.js';
import type { DependencyRepository } from '../../domain/knowledge/DependencyRepository.js';
import { operationDependencyResolver } from './OperationDependencyResolver.js';

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

export interface PreservedScenarioMapping {
  title: string;
  operationId: string;
  acceptanceCriterionId?: string;
  scenarioId?: string;
  strategyItemId?: string;
}

export function matchesGeneratedScenario(previous: PreservedScenarioMapping, current: Pick<TestDesignEntity, 'title' | 'acceptanceCriterionId' | 'scenarioId' | 'strategyItemId'>): boolean {
  if (previous.scenarioId && current.scenarioId && previous.scenarioId === current.scenarioId) return true;
  if (previous.acceptanceCriterionId && current.acceptanceCriterionId && previous.strategyItemId && current.strategyItemId) {
    return previous.acceptanceCriterionId === current.acceptanceCriterionId && previous.strategyItemId === current.strategyItemId;
  }
  if (previous.strategyItemId && current.strategyItemId && previous.strategyItemId === current.strategyItemId) return true;
  if (previous.scenarioId || current.scenarioId || previous.acceptanceCriterionId || current.acceptanceCriterionId) return false;
  return previous.title.trim().toLowerCase() === (current.title || '').trim().toLowerCase();
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
    private readonly knowledgeFlowRepository?: KnowledgeFlowRepository,
    private readonly runtimeVariableRepository?: RuntimeVariableRepository,
    private readonly dependencyRepository?: DependencyRepository,
  ) {}

  async execute(request: GenerateRequirementTestCasesRequest): Promise<GenerateRequirementTestCasesResult> {
    const warnings: string[] = [];
    const requirement = await this.requirementRepository.findById(request.requirementId);
    if (!requirement) {
      throw new Error(`Requirement with id ${request.requirementId} not found`);
    }

    const preservedUserMappings = request.replaceExisting !== false
      ? (await this.testDesignRepository.findByRequirement(request.requirementId))
          .filter((design) => design.mappingProvenance === 'user' && design.operationId)
          .map((design) => ({
            title: design.title,
            operationId: design.operationId,
            acceptanceCriterionId: design.acceptanceCriterionId,
            scenarioId: design.scenarioId,
            strategyItemId: design.strategyItemId,
          }))
      : [];
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

    let designs = await this.enrichDesignMappings(request.requirementId, requirement.projectId, preservedUserMappings);
    const dependencyWarnings = await this.resolveDesignDependencies(requirement.projectId, designs, requirement.relatedFlows || []);
    warnings.push(...dependencyWarnings);
    designs = await this.testDesignRepository.findByRequirement(request.requirementId);
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
    if (projectOperations.length === 0) {
      warnings.push('No API operations are imported for this project. Test cases were generated without API mappings.');
    } else if (diagnostics.lowConfidence) {
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
    preservedUserMappings: PreservedScenarioMapping[] = [],
  ): Promise<TestDesignEntity[]> {
    const requirement = await this.requirementRepository.findById(requirementId);
    if (!requirement) return [];

    const operations: ApiOperationEntity[] = await this.apiOperationRepository.findByProject(projectId);
    const strategy = (await this.testStrategyRepository.findByRequirement(requirementId)) as TestStrategyEntity | null;
    const designs = await this.testDesignRepository.findByRequirement(requirementId);
    const remainingPreserved = [...preservedUserMappings];

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

      const preservedIndex = remainingPreserved.findIndex((mapping) => matchesGeneratedScenario(mapping, design));
      const preserved = preservedIndex >= 0 ? remainingPreserved.splice(preservedIndex, 1)[0] : undefined;
      const mapping = preserved
        ? { operationId: preserved.operationId, provenance: 'user' as const, state: 'confirmed' as const, confidence: 100 }
        : requirementEndpointMappingService.preserveExisting(
          design,
          requirement,
          operations,
          category,
          design.acceptanceCriterionId,
          `${design.title} ${this.resolveStrategyContext(design, strategy).reason || ''}`,
        );
      operationId = mapping.operationId;

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
          mappingProvenance: mapping.provenance,
          mappingState: mapping.state,
          mappingConfidence: mapping.confidence,
        } as Partial<TestDesignEntity>);
      } else if (design.mappingProvenance !== mapping.provenance || design.mappingState !== mapping.state || design.mappingConfidence !== mapping.confidence) {
        await this.testDesignRepository.update(design.id, {
          mappingProvenance: mapping.provenance,
          mappingState: mapping.state,
          mappingConfidence: mapping.confidence,
        } as Partial<TestDesignEntity>);
      }
    }

    return this.testDesignRepository.findByRequirement(requirementId);
  }

  private async resolveDesignDependencies(projectId: string, designs: TestDesignEntity[], relatedFlowIds: string[]): Promise<string[]> {
    if (!this.knowledgeFlowRepository || !this.runtimeVariableRepository || !this.dependencyRepository) return [];
    const [flows, runtimeVariables, projectDependencies, operations] = await Promise.all([
      this.knowledgeFlowRepository.findByProject(projectId),
      this.runtimeVariableRepository.findByProject(projectId),
      this.dependencyRepository.findByProject(projectId),
      this.apiOperationRepository.findByProject(projectId),
    ]);
    const warnings: string[] = [];
    for (const design of designs) {
      const relatedFlows = flows.filter((flow) => relatedFlowIds.includes(flow.id));
      const result = operationDependencyResolver.resolveForDesign(design, designs, relatedFlows, runtimeVariables, projectDependencies, operations);
      warnings.push(...result.warnings);
      await this.testDesignRepository.update(design.id, { dependencies: result.dependencies } as Partial<TestDesignEntity>);
    }
    return warnings;
  }


  private resolveStrategyContext(
    design: TestDesignEntity,
    strategy: TestStrategyEntity | null,
  ): {
    category: StrategyCategory;
    reason?: string;
    focusFieldId?: string;
    scenarioKind?: 'missing_field' | 'invalid_field' | 'duplicate' | 'default';
  } {
    if (!strategy) return { category: 'Positive' };
    for (const section of strategy.sections) {
      const item = section.items.find((i) => i.id === design.strategyItemId);
      if (item) {
        return {
          category: section.category,
          reason: item.reason,
          focusFieldId: item.focusFieldId,
          scenarioKind: item.scenarioKind,
        };
      }
    }
    return { category: 'Positive' };
  }
}

export default GenerateRequirementTestCases;
