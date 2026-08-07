import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { PasswordField } from './PasswordField';
import { authApi } from '../../../services/authApi';
import { authStore } from '../../../store/authStore';
import { getApiErrorMessage, validateLoginForm, type FieldErrors } from '../utils/validation';
import { cn } from '../../../utils/cn';
import { AuthFormAlert, type AuthFormAlertType } from './AuthFormAlert';

const REMEMBER_EMAIL_KEY = 'testforge_remember_email';

export type LoginFormProps = {
  redirectTo?: string;
  sessionExpired?: boolean;
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
  footerClassName?: string;
};

export const LoginForm: React.FC<LoginFormProps> = ({
  redirectTo = '/projects',
  sessionExpired = false,
  onSuccess,
  onSwitchToRegister,
  footerClassName,
}) => {
  const [email, setEmail] = React.useState(() => {
    if (typeof window === 'undefined') return '';
    return sessionStorage.getItem(REMEMBER_EMAIL_KEY) ?? '';
  });
  const [password, setPassword] = React.useState('');
  const [rememberEmail, setRememberEmail] = React.useState(Boolean(email));
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formAlert, setFormAlert] = React.useState<{ type: AuthFormAlertType; message: string } | null>(
    null,
  );
  const navigate = useNavigate();
  const setSession = authStore((s) => s.setSession);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateLoginForm(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    setFormAlert(null);
    try {
      const result = await authApi.login(email.trim().toLowerCase(), password);
      if (rememberEmail) {
        sessionStorage.setItem(REMEMBER_EMAIL_KEY, email.trim().toLowerCase());
      } else {
        sessionStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
      setSession(result.accessToken, result.user);
      onSuccess?.();
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      setFormAlert({ type: 'error', message: getApiErrorMessage(err, 'Sign in failed') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {sessionExpired ? (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Your session expired. Please sign in again.
        </div>
      ) : null}

      {formAlert ? (
        <AuthFormAlert
          type={formAlert.type}
          message={formAlert.message}
          onDismiss={() => setFormAlert(null)}
        />
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label className="mb-1 block text-sm font-medium text-text" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            className={cn(
              'w-full rounded-lg border bg-surface px-3 py-2 text-sm text-text',
              fieldErrors.email ? 'border-red-500/80' : 'border-border',
            )}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email ? (
            <p className="mt-1 text-xs text-red-500" role="alert">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <PasswordField
          id="login-password"
          label="Password"
          value={password}
          onChange={(v) => {
            setPassword(v);
            if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
          }}
          autoComplete="current-password"
          error={fieldErrors.password}
        />

        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={rememberEmail}
            onChange={(e) => setRememberEmail(e.target.checked)}
            className="rounded border-border"
          />
          Remember my email on this device
        </label>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      {onSwitchToRegister ? (
        <p className={cn('mt-6 text-center text-sm text-text-secondary', footerClassName)}>
          No account?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-medium text-primary hover:underline"
          >
            Create one
          </button>
        </p>
      ) : null}
    </>
  );
};

export default LoginForm;
