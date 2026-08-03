// AssertionEntity - Domain Entity for Assertion Library

export type AssertionCategory = 'Functional' | 'Performance' | 'Security' | 'Data' | 'Business' | 'Custom';
export type AssertionSeverity = 'Critical' | 'Major' | 'Minor' | 'Info';
export type AssertionType = 
  | 'HTTP Status'
  | 'Header Exists'
  | 'Header Equals'
  | 'JSON Path Exists'
  | 'JSON Path Equals'
  | 'Body Contains'
  | 'Body Regex'
  | 'Response Time'
  | 'Response Schema'
  | 'Runtime Variable Exists'
  | 'Custom Assertion';

export interface AssertionReference {
  assertionId: string;
  enabled: boolean;
}

export interface AssertionEntity {
  readonly id: string;
  readonly projectId: string;
  name: string;
  description: string;
  category: AssertionCategory;
  enabled: boolean;
  type: AssertionType;
  expression: string;
  expectedValue: any;
  severity: AssertionSeverity;
  tags: string[];
  readonly createdAt: number;
  updatedAt: number;
}

export default AssertionEntity;