// Assertion module types

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

export interface Assertion {
  id: string;
  projectId: string;
  name: string;
  description: string;
  category: AssertionCategory;
  enabled: boolean;
  type: AssertionType;
  expression: string;
  expectedValue: any;
  severity: AssertionSeverity;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface AssertionFormData {
  projectId: string;
  name: string;
  description: string;
  category: AssertionCategory;
  enabled: boolean;
  type: AssertionType;
  expression: string;
  expectedValue: any;
  severity: AssertionSeverity;
  tags: string[];
}