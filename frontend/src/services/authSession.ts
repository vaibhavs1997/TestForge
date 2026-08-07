/**
 * Client session identity for per-user UI state (recent projects, selection).
 * API isolation is enforced by the backend (JWT / API key).
 */

const JWT_STORAGE_KEY = 'testforge_auth_jwt';
const ANON_ID_KEY = 'testforge_anon_id';

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
  if (typeof window === 'undefined') return null;
  const fromStorage = localStorage.getItem(JWT_STORAGE_KEY)?.trim();
  if (fromStorage) return fromStorage;
  const fromEnv = import.meta.env.VITE_AUTH_JWT?.trim();
  return fromEnv || null;
}

export function setStoredJwt(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(JWT_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(JWT_STORAGE_KEY);
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
  const apiKey = import.meta.env.VITE_API_KEY?.trim();
  if (apiKey) return `Bearer ${apiKey}`;
  return undefined;
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export function notifyUnauthorized(): void {
  unauthorizedHandler?.();
}
