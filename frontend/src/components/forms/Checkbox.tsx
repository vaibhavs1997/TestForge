// External libraries
import React, { forwardRef } from 'react';
import { Check } from 'lucide-react';

// Shared constants

// Shared types

// Hooks

// Services

// Components

// Styles
import { cn } from '../../utils/cn';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, helperText, id, checked, ...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const helperId = helperText ? `${checkboxId}-helper` : undefined;
    const errorId = error ? `${checkboxId}-error` : undefined;

    return (
      <div className="flex items-start gap-2">
        <div className="relative flex items-center h-5">
          <input
            id={checkboxId}
            ref={ref}
            type="checkbox"
            checked={checked}
            className={cn(
              'peer h-4 w-4 shrink-0 rounded border border-border bg-background checked:bg-primary checked:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 appearance-none',
              error && 'border-error',
              className
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={[helperId, errorId].filter(Boolean).join(' ') || undefined}
            {...props}
          />
          {checked && (
            <Check className="pointer-events-none absolute left-0 top-0 h-4 w-4 text-white peer-disabled:opacity-50" aria-hidden />
          )}
        </div>
        <div className="flex flex-col">
          {label && (
            <label htmlFor={checkboxId} className="text-sm text-text cursor-pointer">
              {label}
            </label>
          )}
          {helperText && !error && (
            <p id={helperId} className="text-xs text-text-secondary">
              {helperText}
            </p>
          )}
          {error && (
            <p id={errorId} className="text-sm text-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
export default Checkbox;