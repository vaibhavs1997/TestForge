import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EnvironmentRepository } from '../../infrastructure/environment/EnvironmentRepository';

describe('EnvironmentRepository upsertManyByName', () => {
  let previousCwd: string;
  let tempDir: string;

  beforeEach(() => {
    previousCwd = process.cwd();
    tempDir = mkdtempSync(join(tmpdir(), 'testforge-env-'));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates and updates environments in one atomic write', async () => {
    const repo = new EnvironmentRepository();
    const first = await repo.upsertManyByName('proj-1', [
      { name: 'Staging', baseUrl: 'https://a.example.com', variables: { k: '1' } },
    ]);
    expect(first.created).toBe(1);
    expect(first.updated).toBe(0);

    const second = await repo.upsertManyByName('proj-1', [
      { name: 'Staging', baseUrl: 'https://b.example.com', variables: { k: '2' } },
      { name: 'Dev', baseUrl: 'https://dev.example.com' },
    ]);
    expect(second.created).toBe(1);
    expect(second.updated).toBe(1);

    const listed = await repo.findByProject('proj-1');
    expect(listed).toHaveLength(2);
    const staging = listed.find((e) => e.name === 'Staging');
    expect(staging?.baseUrl).toBe('https://b.example.com');
    expect(staging?.variables).toEqual({ k: '2' });
  });
});
