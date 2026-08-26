/**
 * Client session identity for per-user UI state (recent projects, selection).
 * API isolation is enforced by the backend (JWT / API key).
 */

const ANON_ID_KEY = 'testforge_anon_id';
const JWT_SESSION_KEY = 'testforge_jwt';
let inMemoryJwt: string | null = null;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getStoredJwt(): string | null {
  if (inMemoryJwt) return inMemoryJwt;
  if (typeof window === 'undefined') return null;

  try {
    inMemoryJwt = window.sessionStorage.getItem(JWT_SESSION_KEY)?.trim() || null;
  } catch {
    // Privacy settings can deny browser storage. The in-memory session remains
    // usable in that case, but it cannot survive a page refresh.
  }
  return inMemoryJwt;
}

export function setStoredJwt(token: string | null): void {
  inMemoryJwt = token?.trim() || null;
  if (typeof window === 'undefined') return;

  try {
    if (inMemoryJwt) window.sessionStorage.setItem(JWT_SESSION_KEY, inMemoryJwt);
    else window.sessionStorage.removeItem(JWT_SESSION_KEY);
  } catch {
    // Keep the active in-memory session when session storage is unavailable.
  }
}

/** Stable subject for namespacing browser storage per user. */
export function getSessionSubject(): string {
  const jwt = getStoredJwt();
  if (jwt) {
    const payload = decodeJwtPayload(jwt);
    const sub = payload?.sub;
    if (typeof sub === 'string' && sub.length > 0) return sub;
  }
  const devUser = import.meta.env.VITE_DEV_USER_ID?.trim();
  if (devUser) return devUser;

  if (typeof window === 'undefined') return 'ssr';

  let anon = localStorage.getItem(ANON_ID_KEY);
  if (!anon) {
    anon = crypto.randomUUID();
    localStorage.setItem(ANON_ID_KEY, anon);
  }
  return anon;
}

export function getScopedStorageKey(base: string): string {
  return `${base}:${getSessionSubject()}`;
}

export function getAuthAuthorizationHeader(): string | undefined {
  const jwt = getStoredJwt();
  if (jwt) return `Bearer ${jwt}`;
  return undefined;
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export function notifyUnauthorized(): void {
  unauthorizedHandler?.();
}
