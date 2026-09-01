import { describe, expect, it, vi } from 'vitest';
import { TestSuiteController } from './TestSuiteController.js';

describe('TestSuiteController runnable suites', () => {
  it('reports low-confidence mappings without disabling an approved requirement suite', async () => {
    const plan = {
      id: 'plan-1',
      projectId: 'project-1',
      requirementId: 'requirement-1',
      testDesignId: 'design-1',
      operationId: 'operation-1',
      environmentId: 'environment-1',
      executionOrder: 1,
      status: 'Ready',
      requestTemplate: { method: 'GET' },
    };
    const controller = new TestSuiteController(
      { list: vi.fn().mockResolvedValue([]) } as any,
      {} as any,
      {} as any,
      { findById: vi.fn().mockResolvedValue(plan), findByRequirement: vi.fn().mockResolvedValue([plan]) } as any,
      { findDefault: vi.fn().mockResolvedValue(null) } as any,
      {
        findByProject: vi.fn().mockResolvedValue([{
          id: 'requirement-1', projectId: 'project-1', approvalStatus: 'Approved',
        }]),
        findById: vi.fn().mockResolvedValue({ id: 'requirement-1', approvalStatus: 'Approved' }),
      } as any,
      {} as any,
      {
        findByProject: vi.fn().mockResolvedValue([{
          id: 'environment-1', projectId: 'project-1', isDefault: true, tier: 'TEST', executionPolicy: null,
        }]),
      } as any,
      {
        findByProject: vi.fn().mockResolvedValue([]),
        findById: vi.fn().mockResolvedValue({
          id: 'design-1', operationId: 'operation-1', mappingProvenance: 'matcher', mappingState: 'review',
          mappingConfidence: 55, requestOverrides: {}, testCaseType: 'Positive', title: 'Health check',
        }),
      } as any,
    );
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };

    await controller.listRunnableSuites({ params: { projectId: 'project-1' } } as any, response as any);

    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({
        isRunnable: true,
        blocker: null,
        warning: expect.stringContaining('Low-confidence endpoint mapping'),
      })],
    }));
  });
});
