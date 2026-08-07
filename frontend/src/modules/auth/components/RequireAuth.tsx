import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authStore } from '../../../store/authStore';

/**
 * When enterprise login is enabled, require a valid session for app routes.
 */
export const RequireAuth: React.FC = () => {
  const loginRequired = authStore((s) => s.loginRequired);
  const user = authStore((s) => s.user);
  const isHydrated = authStore((s) => s.isHydrated);
  const location = useLocation();

  if (!isHydrated || loginRequired === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-text-secondary">
        Loading session…
      </div>
    );
  }

  if (loginRequired && !user) {
    return <Navigate to="/?auth=login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

export default RequireAuth;
