import { describe, expect, it, vi } from 'vitest';
import { ExecuteSuite } from './ExecuteSuite';

describe('ExecuteSuite', () => {
  it('executes selected plans once as one combined run and deduplicates identical plan IDs', async () => {
    const executeCombined = vi.fn().mockResolvedValue({ id: 'run-1', suiteId: 'suite-1' });
    const service = new ExecuteSuite(
      { findById: vi.fn().mockResolvedValue({ id: 'suite-1', status: 'Active', executionPlans: [
        { executionPlanId: 'plan-b', order: 2 },
        { executionPlanId: 'plan-a', order: 1 },
        { executionPlanId: 'plan-a', order: 3 },
      ], executionPolicy: 'ContinueOnError' }) } as any,
      { execute: vi.fn(), executeCombined } as any,
      { findById: vi.fn(async (id: string) => ({ id, status: 'Ready', requestTemplate: { method: 'GET', path: '/' }, assertions: [] })) } as any,
    );
    const result = await service.execute('suite-1');
    expect(executeCombined).toHaveBeenCalledWith(
      ['plan-a', 'plan-b'],
      'ContinueOnFailure',
      undefined,
      'suite-1',
      expect.objectContaining({ suite: expect.objectContaining({ id: 'suite-1', version: 1 }) }),
    );
    expect(result).toMatchObject({ id: 'run-1', suiteId: 'suite-1' });
  });

  it('preserves the individual-plan compatibility path when no plan repository is supplied', async () => {
    const execute = vi.fn().mockResolvedValue({ id: 'run-1' });
    const service = new ExecuteSuite(
      { findById: vi.fn().mockResolvedValue({ id: 'suite-1', status: 'Active', executionPlans: [{ executionPlanId: 'plan-a', order: 1 }], executionPolicy: 'FailFast' }) } as any,
      { execute } as any,
    );
    await service.execute('suite-1');
    expect(execute).toHaveBeenCalledWith('plan-a', 'StopOnFailure', undefined);
  });
});
