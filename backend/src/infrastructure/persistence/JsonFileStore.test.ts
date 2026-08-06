import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readJsonFile, writeJsonFile } from './JsonFileStore';

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
});
