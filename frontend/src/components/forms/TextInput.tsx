// External libraries
import React, { forwardRef } from 'react';

// Shared constants

// Shared types

// Hooks

// Services

// Components

// Styles
import { cn } from '../../utils/cn';

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, label, error, helperText, required, id, name, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-text"
          >
            {label}
            {required && <span className="ml-1 text-error" aria-hidden="true">*</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          name={name}
          required={required}
          className={cn(
            'flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-error focus:ring-error',
            className
          )}
          aria-invalid={error ? 'true' : undefined}
          aria-required={required ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-sm text-error" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1 text-sm text-text-secondary">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';

export default TextInput;