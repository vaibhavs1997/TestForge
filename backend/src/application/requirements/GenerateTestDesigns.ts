// GenerateTestDesigns - Deterministic Test Design Generator
// Converts approved Test Strategy items into executable designs.
// Does NOT execute tests or generate reports.
// Reuses Requirement, Strategy, API Contract, Datasets, Environment, and Knowledge.
import { randomUUID } from 'node:crypto';
import { RequirementRepository } from '../../domain/requirements/RequirementRepository';
import { RequirementEntity } from '../../domain/requirements/RequirementEntity';
import { TestStrategyRepository } from '../../domain/requirements/TestStrategyRepository';
import { TestDesignRepository } from '../../domain/requirements/TestDesignRepository';
import { AnalysisRepository } from '../../infrastructure/analysis/AnalysisRepository';
import { KnowledgeFlowRepository } from '../../infrastructure/knowledge/KnowledgeFlowRepository';
import { DatasetRepository } from '../../infrastructure/test-data/DatasetRepository';
import { EnvironmentRepository } from '../../infrastructure/environment/EnvironmentRepository';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository';
import { TestDesignEntity, DesignPriority, DesignStatus, RequestOverride, RuntimeBinding, Assertion, CleanupStep } from '../../domain/requirements/TestDesignEntity';
import { TestStrategyEntity, StrategyItem, StrategyCategory } from '../../domain/requirements/TestStrategyEntity';
import {
  buildPayloadForScenario,
} from './RequirementOperationMatcher';
import { requirementEndpointMappingService } from './RequirementEndpointMappingService';

export class GenerateTestDesigns {
  constructor(
    private readonly requirementRepository: RequirementRepository,
    private readonly testStrategyRepository: TestStrategyRepository,
    private readonly testDesignRepository: TestDesignRepository,
    private readonly analysisRepository: AnalysisRepository,
    private readonly knowledgeFlowRepository: KnowledgeFlowRepository,
    private readonly datasetRepository: DatasetRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly apiOperationRepository: ApiOperationRepository
  ) {}

  async execute(requirementId: string): Promise<TestDesignEntity[]> {
    const requirement = await this.requirementRepository.findById(requirementId);
    if (!requirement) {
      throw new Error(`Requirement with id ${requirementId} not found`);
    }

    const strategy = await this.testStrategyRepository.findByRequirement(requirementId);
    if (!strategy) {
      throw new Error('Test strategy not found for this requirement');
    }

    const designs: TestDesignEntity[] = [];

    // Get related data
    const analysis = requirement.projectAnalysisId
      ? await this.analysisRepository.findById(requirement.projectAnalysisId)
      : null;

    // Use the environment selected in the API workspace as the shared default.
    // Keep QA/first as backwards-compatible fallbacks for older projects.
    const environments = await this.environmentRepository.findByProject(requirement.projectId);
    const environment = environments.find(e => e.isDefault)
      || environments.find(e => e.name.toLowerCase().includes('qa'))
      || environments[0];

    // Get dataset (prefer test data, fallback to analysis datasets)
    const datasets = await this.datasetRepository.findByProject(requirement.projectId);
    const dataset = datasets[0] || (analysis ? await this.datasetRepository.findById(analysis.relatedDatasets[0]) : null);

    const operations = await this.apiOperationRepository.findByProject(requirement.projectId);

    // Process each enabled strategy item
    for (const section of strategy.sections) {
      for (const item of section.items) {
        if (item.status !== 'Enabled') continue;

        const operationId = this.findRelatedOperationId(
          item,
          requirement,
          section.category,
          operations,
        );

        const operation = operations.find((o) => o.id === operationId);
        const requestOverrides: RequestOverride = {
          body: buildPayloadForScenario(section.category, operation, {
            focusFieldId: item.focusFieldId,
            scenarioKind: item.scenarioKind,
          }),
        };
        if (section.category === 'Security') {
          requestOverrides.headers = { Authorization: 'Bearer invalid-token' };
        }
        
        // Generate runtime bindings
        const runtimeBindings = this.generateRuntimeBindings(section.category);
        
        // Generate assertions based on strategy category
        const assertions = this.generateAssertions(section.category, item);
        
        // Generate cleanup steps
        const cleanup = this.generateCleanupSteps(section.category);

                const design = new TestDesignEntity(
                  randomUUID(),
                  requirement.projectId,
                  requirementId,
                  item.id,
                  item.title,
                  operationId,
                  environment?.id || '',
                  dataset?.id || '',
                  dataset ? `row-${Date.now()}` : '',
                  requestOverrides,
                  runtimeBindings,
                  assertions,
                  cleanup,
                  item.priority,
                  'Ready',
                  Date.now(),
                  Date.now(),
                  [],
                  item.testCaseType,
                  item.expectedHttpStatus,
                  'matcher',
                  requirementEndpointMappingService.resolveFallback(requirement, operations, section.category, item.acceptanceCriterionId, `${item.title} ${item.reason}`).state,
                  requirementEndpointMappingService.resolveFallback(requirement, operations, section.category, item.acceptanceCriterionId, `${item.title} ${item.reason}`).confidence,
                  item.acceptanceCriterionId,
                  item.scenarioId || item.id
                );

        designs.push(design);
      }
    }

    // Persist designs
    const persistedDesigns: TestDesignEntity[] = [];
    for (const design of designs) {
      const persisted = await this.testDesignRepository.create(design);
      persistedDesigns.push(persisted);
    }

    return persistedDesigns;
  }

  private findRelatedOperationId(
    item: StrategyItem,
    requirement: RequirementEntity,
    category: StrategyCategory,
    operations: Awaited<ReturnType<ApiOperationRepository['findByProject']>>,
  ): string {
    return requirementEndpointMappingService.resolveFallback(requirement, operations, category, item.acceptanceCriterionId, `${item.title} ${item.reason}`).operationId;
  }


  private generateRuntimeBindings(category: string): RuntimeBinding[] {
    const bindings: RuntimeBinding[] = [];

    if (category === 'Security' || category === 'Integration') {
      bindings.push({
        variable: 'accessToken',
        source: 'response',
        path: '$.accessToken',
      });
    }

    if (category === 'Validation' || category === 'Error Handling') {
      bindings.push({
        variable: 'errorCode',
        source: 'response',
        path: '$.error.code',
      });
    }

    return bindings;
  }

  private generateAssertions(category: string, item: StrategyItem): Assertion[] {
    const expectedStatus =
      item.expectedHttpStatus ??
      (category === 'Security' ? 401 : category === 'Negative' || category === 'Validation' ? 400 : 200);

    const assertions: Assertion[] = [
      { type: 'status', operator: 'equals', path: '$.status', expected: expectedStatus },
    ];

    if (expectedStatus >= 200 && expectedStatus < 300 && category === 'Positive') {
      assertions.push({ type: 'body', operator: 'exists', path: '$.data', expected: true });
    }

    if (expectedStatus >= 400) {
      assertions.push({ type: 'body', operator: 'exists', path: '$.message', expected: true });
    }

    return assertions;
  }

  private generateCleanupSteps(category: string): CleanupStep[] {
    const steps: CleanupStep[] = [];

    if (category === 'Integration' || category === 'Regression') {
      steps.push({
        type: 'dataset',
        action: 'cleanup',
        target: 'test-data',
      });
    }

    return steps;
  }
}

export default GenerateTestDesigns;
