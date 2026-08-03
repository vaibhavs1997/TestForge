// Validators - Individual validators for each validation rule type
import { ValidationResult, ValidationRule } from './ValidationRuleEntity';

export class Validators {
  static validateHTTPStatus(rule: ValidationRule, response: any): ValidationResult {
    const startTime = Date.now();
    const expected = rule.config.expected as number;
    const actual = response?.status;
    const passed = actual === expected;
    
    return {
      rule,
      expected,
      actual,
      status: passed ? 'Passed' : 'Failed',
      duration: Date.now() - startTime,
      error: passed ? null : `Expected status ${expected}, got ${actual}`,
    };
  }

  static validateHeaderExists(rule: ValidationRule, response: any): ValidationResult {
    const startTime = Date.now();
    const headerName = rule.config.path as string;
    const actual = response?.headers?.[headerName];
    const passed = actual !== undefined && actual !== null;
    
    return {
      rule,
      expected: 'Header exists',
      actual: actual || 'Not found',
      status: passed ? 'Passed' : 'Failed',
      duration: Date.now() - startTime,
      error: passed ? null : `Header '${headerName}' not found`,
    };
  }

  static validateHeaderEquals(rule: ValidationRule, response: any): ValidationResult {
    const startTime = Date.now();
    const headerName = rule.config.path as string;
    const expected = rule.config.expected as string;
    const actual = response?.headers?.[headerName];
    const passed = actual === expected;
    
    return {
      rule,
      expected,
      actual: actual || 'Not found',
      status: passed ? 'Passed' : 'Failed',
      duration: Date.now() - startTime,
      error: passed ? null : `Expected header '${headerName}' to equal '${expected}', got '${actual}'`,
    };
  }

  static validateJSONPathExists(rule: ValidationRule, response: any): ValidationResult {
    const startTime = Date.now();
    const path = rule.config.path as string;
    const actual = this.extractJSONPath(response?.data, path);
    const passed = actual !== undefined && actual !== null;
    
    return {
      rule,
      expected: 'JSON path exists',
      actual: actual !== undefined && actual !== null ? actual : 'Not found',
      status: passed ? 'Passed' : 'Failed',
      duration: Date.now() - startTime,
      error: passed ? null : `JSON path '${path}' not found`,
    };
  }

  static validateJSONPathEquals(rule: ValidationRule, response: any): ValidationResult {
    const startTime = Date.now();
    const path = rule.config.path as string;
    const expected = rule.config.expected;
    const actual = this.extractJSONPath(response?.data, path);
    const passed = actual === expected;
    
    return {
      rule,
      expected,
      actual: actual !== undefined ? actual : 'Not found',
      status: passed ? 'Passed' : 'Failed',
      duration: Date.now() - startTime,
      error: passed ? null : `JSON path '${path}' expected '${expected}', got '${actual}'`,
    };
  }

  static validateResponseTime(rule: ValidationRule, response: any): ValidationResult {
    const startTime = Date.now();
    const maxDuration = rule.config.maxDuration as number;
    const actual = response?.duration as number;
    const passed = actual <= maxDuration;
    
    return {
      rule,
      expected: `<= ${maxDuration}ms`,
      actual: `${actual}ms`,
      status: passed ? 'Passed' : 'Warning',
      duration: Date.now() - startTime,
      error: passed ? null : `Response time ${actual}ms exceeded max ${maxDuration}ms`,
    };
  }

  static validateResponseSchema(rule: ValidationRule, response: any): ValidationResult {
    const startTime = Date.now();
    const schema = rule.config.schema;
    const actual = response?.data;
    
    // Simple schema validation (in production, use a proper schema validator like Zod)
    let passed = true;
    let errorMessage: string | null = null;
    
    if (schema && typeof schema === 'object') {
      for (const [key, expectedType] of Object.entries(schema)) {
        if (!(key in actual)) {
          passed = false;
          errorMessage = `Missing required field: ${key}`;
          break;
        }
        if (typeof actual[key] !== expectedType) {
          passed = false;
          errorMessage = `Field '${key}' expected type '${expectedType}', got '${typeof actual[key]}'`;
          break;
        }
      }
    }
    
    return {
      rule,
      expected: schema,
      actual,
      status: passed ? 'Passed' : 'Failed',
      duration: Date.now() - startTime,
      error: errorMessage,
    };
  }

  static validateResponseBodyContains(rule: ValidationRule, response: any): ValidationResult {
    const startTime = Date.now();
    const expected = rule.config.expected as string;
    const actual = JSON.stringify(response?.data);
    const passed = actual.includes(expected);
    
    return {
      rule,
      expected: `Contains '${expected}'`,
      actual: actual,
      status: passed ? 'Passed' : 'Failed',
      duration: Date.now() - startTime,
      error: passed ? null : `Response body does not contain '${expected}'`,
    };
  }

  static validateRuntimeVariableExists(rule: ValidationRule, context: any): ValidationResult {
    const startTime = Date.now();
    const variableName = rule.config.path as string;
    const actual = context?.runtimeVariables?.[variableName];
    const passed = actual !== undefined && actual !== null;
    
    return {
      rule,
      expected: 'Runtime variable exists',
      actual: actual !== undefined ? actual : 'Not found',
      status: passed ? 'Passed' : 'Failed',
      duration: Date.now() - startTime,
      error: passed ? null : `Runtime variable '${variableName}' not found`,
    };
  }

  static validateCustomAssertion(rule: ValidationRule, response: any, context: any): ValidationResult {
    const startTime = Date.now();
    // Placeholder for custom assertion logic
    return {
      rule,
      expected: rule.config.expected,
      actual: 'Custom assertion not implemented',
      status: 'Warning',
      duration: Date.now() - startTime,
      error: 'Custom assertions are not yet implemented',
    };
  }

  private static extractJSONPath(data: any, path: string): any {
    if (!path || !data) return undefined;
    
    // Support simple JSON path (e.g., "$.data.id" or "data.id")
    let cleanPath = path;
    if (cleanPath.startsWith('$.')) {
      cleanPath = cleanPath.substring(2);
    }
    
    const parts = cleanPath.split('.');
    let value = data;
    for (const part of parts) {
      if (value === undefined || value === null) return undefined;
      value = value[part];
    }
    return value;
  }
}