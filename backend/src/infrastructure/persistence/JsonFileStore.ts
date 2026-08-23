// JsonFileStore - Locked read/write for JSON persistence files
import * as fs from 'fs';
import * as path from 'path';
import lockfile from 'proper-lockfile';


function ensureParentDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function ensureLockTarget(filePath: string): string {
  ensureParentDir(filePath);
  return filePath;
}

async function withFileLock<T>(filePath: string, fn: () => T | Promise<T>): Promise<T> {
  const lockTarget = ensureLockTarget(filePath);
  const release = await lockfile.lock(lockTarget, {
    realpath: false,
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

/** Read JSON from disk; returns `defaultValue` when the file is missing, empty, or invalid. */
export async function readJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
  const readOnce = (): T => {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf-8').trim();
    if (!raw) {
      return defaultValue;
    }
    try {
      return JSON.parse(raw.replace(/^\uFEFF/, '')) as T;
    } catch (parseErr) {
      console.error(`[JsonFileStore] Invalid JSON in ${filePath}`, parseErr);
      return defaultValue;
    }
  };

  try {
    return await withFileLock(filePath, () => readOnce());
  } catch (lockErr) {
    console.warn(`[JsonFileStore] Lock failed for ${filePath}, reading without lock`, lockErr);
    return readOnce();
  }
}

/** Read-modify-write an array file under a single lock (avoids lost updates). */
export async function updateJsonArray<T>(
  filePath: string,
  defaultValue: T[],
  updater: (current: T[]) => T[],
): Promise<T[]> {
  const mutate = (): T[] => {
    let current = defaultValue;
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8').trim();
      if (raw) {
        try {
          current = JSON.parse(raw.replace(/^\uFEFF/, '')) as T[];
        } catch (parseErr) {
          console.error(`[JsonFileStore] Invalid JSON in ${filePath} during update`, parseErr);
          current = defaultValue;
        }
      }
    }
    const next = updater(current);
    ensureParentDir(filePath);
    fs.writeFileSync(filePath, JSON.stringify(next, null, 2), 'utf-8');
    return next;
  };

  try {
    return await withFileLock(filePath, mutate);
  } catch (lockErr) {
    console.warn(`[JsonFileStore] Lock failed for ${filePath} during update, retrying without lock`, lockErr);
    return mutate();
  }
}

/** Convenience for array-backed repository files. */
export async function readJsonArray<T>(filePath: string): Promise<T[]> {
  // Never share a mutable default between repositories. A shared empty array
  // lets the first `push` performed by one missing-file repository leak into
  // every other repository that subsequently reads a missing file.
  return readJsonFile<T[]>(filePath, []);
}

export async function writeJsonArray<T>(filePath: string, data: T[]): Promise<void> {
  await writeJsonFile(filePath, data);
}

/** Persist JSON atomically under an exclusive file lock. */
export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  const writeOnce = () => {
    ensureParentDir(filePath);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  };
  try {
    await withFileLock(filePath, writeOnce);
  } catch (lockErr) {
    console.warn(`[JsonFileStore] Lock failed for ${filePath} during write, retrying without lock`, lockErr);
    writeOnce();
  }
}
