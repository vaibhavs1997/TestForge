import { describe, expect, it, vi } from 'vitest';
import { retryStructuredGeneration } from './GenerateTestDesignWithAI.js';
describe('structured AI retry', () => {
  const parse = (content: string) => content === 'valid' ? [{ title: 'safe' }] : [];
  it('retries malformed output then validates attempt two', async () => { const generate = vi.fn().mockResolvedValueOnce({ content: 'bad' }).mockResolvedValueOnce({ content: 'valid' }); const r = await retryStructuredGeneration(generate, parse, () => 'PROVIDER_FAILURE'); expect(r).toMatchObject({ attempts: 2, parsed: [{ title: 'safe' }], failureCategory: 'MALFORMED_STRUCTURED_OUTPUT' }); });
  it('keeps malformed output bounded for deterministic fallback', async () => { const r = await retryStructuredGeneration(vi.fn().mockResolvedValue({ content: 'bad' }), parse, () => 'PROVIDER_FAILURE'); expect(r).toMatchObject({ attempts: 2, parsed: [], failureCategory: 'MALFORMED_STRUCTURED_OUTPUT' }); });
  it('retries transient failures and sanitizes failure categories', async () => { const generate = vi.fn().mockRejectedValueOnce(new Error('token=secret')).mockResolvedValueOnce({ content: 'valid' }); const r = await retryStructuredGeneration(generate, parse, () => 'AUTH_OR_CONFIGURATION'); expect(r).toMatchObject({ attempts: 2, parsed: [{ title: 'safe' }], failureCategory: 'AUTH_OR_CONFIGURATION' }); expect(JSON.stringify(r)).not.toContain('secret'); });
  it('stops after two provider failures', async () => { const r = await retryStructuredGeneration(vi.fn().mockRejectedValue(new Error('password=x')), parse, () => 'AUTH_OR_CONFIGURATION'); expect(r).toMatchObject({ attempts: 2, result: undefined, failureCategory: 'AUTH_OR_CONFIGURATION' }); });
});
