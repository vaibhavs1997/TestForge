import type { RequirementEntity } from '../../domain/requirements/RequirementEntity.js';
import type { ApiOperationEntity } from '../../domain/api/ApiOperationEntity.js';
import type { TestDesignEntity, GenerationMode, GenerationProvenance } from '../../domain/requirements/TestDesignEntity.js';
import type { ApiOperationRepository } from '../../domain/api/ApiOperationRepository.js';
import type { TestDesignRepository } from '../../domain/requirements/TestDesignRepository.js';
import type { FieldDataRuleRepository } from '../../domain/test-data/FieldDataRuleRepository.js';
import type { TestCaseVersionService } from './TestCaseVersionService.js';
import { ConflictError } from '../../shared/errors.js';
import type { BudgetDecision } from './GenerationBudget.js';

export interface GenerationAiEvidence { providerId: string; provider: string; model: string; promptTemplateId?: string; promptVersion?: string; attemptedAt?: number; attempts?: number; validationStatus?: 'VALID' | 'INVALID' | 'REPAIRED'; outcome?: 'SUCCESS' | 'FAILED'; failureCategory?: string; }

/** Builds identifier-only evidence. Deliberately excludes payloads, headers, variables, prompts, and test-data values. */
export class GenerationProvenanceService {
  constructor(
    private readonly apiOperationRepository?: ApiOperationRepository,
    private readonly fieldDataRuleRepository?: FieldDataRuleRepository,
    private readonly testDesignRepository?: TestDesignRepository,
    private readonly testCaseVersionService?: TestCaseVersionService,
  ) {}

  /**
   * The only persistence boundary for generated-design provenance.  Entry
   * points may choose a generation mode, but never assemble snapshots.
   */
  async captureGeneratedDesigns(input: { requirement: RequirementEntity; designs: TestDesignEntity[]; mode: GenerationMode; ai?: GenerationAiEvidence; fallbackReason?: string; budgetDecisions?: Map<string, BudgetDecision> }): Promise<TestDesignEntity[]> {
    if (!this.apiOperationRepository || !this.testDesignRepository) {
      throw new ConflictError('Generation provenance context is unavailable; generated designs cannot be persisted without provenance.');
    }
    const operations = await this.apiOperationRepository.findByProject(input.requirement.projectId);
    const rules = this.fieldDataRuleRepository ? await this.fieldDataRuleRepository.findByProject(input.requirement.projectId) : [];
    for (const design of input.designs) {
      const provenance = this.build({
        requirement: input.requirement,
        design,
        operation: operations.find((operation) => operation.id === design.operationId),
        mode: input.mode,
        ai: input.ai,
        fallbackReason: input.fallbackReason,
        fieldRuleIds: rules.filter((rule) => rule.input.operationId === design.operationId).map((rule) => rule.id),
      });
      const decision = input.budgetDecisions?.get(design.id);
      if (decision) provenance.budget = { maxTotalScenarios: decision.budget.maxTotalScenarios, maxMutationsPerOperationField: decision.budget.maxMutationsPerOperationField, allocation: decision.budget.allocation, riskScore: decision.riskScore, selectionReason: decision.reason, omittedScenarioFamilies: decision.omissions || [] };
      await this.testDesignRepository.update(design.id, { generationProvenance: provenance } as Partial<TestDesignEntity>);
    }
    const captured = await this.testDesignRepository.findByRequirement(input.requirement.id) as TestDesignEntity[];
    if (this.testCaseVersionService) {
      this.testCaseVersionService.ingest(input.requirement.projectId, captured.map((design) => ({
        requirementId: design.requirementId, acceptanceCriterionId: design.acceptanceCriterionId,
        operationId: design.operationId, scenarioIntent: design.title, payload: design.requestOverrides,
        assertions: design.assertions,
        mapping: { confidence: design.mappingConfidence, state: design.mappingState, provenance: design.mappingProvenance },
        mutationProvenance: design.mutationProvenance,
        generatedContent: { designId: design.id, strategyItemId: design.strategyItemId, testCaseType: design.testCaseType },
        generationProvenance: design.generationProvenance,
      })));
    }
    return captured;
  }

  build(input: { requirement: RequirementEntity; design: TestDesignEntity; operation?: ApiOperationEntity; mode: GenerationMode; ai?: GenerationAiEvidence; fallbackReason?: string; fieldRuleIds?: string[] }): GenerationProvenance {
    const { requirement, design, operation, mode, ai, fallbackReason, fieldRuleIds = [] } = input;
    const criterion = design.acceptanceCriterionId
      ? [{ id: design.acceptanceCriterionId, version: requirement.updatedAt }]
      : [];
    return {
      generatedAt: Date.now(),
      mode,
      requirement: { id: requirement.id, version: requirement.updatedAt },
      acceptanceCriteria: criterion,
      operation: operation ? { id: operation.id, serviceId: operation.serviceId, operationVersion: operation.updatedAt } : undefined,
      mapping: { confidence: design.mappingConfidence, state: design.mappingState, provenance: design.mappingProvenance },
      knowledgeSourceIds: [...new Set(requirement.relatedFlows || [])],
      testData: {
        datasetId: design.datasetId || undefined,
        fieldRuleIds: [...new Set(fieldRuleIds)],
        sourceFields: design.mutationProvenance?.fieldPath ? [design.mutationProvenance.fieldPath] : [],
      },
      mutation: design.mutationProvenance ? {
        strategy: design.mutationProvenance.strategy,
        location: design.mutationProvenance.location,
        fieldPath: design.mutationProvenance.fieldPath,
        schemaRule: design.mutationProvenance.schemaRule,
      } : undefined,
      ai: mode === 'AI_GENERATED' || mode === 'HYBRID' ? ai : undefined,
      fallback: mode === 'FALLBACK' ? { from: 'AI_GENERATED', reason: this.safeReason(fallbackReason) } : undefined,
    };
  }

  private safeReason(reason?: string): string {
    // Failure class only: messages can contain provider responses, URLs, or credentials.
    if (!reason) return 'AI generation did not produce usable designs.';
    return reason.replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]').slice(0, 240);
  }
}
