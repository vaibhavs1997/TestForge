import { describe, expect, it, vi } from 'vitest';
import { RunAIPipeline } from './RunAIPipeline.js';

describe('RunAIPipeline', () => {
  it('runs all stages with mocked AI use cases', async () => {
    const requirementRepository = {
      findByProject: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(undefined),
    };

    const generateRequirementsWithAI = {
      execute: vi.fn()
        .mockResolvedValueOnce({ providerUsed: 'prov-1' })
        .mockResolvedValueOnce({ requirements: [{ id: 'req-1' }] }),
    };

    const generateTestStrategyWithAI = {
      execute: vi.fn().mockResolvedValue({ strategy: { id: 'strat-1' } }),
    };

    const generateTestDesignWithAI = {
      execute: vi.fn().mockResolvedValue({ designs: [{ id: 'design-1' }] }),
    };

    const generateAssertionsWithAI = {
      execute: vi.fn().mockResolvedValue({ assertions: [{ id: 'assert-1' }] }),
    };

    const generateExecutionPlanWithAI = {
      execute: vi.fn().mockResolvedValue({ plans: [{ id: 'plan-1' }] }),
    };

    const generateTestSuiteWithAI = {
      execute: vi.fn().mockResolvedValue({ suites: [{ id: 'suite-1' }] }),
    };

    const pipeline = new RunAIPipeline(
      requirementRepository as any,
      generateRequirementsWithAI as any,
      generateTestStrategyWithAI as any,
      generateTestDesignWithAI as any,
      generateAssertionsWithAI as any,
      generateExecutionPlanWithAI as any,
      generateTestSuiteWithAI as any
    );

    const result = await pipeline.execute({
      projectId: 'p1',
      providerId: 'prov-1',
      autoApprove: true,
    });

    expect(result.status).toBe('Completed');
    expect(result.requirementIds).toContain('req-1');
    expect(result.strategyIds).toContain('strat-1');
    expect(result.designIds).toContain('design-1');
    expect(generateRequirementsWithAI.execute).toHaveBeenCalled();
    expect(requirementRepository.update).toHaveBeenCalled();
  });
});
