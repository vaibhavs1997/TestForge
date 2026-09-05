import { describe, expect, it, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { ExecutePlan } from './ExecutePlan.js';
import { EnvironmentEntity } from '../../domain/environment/EnvironmentEntity.js';
import { ExecutionRunEntity } from '../../domain/execution/ExecutionRunEntity.js';
import { secureHttpExecutor } from '../../infrastructure/http/SecureHttpExecutor.js';

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
    vi.spyOn(secureHttpExecutor, 'execute').mockImplementation((config: any) => mockedAxios(config) as any);

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
      { findByDataset: vi.fn().mockResolvedValue([]) } as any,
      { findByProject: vi.fn().mockResolvedValue([]) } as any,
      { findById: vi.fn().mockResolvedValue({ assertionIds: [] }) } as any,
      { findById: vi.fn() } as any
    );

    const result = await executePlan.execute('plan-1');

    expect(mockedAxios).toHaveBeenCalled();
    expect(result.status).toBe('Completed');
    expect(executionRunRepository.create).toHaveBeenCalled();
    expect(executionRunRepository.update).toHaveBeenCalled();
  });

  it('executes each mapped test case with its own complete body', async () => {
    const plans = [
      {
        ...plan,
        id: 'plan-a',
        testDesignId: 'design-a',
        executionOrder: 1,
        requestTemplate: { method: 'POST', path: '/users', body: { email: 'invalid-a', role: 'admin' } },
      },
      {
        ...plan,
        id: 'plan-b',
        testDesignId: 'design-b',
        executionOrder: 2,
        requestTemplate: { method: 'POST', path: '/users', body: { email: 'invalid-b', role: 'viewer' } },
      },
    ];
    const designs = [
      { id: 'design-a', assertionIds: [], requestOverrides: { body: { email: 'invalid-a', role: 'admin' } }, mutationProvenance: { strategy: 'format-violation', location: 'body', fieldPath: '$.email', mutatedValue: 'invalid-a' } },
      { id: 'design-b', assertionIds: [], requestOverrides: { body: { email: 'invalid-b', role: 'viewer' } }, mutationProvenance: { strategy: 'format-violation', location: 'body', fieldPath: '$.email', mutatedValue: 'invalid-b' } },
    ];
    const executor = new ExecutePlan(
      executionRunRepository as any,
      {
        findByProject: vi.fn().mockResolvedValue(plans),
        findById: vi.fn(async (id: string) => plans.find((item) => item.id === id)),
        findByRequirement: vi.fn().mockResolvedValue(plans),
      } as any,
      { findById: vi.fn().mockResolvedValue({ id: 'req-1' }) } as any,
      { findByProject: vi.fn().mockResolvedValue([environment]) } as any,
      { findById: vi.fn() } as any,
      { findById: vi.fn().mockResolvedValue({ id: 'op-1', serviceId: 'svc-1', method: 'POST', path: '/users', sampleRequestBody: { email: 'imported@example.com', role: 'imported' } }) } as any,
      { findByProjectAndOperation: vi.fn().mockResolvedValue([]) } as any,
      {} as any,
      { findByDataset: vi.fn().mockResolvedValue([]) } as any,
      { findByProject: vi.fn().mockResolvedValue([]) } as any,
      { findById: vi.fn(async (id: string) => designs.find((item) => item.id === id) || { assertionIds: [] }) } as any,
      { findById: vi.fn() } as any,
    );

    await executor.executeCombined(['plan-a', 'plan-b']);

    expect(mockedAxios.mock.calls.map(([config]) => (config as any).data)).toEqual([
      { email: 'invalid-a', role: 'admin' },
      { email: 'invalid-b', role: 'viewer' },
    ]);
  });

  it('passes a negative scenario when its test design expects the returned 401 status', async () => {
    mockedAxios.mockResolvedValue({
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      data: { message: 'Incorrect username or password.' },
    } as any);
    const stalePlan = {
      ...plan,
      assertions: [{ type: 'status', operator: 'equals', path: '$.status', expected: 400 }],
    };
    const executePlan = new ExecutePlan(
      executionRunRepository as any,
      { findByProject: vi.fn().mockResolvedValue([]), findById: vi.fn().mockResolvedValue(stalePlan), findByRequirement: vi.fn().mockResolvedValue([stalePlan]) } as any,
      { findById: vi.fn().mockResolvedValue({ id: 'req-1' }) } as any,
      { findByProject: vi.fn().mockResolvedValue([environment]) } as any,
      { findById: vi.fn() } as any,
      { findById: vi.fn().mockResolvedValue({ id: 'op-1', serviceId: 'svc-1', method: 'GET', path: '/get' }) } as any,
      { findByProjectAndOperation: vi.fn().mockResolvedValue([]) } as any,
      {} as any,
      { findByDataset: vi.fn().mockResolvedValue([]) } as any,
      { findByProject: vi.fn().mockResolvedValue([]) } as any,
      { findById: vi.fn().mockResolvedValue({ id: 'design-1', assertionIds: [], expectedHttpStatus: 401 }) } as any,
      { findById: vi.fn() } as any,
    );

    const result = await executePlan.execute('plan-1');

    expect(result.status).toBe('Completed');
    expect(result.stepResults[0].status).toBe('Passed');
    expect(result.stepResults[0].assertions[0]).toMatchObject({ expected: 401, actual: 401, passed: true });
  });

  it('executes enabled reusable custom assertions as part of the normal attempt', async () => {
    const executePlan = new ExecutePlan(
      executionRunRepository as any,
      { findByProject: vi.fn().mockResolvedValue([]), findById: vi.fn().mockResolvedValue(plan), findByRequirement: vi.fn().mockResolvedValue([plan]) } as any,
      { findById: vi.fn().mockResolvedValue({ id: 'req-1' }) } as any,
      { findByProject: vi.fn().mockResolvedValue([environment]) } as any,
      { findById: vi.fn() } as any,
      { findById: vi.fn().mockResolvedValue({ id: 'op-1', serviceId: 'svc-1', method: 'GET', path: '/get' }) } as any,
      { findByProjectAndOperation: vi.fn().mockResolvedValue([]) } as any,
      {} as any, { findByDataset: vi.fn().mockResolvedValue([]) } as any, { findByProject: vi.fn().mockResolvedValue([]) } as any,
      { findById: vi.fn().mockResolvedValue({ assertionIds: [{ assertionId: 'custom-1', enabled: true }] }) } as any,
      { findById: vi.fn().mockResolvedValue({ id: 'custom-1', enabled: true, type: 'Custom Assertion', expression: '$.ok', expectedValue: { operator: 'equals', expected: false } }) } as any,
    );
    const result = await executePlan.execute('plan-1');
    expect(result.stepResults[0].status).toBe('Failed');
    expect(result.stepResults[0].validations[0].status).toBe('Failed');
  });

  it('cancels an active run idempotently without changing terminal runs', async () => {
    const running: any = { id: 'run-cancel', projectId: 'p1', status: 'Running' };
    const repository: any = { ...executionRunRepository, findById: vi.fn().mockResolvedValue(running) };
    repository.update.mockImplementation(async (_id: string, patch: any) => ({ ...running, ...patch }));
    const runner = new ExecutePlan(repository, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    await expect(runner.cancel('run-cancel')).resolves.toMatchObject({ status: 'Cancelled' });
    running.status = 'Cancelled';
    await expect(runner.cancel('run-cancel')).resolves.toBe(running);
    expect(repository.update).toHaveBeenCalledTimes(1);
  });

  it('uses a resolved secret in the outbound request but never persists that value in the run', async () => {
    const secretEnvironment = new EnvironmentEntity('env-1', 'p1', 'dev', 'https://example.test', '', null, { accessToken: { secretRef: 'token-1' } } as any, 30000, Date.now(), Date.now());
    const executor = new ExecutePlan(
      executionRunRepository as any,
      { findByProject: vi.fn().mockResolvedValue([]), findById: vi.fn().mockResolvedValue(plan), findByRequirement: vi.fn().mockResolvedValue([plan]) } as any,
      { findById: vi.fn().mockResolvedValue({ id: 'req-1' }) } as any,
      { findByProject: vi.fn().mockResolvedValue([secretEnvironment]) } as any,
      { findById: vi.fn() } as any,
      { findById: vi.fn().mockResolvedValue({ id: 'op-1', serviceId: 'svc-1', method: 'GET', path: '/get' }) } as any,
      { findByProjectAndOperation: vi.fn().mockResolvedValue([]) } as any,
      {} as any, { findByDataset: vi.fn().mockResolvedValue([]) } as any, { findByProject: vi.fn().mockResolvedValue([]) } as any,
      { findById: vi.fn().mockResolvedValue({ assertionIds: [] }) } as any, { findById: vi.fn() } as any,
      undefined, undefined, undefined, undefined,
      { get: vi.fn().mockResolvedValue('actual-token'), metadata: vi.fn().mockResolvedValue({projectId:'p1'}) } as any,
    );
    await executor.execute('plan-1');
    expect((mockedAxios.mock.calls[0][0] as any).headers.Authorization).toBe('Bearer actual-token');
    expect(JSON.stringify(executionRunRepository.create.mock.calls)).not.toContain('actual-token');
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
      { findByDataset: vi.fn().mockResolvedValue([]) } as any,
      { findByProject: vi.fn().mockResolvedValue([]) } as any,
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
      { findByDataset: vi.fn().mockResolvedValue([]) } as any,
      { findByProject: vi.fn().mockResolvedValue([]) } as any,
      { findById: vi.fn().mockResolvedValue({ assertionIds: [] }) } as any,
      { findById: vi.fn() } as any,
      undefined,
      undefined,
      { findById: vi.fn().mockResolvedValue({ id: 'svc-1', name: 'API', baseUrl: 'https://example.test' }) } as any,
    );
    const result = await executor.execute('plan-1');
    expect(result.status).toBe('Completed');
  });

  it('uses a scheduled environment override and records it in the suite snapshot', async () => {
    const scheduledEnvironment = new EnvironmentEntity(
      'env-scheduled', 'p1', 'scheduled', 'https://scheduled.example.test', '', null, {}, 30000, Date.now(), Date.now(),
    );
    const executor = new ExecutePlan(
      executionRunRepository as any,
      { findByProject: vi.fn().mockResolvedValue([plan]), findById: vi.fn().mockResolvedValue(plan), findByRequirement: vi.fn().mockResolvedValue([plan]) } as any,
      { findById: vi.fn().mockResolvedValue({ id: 'req-1' }) } as any,
      { findByProject: vi.fn().mockResolvedValue([environment, scheduledEnvironment]) } as any,
      { findById: vi.fn() } as any,
      { findById: vi.fn().mockResolvedValue({ id: 'op-1', serviceId: 'svc-1', method: 'GET', path: '/get' }) } as any,
      { findByProjectAndOperation: vi.fn().mockResolvedValue([]) } as any,
      {} as any,
      { findByDataset: vi.fn().mockResolvedValue([]) } as any,
      { findByProject: vi.fn().mockResolvedValue([]) } as any,
      { findById: vi.fn().mockResolvedValue({ assertionIds: [] }) } as any,
      { findById: vi.fn() } as any,
    );

    const result = await executor.executeCombined(['plan-1'], 'StopOnFailure', undefined, 'suite-1', { suite: { id: 'suite-1' } }, 'env-scheduled');

    expect(result.context.environmentId).toBe('env-scheduled');
    expect(result.suiteSnapshot).toMatchObject({
      environment: { id: 'env-scheduled', name: 'scheduled', baseUrl: 'https://scheduled.example.test', source: 'schedule' },
    });
  });

  it('uses injected column and runtime-variable repositories for generated and runtime mappings', async () => {
    const columnRepository = { findByDataset: vi.fn().mockResolvedValue([{ name: 'email', dataType: 'email' }]) };
    const runtimeVariableRepository = { findByProject: vi.fn().mockResolvedValue([{ name: 'accountId', defaultValue: 'account-1' }]) };
    const mappings = [
      { fieldPath: 'email', sourceType: 'Generated Value', datasetId: 'dataset-1', datasetColumn: 'email' },
      { fieldPath: 'accountId', sourceType: 'Runtime Variable', runtimeField: 'accountId' },
    ];
    const executor = new ExecutePlan(
      executionRunRepository as any,
      { findByProject: vi.fn().mockResolvedValue([plan]), findById: vi.fn().mockResolvedValue(plan), findByRequirement: vi.fn().mockResolvedValue([plan]) } as any,
      { findById: vi.fn().mockResolvedValue({ id: 'req-1' }) } as any,
      { findByProject: vi.fn().mockResolvedValue([environment]) } as any,
      { findById: vi.fn() } as any,
      { findById: vi.fn().mockResolvedValue({ id: 'op-1', serviceId: 'svc-1', method: 'GET', path: '/get' }) } as any,
      { findByProjectAndOperation: vi.fn().mockResolvedValue(mappings) } as any,
      {} as any,
      columnRepository as any,
      runtimeVariableRepository as any,
      { findById: vi.fn().mockResolvedValue({ assertionIds: [] }) } as any,
      { findById: vi.fn() } as any,
    );

    await executor.execute('plan-1');

    expect(columnRepository.findByDataset).toHaveBeenCalledWith('dataset-1');
    expect(runtimeVariableRepository.findByProject).toHaveBeenCalledWith('p1');
  });

  it('surfaces test-data repository failures as a clear execution error', async () => {
    const executor = new ExecutePlan(
      executionRunRepository as any,
      { findByProject: vi.fn().mockResolvedValue([plan]), findById: vi.fn().mockResolvedValue(plan), findByRequirement: vi.fn().mockResolvedValue([plan]) } as any,
      { findById: vi.fn().mockResolvedValue({ id: 'req-1' }) } as any,
      { findByProject: vi.fn().mockResolvedValue([environment]) } as any,
      { findById: vi.fn() } as any,
      { findById: vi.fn().mockResolvedValue({ id: 'op-1', serviceId: 'svc-1', method: 'GET', path: '/get' }) } as any,
      { findByProjectAndOperation: vi.fn().mockResolvedValue([{ fieldPath: 'email', sourceType: 'Generated Value', datasetId: 'dataset-1', datasetColumn: 'email' }]) } as any,
      {} as any,
      { findByDataset: vi.fn().mockRejectedValue(new Error('column store unavailable')) } as any,
      { findByProject: vi.fn().mockResolvedValue([]) } as any,
      { findById: vi.fn().mockResolvedValue({ assertionIds: [] }) } as any,
      { findById: vi.fn() } as any,
    );

    await expect(executor.execute('plan-1')).rejects.toThrow(
      'Test data resolution failed before execution: Unable to resolve Generated Value for field "email": column store unavailable',
    );
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
      { findByDataset: vi.fn().mockResolvedValue([]) } as any,
      { findByProject: vi.fn().mockResolvedValue([]) } as any,
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

  it('records an unresolved endpoint mapping in the run instead of throwing a server error', async () => {
    const unresolvedPlan = { ...plan, operationId: '' };
    const { executor, runs } = buildExecutor([unresolvedPlan], [{ id: 'design-1', assertionIds: [] }]);

    const result = await executor.execute('plan-1');

    expect(result.stepResults).toHaveLength(1);
    expect(result.stepResults[0]).toMatchObject({
      status: 'Blocked',
      error: 'Endpoint mapping is unresolved. No request was sent; map this test case to an endpoint and run it again.',
    });
    expect(mockedAxios).not.toHaveBeenCalled();
    expect(runs.update).toHaveBeenCalled();
  });
});
