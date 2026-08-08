import { describe, expect, it, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { ExecutePlan } from './ExecutePlan';
import { EnvironmentEntity } from '../../domain/environment/EnvironmentEntity';
import { ExecutionRunEntity } from '../../domain/execution/ExecutionRunEntity';

vi.mock('axios', () => ({
  default: vi.fn(),
}));

const mockedAxios = vi.mocked(axios);

describe('ExecutePlan', () => {
  const plan = {
    id: 'plan-1',
    projectId: 'p1',
    requirementId: 'req-1',
    testDesignId: 'design-1',
    operationId: 'op-1',
    environmentId: 'env-1',
    datasetId: '',
    executionOrder: 1,
    prerequisiteDesignIds: [],
    runtimeBindings: [],
    requestTemplate: { method: 'GET', path: '/get' },
    assertions: [],
    cleanupSteps: [],
    status: 'Ready',
  };

  const environment = new EnvironmentEntity(
    'env-1',
    'p1',
    'dev',
    'https://example.test',
    '',
    null,
    {},
    30000,
    Date.now(),
    Date.now()
  );

  let executionRunRepository: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedAxios.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: {},
      data: { ok: true },
    } as any);

    executionRunRepository = {
      create: vi.fn(async (run: ExecutionRunEntity) => run),
      update: vi.fn(async (_id: string, run: ExecutionRunEntity) => run),
    };
  });

  it('executes a plan step and records a completed run', async () => {
    const executePlan = new ExecutePlan(
      executionRunRepository as any,
      {
        findByProject: vi.fn().mockResolvedValue([]),
        findById: vi.fn().mockResolvedValue(plan),
      } as any,
      { findById: vi.fn().mockResolvedValue({ id: 'req-1' }) } as any,
      { findByProject: vi.fn().mockResolvedValue([environment]) } as any,
      { findById: vi.fn() } as any,
      { findById: vi.fn().mockResolvedValue({ id: 'op-1', serviceId: 'svc-1', method: 'GET', path: '/get' }) } as any,
      { findByProjectAndOperation: vi.fn().mockResolvedValue([]) } as any,
      {} as any,
      { findById: vi.fn().mockResolvedValue({ assertionIds: [] }) } as any,
      { findById: vi.fn() } as any
    );

    const result = await executePlan.execute('plan-1');

    expect(mockedAxios).toHaveBeenCalled();
    expect(result.status).toBe('Completed');
    expect(executionRunRepository.create).toHaveBeenCalled();
    expect(executionRunRepository.update).toHaveBeenCalled();
  });
});
