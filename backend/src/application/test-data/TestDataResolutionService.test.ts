import { describe, expect, it, vi } from 'vitest';
import { TestDataResolutionService } from './TestDataResolutionService.js';

interface RepositoryOverrides {
  datasetRows?: Record<string, unknown>;
  datasets?: Record<string, unknown>;
  columns?: Record<string, unknown>;
  runtimeVariables?: Record<string, unknown>;
}

function createService(overrides: RepositoryOverrides = {}) {
  return new TestDataResolutionService(
    { findByProjectAndOperation: vi.fn() } as any,
    ({ list: vi.fn(), ...overrides.datasetRows } as any),
    ({ findById: vi.fn(), ...overrides.datasets } as any),
    ({ findByDataset: vi.fn(), ...overrides.columns } as any),
    ({ findByProject: vi.fn(), ...overrides.runtimeVariables } as any),
    {} as any,
  );
}

const context = {
  runtimeVariables: {},
  environmentVariables: {},
  sequentialPositions: new Map<string, number>(),
};

describe('TestDataResolutionService failure messages', () => {
  it.each([
    ['Generated Value', { datasetId: 'dataset-1', datasetColumn: 'email' }, { columns: { findByDataset: vi.fn().mockRejectedValue(new Error('column store unavailable')) } }, 'column store unavailable'],
    ['Dataset Row', { datasetId: 'dataset-1', datasetColumn: 'email' }, { datasets: { findById: vi.fn().mockRejectedValue(new Error('dataset store unavailable')) } }, 'dataset store unavailable'],
    ['Runtime Variable', { runtimeField: 'accountId' }, { runtimeVariables: { findByProject: vi.fn().mockRejectedValue(new Error('runtime variable store unavailable')) } }, 'runtime variable store unavailable'],
  ])('labels %s repository failures with mapping context', async (sourceType, fields, repositories, detail) => {
    const service = createService(repositories as RepositoryOverrides);
    const mapping = { fieldPath: 'targetField', sourceType, ...fields } as any;

    await expect(service.resolveMapping(mapping, context, 'project-1')).rejects.toThrow(
      `Unable to resolve ${sourceType} for field "targetField": ${detail}`,
    );
  });
});
