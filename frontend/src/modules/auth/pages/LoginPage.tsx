import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/Card';
import { AuthLayout } from '../components/AuthLayout';
import { LoginForm } from '../components/LoginForm';

export const LoginPage: React.FC = () => {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/projects';

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Access your organization's projects and test data."
      footer={
        <p className="mt-6 text-center text-sm text-text-secondary">
          No account?{' '}
          <Link to="/?auth=register" state={{ from }} className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </p>
      }
    >
      <Card>
        <CardContent className="pt-6">
          <LoginForm redirectTo={from} />
        </CardContent>
      </Card>
    </AuthLayout>
  );
};

export default LoginPage;
