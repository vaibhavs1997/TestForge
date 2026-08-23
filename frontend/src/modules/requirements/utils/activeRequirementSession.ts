const activeKey = (projectId: string) => `testforge-requirements-active:${projectId}`;
const panelVisibleKey = (projectId: string) => `testforge-requirements-panel-visible:${projectId}`;

export function readActiveRequirementId(projectId: string): string | null {
  try {
    return localStorage.getItem(activeKey(projectId));
  } catch {
    return null;
  }
}

export function writeActiveRequirementId(projectId: string, requirementId: string): void {
  try {
    localStorage.setItem(activeKey(projectId), requirementId);
  } catch {
    /* ignore */
  }
}

export function clearActiveRequirementId(projectId: string): void {
  try {
    localStorage.removeItem(activeKey(projectId));
  } catch {
    /* ignore */
  }
}

export function readSuitePanelVisible(projectId: string): boolean {
  try {
    return localStorage.getItem(panelVisibleKey(projectId)) === '1';
  } catch {
    return false;
  }
}

export function writeSuitePanelVisible(projectId: string, visible: boolean): void {
  try {
    if (visible) localStorage.setItem(panelVisibleKey(projectId), '1');
    else localStorage.removeItem(panelVisibleKey(projectId));
  } catch {
    /* ignore */
  }
}
