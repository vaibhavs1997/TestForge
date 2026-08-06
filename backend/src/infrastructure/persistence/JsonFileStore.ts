// JsonFileStore - Locked read/write for JSON persistence files
import * as fs from 'fs';
import * as path from 'path';
import lockfile from 'proper-lockfile';

const DEFAULT_EMPTY: unknown[] = [];

function ensureParentDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function ensureLockTarget(filePath: string): string {
  ensureParentDir(filePath);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  const stub = `${filePath}.lockstub`;
  if (!fs.existsSync(stub)) {
    fs.writeFileSync(stub, '');
  }
  return stub;
}

async function withFileLock<T>(filePath: string, fn: () => T | Promise<T>): Promise<T> {
  const lockTarget = ensureLockTarget(filePath);
  const release = await lockfile.lock(lockTarget, {
    retries: {
      retries: 5,
      minTimeout: 50,
      maxTimeout: 500,
    },
  });
  try {
    return await fn();
  } finally {
    await release();
  }
}

/** Read JSON from disk; returns `defaultValue` when the file is missing or empty. */
export async function readJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
  return withFileLock(filePath, () => {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf-8').trim();
    if (!raw) {
      return defaultValue;
    }
    return JSON.parse(raw) as T;
  });
}

/** Persist JSON atomically under an exclusive file lock. */
export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await withFileLock(filePath, () => {
    ensureParentDir(filePath);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  });
}

/** Convenience for array-backed repository files. */
export async function readJsonArray<T>(filePath: string): Promise<T[]> {
  return readJsonFile<T[]>(filePath, DEFAULT_EMPTY as T[]);
}

export async function writeJsonArray<T>(filePath: string, data: T[]): Promise<void> {
  await writeJsonFile(filePath, data);
}
