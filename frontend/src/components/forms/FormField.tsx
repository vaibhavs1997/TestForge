// External libraries
import React, { useId } from 'react';
// Styles
import { cn } from '../../utils/cn';
import { HelperText } from './HelperText';
import { describedByIds, slugifyFieldId } from '../../utils/a11y';

export interface FormFieldProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  /** Stable id for the control; generated from label when omitted */
  fieldId?: string;
  htmlFor?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  helperText,
  required,
  children,
  className,
  fieldId: fieldIdProp,
  htmlFor,
}) => {
  const reactId = useId();
  const fieldId = fieldIdProp ?? (label ? slugifyFieldId(label) : reactId.replace(/:/g, ''));
  const controlId = htmlFor ?? fieldId;
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;
  const ariaDescribedBy = describedByIds(error && errorId, helperText && !error && helperId);

  const control =
    React.isValidElement(children) && ariaDescribedBy
      ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
          id: (children as React.ReactElement).props.id ?? controlId,
          'aria-describedby': ariaDescribedBy,
          'aria-invalid': error ? true : (children as React.ReactElement).props['aria-invalid'],
          'aria-required': required ? true : (children as React.ReactElement).props['aria-required'],
        })
      : children;

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <label htmlFor={controlId} className="block text-sm font-medium text-text">
          {label}
          {required && <span className="ml-1 text-error" aria-hidden="true">*</span>}
        </label>
      )}
      {control}
      {error && (
        <p id={errorId} className="text-sm text-error" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && <HelperText id={helperId}>{helperText}</HelperText>}
    </div>
  );
};

export default FormField;