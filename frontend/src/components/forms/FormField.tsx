// External libraries
import React from 'react';
// Styles
import { cn } from '../../utils/cn';

export interface FormFieldProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label, error, helperText, required, children, className,
}) => {
  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <label className="block text-sm font-medium text-text">
          {label}
          {required && <span className="ml-1 text-error">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-sm text-error" role="alert">{error}</p>}
      {helperText && !error && <p className="text-sm text-text-secondary">{helperText}</p>}
    </div>
  );
};

export default FormField;