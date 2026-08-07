import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../../../components/brand/BrandLogo';
import { Shield } from 'lucide-react';

export interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children, footer }) => (
  <div className="flex min-h-screen bg-background">
    <div className="hidden w-[42%] flex-col justify-between border-r border-border bg-gradient-to-br from-primary/15 via-surface to-background p-10 lg:flex">
      <BrandLogo variant="landing" linkTo="/" />
      <div>
        <div className="mb-4 inline-flex rounded-full bg-primary/10 p-3 text-primary">
          <Shield className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-text">Enterprise-ready isolation</h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-text-secondary">
          Each organization gets its own workspace. Projects, APIs, test data, and knowledge stay
          scoped to your tenant — other teams cannot access your data.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-text-secondary">
          <li>• Secure sign-in with encrypted passwords</li>
          <li>• Tenant-scoped projects and assets</li>
          <li>• Session-based access to the API</li>
        </ul>
      </div>
      <p className="text-xs text-text-secondary">
        <Link to="/" className="hover:text-primary">
          ← Back to home
        </Link>
      </p>
    </div>

    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 w-full max-w-md lg:hidden">
        <BrandLogo variant="landing" linkTo="/" />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-6 text-center lg:text-left">
          <h1 className="text-2xl font-bold text-text">{title}</h1>
          <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
        </div>
        {children}
        {footer}
      </div>
    </div>
  </div>
);

export default AuthLayout;
