import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JsonProjectRepository } from './JsonProjectRepository';
import {
  discoverProjectIdsFromData,
  isValidDiscoveredProjectId,
} from './projectDataPaths';

describe('projectDataPaths', () => {
  it('rejects lock artifact folder names', () => {
    expect(isValidDiscoveredProjectId('logs.json.lock')).toBe(false);
    expect(isValidDiscoveredProjectId('GPR_01')).toBe(true);
  });
});

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

  it('does not register audit or lock folders as projects', async () => {
    mkdirSync(join('data', 'apis', 'real-project'), { recursive: true });
    mkdirSync(join('data', 'apis', 'logs.json.lock'), { recursive: true });
    mkdirSync(join('data', 'audit'), { recursive: true });
    writeFileSync(join('data', 'audit', 'logs.json'), '[]');

    expect(discoverProjectIdsFromData()).toEqual(['real-project']);

    const repo = new JsonProjectRepository();
    const list = await repo.list();
    expect(list.map((p) => p.id)).toContain('real-project');
    expect(list.map((p) => p.id)).not.toContain('logs.json.lock');
  });

  it('delete removes registry entry and project data folders', async () => {
    mkdirSync(join('data', 'apis', 'to-delete'), { recursive: true });
    mkdirSync(join('data', 'environments', 'to-delete'), { recursive: true });
    const repo = new JsonProjectRepository();
    await repo.list();
    await repo.delete('to-delete');
    const list = await repo.list();
    expect(list.some((p) => p.id === 'to-delete')).toBe(false);
    expect(discoverProjectIdsFromData()).not.toContain('to-delete');
  });
});
