import { create } from 'zustand';
import { getStoredJwt, setStoredJwt } from '../services/authSession';
import { authApi, type AuthUser } from '../services/authApi';
import { projectStore } from './projectStore';

interface AuthState {
  loginRequired: boolean | null;
  user: AuthUser | null;
  isHydrated: boolean;
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

export const authStore = create<AuthState>((set) => ({
  loginRequired: null,
  user: null,
  isHydrated: false,

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
    } catch {
      setStoredJwt(null);
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
    set({ user: null });
  },
}));

export default authStore;
