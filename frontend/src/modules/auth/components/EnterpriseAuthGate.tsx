import React from 'react';
import { Link } from 'react-router-dom';
import { authStore } from '../../../store/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';

/**
 * When MongoDB enterprise login is not enabled, auth pages show guidance instead of broken API calls.
 */
export const EnterpriseAuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const loginRequired = authStore((s) => s.loginRequired);
  const isHydrated = authStore((s) => s.isHydrated);

  if (!isHydrated || loginRequired === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-text-secondary">
        Loading…
      </div>
    );
  }

  if (!loginRequired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign-in not required</CardTitle>
            <CardDescription>
              This environment runs in open development mode. Configure <code className="text-xs">MONGODB_URI</code>{' '}
              and <code className="text-xs">TESTFORGE_JWT_SECRET</code> on the backend to enable enterprise accounts.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link
              to="/projects"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90"
            >
              Continue to projects
            </Link>
            <Link
              to="/"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-surface"
            >
              Home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default EnterpriseAuthGate;
