import React from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { cn } from '../../../utils/cn';

export type AuthFormAlertType = 'error' | 'success';

export type AuthFormAlertProps = {
  type: AuthFormAlertType;
  message: string;
  onDismiss?: () => void;
  className?: string;
};

export const AuthFormAlert: React.FC<AuthFormAlertProps> = ({
  type,
  message,
  onDismiss,
  className,
}) => {
  const isError = type === 'error';

  return (
    <div
      role="alert"
      className={cn(
        'mb-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm',
        isError
          ? 'border-red-500/40 bg-red-500/10 text-red-100'
          : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
        className,
      )}
    >
      {isError ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden />
      ) : (
        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
      )}
      <p className="min-w-0 flex-1 whitespace-pre-wrap break-words">{message}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-current opacity-70 hover:opacity-100"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
};

export default AuthFormAlert;
