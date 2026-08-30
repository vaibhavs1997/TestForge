import { getScopedStorageKey } from '../services/authSession';

/**
 * Browser storage is not a secret store.  Keep request material, environment
 * values, responses, and credentials out of it and remove snapshots created
 * by older versions of the API workspace.
 */
const SENSITIVE_KEYS = new Set([
  'testforge_auth_jwt',
  'testforge_remember_email',
]);

const SENSITIVE_PREFIXES = [
  'testforge:api-workspace:',
  'testforge:api-workspace-session:',
];

export function clearProjectBrowserState(projectId: string): void {
  if (typeof window === 'undefined' || !projectId) return;
  const scopedKeys = [
    getScopedStorageKey('selectedProjectId'),
    getScopedStorageKey(`testforge:api-selection:${projectId}`),
    getScopedStorageKey(`testforge:api-workspace-session:${projectId}`),
  ];
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      if (storage.getItem(scopedKeys[0]) === projectId) storage.removeItem(scopedKeys[0]);
      scopedKeys.slice(1).forEach((key) => storage.removeItem(key));
    } catch { /* storage may be unavailable */ }
  }
}

function removeMatching(storage: Storage): void {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && (SENSITIVE_KEYS.has(key) || SENSITIVE_PREFIXES.some((prefix) => key.startsWith(prefix)))) {
      keys.push(key);
    }
  }
  keys.forEach((key) => storage.removeItem(key));
}

/** Removes legacy persisted secrets without touching harmless UI preferences. */
export function clearSensitiveBrowserState(): void {
  if (typeof window === 'undefined') return;
  try { removeMatching(window.localStorage); } catch { /* storage may be disabled */ }
  try { removeMatching(window.sessionStorage); } catch { /* storage may be disabled */ }
}

/** Removes only superseded API workspace snapshots during page migration. */
export function clearLegacyApiWorkspaceState(): void {
  if (typeof window === 'undefined') return;
  const legacyPrefixes = ['testforge:api-workspace:'];
  const removeLegacy = (storage: Storage) => {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
      .filter((key): key is string => Boolean(key) && legacyPrefixes.some((prefix) => key!.startsWith(prefix)));
    keys.forEach((key) => storage.removeItem(key));
  };
  try { removeLegacy(window.localStorage); } catch { /* storage may be disabled */ }
  try { removeLegacy(window.sessionStorage); } catch { /* storage may be disabled */ }
}
