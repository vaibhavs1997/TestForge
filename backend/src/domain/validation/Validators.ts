// Validators - Individual validators for each validation rule type
import { ValidationResult, ValidationRule } from './ValidationRuleEntity.js';

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
    const legacyErrorAssertion = rule.config.path === '$.error' && expected === 'true';
    const passed = legacyErrorAssertion
      ? Boolean(response?.data?.error || response?.data?.message || response?.data?.errors)
      : actual.includes(expected);
    
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
    const config = rule.config || {};
    try {
      const definition = typeof config.expected === 'object' && config.expected !== null
        ? { ...config.expected, path: config.expected.path ?? config.path }
        : { path: config.path, expected: config.expected, operator: config.operator };
      const operator = String(definition.operator || 'equals').toLowerCase();
      const target = String(definition.target || definition.scope || 'body').toLowerCase();
      const path = String(definition.path || definition.expression || '');
      const actual = this.customValue(target, path, response, context);
      const expected = definition.expected ?? definition.value;
      const passed = this.customOperator(operator, actual, expected);
      return { rule, expected, actual: this.safeActual(actual), status: passed ? 'Passed' : 'Failed', duration: Date.now() - startTime, error: passed ? null : `Custom assertion failed: ${operator} at ${path || target}` };
    } catch (error: any) {
      return { rule, expected: null, actual: null, status: 'Failed', duration: Date.now() - startTime, error: `Invalid custom assertion: ${error instanceof Error ? error.message : 'unsupported definition'}` };
    }
  }

  private static customValue(target: string, path: string, response: any, context: any): any {
    if (target === 'status') return response?.status;
    if (target === 'duration' || target === 'time') return response?.duration;
    if (target === 'header' || target === 'headers') return this.extractJSONPath(response?.headers || {}, path);
    if (target === 'runtime') return this.extractJSONPath(context?.runtimeVariables || {}, path);
    if (target === 'body' || target === 'json') return this.extractJSONPath(response?.data, path);
    if (path.startsWith('headers.')) return this.extractJSONPath(response?.headers || {}, path.slice(8));
    if (path === 'status') return response?.status;
    if (path === 'duration') return response?.duration;
    return this.extractJSONPath(response?.data, path);
  }

  private static customOperator(operator: string, actual: any, expected: any): boolean {
    switch (operator) {
      case 'equals': case 'equal': return actual === expected;
      case 'not equals': case 'not_equals': case 'not-equals': return actual !== expected;
      case 'exists': return actual !== undefined && actual !== null;
      case 'not exists': case 'not_exists': case 'not-exists': return actual === undefined || actual === null;
      case 'contains': return Array.isArray(actual) ? actual.includes(expected) : String(actual ?? '').includes(String(expected));
      case 'matches': case 'regex': {
        if (typeof expected !== 'string') throw new Error('matches requires a string regex');
        try { return new RegExp(expected).test(String(actual ?? '')); } catch { throw new Error('matches has an invalid regex'); }
      }
      case 'greater than': case 'greater_than': case 'gt': return Number(actual) > Number(expected);
      case 'less than': case 'less_than': case 'lt': return Number(actual) < Number(expected);
      case 'type': case 'type check': case 'type_check': return expected === 'array' ? Array.isArray(actual) : typeof actual === expected;
      case 'array length': case 'array_length': case 'count': return (Array.isArray(actual) || typeof actual === 'string') && actual.length === Number(expected);
      case 'schema': return this.schemaMatches(actual, expected);
      default: throw new Error(`unsupported operator "${operator}"`);
    }
  }

  private static schemaMatches(actual: any, expected: any): boolean {
    if (!expected || typeof expected !== 'object' || Array.isArray(expected) || !actual || typeof actual !== 'object') throw new Error('schema requires object expected and actual values');
    return Object.entries(expected).every(([key, type]) => key in actual && (type === 'array' ? Array.isArray(actual[key]) : typeof actual[key] === type));
  }

  private static safeActual(actual: any): any {
    if (typeof actual === 'string' && /(token|secret|password|api[_-]?key)/i.test(actual)) return '[REDACTED]';
    return actual;
  }

  private static extractJSONPath(data: any, path: string): any {
    if (!path || !data) return undefined;
    
    // Support simple JSON path (e.g., "$.data.id" or "data.id")
    let cleanPath = path;
    if (cleanPath.startsWith('$.')) {
      cleanPath = cleanPath.substring(2);
    }
    
    const parts = cleanPath.replace(/\[(['"]?)([^\]'".]+)\1\]/g, '.$2').split('.').filter(Boolean);
    let value = data;
    for (const part of parts) {
      if (value === undefined || value === null) return undefined;
      value = value[part];
    }
    return value;
  }
}
