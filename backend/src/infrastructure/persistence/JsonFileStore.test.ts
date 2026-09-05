import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import lockfile from 'proper-lockfile';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readJsonArray, readJsonFile, writeJsonArray, writeJsonFile, updateJsonArray } from './JsonFileStore.js';

describe('JsonFileStore', () => {
  let dir: string;
  let previousCwd: string;

  beforeEach(() => {
    previousCwd = process.cwd();
    dir = mkdtempSync(join(tmpdir(), 'testforge-json-'));
    process.chdir(dir);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates parent dirs and round-trips JSON without lock stub files', async () => {
    const filePath = join('data', 'demo', 'store.json');
    await writeJsonFile(filePath, { count: 1 });
    const value = await readJsonFile(filePath, { count: 0 });
    expect(value).toEqual({ count: 1 });
  });

  it('returns default when file is missing', async () => {
    const value = await readJsonFile('missing.json', ['empty']);
    expect(value).toEqual(['empty']);
  });

  it('returns a fresh empty array for every missing persistence file', async () => {
    const environments = await readJsonArray<{ kind: string }>(join(dir, 'environments.json'));
    const plans = await readJsonArray<{ kind: string }>(join(dir, 'plans.json'));
    environments.push({ kind: 'environment' });
    await writeJsonArray(join(dir, 'environments.json'), environments);
    expect(plans).toEqual([]);
    expect(await readJsonArray(join(dir, 'plans.json'))).toEqual([]);
  });
});

// These regressions exercise disk behavior, including competing writers.
describe('JSON persistence failure handling', () => {
  it('does not retry a throwing updater or change committed data', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'json-failure-'));
    const file = join(directory, 'items.json');
    try {
      await writeJsonArray(file, [1]);
      let calls = 0;
      await expect(updateJsonArray(file, [], () => { calls++; throw new Error('updater failed'); })).rejects.toThrow('updater failed');
      expect(calls).toBe(1);
      expect(await readJsonArray(file)).toEqual([1]);
      writeFileSync(file, '{corrupt');
      await expect(updateJsonArray(file, [], () => [2])).rejects.toThrow('invalid JSON');
      expect(readFileSync(file, 'utf8')).toBe('{corrupt');
    } finally { rmSync(directory, {recursive: true, force: true}); }
  });
  it('never writes unlocked when acquisition fails', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'json-lock-failure-'));
    const file = join(directory, 'items.json');
    try {
      await writeJsonArray(file, [1]);
      const lock = vi.spyOn(lockfile, 'lock').mockRejectedValueOnce(new Error('locked by another process'));
      await expect(writeJsonArray(file, [2])).rejects.toThrow('locked by another process');
      lock.mockRestore();
      expect(await readJsonArray(file)).toEqual([1]);
    } finally { vi.restoreAllMocks(); rmSync(directory, {recursive:true,force:true}); }
  });
  it('keeps every concurrently appended record', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'json-concurrent-'));
    const file = join(directory, 'items.json');
    try {
      await Promise.all(Array.from({length: 5}, (_, id) => updateJsonArray<number>(file, [], values => [...values, id])));
      expect((await readJsonArray<number>(file)).sort()).toEqual([0,1,2,3,4]);
    } finally { rmSync(directory, {recursive: true, force: true}); }
  });
});
