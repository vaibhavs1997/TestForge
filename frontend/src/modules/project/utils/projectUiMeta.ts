import { getScopedStorageKey } from '../../../services/authSession';

const META_BASE = 'testforge_project_ui_meta';

export interface ProjectUiMeta {
  lastOpenedAt: number;
}

type MetaMap = Record<string, ProjectUiMeta>;

function metaKey(): string {
  return getScopedStorageKey(META_BASE);
}

export function loadProjectUiMeta(): MetaMap {
  try {
    const raw = localStorage.getItem(metaKey());
    if (!raw) return {};
    return JSON.parse(raw) as MetaMap;
  } catch {
    return {};
  }
}

export function saveProjectUiMeta(map: MetaMap): void {
  try {
    localStorage.setItem(metaKey(), JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function touchProjectOpened(projectId: string): void {
  const map = loadProjectUiMeta();
  map[projectId] = { lastOpenedAt: Date.now() };
  saveProjectUiMeta(map);
}

export function getLastOpenedAt(projectId: string, fallback: number): number {
  return loadProjectUiMeta()[projectId]?.lastOpenedAt ?? fallback;
}
