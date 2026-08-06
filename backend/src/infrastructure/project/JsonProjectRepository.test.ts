import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JsonProjectRepository } from './JsonProjectRepository';

describe('JsonProjectRepository', () => {
  let dir: string;
  let previousCwd: string;

  beforeEach(() => {
    previousCwd = process.cwd();
    dir = mkdtempSync(join(tmpdir(), 'testforge-projects-'));
    process.chdir(dir);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates and lists projects', async () => {
    const repo = new JsonProjectRepository();
    const created = await repo.create({
      name: 'Alpha',
      projectKey: 'alpha',
    });
    expect(created.id).toBeTruthy();
    const list = await repo.list();
    expect(list.some((p) => p.projectKey === 'alpha')).toBe(true);
  });
});
