// ValidationRuleEntity - Domain Entity for Validation Engine
// Defines validation rules that are applied to execution results.

export type ValidationRuleType = 
  | 'HTTP Status'
  | 'Header Exists'
  | 'Header Equals'
  | 'JSON Path Exists'
  | 'JSON Path Equals'
  | 'Response Time'
  | 'Response Schema'
  | 'Response Body Contains'
  | 'Runtime Variable Exists'
  | 'Custom Assertion';

export interface ValidationRule {
  id: string;
  executionPlanId: string;
  name: string;
  type: ValidationRuleType;
  config: {
    path?: string;
    expected?: any;
    operator?: string;
    schema?: any;
    maxDuration?: number;
  };
}

export interface ValidationResult {
  rule: ValidationRule;
  expected: any;
  actual: any;
  status: 'Passed' | 'Failed' | 'Warning';
  duration: number;
  error: string | null;
}

export interface StepValidationResult {
  stepId: string;
  executionOrder: number;
  validations: ValidationResult[];
  stepStatus: 'Passed' | 'Failed';
}
