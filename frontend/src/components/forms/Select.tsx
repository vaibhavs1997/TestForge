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

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, placeholder, required, id, name, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className={fieldLabelClass}>
            {label}
            {required && <span className="ml-1 text-error" aria-hidden="true">*</span>}
          </label>
        )}
        <select
          id={selectId}
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
          aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
          {...props}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={`${selectId}-error`} className={fieldErrorClass} role="alert">{error}</p>
        )}
        {helperText && !error && (
          <p id={`${selectId}-helper`} className={fieldHelperClass}>{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
