const META_KEY = 'testforge_project_ui_meta';

export interface ProjectUiMeta {
  lastOpenedAt: number;
}

type MetaMap = Record<string, ProjectUiMeta>;

export function loadProjectUiMeta(): MetaMap {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as MetaMap;
  } catch {
    return {};
  }
}

export function saveProjectUiMeta(map: MetaMap): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(map));
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
