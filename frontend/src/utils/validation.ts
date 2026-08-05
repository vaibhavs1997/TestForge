// Central validation utilities for the application
// Supports: required fields, duplicate names, invalid IDs, invalid references,
// empty values, invalid ranges, invalid URLs, invalid cron expressions, invalid JSON

// ─── Basic Validators ───────────────────────────────────────────────────────

export const isNotEmpty = (value: string | undefined | null): boolean => {
  return value !== undefined && value !== null && value.trim().length > 0;
};

export const isNotEmptyArray = <T>(value: T[] | undefined | null): boolean => {
  return value !== undefined && value !== null && value.length > 0;
};

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isValidId = (id: string | undefined | null): boolean => {
  return isNotEmpty(id) && /^[a-zA-Z0-9_-]+$/.test(id!.trim());
};

export const isValidProjectKey = (key: string): boolean => {
  return /^[A-Z][A-Z0-9_]{1,19}$/.test(key.trim());
};

export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

export const isPositiveNumber = (value: number): boolean => {
  return value > 0;
};

export const isNonNegativeNumber = (value: number): boolean => {
  return value >= 0;
};

// ─── Duplicate Name Validation ──────────────────────────────────────────────

export const isDuplicateName = (
  name: string,
  existingNames: string[],
  currentName?: string
): boolean => {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return false;
  return existingNames.some(
    (existing) =>
      existing.trim().toLowerCase() === trimmed &&
      existing.trim().toLowerCase() !== currentName?.trim().toLowerCase()
  );
};

export const isDuplicateId = (
  id: string,
  existingIds: string[],
  currentId?: string
): boolean => {
  const trimmed = id.trim().toLowerCase();
  if (!trimmed) return false;
  return existingIds.some(
    (existing) =>
      existing.trim().toLowerCase() === trimmed &&
      existing.trim().toLowerCase() !== currentId?.trim().toLowerCase()
  );
};

// ─── Cron Expression Validation ─────────────────────────────────────────────

export const isValidCronExpression = (cron: string): boolean => {
  const trimmed = cron.trim();
  if (!trimmed) return false;

  // Standard 5-field cron: minute hour day-of-month month day-of-week
  const parts = trimmed.split(/\s+/);
  if (parts.length !== 5) return false;

  const fieldPatterns = [
    /^(\*|[0-5]?\d|(\*|[0-5]?\d)(\/[1-9]\d*)?|([0-5]?\d)(-[0-5]?\d)?)(,([0-5]?\d|(\*|[0-5]?\d)(\/[1-9]\d*)?|([0-5]?\d)(-[0-5]?\d)?))*$/,
    /^(\*|([01]?\d|2[0-3])|(\*|([01]?\d|2[0-3]))(\/[1-9]\d*)?|(([01]?\d|2[0-3])-([01]?\d|2[0-3])))(,(([01]?\d|2[0-3])|(\*|([01]?\d|2[0-3]))(\/[1-9]\d*)?|(([01]?\d|2[0-3])-([01]?\d|2[0-3]))))*$/,
    /^(\*|([1-9]|[12]\d|3[01])|(\*|([1-9]|[12]\d|3[01]))(\/[1-9]\d*)?|(([1-9]|[12]\d|3[01])-([1-9]|[12]\d|3[01])))(,(([1-9]|[12]\d|3[01])|(\*|([1-9]|[12]\d|3[01]))(\/[1-9]\d*)?|(([1-9]|[12]\d|3[01])-([1-9]|[12]\d|3[01]))))*$/,
    /^(\*|([1-9]|1[0-2])|(\*|([1-9]|1[0-2]))(\/[1-9]\d*)?|(([1-9]|1[0-2])-([1-9]|1[0-2])))(,(([1-9]|1[0-2])|(\*|([1-9]|1[0-2]))(\/[1-9]\d*)?|(([1-9]|1[0-2])-([1-9]|1[0-2]))))*$/,
    /^(\*|([0-6])|(\*|([0-6]))(\/[1-9]\d*)?|(([0-6])-([0-6])))(,(([0-6])|(\*|([0-6]))(\/[1-9]\d*)?|(([0-6])-([0-6]))))*$/,
  ];

  return parts.every((part, index) => fieldPatterns[index].test(part));
};

// ─── JSON Validation ────────────────────────────────────────────────────────

export const isValidJson = (json: string): boolean => {
  if (!json.trim()) return false;
  try {
    JSON.parse(json);
    return true;
  } catch {
    return false;
  }
};

export const parseJsonSafe = <T>(json: string): { data: T | null; error: string | null } => {
  try {
    return { data: JSON.parse(json) as T, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Invalid JSON' };
  }
};

// ─── Reference Validation ───────────────────────────────────────────────────

export const isValidReference = (
  referenceId: string | undefined | null,
  availableIds: string[]
): boolean => {
  if (!referenceId) return false;
  return availableIds.includes(referenceId);
};

export const getInvalidReferences = (
  referenceIds: string[],
  availableIds: string[]
): string[] => {
  return referenceIds.filter((id) => !availableIds.includes(id));
};

// ─── Field Validation Helpers ───────────────────────────────────────────────

export interface FieldValidationResult {
  valid: boolean;
  message?: string;
}

export const validateRequired = (value: string, fieldName: string): FieldValidationResult => {
  if (!isNotEmpty(value)) {
    return { valid: false, message: `${fieldName} is required` };
  }
  return { valid: true };
};

export const validateUrl = (value: string, fieldName: string): FieldValidationResult => {
  if (!isNotEmpty(value)) {
    return { valid: false, message: `${fieldName} is required` };
  }
  if (!isValidUrl(value)) {
    return { valid: false, message: `${fieldName} must be a valid URL starting with http:// or https://` };
  }
  return { valid: true };
};

export const validateRange = (
  value: number,
  min: number,
  max: number,
  fieldName: string
): FieldValidationResult => {
  if (!isInRange(value, min, max)) {
    return { valid: false, message: `${fieldName} must be between ${min} and ${max}` };
  }
  return { valid: true };
};

export const validateCron = (value: string): FieldValidationResult => {
  if (!isNotEmpty(value)) {
    return { valid: false, message: 'Cron expression is required' };
  }
  if (!isValidCronExpression(value)) {
    return {
      valid: false,
      message: 'Invalid cron expression. Format: minute hour day-of-month month day-of-week (e.g., 0 9 * * 1)',
    };
  }
  return { valid: true };
};

export const validateJson = (value: string, fieldName: string): FieldValidationResult => {
  if (!isNotEmpty(value)) {
    return { valid: false, message: `${fieldName} is required` };
  }
  if (!isValidJson(value)) {
    return { valid: false, message: `${fieldName} must be valid JSON` };
  }
  return { valid: true };
};

// ─── Form Validation Result ─────────────────────────────────────────────────

export interface FormErrors {
  [field: string]: string | undefined;
}

export const hasErrors = (errors: FormErrors): boolean => {
  return Object.values(errors).some((error) => error !== undefined && error !== '');
};

export const clearFieldError = (errors: FormErrors, field: string): FormErrors => {
  if (!errors[field]) return errors;
  const next = { ...errors };
  delete next[field];
  return next;
};

export const getFirstErrorField = (errors: FormErrors): string | null => {
  const entries = Object.entries(errors);
  for (const [field, error] of entries) {
    if (error !== undefined && error !== '') {
      return field;
    }
  }
  return null;
};