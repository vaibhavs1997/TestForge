import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { LoginForm } from '../../auth/components/LoginForm';
import { RegisterForm } from '../../auth/components/RegisterForm';
import { authStore } from '../../../store/authStore';

export type LandingAuthMode = 'login' | 'register';

export type LandingAuthModalProps = {
  mode: LandingAuthMode;
  sessionExpired?: boolean;
  redirectTo?: string;
  onClose: () => void;
  onSwitchMode: (mode: LandingAuthMode) => void;
};

export const LandingAuthModal: React.FC<LandingAuthModalProps> = ({
  mode,
  sessionExpired,
  redirectTo,
  onClose,
  onSwitchMode,
}) => {
  const loginRequired = authStore((s) => s.loginRequired);
  const isHydrated = authStore((s) => s.isHydrated);
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? redirectTo ?? '/projects';

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const title = mode === 'login' ? 'Sign in' : 'Create your account';
  const subtitle =
    mode === 'login'
      ? 'Access your organization\'s projects and test data.'
      : 'Set up your organization. All projects and data stay isolated to your team.';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617]/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="landing-auth-title"
      onClick={onClose}
    >
      <Card
        className="flex max-h-[90vh] w-full max-w-md flex-col border-white/10 bg-[#0f172a] text-slate-200 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="shrink-0 border-b border-white/[0.06] pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle id="landing-auth-title" className="text-xl text-white">
                {title}
              </CardTitle>
              <CardDescription className="mt-1 text-slate-400">{subtitle}</CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 shrink-0 p-0 text-slate-400 hover:text-white"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-6 scrollbar-none">
          {!isHydrated || loginRequired === null ? (
            <p className="text-center text-sm text-slate-400">Loading…</p>
          ) : !loginRequired ? (
            <div className="space-y-4 text-sm text-slate-300">
              <p>
                This environment runs in open development mode. Configure{' '}
                <code className="text-xs text-violet-300">MONGODB_URI</code> and{' '}
                <code className="text-xs text-violet-300">TESTFORGE_JWT_SECRET</code> on the backend to
                enable enterprise accounts.
              </p>
              <Link
                to="/projects"
                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#2563EB] text-sm font-medium text-white hover:bg-blue-500"
                onClick={onClose}
              >
                Continue to projects
              </Link>
            </div>
          ) : mode === 'login' ? (
            <LoginForm
              redirectTo={from}
              sessionExpired={sessionExpired}
              onSuccess={onClose}
              onSwitchToRegister={() => onSwitchMode('register')}
              footerClassName="text-slate-400"
            />
          ) : (
            <RegisterForm
              redirectTo={from}
              onSuccess={onClose}
              onSwitchToLogin={() => onSwitchMode('login')}
              footerClassName="text-slate-400"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LandingAuthModal;
