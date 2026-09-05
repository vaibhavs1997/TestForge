import path from 'node:path';
import lockfile from 'proper-lockfile';

/** One server or offline maintenance process may own this single-node store. */
export async function acquireRuntimeStorageLock(): Promise<() => Promise<void>> {
  return lockfile.lock(path.resolve('data') + '.runtime', { realpath: false, retries: 0 });
}
