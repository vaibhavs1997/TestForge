import { describe, it, expect } from 'vitest';
import {
  isNotEmpty,
  isNotEmptyArray,
  isValidEmail,
  isValidUrl,
  isValidId,
  isValidProjectKey,
  isInRange,
  isPositiveNumber,
  isNonNegativeNumber,
  isDuplicateName,
  isDuplicateId,
  isValidCronExpression,
  isValidJson,
  parseJsonSafe,
  isValidReference,
  getInvalidReferences,
  validateRequired,
  validateUrl,
  validateRange,
  validateCron,
  validateJson,
  hasErrors,
  clearFieldError,
  getFirstErrorField,
} from './validation';

describe('validation utilities', () => {
  describe('isNotEmpty', () => {
    it('returns false for empty string', () => {
      expect(isNotEmpty('')).toBe(false);
    });

    it('returns false for whitespace-only string', () => {
      expect(isNotEmpty('   ')).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isNotEmpty(undefined)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isNotEmpty(null)).toBe(false);
    });

    it('returns true for non-empty string', () => {
      expect(isNotEmpty('hello')).toBe(true);
    });
  });

  describe('isNotEmptyArray', () => {
    it('returns false for empty array', () => {
      expect(isNotEmptyArray([])).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isNotEmptyArray(undefined)).toBe(false);
    });

    it('returns false for null', () => {
      expect(isNotEmptyArray(null)).toBe(false);
    });

    it('returns true for non-empty array', () => {
      expect(isNotEmptyArray([1, 2, 3])).toBe(true);
    });
  });

  describe('isValidEmail', () => {
    it('returns true for valid email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
    });

    it('returns false for invalid email', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('returns true for valid http URL', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
    });

    it('returns true for valid https URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
    });

    it('returns false for invalid protocol', () => {
      expect(isValidUrl('ftp://example.com')).toBe(false);
    });

    it('returns false for invalid URL', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
    });
  });

  describe('isValidId', () => {
    it('returns false for empty string', () => {
      expect(isValidId('')).toBe(false);
    });

    it('returns true for valid ID with alphanumeric, hyphens, and underscores', () => {
      expect(isValidId('abc-123_XYZ')).toBe(true);
    });

    it('returns false for ID with special characters', () => {
      expect(isValidId('abc@123')).toBe(false);
    });
  });

  describe('isValidProjectKey', () => {
    it('returns true for valid project key', () => {
      expect(isValidProjectKey('PROJ')).toBe(true);
    });

    it('returns true for project key with numbers', () => {
      expect(isValidProjectKey('PROJ123')).toBe(true);
    });

    it('returns false for key starting with lowercase', () => {
      expect(isValidProjectKey('proj')).toBe(false);
    });

    it('returns false for key with special characters', () => {
      expect(isValidProjectKey('PROJ-123')).toBe(false);
    });
  });

  describe('isInRange', () => {
    it('returns true when value is within range', () => {
      expect(isInRange(5, 0, 10)).toBe(true);
    });

    it('returns true when value is at min', () => {
      expect(isInRange(0, 0, 10)).toBe(true);
    });

    it('returns true when value is at max', () => {
      expect(isInRange(10, 0, 10)).toBe(true);
    });

    it('returns false when value is below min', () => {
      expect(isInRange(-1, 0, 10)).toBe(false);
    });

    it('returns false when value is above max', () => {
      expect(isInRange(11, 0, 10)).toBe(false);
    });
  });

  describe('isPositiveNumber', () => {
    it('returns true for positive numbers', () => {
      expect(isPositiveNumber(1)).toBe(true);
    });

    it('returns false for zero', () => {
      expect(isPositiveNumber(0)).toBe(false);
    });

    it('returns false for negative numbers', () => {
      expect(isPositiveNumber(-1)).toBe(false);
    });
  });

  describe('isNonNegativeNumber', () => {
    it('returns true for positive numbers', () => {
      expect(isNonNegativeNumber(1)).toBe(true);
    });

    it('returns true for zero', () => {
      expect(isNonNegativeNumber(0)).toBe(true);
    });

    it('returns false for negative numbers', () => {
      expect(isNonNegativeNumber(-1)).toBe(false);
    });
  });

  describe('isDuplicateName', () => {
    it('returns false for empty name', () => {
      expect(isDuplicateName('', ['existing'])).toBe(false);
    });

    it('returns true for duplicate name', () => {
      expect(isDuplicateName('test', ['test', 'other'])).toBe(true);
    });

    it('returns false for unique name', () => {
      expect(isDuplicateName('unique', ['test', 'other'])).toBe(false);
    });

    it('is case insensitive', () => {
      expect(isDuplicateName('TEST', ['test', 'other'])).toBe(true);
    });

    it('ignores current name', () => {
      expect(isDuplicateName('test', ['test', 'other'], 'test')).toBe(false);
    });
  });

  describe('isDuplicateId', () => {
    it('returns false for empty id', () => {
      expect(isDuplicateId('', ['existing'])).toBe(false);
    });

    it('returns true for duplicate id', () => {
      expect(isDuplicateId('id1', ['id1', 'id2'])).toBe(true);
    });

    it('returns false for unique id', () => {
      expect(isDuplicateId('id3', ['id1', 'id2'])).toBe(false);
    });

    it('ignores current id', () => {
      expect(isDuplicateId('id1', ['id1', 'id2'], 'id1')).toBe(false);
    });
  });

  describe('isValidCronExpression', () => {
    it('returns true for valid cron expression', () => {
      expect(isValidCronExpression('0 9 * * 1')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(isValidCronExpression('')).toBe(false);
    });

    it('returns false for invalid field count', () => {
      expect(isValidCronExpression('0 9 * *')).toBe(false);
    });

    it('returns false for invalid minute', () => {
      expect(isValidCronExpression('60 * * * *')).toBe(false);
    });
  });

  describe('isValidJson', () => {
    it('returns true for valid JSON', () => {
      expect(isValidJson('{"key": "value"}')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(isValidJson('')).toBe(false);
    });

    it('returns false for invalid JSON', () => {
      expect(isValidJson('{invalid json}')).toBe(false);
    });
  });

  describe('parseJsonSafe', () => {
    it('parses valid JSON', () => {
      const result = parseJsonSafe<{ key: string }>('{"key": "value"}');
      expect(result.data).toEqual({ key: 'value' });
      expect(result.error).toBeNull();
    });

    it('returns error for invalid JSON', () => {
      const result = parseJsonSafe('{invalid}');
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('isValidReference', () => {
    it('returns true for valid reference', () => {
      expect(isValidReference('id1', ['id1', 'id2'])).toBe(true);
    });

    it('returns false for undefined reference', () => {
      expect(isValidReference(undefined, ['id1', 'id2'])).toBe(false);
    });

    it('returns false for invalid reference', () => {
      expect(isValidReference('id3', ['id1', 'id2'])).toBe(false);
    });
  });

  describe('getInvalidReferences', () => {
    it('returns invalid references', () => {
      expect(getInvalidReferences(['id1', 'id3'], ['id1', 'id2'])).toEqual(['id3']);
    });

    it('returns empty array for all valid references', () => {
      expect(getInvalidReferences(['id1', 'id2'], ['id1', 'id2'])).toEqual([]);
    });
  });

  describe('validateRequired', () => {
    it('returns valid for non-empty value', () => {
      expect(validateRequired('test', 'Field')).toEqual({ valid: true });
    });

    it('returns invalid for empty value', () => {
      expect(validateRequired('', 'Field')).toEqual({ valid: false, message: 'Field is required' });
    });
  });

  describe('validateUrl', () => {
    it('returns valid for valid URL', () => {
      expect(validateUrl('http://example.com', 'URL')).toEqual({ valid: true });
    });

    it('returns invalid for invalid URL', () => {
      expect(validateUrl('not-a-url', 'URL')).toEqual({
        valid: false,
        message: 'URL must be a valid URL starting with http:// or https://',
      });
    });
  });

  describe('validateRange', () => {
    it('returns valid for value in range', () => {
      expect(validateRange(5, 0, 10, 'Value')).toEqual({ valid: true });
    });

    it('returns invalid for value out of range', () => {
      expect(validateRange(15, 0, 10, 'Value')).toEqual({
        valid: false,
        message: 'Value must be between 0 and 10',
      });
    });
  });

  describe('validateCron', () => {
    it('returns valid for valid cron', () => {
      expect(validateCron('0 9 * * 1')).toEqual({ valid: true });
    });

    it('returns invalid for empty cron', () => {
      expect(validateCron('')).toEqual({ valid: false, message: 'Cron expression is required' });
    });
  });

  describe('validateJson', () => {
    it('returns valid for valid JSON', () => {
      expect(validateJson('{"key": "value"}', 'JSON')).toEqual({ valid: true });
    });

    it('returns invalid for invalid JSON', () => {
      expect(validateJson('{invalid}', 'JSON')).toEqual({ valid: false, message: 'JSON must be valid JSON' });
    });
  });

  describe('hasErrors', () => {
    it('returns true when errors exist', () => {
      expect(hasErrors({ field1: 'error1', field2: '' })).toBe(true);
    });

    it('returns false when no errors', () => {
      expect(hasErrors({})).toBe(false);
    });
  });

  describe('clearFieldError', () => {
    it('removes specified field error', () => {
      const errors = { field1: 'error1', field2: 'error2' };
      expect(clearFieldError(errors, 'field1')).toEqual({ field2: 'error2' });
    });

    it('returns same errors if field not present', () => {
      const errors = { field1: 'error1' };
      expect(clearFieldError(errors, 'field2')).toEqual({ field1: 'error1' });
    });
  });

  describe('getFirstErrorField', () => {
    it('returns first field with error', () => {
      expect(getFirstErrorField({ field1: 'error1', field2: 'error2' })).toBe('field1');
    });

    it('returns null when no errors', () => {
      expect(getFirstErrorField({})).toBeNull();
    });
  });
});