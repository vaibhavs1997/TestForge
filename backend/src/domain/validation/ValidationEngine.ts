// ValidationEngine - Orchestrates validation of execution results
import { ValidationRule, ValidationResult, StepValidationResult } from './ValidationRuleEntity';
import { Validators } from './Validators';

export interface ValidationContext {
  response: any;
  runtimeVariables: Record<string, any>;
}

export class ValidationEngine {
  static validateStep(rules: ValidationRule[], context: ValidationContext): StepValidationResult {
    const startTime = Date.now();
    const results: ValidationResult[] = [];
    let hasFailures = false;

    for (const rule of rules) {
      try {
        let result: ValidationResult;
        
        switch (rule.type) {
          case 'HTTP Status':
            result = Validators.validateHTTPStatus(rule, context.response);
            break;
          case 'Header Exists':
            result = Validators.validateHeaderExists(rule, context.response);
            break;
          case 'Header Equals':
            result = Validators.validateHeaderEquals(rule, context.response);
            break;
          case 'JSON Path Exists':
            result = Validators.validateJSONPathExists(rule, context.response);
            break;
          case 'JSON Path Equals':
            result = Validators.validateJSONPathEquals(rule, context.response);
            break;
          case 'Response Time':
            result = Validators.validateResponseTime(rule, context.response);
            break;
          case 'Response Schema':
            result = Validators.validateResponseSchema(rule, context.response);
            break;
          case 'Response Body Contains':
            result = Validators.validateResponseBodyContains(rule, context.response);
            break;
          case 'Runtime Variable Exists':
            result = Validators.validateRuntimeVariableExists(rule, context);
            break;
          case 'Custom Assertion':
            result = Validators.validateCustomAssertion(rule, context.response, context);
            break;
          default:
            result = {
              rule,
              expected: null,
              actual: null,
              status: 'Failed',
              duration: 0,
              error: `Unknown validation type: ${rule.type}`,
            };
        }
        
        results.push(result);
        if (result.status === 'Failed') {
          hasFailures = true;
        }
      } catch (error: any) {
        results.push({
          rule,
          expected: null,
          actual: null,
          status: 'Failed',
          duration: Date.now() - startTime,
          error: `Validation error: ${error.message}`,
        });
        hasFailures = true;
      }
    }

    return {
      stepId: '', // Will be set by caller
      executionOrder: 0, // Will be set by caller
      validations: results,
      stepStatus: hasFailures ? 'Failed' : 'Passed',
    };
  }
}