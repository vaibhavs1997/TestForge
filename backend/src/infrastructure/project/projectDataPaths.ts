import * as fs from 'node:fs';
import * as path from 'node:path';

/** Subfolders under `data/<module>/` that hold per-project JSON stores. */
export const PROJECT_DATA_MODULE_DIRS = [
  'apis',
  'environments',
  'requirements',
  'analysis',
  'test-data',
  'knowledge',
  'executions',
  'execution-plans',
  'reports',
  'test-designs',
  'test-strategies',
  'test-suites',
  'providers',
  'assertions',
] as const;

/** Modules scanned to auto-register projects when a data folder exists (not audit — global). */
const DISCOVERY_MODULE_DIRS = ['apis', 'environments'] as const;

export function isValidDiscoveredProjectId(id: string): boolean {
  const trimmed = id.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('.')) return false;
  const lower = trimmed.toLowerCase();
  if (lower.includes('.lock')) return false;
  if (lower === 'node_modules') return false;
  return true;
}

export function discoverProjectIdsFromData(): string[] {
  const ids = new Set<string>();
  const dataRoot = path.join(process.cwd(), 'data');

  for (const module of DISCOVERY_MODULE_DIRS) {
    const root = path.join(dataRoot, module);
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (!isValidDiscoveredProjectId(entry.name)) continue;
      ids.add(entry.name);
    }
  }

  return Array.from(ids);
}

/** Remove all on-disk workspace folders for a project id. */
export function deleteProjectDataOnDisk(projectId: string): void {
  const dataRoot = path.join(process.cwd(), 'data');
  for (const module of PROJECT_DATA_MODULE_DIRS) {
    const dir = path.join(dataRoot, module, projectId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}
