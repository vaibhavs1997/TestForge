// GenerateTestDesigns - Deterministic Test Design Generator
// Converts approved Test Strategy items into executable designs.
// Does NOT execute tests or generate reports.
// Uses Requirement and Strategy only. Execution enrichment happens later.
import { randomUUID } from 'node:crypto';
import { RequirementRepository } from '../../domain/requirements/RequirementRepository.js';
import { RequirementEntity } from '../../domain/requirements/RequirementEntity.js';
import { TestStrategyRepository } from '../../domain/requirements/TestStrategyRepository.js';
import { TestDesignRepository } from '../../domain/requirements/TestDesignRepository.js';
import { AnalysisRepository } from '../../infrastructure/analysis/AnalysisRepository.js';
import { KnowledgeFlowRepository } from '../../infrastructure/knowledge/KnowledgeFlowRepository.js';
import { DatasetRepository } from '../../infrastructure/test-data/DatasetRepository.js';
import { EnvironmentRepository } from '../../infrastructure/environment/EnvironmentRepository.js';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository.js';
import { TestDesignEntity, DesignPriority, DesignStatus, RequestOverride, RuntimeBinding, Assertion, CleanupStep } from '../../domain/requirements/TestDesignEntity.js';
import { TestStrategyEntity, StrategyItem, StrategyCategory } from '../../domain/requirements/TestStrategyEntity.js';
import type { GenerationProvenanceService } from './GenerationProvenanceService.js';
import { selectByBudget, type GenerationBudget } from './GenerationBudget.js';

export class GenerateTestDesigns {
  constructor(
    private readonly requirementRepository: RequirementRepository,
    private readonly testStrategyRepository: TestStrategyRepository,
    private readonly testDesignRepository: TestDesignRepository,
    private readonly analysisRepository: AnalysisRepository,
    private readonly knowledgeFlowRepository: KnowledgeFlowRepository,
    private readonly datasetRepository: DatasetRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly apiOperationRepository: ApiOperationRepository,
    private readonly provenanceService?: GenerationProvenanceService,
  ) {}

  async execute(requirementId: string, options: { deferProvenance?: boolean; budget?: GenerationBudget } = {}): Promise<TestDesignEntity[]> {
    if (!options.deferProvenance && !this.provenanceService) {
      throw new Error('Generation provenance service is required for persisted generated designs.');
    }
    const requirement = await this.requirementRepository.findById(requirementId);
    if (!requirement) {
      throw new Error(`Requirement with id ${requirementId} not found`);
    }

    const strategy = await this.testStrategyRepository.findByRequirement(requirementId);
    if (!strategy) {
      throw new Error('Test strategy not found for this requirement');
    }

    const designs: TestDesignEntity[] = [];

    // Process each enabled strategy item
    for (const section of strategy.sections) {
      for (const item of section.items) {
        if (item.status !== 'Enabled') continue;

        // A design is an immutable requirement-derived scenario at this point.
        // Endpoint, environment, dataset, payload, and runtime bindings are
        // assigned later by the mapping/execution-enrichment phase.
        const operationId = '';
        const requestOverrides: RequestOverride = {};
        
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
                  '',
                  '',
                  '',
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
                  'unmapped',
                  0,
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

    if (options.deferProvenance) return persistedDesigns;
    const selection = selectByBudget(persistedDesigns, options.budget); const ids = new Set(selection.selected.map(x => x.design.id));
    for (const design of persistedDesigns) if (!ids.has(design.id)) await this.testDesignRepository.delete(design.id);
    return this.provenanceService!.captureGeneratedDesigns({ requirement, designs: selection.selected.map(x => x.design), mode: 'DETERMINISTIC', budgetDecisions: new Map(selection.selected.map(x => [x.design.id, { ...x.decision, omissions: selection.omitted }])) });
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
