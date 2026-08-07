import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { PasswordField } from './PasswordField';
import { authApi } from '../../../services/authApi';
import { authStore } from '../../../store/authStore';
import { projectStore } from '../../../store/projectStore';
import { useToast } from '../../../hooks/useToast';
import {
  getApiErrorMessage,
  validateRegisterForm,
  type FieldErrors,
} from '../utils/validation';
import { cn } from '../../../utils/cn';

export type RegisterFormProps = {
  redirectTo?: string;
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
  footerClassName?: string;
};

export const RegisterForm: React.FC<RegisterFormProps> = ({
  redirectTo = '/projects',
  onSuccess,
  onSwitchToLogin,
  footerClassName,
}) => {
  const [organizationName, setOrganizationName] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [acceptTerms, setAcceptTerms] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const navigate = useNavigate();
  const setSession = authStore((s) => s.setSession);
  const setSelectedProjectId = projectStore((s) => s.setSelectedProjectId);
  const { showError, showSuccess, toast } = useToast();

  const clearError = (key: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateRegisterForm({
      email,
      password,
      confirmPassword,
      firstName,
      lastName,
      organizationName,
      acceptTerms,
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const result = await authApi.register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        organizationName: organizationName.trim(),
      });
      setSelectedProjectId(null);
      setSession(result.accessToken, result.user);
      showSuccess('Welcome! Your organization workspace is ready.');
      onSuccess?.();
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      showError(getApiErrorMessage(err, 'Registration failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const textInput = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    errorKey: keyof FieldErrors,
    options?: { type?: string; autoComplete?: string; placeholder?: string; required?: boolean },
  ) => (
    <div>
      <label className="mb-1 block text-sm font-medium text-text" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={options?.type ?? 'text'}
        autoComplete={options?.autoComplete}
        placeholder={options?.placeholder}
        required={options?.required}
        className={cn(
          'w-full rounded-lg border bg-surface px-3 py-2 text-sm text-text',
          fieldErrors[errorKey] ? 'border-red-500/80' : 'border-border',
        )}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (fieldErrors[errorKey]) clearError(errorKey);
        }}
        aria-invalid={Boolean(fieldErrors[errorKey])}
      />
      {fieldErrors[errorKey] ? (
        <p className="mt-1 text-xs text-red-500" role="alert">
          {fieldErrors[errorKey]}
        </p>
      ) : null}
    </div>
  );

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {textInput('reg-org', 'Organization name', organizationName, setOrganizationName, 'organizationName', {
          placeholder: 'Acme QA Team',
          required: true,
        })}
        {textInput('reg-firstName', 'First name', firstName, setFirstName, 'firstName', {
          autoComplete: 'given-name',
          required: true,
        })}
        {textInput('reg-lastName', 'Last name', lastName, setLastName, 'lastName', {
          autoComplete: 'family-name',
          required: true,
        })}
        {textInput('reg-email', 'Work email', email, setEmail, 'email', {
          type: 'email',
          autoComplete: 'email',
          required: true,
        })}
        <PasswordField
          id="reg-password"
          label="Password"
          value={password}
          onChange={(v) => {
            setPassword(v);
            clearError('password');
          }}
          autoComplete="new-password"
          error={fieldErrors.password}
          hint="At least 6 characters (letters and numbers recommended)"
        />
        <PasswordField
          id="reg-confirmPassword"
          label="Confirm password"
          value={confirmPassword}
          onChange={(v) => {
            setConfirmPassword(v);
            clearError('confirmPassword');
          }}
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
        />

        <div>
          <label className="flex items-start gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => {
                setAcceptTerms(e.target.checked);
                if (e.target.checked) clearError('acceptTerms');
              }}
              className="mt-0.5 rounded border-border"
            />
            <span>
              I agree to use TestForge in accordance with my organization&apos;s policies and understand
              that project data is isolated per organization.
            </span>
          </label>
          {fieldErrors.acceptTerms ? (
            <p className="mt-1 text-xs text-red-500" role="alert">
              {fieldErrors.acceptTerms}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      {onSwitchToLogin ? (
        <p className={cn('mt-6 text-center text-sm text-text-secondary', footerClassName)}>
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </button>
        </p>
      ) : null}
      {toast}
    </>
  );
};

export default RegisterForm;
