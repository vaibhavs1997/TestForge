/**
 * Client session identity for per-user UI state (recent projects, selection).
 * API isolation is enforced by the backend (JWT / API key).
 */

const ANON_ID_KEY = 'testforge_anon_id';
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
  return inMemoryJwt;
}

export function setStoredJwt(token: string | null): void {
  // Kept only for the lifetime of this document.  JWTs and VITE_* credentials
  // are intentionally never read from or written to browser persistence.
  inMemoryJwt = token?.trim() || null;
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
