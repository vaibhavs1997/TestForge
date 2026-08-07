import React from 'react';
import { authStore } from '../../store/authStore';

/** Loads auth config and restores session before rendering children. */
export const AuthBootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const loadConfig = authStore((s) => s.loadConfig);
  const hydrateSession = authStore((s) => s.hydrateSession);
  const isHydrated = authStore((s) => s.isHydrated);
  const loginRequired = authStore((s) => s.loginRequired);

  React.useEffect(() => {
    void (async () => {
      await loadConfig();
      await hydrateSession();
    })();
  }, [loadConfig, hydrateSession]);

  if (loginRequired === null || !isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-text-secondary">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthBootstrap;
