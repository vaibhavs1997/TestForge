export interface RequirementCaptureDraft {
  title: string;
  criteriaText: string;
  sourceMode: 'manual' | 'jira';
}

const keyFor = (projectId: string) => `testforge-requirement-capture-draft:${projectId}`;

export function readRequirementCaptureDraft(projectId?: string): RequirementCaptureDraft | null {
  if (!projectId || typeof window === 'undefined') return null;
  try {
    const value = window.sessionStorage.getItem(keyFor(projectId));
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<RequirementCaptureDraft>;
    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      criteriaText: typeof parsed.criteriaText === 'string' ? parsed.criteriaText : '',
      sourceMode: parsed.sourceMode === 'jira' ? 'jira' : 'manual',
    };
  } catch {
    return null;
  }
}

export function writeRequirementCaptureDraft(projectId: string | undefined, draft: RequirementCaptureDraft): void {
  if (!projectId || typeof window === 'undefined') return;
  try {
    if (!draft.title.trim() && !draft.criteriaText.trim()) {
      window.sessionStorage.removeItem(keyFor(projectId));
      return;
    }
    window.sessionStorage.setItem(keyFor(projectId), JSON.stringify(draft));
  } catch {
    // Browser storage can be disabled; the active form still works normally.
  }
}

export function clearRequirementCaptureDraft(projectId?: string): void {
  if (!projectId || typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(keyFor(projectId));
  } catch {
    // Ignore unavailable browser storage.
  }
}
