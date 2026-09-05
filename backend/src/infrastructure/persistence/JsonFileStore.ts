// JSON persistence: exclusive locks, fail-closed reads, and atomic replacement.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import lockfile from 'proper-lockfile';

const pendingFiles = new Map<string, Promise<unknown>>();

async function withFileLock<T>(filePath: string, fn: () => T | Promise<T>): Promise<T> {
  const target = path.resolve(filePath);
  const previous = pendingFiles.get(target) || Promise.resolve();
  const operation = previous.catch(() => undefined).then(async () => {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const release = await lockfile.lock(target, {
      realpath: false,
      retries: { retries: 5, minTimeout: 50, maxTimeout: 500 },
    });
    try { return await fn(); } finally { await release(); }
  });
  pendingFiles.set(target, operation);
  try { return await operation; }
  finally { if (pendingFiles.get(target) === operation) pendingFiles.delete(target); }
}

function readExisting<T>(filePath: string, defaultValue: T): T {
  let raw: string;
  try { raw = fs.readFileSync(filePath, 'utf-8'); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return defaultValue;
    throw error;
  }
  try { return JSON.parse(raw.replace(/^\uFEFF/, '')) as T; }
  catch { throw new Error('Persistence file contains invalid JSON'); }
}

/** Atomic replacement; callers must serialize read-modify-write operations. */
export function writeJsonFileSyncAtomic<T>(filePath: string, data: T): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const serialized = JSON.stringify(data, null, 2);
  const temporary = path.join(path.dirname(filePath), '.' + path.basename(filePath) + '.' + randomUUID() + '.tmp');
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(descriptor, serialized, 'utf-8');
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporary, filePath);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

/** Missing files use the default; corrupt files and lock failures are errors. */
export async function readJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
  return withFileLock(filePath, () => readExisting(filePath, defaultValue));
}

export async function updateJsonArray<T>(
  filePath: string, defaultValue: T[], updater: (current: T[]) => T[] | Promise<T[]>,
): Promise<T[]> {
  return withFileLock(filePath, async () => {
    const current = readExisting(filePath, defaultValue);
    if (!Array.isArray(current)) throw new Error('Persistence file must contain an array');
    const next = await updater(current);
    writeJsonFileSyncAtomic(filePath, next);
    return next;
  });
}

export async function readJsonArray<T>(filePath: string): Promise<T[]> {
  const result = await readJsonFile<T[]>(filePath, []);
  if (!Array.isArray(result)) throw new Error('Persistence file must contain an array');
  return result;
}

export async function writeJsonArray<T>(filePath: string, data: T[]): Promise<void> {
  await writeJsonFile(filePath, data);
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await withFileLock(filePath, () => writeJsonFileSyncAtomic(filePath, data));
}
