import { describe, expect, it, vi } from 'vitest';
import { ExecutePlan } from './ExecutePlan.js';

const context = (): any => ({ baseUrl: 'https://api.example.test', headers: {}, runtimeVariables: {}, environmentVariables: {}, datasetValues: {}, responses: {} });
const plan = (overrides: Record<string, unknown> = {}) => ({
  id: 'plan-1', executionOrder: 1, requestTemplate: { method: 'GET', path: '/items' },
  assertions: [{ type: 'body', path: '$.ok', operator: 'equals', expected: true }], runtimeBindings: [], ...overrides,
});

function runner(execute: ReturnType<typeof vi.fn>, retries = 1) {
  const instance = new ExecutePlan({} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, undefined, undefined, undefined, undefined, undefined, undefined, { execute } as any);
  (instance as any).loadedProfile = { timeout: 1000, retryPolicy: { enabled: true, maxRetries: retries, retryDelay: 0 } };
  return instance;
}

describe('ExecutePlan retry semantics', () => {
  it('does not convert a retried 200 assertion failure into a pass', async () => {
    const execute = vi.fn().mockResolvedValue({ status: 200, statusText: 'OK', headers: {}, data: { ok: false } });
    const result = await (runner(execute) as any).executeStep(plan(), context(), {});
    expect(result.status).toBe('Failed');
    expect(result.assertions[0].passed).toBe(false);
    expect(result.attempts).toHaveLength(2);
  });

  it('retries a transport failure through assertions and captures only the accepted response', async () => {
    const execute = vi.fn().mockRejectedValueOnce(new Error('network unavailable')).mockResolvedValueOnce({ status: 200, statusText: 'OK', headers: {}, data: { ok: true, id: 'accepted' } });
    const executionContext = context();
    const result = await (runner(execute) as any).executeStep(plan({ runtimeBindings: [{ source: 'response', path: '$.id', variable: 'id' }] }), executionContext, {});
    expect(result.status).toBe('Passed');
    expect(result.capturedVariables).toEqual({ id: 'accepted' });
    expect(executionContext.runtimeVariables).toEqual({ id: 'accepted' });
    expect(executionContext.responses['plan-1']).toEqual({ ok: true, id: 'accepted' });
  });

  it('does not retain runtime captures or response state from a failed assertion attempt', async () => {
    const execute = vi.fn().mockResolvedValueOnce({ status: 200, statusText: 'OK', headers: {}, data: { ok: false, id: 'stale' } }).mockResolvedValueOnce({ status: 200, statusText: 'OK', headers: {}, data: { ok: true, id: 'fresh' } });
    const executionContext = context();
    const result = await (runner(execute) as any).executeStep(plan({ runtimeBindings: [{ source: 'response', path: '$.id', variable: 'id' }] }), executionContext, {});
    expect(result.capturedVariables).toEqual({ id: 'fresh' });
    expect(executionContext.responses['plan-1']).toEqual({ ok: true, id: 'fresh' });
  });

  it('keeps validation failure semantics on a retry', async () => {
    const execute = vi.fn().mockResolvedValue({ status: 200, statusText: 'OK', headers: {}, data: { ok: false } });
    const result = await (runner(execute) as any).executeStep(plan(), context(), {});
    expect(result.status).toBe('Failed');
    expect(result.validations.some((validation: any) => validation.status === 'Failed')).toBe(true);
  });

  it('applies egress policy to each retry and records exhausted attempts', async () => {
    const execute = vi.fn().mockRejectedValue(new Error('Outbound egress policy rejected host'));
    const result = await (runner(execute, 2) as any).executeStep(plan(), context(), {}, { allowedHosts: ['api.example.test'] }, 'PRODUCTION');
    expect(execute).toHaveBeenCalledTimes(3);
    expect(execute).toHaveBeenLastCalledWith(expect.objectContaining({ egressPolicy: { allowedHosts: ['api.example.test'] }, environmentTier: 'PRODUCTION' }));
    expect(result.attempts.map((attempt: any) => attempt.attempt)).toEqual([1, 2, 3]);
    expect(result.status).toBe('Failed');
  });

  it('does not retry cancellation', async () => {
    const execute = vi.fn().mockRejectedValue(new Error('Request cancelled'));
    const result = await (runner(execute, 2) as any).executeStep(plan(), context(), {});
    expect(execute).toHaveBeenCalledOnce();
    expect(result.status).toBe('Failed');
  });

  it('reuses resolved Test Data values for every retry attempt', async () => {
    const execute = vi.fn().mockRejectedValueOnce(new Error('temporary')).mockResolvedValueOnce({ status: 200, statusText: 'OK', headers: {}, data: { ok: true } });
    await (runner(execute) as any).executeStep(plan(), context(), { email: { value: 'stable@example.test' } });
    expect(execute.mock.calls.map((call) => call[0].headers.email)).toEqual(['stable@example.test', 'stable@example.test']);
  });
});
