// Shared form validation hook for consistent form UX
import React from 'react';
import {
  FormErrors,
  hasErrors,
  clearFieldError,
  getFirstErrorField,
} from '../utils/validation';

export interface UseFormValidationOptions {
  validate: () => FormErrors;
  focusFirstError?: boolean;
}

export interface UseFormValidationResult {
  errors: FormErrors;
  isValid: boolean;
  validateForm: () => boolean;
  clearError: (field: string) => void;
  setErrors: React.Dispatch<React.SetStateAction<FormErrors>>;
  focusFirstInvalidField: () => void;
}

export const useFormValidation = ({
  validate,
  focusFirstError = true,
}: UseFormValidationOptions): UseFormValidationResult => {
  const [errors, setErrors] = React.useState<FormErrors>({});

  const focusFirstInvalidField = React.useCallback(() => {
    const firstErrorField = getFirstErrorField(errors);
    if (firstErrorField) {
      // Try to find the field by name, id, or data-field attribute
      const selectors = [
        `[name="${firstErrorField}"]`,
        `#${firstErrorField}`,
        `[data-field="${firstErrorField}"]`,
      ];
      for (const selector of selectors) {
        const el = document.querySelector<HTMLElement>(selector);
        if (el) {
          el.focus();
          return;
        }
      }
    }
  }, [errors]);

  const validateForm = React.useCallback((): boolean => {
    const newErrors = validate();
    setErrors(newErrors);
    const valid = !hasErrors(newErrors);
    if (!valid && focusFirstError) {
      // Defer focus to next tick so the DOM has updated with error states
      setTimeout(() => {
        const firstErrorField = getFirstErrorField(newErrors);
        if (firstErrorField) {
          const selectors = [
            `[name="${firstErrorField}"]`,
            `#${firstErrorField}`,
            `[data-field="${firstErrorField}"]`,
          ];
          for (const selector of selectors) {
            const el = document.querySelector<HTMLElement>(selector);
            if (el) {
              el.focus();
              break;
            }
          }
        }
      }, 0);
    }
    return valid;
  }, [validate, focusFirstError]);

  const clearError = React.useCallback((field: string) => {
    setErrors((prev) => clearFieldError(prev, field));
  }, []);

  return {
    errors,
    isValid: !hasErrors(errors),
    validateForm,
    clearError,
    setErrors,
    focusFirstInvalidField,
  };
};

export default useFormValidation;