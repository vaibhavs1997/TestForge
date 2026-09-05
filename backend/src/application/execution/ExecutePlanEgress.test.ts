import { describe, expect, it, vi } from 'vitest';
import { ExecutePlan } from './ExecutePlan.js';

describe('ExecutePlan outbound egress', () => {
  it('uses the secure executor for every retry attempt', async () => {
    const execute = vi.fn()
      .mockRejectedValueOnce(new Error('temporary network failure'))
      .mockResolvedValueOnce({ status: 200, statusText: 'OK', headers: {}, data: { ok: true } });
    const runner = new ExecutePlan(
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      undefined, undefined, undefined, undefined, undefined, undefined, { execute } as any,
    );
    const profile = { timeout: 1000, retryPolicy: { enabled: true, maxRetries: 1, retryDelay: 0 } };
    const result = await (runner as any).executionContext.run({ profile }, () => (runner as any).executeStep(
      { id: 'plan-1', executionOrder: 1, requestTemplate: { method: 'GET', path: '/items' }, assertions: [], runtimeBindings: [] },
      { baseUrl: 'https://api.example.com', headers: {}, runtimeVariables: {}, environmentVariables: {}, datasetValues: {}, responses: {} },
      {},
      { allowedHosts: ['api.example.com'] },
      'PRODUCTION',
    ));

    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenNthCalledWith(1, expect.objectContaining({ url: 'https://api.example.com/items', environmentTier: 'PRODUCTION' }));
    expect(execute).toHaveBeenNthCalledWith(2, expect.objectContaining({ url: 'https://api.example.com/items', environmentTier: 'PRODUCTION' }));
    expect(result.status).toBe('Passed');
  });
});
