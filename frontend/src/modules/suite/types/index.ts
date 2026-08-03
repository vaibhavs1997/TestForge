// Test Suite Management domain types
export type SuiteExecutionPolicy = 'Sequential' | 'FailFast' | 'ContinueOnError';
export type SuiteStatus = 'Draft' | 'Active' | 'Archived';

export interface SuiteTag {
  id: string;
  name: string;
}

export interface TestSuiteItem {
  executionPlanId: string;
  order: number;
}

export interface TestSuite {
  id: string;
  projectId: string;
  name: string;
  description: string;
  tags: SuiteTag[];
  executionPlans: TestSuiteItem[];
  defaultEnvironmentId: string;
  executionPolicy: SuiteExecutionPolicy;
  estimatedDuration: number;
  status: SuiteStatus;
  createdAt: number;
  updatedAt: number;
}

export interface TestSuiteFormData {
  name: string;
  description: string;
  tags: SuiteTag[];
  executionPlans: TestSuiteItem[];
  defaultEnvironmentId: string;
  executionPolicy: SuiteExecutionPolicy;
  estimatedDuration: number;
  status: SuiteStatus;
}