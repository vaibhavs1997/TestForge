import { describe, expect, it, vi } from 'vitest';
import { RefreshApiContract } from './RefreshApiContract';

describe('RefreshApiContract', () => {
  it('replays the stored original contract when sourceContract is available', async () => {
    const serviceRepository = {
      findById: vi.fn().mockResolvedValue({
        id: 'svc-1',
        projectId: 'proj-1',
        name: 'Inventory',
        sourceContract: {
          openapi: '3.0.0',
          info: { title: 'Inventory API' },
          paths: {},
        },
      }),
    } as any;
    const importApiContract = {
      execute: vi.fn().mockResolvedValue({
        servicesImported: 0,
        servicesUpdated: 1,
        operationsImported: 0,
        operationsUpdated: 0,
        operationsRemoved: 0,
        duplicatesSkipped: 0,
        warnings: [],
        detectedEnvironments: [],
      }),
    } as any;

    const result = await new RefreshApiContract(serviceRepository, importApiContract).execute('proj-1', 'svc-1');

    expect(result.refreshed).toBe(true);
    expect(result.refreshRequired).toBe(false);
    expect(importApiContract.execute).toHaveBeenCalledWith({
      projectId: 'proj-1',
      fileName: 'Inventory.openapi.json',
      content: JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Inventory API' },
        paths: {},
      }),
      preserveUnmatchedOperations: true,
    });
  });

  it('returns a refresh-required state when the original contract is unavailable', async () => {
    const serviceRepository = {
      findById: vi.fn().mockResolvedValue({
        id: 'svc-legacy',
        projectId: 'proj-1',
        name: 'Legacy API',
        sourceContract: null,
      }),
    } as any;
    const importApiContract = {
      execute: vi.fn(),
    } as any;

    const result = await new RefreshApiContract(serviceRepository, importApiContract).execute('proj-1', 'svc-legacy');

    expect(result.refreshed).toBe(false);
    expect(result.refreshRequired).toBe(true);
    expect(result.reason).toContain('Original contract unavailable');
    expect(importApiContract.execute).not.toHaveBeenCalled();
  });
});
