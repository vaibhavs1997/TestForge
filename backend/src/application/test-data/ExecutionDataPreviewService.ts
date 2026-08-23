import type { CanonicalInputReference, FieldDataRuleEntity } from '../../domain/test-data/FieldDataRuleEntity.js';
import { FieldDataResolutionService, OMIT, type ExecutionDataContext, type ResolutionMetadata } from './FieldDataResolutionService.js';
export interface PreviewInput { input: CanonicalInputReference; required: boolean; rule: FieldDataRuleEntity | null; }
export interface ExecutionPreview { inputs: Array<ResolutionMetadata & { required: boolean; displayValue: unknown }>; canExecute: boolean; unresolvedRequired: number; optionalOmitted: number; reviewRequired: number; }
/** Resolves preview metadata only; actual values remain transient and secrets are masked for display. */
export class ExecutionDataPreviewService {
  constructor(private readonly resolver: FieldDataResolutionService) {}
  async preview(inputs: PreviewInput[], context: ExecutionDataContext): Promise<ExecutionPreview> {
    const resolved = await Promise.all(inputs.map(async (item) => { const result = await this.resolver.resolve(item.input, item.rule, context); return { ...result, required: item.required, displayValue: result.sensitive ? '[REDACTED]' : result.value }; }));
    const unresolvedRequired = resolved.filter((item) => item.required && item.value !== OMIT && item.value === undefined).length;
    return { inputs: resolved, canExecute: unresolvedRequired === 0, unresolvedRequired, optionalOmitted: resolved.filter((item) => !item.required && item.value === OMIT).length, reviewRequired: resolved.filter((item) => Boolean(item.reviewReason)).length };
  }
}
