import { create } from 'zustand';
import { getStoredJwt, setStoredJwt } from '../services/authSession';
import { authApi, type AuthUser } from '../services/authApi';
import { projectStore } from './projectStore';

interface AuthState {
  loginRequired: boolean | null;
  user: AuthUser | null;
  isHydrated: boolean;
  manualLogoutUntil: number;
  loadConfig: () => Promise<void>;
  hydrateSession: () => Promise<void>;
  setSession: (accessToken: string, user: AuthUser) => void;
  logout: () => void;
}

function userFromMe(me: Awaited<ReturnType<typeof authApi.me>>): AuthUser | null {
  if (!me.authenticated) return null;
  return {
    id: me.subject,
    email: me.email ?? me.subject,
    displayName: me.displayName ?? me.email ?? me.subject,
    tenantId: me.tenantId ?? '',
    role: me.role ?? 'member',
  };
}

function isUnauthorizedSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { statusCode?: unknown; status?: unknown };
  const code = Number(maybeError.statusCode ?? maybeError.status);
  return code === 401 || code === 403;
}

export const authStore = create<AuthState>((set) => ({
  loginRequired: null,
  user: null,
  isHydrated: false,
  manualLogoutUntil: 0,

  loadConfig: async () => {
    try {
      const config = await authApi.getConfig();
      set({ loginRequired: config.loginRequired });
    } catch {
      // Backend unreachable — still render the app (open dev mode) instead of hanging on Loading…
      set({ loginRequired: false });
    }
  },

  hydrateSession: async () => {
    const token = getStoredJwt();
    if (!token) {
      set({ user: null, isHydrated: true });
      return;
    }
    try {
      const me = await authApi.me();
      const user = userFromMe(me);
      if (user) {
        set({ user, isHydrated: true });
      } else {
        setStoredJwt(null);
        set({ user: null, isHydrated: true });
      }
    } catch (error) {
      if (isUnauthorizedSessionError(error)) {
        setStoredJwt(null);
      }
      set({ user: null, isHydrated: true });
    }
  },

  setSession: (accessToken, user) => {
    setStoredJwt(accessToken);
    set({ user, isHydrated: true, loginRequired: true });
  },

  logout: () => {
    setStoredJwt(null);
    projectStore.getState().setSelectedProjectId(null);
    set({ user: null, manualLogoutUntil: Date.now() + 3000 });
  },
}));

export default authStore;
