import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { PasswordField } from './PasswordField';
import { authApi } from '../../../services/authApi';
import { authStore } from '../../../store/authStore';
import { getApiErrorMessage, validateLoginForm, type FieldErrors } from '../utils/validation';
import { cn } from '../../../utils/cn';
import { AuthFormAlert, type AuthFormAlertType } from './AuthFormAlert';

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
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
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
            aria-describedby={fieldErrors.email ? 'login-email-error' : 'login-email-helper'}
          />
          {fieldErrors.email ? (
            <p id="login-email-error" className="mt-1 text-xs text-red-500" role="alert">
              {fieldErrors.email}
            </p>
          ) : (
            <p id="login-email-helper" className="mt-1 text-xs text-text-secondary">
              Use the email address associated with your TestForge account.
            </p>
          )}
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
          hint="Enter your account password."
        />

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
