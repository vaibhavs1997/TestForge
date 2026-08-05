// ValidationHelpers - Shared input validation utilities for use cases
// Consolidates repeated validation patterns across 50+ use cases

export class ValidationHelpers {
  /**
   * Validates that a required string field is provided and not empty.
   * @param value The value to validate
   * @param fieldName The field name for error messages
   * @returns The trimmed value if valid
   * @throws Error if value is missing or empty
   */
  static validateRequired(value: string | null | undefined, fieldName: string): string {
    if (!value || !value.trim()) {
      throw new Error(`${fieldName} is required`);
    }
    return value.trim();
  }

  /**
   * Validates that a required field is provided (non-null/undefined check).
   * @param value The value to validate
   * @param fieldName The field name for error messages
   * @throws Error if value is null or undefined
   */
  static validateRequiredField(value: any, fieldName: string): void {
    if (value === null || value === undefined) {
      throw new Error(`${fieldName} is required`);
    }
  }

  /**
   * Validates that a resource name is unique within a project scope.
   * @param repo The repository with existsByName method
   * @param name The name to validate
   * @param projectId The project scope
   * @param existingName Optional existing name to allow unchanged updates
   * @throws Error if name already exists
   */
  static async validateUniqueName(
    repo: any,
    name: string,
    projectId: string,
    existingName?: string
  ): Promise<void> {
    // Allow unchanged names during updates
    if (existingName && name.trim() === existingName) {
      return;
    }

    const exists = await repo.existsByName(name.trim(), projectId);
    if (exists) {
      throw new Error(`Resource with name "${name}" already exists in this project`);
    }
  }

  /**
   * Validates that a name is unique within a specific context (e.g., dataset, column).
   * @param repo The repository with existsByName method
   * @param name The name to validate
   * @param contextId The context ID (e.g., datasetId)
   * @param contextLabel The context label for error messages
   * @param existingName Optional existing name to allow unchanged updates
   * @throws Error if name already exists in context
   */
  static async validateUniqueNameInContext(
    repo: any,
    name: string,
    contextId: string,
    contextLabel: string,
    existingName?: string
  ): Promise<void> {
    // Allow unchanged names during updates
    if (existingName && name.trim() === existingName) {
      return;
    }

    const exists = await repo.existsByName(name.trim(), contextId);
    if (exists) {
      throw new Error(`${contextLabel} with name "${name}" already exists in this ${contextLabel.split(' ')[0].toLowerCase()}`);
    }
  }

  /**
   * Validates that a value is within a numeric range.
   * @param value The value to validate
   * @param min Minimum allowed value (inclusive)
   * @param max Maximum allowed value (inclusive)
   * @param fieldName The field name for error messages
   * @returns The value if valid
   * @throws Error if value is outside range
   */
  static validateRange(value: number, min: number, max: number, fieldName: string): number {
    if (value < min || value > max) {
      throw new Error(`${fieldName} must be between ${min} and ${max}`);
    }
    return value;
  }

  /**
   * Validates that a value is greater than a minimum.
   * @param value The value to validate
   * @param min Minimum allowed value (exclusive)
   * @param fieldName The field name for error messages
   * @returns The value if valid
   * @throws Error if value is not greater than min
   */
  static validateGreaterThan(value: number, min: number, fieldName: string): number {
    if (value <= min) {
      throw new Error(`${fieldName} must be greater than ${min}`);
    }
    return value;
  }

  /**
   * Validates that a value is one of the allowed enum values.
   * @param value The value to validate
   * @param allowedValues Array of allowed values
   * @param fieldName The field name for error messages
   * @returns The value if valid
   * @throws Error if value is not in allowed list
   */
  static validateEnum(value: string, allowedValues: string[], fieldName: string): string {
    if (!allowedValues.includes(value)) {
      throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
    }
    return value;
  }

  /**
   * Validates an email address format.
   * @param email The email to validate
   * @returns The email if valid
   * @throws Error if email format is invalid
   */
  static validateEmail(email: string): string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
    return email;
  }

  /**
   * Validates that start date is before end date.
   * @param startDate The start date
   * @param endDate The end date
   * @throws Error if start date is not before end date
   */
  static validateDateRange(startDate: Date, endDate: Date): void {
    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }
  }

  /**
   * Trims a string field, returning empty string if null/undefined.
   * @param value The value to trim
   * @returns The trimmed value or empty string
   */
  static trimString(value: string | null | undefined): string {
    return value?.trim() || '';
  }

  /**
   * Trims an array of strings, filtering out empty values.
   * @param values The values to trim
   * @returns Array of trimmed non-empty values
   */
  static trimStringArray(values: string[] | null | undefined): string[] {
    return values?.map(v => v.trim()).filter(v => v.length > 0) || [];
  }

  /**
   * Validates that a string is not empty after trimming.
   * Used for optional fields that, if provided, must not be empty.
   * @param value The value to validate
   * @param fieldName The field name for error messages
   * @throws Error if value is provided but empty after trim
   */
  static validateNotEmpty(value: string | null | undefined, fieldName: string): void {
    if (value !== null && value !== undefined && !value.trim()) {
      throw new Error(`${fieldName} cannot be empty`);
    }
  }
}

export default ValidationHelpers;
