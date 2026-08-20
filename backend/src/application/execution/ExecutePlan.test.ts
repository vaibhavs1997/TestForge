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
        findByRequirement: vi.fn().mockResolvedValue([plan]),
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

  it('recovers requirement identity for legacy plans missing requirementId', async () => {
    const legacyPlan = { ...plan, requirementId: undefined };
    const executor = new ExecutePlan(
      executionRunRepository as any,
      { findByProject: vi.fn().mockResolvedValue([]), findById: vi.fn().mockResolvedValue(legacyPlan), findByRequirement: vi.fn().mockResolvedValue([legacyPlan]) } as any,
      { findById: vi.fn().mockResolvedValue({ id: 'req-1' }) } as any,
      { findByProject: vi.fn().mockResolvedValue([environment]) } as any,
      { findById: vi.fn() } as any,
      { findById: vi.fn().mockResolvedValue({ id: 'op-1', serviceId: 'svc-1', method: 'GET', path: '/get' }) } as any,
      { findByProjectAndOperation: vi.fn().mockResolvedValue([]) } as any,
      {} as any,
      { findById: vi.fn().mockResolvedValue({ id: 'design-1', requirementId: 'req-1', assertionIds: [] }) } as any,
      { findById: vi.fn() } as any,
    );
    const result = await executor.execute('plan-1');
    expect(result.status).toBe('Completed');
  });

  it('uses the mapped API service base URL when no environment is configured', async () => {
    const executor = new ExecutePlan(
      executionRunRepository as any,
      { findByProject: vi.fn().mockResolvedValue([]), findById: vi.fn().mockResolvedValue(plan), findByRequirement: vi.fn().mockResolvedValue([plan]) } as any,
      { findById: vi.fn().mockResolvedValue({ id: 'req-1' }) } as any,
      { findByProject: vi.fn().mockResolvedValue([]) } as any,
      { findById: vi.fn() } as any,
      { findById: vi.fn().mockResolvedValue({ id: 'op-1', serviceId: 'svc-1', method: 'GET', path: '/get' }) } as any,
      { findByProjectAndOperation: vi.fn().mockResolvedValue([]) } as any,
      {} as any,
      { findById: vi.fn().mockResolvedValue({ assertionIds: [] }) } as any,
      { findById: vi.fn() } as any,
      undefined,
      undefined,
      { findById: vi.fn().mockResolvedValue({ id: 'svc-1', name: 'API', baseUrl: 'https://example.test' }) } as any,
    );
    const result = await executor.execute('plan-1');
    expect(result.status).toBe('Completed');
  });

  function buildExecutor(plans: any[], designs: any[], responses: any[] = [{ id: 'value-a' }, { ok: true }]) {
    let responseIndex = 0;
    mockedAxios.mockImplementation(async (config: any) => ({ status: 200, statusText: 'OK', headers: {}, data: responses[responseIndex++] } as any));
    const runs = { create: vi.fn(async (run: ExecutionRunEntity) => run), update: vi.fn(async (_id: string, run: ExecutionRunEntity) => run) };
    const executor = new ExecutePlan(
      runs as any,
      { findByProject: vi.fn().mockResolvedValue([]), findById: vi.fn(async (id: string) => plans.find((item) => item.id === id)), findByRequirement: vi.fn().mockResolvedValue(plans) } as any,
      { findById: vi.fn().mockResolvedValue({ id: 'req-1' }) } as any,
      { findByProject: vi.fn().mockResolvedValue([environment]) } as any,
      { findById: vi.fn() } as any,
      { findById: vi.fn(async (id: string) => ({ id, serviceId: 'svc-1', method: 'POST', path: `/${id}` })) } as any,
      { findByProjectAndOperation: vi.fn().mockResolvedValue([]) } as any,
      { findById: vi.fn(async (id: string) => designs.find((item) => item.id === id) || { assertionIds: [] }) } as any,
      { findById: vi.fn().mockResolvedValue({ assertionIds: [] }) } as any,
      { findById: vi.fn() } as any,
    );
    return { executor, runs };
  }

  it('executes A before B and propagates a response value into the target body', async () => {
    const plans = [
      { ...plan, id: 'plan-a', testDesignId: 'design-a', operationId: 'a', executionOrder: 1, prerequisiteDesignIds: [], requestTemplate: { method: 'POST', path: '/a', body: {} }, runtimeBindings: [] },
      { ...plan, id: 'plan-b', testDesignId: 'design-b', operationId: 'b', executionOrder: 2, prerequisiteDesignIds: ['design-a'], requestTemplate: { method: 'POST', path: '/b', body: {} }, dependencies: [{ sourceOperationId: 'a', sourceResponsePath: '$.id', targetOperationId: 'b', targetRequestPath: '$.body.parentId', evidence: ['test'] }], runtimeBindings: [] },
    ];
    const { executor } = buildExecutor(plans, [{ id: 'design-a', assertionIds: [] }, { id: 'design-b', assertionIds: [] }]);
    const result = await executor.execute('plan-b');
    expect(result.stepResults.map((step) => step.status)).toEqual(['Passed', 'Passed']);
    expect(mockedAxios.mock.calls[1][0]).toMatchObject({ data: { parentId: 'value-a' } });
  });

  it('blocks a dependent when a prerequisite fails and does not call the dependent', async () => {
    const plans = [
      { ...plan, id: 'plan-a', testDesignId: 'design-a', operationId: 'a', executionOrder: 1, prerequisiteDesignIds: [], requestTemplate: { method: 'POST', path: '/a' }, assertions: [{ type: 'status', operator: 'equals', path: '$.status', expected: 200 }] },
      { ...plan, id: 'plan-b', testDesignId: 'design-b', operationId: 'b', executionOrder: 2, prerequisiteDesignIds: ['design-a'], requestTemplate: { method: 'POST', path: '/b' } },
    ];
    const { executor } = buildExecutor(plans, [{ id: 'design-a', assertionIds: [] }, { id: 'design-b', assertionIds: [] }]);
    mockedAxios.mockImplementation(async () => ({ status: 500, statusText: 'Error', headers: {}, data: { error: true } } as any));
    const result = await executor.execute('plan-b', 'ContinueOnFailure');
    expect(result.stepResults.map((step) => step.status)).toEqual(['Failed', 'Blocked']);
    expect(mockedAxios).toHaveBeenCalledTimes(1);
  });

  it('blocks when the source response value is missing instead of injecting undefined', async () => {
    const plans = [
      { ...plan, id: 'plan-a', testDesignId: 'design-a', operationId: 'a', executionOrder: 1, prerequisiteDesignIds: [], requestTemplate: { method: 'POST', path: '/a' }, assertions: [{ type: 'status', operator: 'equals', path: '$.status', expected: 200 }] },
      { ...plan, id: 'plan-b', testDesignId: 'design-b', operationId: 'b', executionOrder: 2, prerequisiteDesignIds: ['design-a'], requestTemplate: { method: 'POST', path: '/b', body: {} }, dependencies: [{ sourceOperationId: 'a', sourceResponsePath: '$.missing', targetOperationId: 'b', targetRequestPath: '$.body.id', evidence: ['test'] }] },
    ];
    const { executor } = buildExecutor(plans, [{ id: 'design-a', assertionIds: [] }, { id: 'design-b', assertionIds: [] }], [{ ok: true }]);
    const result = await executor.execute('plan-b');
    expect(result.stepResults.map((step) => step.status)).toEqual(['Passed', 'Blocked']);
    expect(mockedAxios).toHaveBeenCalledTimes(1);
  });

  it('propagates values through an A to B to C chain', async () => {
    const plans = [
      { ...plan, id: 'plan-a', testDesignId: 'design-a', operationId: 'a', executionOrder: 1, prerequisiteDesignIds: [], requestTemplate: { method: 'POST', path: '/a' } },
      { ...plan, id: 'plan-b', testDesignId: 'design-b', operationId: 'b', executionOrder: 2, prerequisiteDesignIds: ['design-a'], requestTemplate: { method: 'POST', path: '/b', body: {} }, dependencies: [{ sourceOperationId: 'a', sourceResponsePath: '$.id', targetOperationId: 'b', targetRequestPath: '$.body.fromA', evidence: ['test'] }] },
      { ...plan, id: 'plan-c', testDesignId: 'design-c', operationId: 'c', executionOrder: 3, prerequisiteDesignIds: ['design-b'], requestTemplate: { method: 'POST', path: '/c', body: {} }, dependencies: [{ sourceOperationId: 'b', sourceResponsePath: '$.id', targetOperationId: 'c', targetRequestPath: '$.body.fromB', evidence: ['test'] }] },
    ];
    const { executor } = buildExecutor(plans, plans.map((item) => ({ id: item.testDesignId, assertionIds: [] })), [{ id: 'b-value' }, { id: 'c-value' }, { ok: true }]);
    const result = await executor.execute('plan-c');
    expect(result.stepResults.map((step) => step.status)).toEqual(['Passed', 'Passed', 'Passed']);
    expect(mockedAxios.mock.calls[1][0]).toMatchObject({ data: { fromA: 'b-value' } });
    expect(mockedAxios.mock.calls[2][0]).toMatchObject({ data: { fromB: 'c-value' } });
  });

  it('requires all available prerequisites before executing a target', async () => {
    const plans = [
      { ...plan, id: 'plan-a', testDesignId: 'design-a', operationId: 'a', executionOrder: 1, prerequisiteDesignIds: [], requestTemplate: { method: 'POST', path: '/a' }, assertions: [{ type: 'status', operator: 'equals', path: '$.status', expected: 200 }] },
      { ...plan, id: 'plan-b', testDesignId: 'design-b', operationId: 'b', executionOrder: 2, prerequisiteDesignIds: [], requestTemplate: { method: 'POST', path: '/b' } },
      { ...plan, id: 'plan-c', testDesignId: 'design-c', operationId: 'c', executionOrder: 3, prerequisiteDesignIds: ['design-a', 'design-b'], requestTemplate: { method: 'POST', path: '/c' } },
    ];
    const { executor } = buildExecutor(plans, plans.map((item) => ({ id: item.testDesignId, assertionIds: [] })));
    let calls = 0;
    mockedAxios.mockImplementation(async () => ({ status: calls++ === 0 ? 500 : 200, statusText: 'OK', headers: {}, data: {} } as any));
    const result = await executor.execute('plan-c', 'ContinueOnFailure');
    expect(result.stepResults.map((step) => step.status)).toEqual(['Failed', 'Passed', 'Blocked']);
    expect(mockedAxios).toHaveBeenCalledTimes(2);
  });

  it('keeps an independent plan as a single-step execution', async () => {
    const independent = { ...plan, requestTemplate: { method: 'GET', path: '/independent' }, dependencies: [] };
    const { executor } = buildExecutor([independent], [{ id: 'design-1', assertionIds: [] }]);
    const result = await executor.execute('plan-1');
    expect(result.stepResults).toHaveLength(1);
    expect(result.stepResults[0].status).toBe('Passed');
  });
});
