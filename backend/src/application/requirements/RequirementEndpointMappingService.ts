import type { ApiOperationEntity } from '../../domain/api/ApiOperationEntity.js';
import type { RequirementEntity } from '../../domain/requirements/RequirementEntity.js';
import type { MappingProvenance, MappingState, TestDesignEntity } from '../../domain/requirements/TestDesignEntity.js';
import {
  getOperationMatchDiagnostics,
  mappingConfidencePercent,
  pickOperationForCategory,
  rankOperationsForRequirement,
} from './RequirementOperationMatcher.js';
import type { StrategyCategory } from '../../domain/requirements/TestStrategyEntity.js';

export interface OperationCandidate extends ApiOperationEntity { score: number }
export interface MappingDecision {
  operationId: string;
  provenance: MappingProvenance;
  state: MappingState;
  confidence: number;
}

/** Single authority for primary endpoint candidate selection and validation. */
export class RequirementEndpointMappingService {
  rankCandidates(requirement: RequirementEntity, operations: ApiOperationEntity[], max = 8, additionalOperationIds: string[] = []): OperationCandidate[] {
    const ranked = rankOperationsForRequirement(requirement, operations);
    const scoreById = new Map(ranked.map((operation, index) => [operation.id, Math.max(0, ranked.length - index)]));
    const ordered: ApiOperationEntity[] = [];
    const add = (id: string) => {
      const operation = operations.find((candidate) => candidate.id === id);
      if (operation && !ordered.some((item) => item.id === operation.id)) ordered.push(operation);
    };
    requirement.relatedOperations?.forEach(add);
    ranked.forEach((operation) => add(operation.id));
    // Related-flow references are commonly operation IDs; only add exact IDs.
    requirement.relatedFlows?.forEach((flow) => add(flow));
    additionalOperationIds.forEach(add);
    const selected = ordered.slice(0, max);
    for (const id of additionalOperationIds) {
      const operation = operations.find((candidate) => candidate.id === id);
      if (operation && !selected.some((item) => item.id === id)) {
        selected[selected.length - 1] = operation;
      }
    }
    return selected.map((operation) => ({ ...operation, score: scoreById.get(operation.id) ?? 0 }));
  }

  rankCandidatesForScenario(
    requirement: RequirementEntity,
    operations: ApiOperationEntity[],
    acceptanceCriterionId?: string,
    scenarioContext?: string,
    max = 8,
    additionalOperationIds: string[] = [],
  ): OperationCandidate[] {
    if (!acceptanceCriterionId) return this.rankCandidates(requirement, operations, max, additionalOperationIds);
    const criterion = requirement.acceptanceCriteria?.find((item) => item.id === acceptanceCriterionId);
    if (!criterion) return this.rankCandidates(requirement, operations, max, additionalOperationIds);
    const scopedRequirement = {
      ...requirement,
      description: [requirement.description, scenarioContext].filter(Boolean).join(' '),
      acceptanceCriteria: [criterion],
    } as RequirementEntity;
    return this.rankCandidates(scopedRequirement, operations, max, additionalOperationIds);
  }

  validateOperation(operationId: string | undefined, candidates: ApiOperationEntity[], operations: ApiOperationEntity[]): boolean {
    return Boolean(operationId && operations.some((operation) => operation.id === operationId) && candidates.some((operation) => operation.id === operationId));
  }

  confidence(requirement: RequirementEntity, operations: ApiOperationEntity[]): number {
    return mappingConfidencePercent(getOperationMatchDiagnostics(requirement, operations), operations.length);
  }

  confidenceForScenario(requirement: RequirementEntity, operations: ApiOperationEntity[], acceptanceCriterionId?: string, scenarioContext?: string): number {
    if (!acceptanceCriterionId || !requirement.acceptanceCriteria?.some((item) => item.id === acceptanceCriterionId)) {
      return this.confidence(requirement, operations);
    }
    const criterion = requirement.acceptanceCriteria.find((item) => item.id === acceptanceCriterionId)!;
    const scopedRequirement = { ...requirement, acceptanceCriteria: [criterion], description: [requirement.description, scenarioContext].filter(Boolean).join(' ') } as RequirementEntity;
    return this.confidence(scopedRequirement, operations);
  }

  resolveFallback(requirement: RequirementEntity, operations: ApiOperationEntity[], category: StrategyCategory, acceptanceCriterionId?: string, scenarioContext?: string): MappingDecision {
    const candidates = this.rankCandidatesForScenario(requirement, operations, acceptanceCriterionId, scenarioContext);
    const scopedRequirement = acceptanceCriterionId && requirement.acceptanceCriteria?.some((item) => item.id === acceptanceCriterionId)
      ? ({ ...requirement, acceptanceCriteria: [requirement.acceptanceCriteria.find((item) => item.id === acceptanceCriterionId)!], description: [requirement.description, scenarioContext].filter(Boolean).join(' ') } as RequirementEntity)
      : requirement;
    const operationId = pickOperationForCategory(scopedRequirement, candidates.length ? candidates : operations, category);
    const confidence = this.confidence(scopedRequirement, operations);
    return {
      operationId: operationId || '',
      provenance: 'matcher',
      confidence,
      state: operationId && confidence >= 70 ? 'confirmed' : operationId ? 'review' : 'unmapped',
    };
  }

  preserveExisting(design: Pick<TestDesignEntity, 'operationId' | 'mappingProvenance' | 'mappingState' | 'mappingConfidence'>, requirement: RequirementEntity, operations: ApiOperationEntity[], category: StrategyCategory, acceptanceCriterionId?: string, scenarioContext?: string): MappingDecision {
    const candidates = this.rankCandidatesForScenario(requirement, operations, acceptanceCriterionId, scenarioContext);
    if (design.mappingProvenance === 'user' && this.validateOperation(design.operationId, operations, operations)) {
      return { operationId: design.operationId, provenance: 'user', state: 'confirmed', confidence: 100 };
    }
    if (this.validateOperation(design.operationId, candidates, operations)) {
      const confidence = design.mappingConfidence || this.confidence(requirement, operations);
      return { operationId: design.operationId, provenance: design.mappingProvenance || 'matcher', confidence, state: confidence >= 70 ? 'confirmed' : 'review' };
    }
    return this.resolveFallback(requirement, operations, category, acceptanceCriterionId, scenarioContext);
  }
}

export const requirementEndpointMappingService = new RequirementEndpointMappingService();
export default requirementEndpointMappingService;
