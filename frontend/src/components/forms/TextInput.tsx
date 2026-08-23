// External libraries
import React, { forwardRef } from 'react';

// Shared constants

// Shared types

// Hooks

// Services

// Components

// Styles
import { cn } from '../../utils/cn';
import { fieldControlBaseClass, fieldErrorClass, fieldHelperClass, fieldLabelClass } from './fieldStyles';

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
            className={fieldLabelClass}
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
            fieldControlBaseClass,
            error && 'border-error focus:ring-error',
            className
          )}
          aria-invalid={error ? 'true' : undefined}
          aria-required={required ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className={fieldErrorClass} role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className={fieldHelperClass}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';

export default TextInput;
