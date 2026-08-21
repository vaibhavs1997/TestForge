import { describe, expect, it, vi } from 'vitest';
import { GenerateReport } from './GenerateReport.js';

function makeRun(overrides: Record<string, unknown> = {}) {
  return {
    id: 'run-1', projectId: 'project-1', requirementId: 'requirement-1', executionPlanId: 'plan-1', suiteId: 'suite-1',
    executionPlanIds: ['plan-a', 'plan-b'], dependencyGraph: [{ executionPlanId: 'plan-b', prerequisitePlanIds: ['plan-a'] }],
    status: 'Completed', context: { environmentId: 'env-1', baseUrl: 'http://example.test', environmentVariables: {}, datasetValues: {}, runtimeVariables: {}, responses: {}, headers: {} },
    stepResults: [], summary: { totalSteps: 0, passed: 0, failed: 0, skipped: 0, blocked: 0, duration: 1, validationPassed: 0, validationFailed: 0, validationWarnings: 0 },
    ...overrides,
  };
}

function createUseCase(run: any) {
  const repository = { findByExecutionRun: vi.fn().mockResolvedValue(null), create: vi.fn(async (report) => report) };
  const useCase = new GenerateReport(
    repository as any,
    { findById: vi.fn().mockResolvedValue(run) } as any,
    { findByProject: vi.fn().mockResolvedValue([{ id: 'env-1', name: 'Test', baseUrl: 'http://example.test' }]) } as any,
    { analyzeProject: vi.fn().mockResolvedValue([]) } as any,
  );
  return { useCase, repository };
}

describe('GenerateReport suite identity', () => {
  it('derives suite identity and dependency graph from the execution run', async () => {
    const run = makeRun();
    const { useCase } = createUseCase(run);
    const report: any = await useCase.generate('run-1');
    expect(report.suiteId).toBe('suite-1');
    expect(report.sections.executionPlansExecuted).toEqual(['plan-a', 'plan-b']);
    expect(report.sections.dependencyGraph).toEqual([{ executionPlanId: 'plan-b', prerequisitePlanIds: ['plan-a'] }]);
  });

  it('preserves individual-run behavior when the run has no suite', async () => {
    const { useCase } = createUseCase(makeRun({ suiteId: null, executionPlanIds: [], dependencyGraph: [] }));
    const report: any = await useCase.generate('run-1', null);
    expect(report.suiteId).toBeNull();
    expect(report.sections.executionPlansExecuted).toEqual(['plan-1']);
  });

  it('masks request evidence and runtime values in persisted reports', async () => {
    const run = makeRun({
      context: { environmentId: 'env-1', baseUrl: 'http://example.test', environmentVariables: {}, datasetValues: {}, runtimeVariables: { accessToken: 'secret' }, responses: {}, headers: {} },
      stepResults: [{ status: 'Passed', request: { headers: { Authorization: 'Bearer secret' } }, response: { data: { password: 'p@ss' } }, startedAt: 1, completedAt: 2 }],
    });
    const { useCase } = createUseCase(run);
    const report: any = await useCase.generate('run-1');
    expect(report.sections.runtimeVariablesCaptured.accessToken).toBe('[REDACTED]');
    expect(report.sections.stepResults[0].request.headers.Authorization).toBe('[REDACTED]');
    expect(report.sections.stepResults[0].response.data.password).toBe('[REDACTED]');
  });
});
