import { randomUUID } from 'node:crypto';
import type { FieldDataRuleRepository } from '../../domain/test-data/FieldDataRuleRepository.js';
import { FieldDataRuleEntity, type CanonicalInputReference, type FieldDataSourceReference, type FieldDataRuleStatus, type FieldDataRuleScopeKind, type FieldDataRuleReviewMetadata, type ManualOverridePolicy, type OptionalFieldPolicy, type ValueChangeScope, type ValueStrategy } from '../../domain/test-data/FieldDataRuleEntity.js';

export interface FieldDataRuleInput { projectId: string; input: CanonicalInputReference; semanticType: string; required: boolean; valueStrategy: ValueStrategy; changeScope: ValueChangeScope; lifecycle?: string; optionalFieldPolicy?: OptionalFieldPolicy; sourceReference?: FieldDataSourceReference | null; manualOverridePolicy?: ManualOverridePolicy; status?: FieldDataRuleStatus; scopeKind?: FieldDataRuleScopeKind; reviewMetadata?: FieldDataRuleReviewMetadata; }
export class ManageFieldDataRules {
  constructor(private readonly repository: FieldDataRuleRepository) {}
  async create(input: FieldDataRuleInput) { const now = Date.now(); return this.repository.create(new FieldDataRuleEntity(randomUUID(), input.projectId, input.input, input.semanticType, input.required, input.valueStrategy, input.changeScope, input.lifecycle || 'REUSABLE', input.optionalFieldPolicy || 'POPULATE', input.sourceReference || null, input.manualOverridePolicy || 'ALLOW', input.status || 'SUGGESTED', now, now, input.scopeKind || 'OPERATION', input.reviewMetadata)); }
  async update(id: string, patch: Partial<FieldDataRuleInput>) { return this.repository.update(id, patch as Partial<FieldDataRuleEntity>); }
  async listByOperation(projectId: string, operationId: string) { return this.repository.findByOperation(projectId, operationId); }
  async listByProject(projectId: string) { return this.repository.findByProject(projectId); }
  async resolveCurrent(projectId: string, input: CanonicalInputReference) { return (await this.repository.findByOperation(projectId, input.operationId)).find((rule) => rule.input.location === input.location && rule.input.path === input.path && (rule.input.serviceId || '') === (input.serviceId || '')) || null; }
  async markReviewRequired(id: string) { return this.repository.update(id, { status: 'REVIEW_REQUIRED' }); }
  async acceptSuggestedRule(id: string) { return this.repository.update(id, { status: 'ACCEPTED' }); }
}
