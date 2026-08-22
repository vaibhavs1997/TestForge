import { describe, expect, it } from 'vitest';
import { ExecutionDataPreviewService } from './ExecutionDataPreviewService.js';
import { FieldDataResolutionService, OMIT } from './FieldDataResolutionService.js';
import { FieldDataRuleEntity } from '../../domain/test-data/FieldDataRuleEntity.js';
const input = { operationId: 'op', location: 'BODY', path: 'email', protocol: 'neutral' };
const rule = (strategy: any, required = true, optionalFieldPolicy: any = 'POPULATE', sourceReference: any = null) => new FieldDataRuleEntity('r', 'p', input, 'email', required, strategy, 'SUITE_RUN', 'REUSABLE', optionalFieldPolicy, sourceReference, 'ALLOW', 'ACCEPTED', 0, 0);
describe('ExecutionDataPreviewService', () => {
  it('masks secrets, honors scoped overrides, and blocks only required unresolved values', async () => { const resolver = new FieldDataResolutionService({ get: async () => 'secret' } as any); const preview = new ExecutionDataPreviewService(resolver); const secret = await preview.preview([{ input, required: true, rule: rule('SECRET', true, 'POPULATE', { secretRef: 'x' }) }], { projectId: 'p' }); expect(secret.inputs[0].displayValue).toBe('[REDACTED]'); expect(secret.canExecute).toBe(true); const omitted = await preview.preview([{ input, required: false, rule: rule('FIXED', false, 'OMIT') }], { projectId: 'p' }); expect(omitted.inputs[0].value).toBe(OMIT); expect(omitted.canExecute).toBe(true); const missing = await preview.preview([{ input, required: true, rule: rule('REUSE') }], { projectId: 'p' }); expect(missing.canExecute).toBe(false); });
});
