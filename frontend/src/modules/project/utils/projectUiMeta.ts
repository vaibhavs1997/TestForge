import { getScopedStorageKey } from '../../../services/authSession';

const META_BASE = 'testforge_project_ui_meta';

export interface ProjectUiMeta {
  lastOpenedAt: number;
}

type MetaMap = Record<string, ProjectUiMeta>;

export interface ProjectActivityEntry {
  id: string;
  action: string;
  projectName: string;
  user: string;
  timestamp: number;
}

const MAX_PROJECT_ACTIVITY = 5;
const ACTIVITY_BASE = 'testforge_project_recent_activity';

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

function activityKey(): string {
  return getScopedStorageKey(ACTIVITY_BASE);
}

export function loadProjectActivity(): ProjectActivityEntry[] {
  try {
    const raw = localStorage.getItem(activityKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProjectActivityEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveProjectActivity(entries: ProjectActivityEntry[]): void {
  try {
    localStorage.setItem(activityKey(), JSON.stringify(entries.slice(0, MAX_PROJECT_ACTIVITY)));
  } catch {
    // ignore
  }
}

export function appendProjectActivity(action: string, projectName: string, user = 'You'): void {
  const next: ProjectActivityEntry[] = [
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action,
      projectName,
      user,
      timestamp: Date.now(),
    },
    ...loadProjectActivity(),
  ];
  saveProjectActivity(next);
}
