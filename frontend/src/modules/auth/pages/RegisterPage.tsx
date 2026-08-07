import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/Card';
import { AuthLayout } from '../components/AuthLayout';
import { RegisterForm } from '../components/RegisterForm';

export const RegisterPage: React.FC = () => {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/projects';

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up your organization. All projects and data stay isolated to your team."
      footer={
        <p className="mt-6 text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <Link to="/?auth=login" state={{ from }} className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <Card>
        <CardContent className="pt-6">
          <RegisterForm redirectTo={from} />
        </CardContent>
      </Card>
    </AuthLayout>
  );
};

export default RegisterPage;
