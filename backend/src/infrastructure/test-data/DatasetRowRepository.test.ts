import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatasetRowRepository } from './DatasetRowRepository.js';

describe('DatasetRowRepository reservations', () => {
  let cwd = ''; let dir = '';
  beforeEach(() => { cwd = process.cwd(); dir = mkdtempSync(join(tmpdir(), 'tf-data-')); process.chdir(dir); });
  afterEach(() => { process.chdir(cwd); rmSync(dir, { recursive: true, force: true }); });

  it('does not allocate the same test-data row to concurrent consumers', async () => {
    const repository = new DatasetRowRepository();
    await repository.create({ projectId: 'project', datasetId: 'dataset', values: { id: 'one' } });
    const reservations = await Promise.all([
      repository.reserveFirstAvailable('project', 'dataset', 'worker-a'),
      repository.reserveFirstAvailable('project', 'dataset', 'worker-b'),
    ]);
    expect(reservations.filter(Boolean)).toHaveLength(1);
    expect(reservations.find(Boolean)?.reservedBy).toMatch(/worker-[ab]/);
  });
});
