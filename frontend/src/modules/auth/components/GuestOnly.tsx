import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authStore } from '../../../store/authStore';

/** Auth pages: redirect to app when already signed in. */
export const GuestOnly: React.FC = () => {
  const user = authStore((s) => s.user);
  const loginRequired = authStore((s) => s.loginRequired);
  const isHydrated = authStore((s) => s.isHydrated);
  const location = useLocation();

  if (!isHydrated || loginRequired === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-text-secondary">
        Loading…
      </div>
    );
  }

  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? '/projects';
    return <Navigate to={from} replace />;
  }

  return <Outlet />;
};

export default GuestOnly;
