export const VALUE_STRATEGIES = ['GENERATE', 'FIXED', 'REUSE', 'LINKED_RESPONSE', 'DATASET', 'ENVIRONMENT', 'SECRET', 'MANUAL', 'CONTRACT_DEFAULT'] as const;
export type ValueStrategy = typeof VALUE_STRATEGIES[number];
export const VALUE_CHANGE_SCOPES = ['EACH_REQUEST', 'EACH_EXECUTION', 'SUITE_RUN', 'TEST_CASE', 'ENVIRONMENT', 'PROJECT', 'UNTIL_CHANGED'] as const;
export type ValueChangeScope = typeof VALUE_CHANGE_SCOPES[number];
export type OptionalFieldPolicy = 'OMIT' | 'EMPTY' | 'NULL' | 'POPULATE';
export type ManualOverridePolicy = 'ALLOW' | 'DISALLOW' | 'REVIEW_REQUIRED';
export type FieldDataRuleStatus = 'SUGGESTED' | 'REVIEW_REQUIRED' | 'ACCEPTED';
export type FieldDataRuleScopeKind = 'OPERATION' | 'PROJECT_FALLBACK';

export interface FieldDataRuleReviewMetadata {
  reviewer?: string;
  reviewedAt?: number;
  reason?: string;
}

/** Protocol-neutral identity for one operation input use, rather than a global field name. */
export interface CanonicalInputReference {
  operationId: string;
  serviceId?: string;
  protocol?: string;
  location: string;
  path: string;
  /** Adapter-provided semantic metadata used to safely match project defaults. */
  semanticType?: string;
}

export interface FieldDataSourceReference { type: string; id?: string; field?: string; value?: unknown; [key: string]: unknown; }

export class FieldDataRuleEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public input: CanonicalInputReference,
    public semanticType: string,
    public required: boolean,
    public valueStrategy: ValueStrategy,
    public changeScope: ValueChangeScope,
    public lifecycle: string,
    public optionalFieldPolicy: OptionalFieldPolicy,
    public sourceReference: FieldDataSourceReference | null,
    public manualOverridePolicy: ManualOverridePolicy,
    public status: FieldDataRuleStatus,
    public readonly createdAt: number,
    public updatedAt: number,
    /** A project fallback is matched by canonical location + semantic type, never by a raw field name alone. */
    public scopeKind: FieldDataRuleScopeKind = 'OPERATION',
    public reviewMetadata?: FieldDataRuleReviewMetadata,
  ) {}
}
