import type { FieldDataRuleEntity, CanonicalInputReference, FieldDataSourceReference } from '../../domain/test-data/FieldDataRuleEntity.js';
import type { SecretStore } from '../../domain/security/SecretStore.js';

export const OMIT = Symbol('OMIT');
export type ResolvedInputValue = unknown | typeof OMIT;
export interface ResolutionMetadata { input: CanonicalInputReference; value: ResolvedInputValue; sourceStrategy: string; sourceReference?: unknown; scope?: string; lifecycle?: string; sensitive: boolean; generated: boolean; reused: boolean; overridden: boolean; reviewReason?: string; unresolvedReason?: string; persistedValue?: unknown; }
export interface ExecutionDataContext { requestId?: string; executionId?: string; suiteRunId?: string; testCaseId?: string; environmentId?: string; projectId: string; manualOverrides?: Record<string, unknown>; testCaseOverrides?: Record<string, unknown>; projectFallbackRules?: FieldDataRuleEntity[]; linkedValues?: Record<string, unknown>; datasetValues?: Record<string, unknown>; environmentValues?: Record<string, unknown>; contractValues?: Record<string, unknown>; cache?: Map<string, unknown>; generator?: (input: CanonicalInputReference) => unknown; }

const key = (input: CanonicalInputReference) => `${input.operationId}|${input.location}|${input.path}`;
const scopedKey = (scope: string, input: CanonicalInputReference, context: ExecutionDataContext) => `${scope}:${scope === 'EACH_REQUEST' ? context.requestId : scope === 'EACH_EXECUTION' ? context.executionId : scope === 'SUITE_RUN' ? context.suiteRunId : scope === 'TEST_CASE' ? context.testCaseId : scope === 'ENVIRONMENT' ? context.environmentId : context.projectId}:${key(input)}`;

/** The only precedence implementation for canonical input values. */
export class FieldDataResolutionService {
  constructor(private readonly secretStore?: SecretStore) {}
  async resolve(input: CanonicalInputReference, rule: FieldDataRuleEntity | null, context: ExecutionDataContext): Promise<ResolutionMetadata> {
    const inputKey = key(input); const cache = context.cache || new Map<string, unknown>();
    const direct = (values: Record<string, unknown> | undefined, strategy: string, overridden = false): ResolutionMetadata | null => values && Object.prototype.hasOwnProperty.call(values, inputKey) ? { input, value: values[inputKey], sourceStrategy: strategy, sensitive: false, generated: false, reused: false, overridden } : null;
    const directValue = direct(context.manualOverrides, 'MANUAL_OVERRIDE', true)
      || direct(context.testCaseOverrides, 'TEST_CASE_OVERRIDE', true)
      || direct(context.linkedValues, 'LINKED_RESPONSE')
      || direct(context.datasetValues, 'DATASET');
    if (directValue) return directValue;
    const operationRule = await this.fromRule(input, rule, context, cache);
    if (operationRule) return operationRule;
    // An explicit operation rule, including one that needs review, wins over a
    // generic fallback. Otherwise a default could silently change its intent.
    const fallbackRule = rule ? null : this.projectFallbackFor(input, context.projectFallbackRules || []);
    return await this.fromRule(input, fallbackRule, context, cache)
      || direct(context.environmentValues, 'ENVIRONMENT')
      || direct(context.contractValues, 'CONTRACT_DEFAULT')
      || this.unresolved(input, rule || fallbackRule);
  }
  private projectFallbackFor(input: CanonicalInputReference, rules: FieldDataRuleEntity[]): FieldDataRuleEntity | null {
    // A fallback must agree on canonical request location and adapter-provided
    // semantic type. It intentionally does not use `path`/field name matching.
    if (!input.semanticType) return null;
    return rules.find((candidate) => candidate.scopeKind === 'PROJECT_FALLBACK'
      && candidate.status === 'ACCEPTED'
      && candidate.input.location === input.location
      && candidate.semanticType === input.semanticType
      && (!candidate.input.protocol || !input.protocol || candidate.input.protocol === input.protocol)) || null;
  }
  private async fromRule(input: CanonicalInputReference, rule: FieldDataRuleEntity | null, context: ExecutionDataContext, cache: Map<string, unknown>): Promise<ResolutionMetadata | null> {
    if (!rule || rule.status !== 'ACCEPTED') return null;
    if (!rule.required && rule.optionalFieldPolicy === 'OMIT') return this.meta(input, OMIT, rule, false, false);
    if (!rule.required && rule.optionalFieldPolicy === 'EMPTY') return this.meta(input, '', rule, false, false);
    if (!rule.required && rule.optionalFieldPolicy === 'NULL') return this.meta(input, null, rule, false, false);
    const source = (rule.sourceReference || {}) as FieldDataSourceReference; const sourceField = String(source.field || input.path);
    if (rule.valueStrategy === 'LINKED_RESPONSE' || rule.valueStrategy === 'REUSE') { const value = context.linkedValues?.[sourceField]; return value === undefined ? this.unresolved(input, rule, `No linked/reused value for ${sourceField}`) : this.meta(input, value, rule, false, true); }
    if (rule.valueStrategy === 'DATASET') { const value = context.datasetValues?.[sourceField]; return value === undefined ? this.unresolved(input, rule, `No dataset value for ${sourceField}`) : this.meta(input, value, rule, false, false); }
    if (rule.valueStrategy === 'ENVIRONMENT') { const value = context.environmentValues?.[sourceField]; return value === undefined ? this.unresolved(input, rule, `No environment value for ${sourceField}`) : this.meta(input, value, rule, false, false); }
    if (rule.valueStrategy === 'SECRET') { const ref = String(source.secretRef || source.id || ''); const value = ref && this.secretStore ? await this.secretStore.get(ref) : null; return value === null ? this.unresolved(input, rule, 'Secret reference could not be resolved') : { ...this.meta(input, value, rule, false, false), sensitive: true, persistedValue: '[REDACTED]' }; }
    if (rule.valueStrategy === 'FIXED' || rule.valueStrategy === 'MANUAL' || rule.valueStrategy === 'CONTRACT_DEFAULT') return this.meta(input, source.value, rule, false, false);
    if (rule.valueStrategy === 'GENERATE') { const cacheKey = scopedKey(rule.changeScope, input, context); if (rule.changeScope !== 'EACH_REQUEST' && cache.has(cacheKey)) return this.meta(input, cache.get(cacheKey), rule, false, true); const value = context.generator ? context.generator(input) : `generated:${input.path}`; if (rule.changeScope !== 'EACH_REQUEST') cache.set(cacheKey, value); return this.meta(input, value, rule, true, false); }
    return null;
  }
  private meta(input: CanonicalInputReference, value: ResolvedInputValue, rule: FieldDataRuleEntity, generated: boolean, reused: boolean): ResolutionMetadata { return { input, value, sourceStrategy: rule.valueStrategy, sourceReference: rule.sourceReference, scope: rule.changeScope, lifecycle: rule.lifecycle, sensitive: false, generated, reused, overridden: false }; }
  private unresolved(input: CanonicalInputReference, rule: FieldDataRuleEntity | null, reason = 'No value source resolved for required input'): ResolutionMetadata { return { input, value: undefined, sourceStrategy: rule?.valueStrategy || 'UNRESOLVED', scope: rule?.changeScope, lifecycle: rule?.lifecycle, sensitive: false, generated: false, reused: false, overridden: false, unresolvedReason: reason, reviewReason: rule && rule.status !== 'ACCEPTED' ? `Rule is ${rule.status}` : undefined }; }
}
