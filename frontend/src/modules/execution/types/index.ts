// Execution module types
export type ExecutionRunStatus = 'Pending' | 'Running' | 'Completed' | 'Failed' | 'Cancelled';
export type StepStatus = 'Pending' | 'Running' | 'Passed' | 'Failed' | 'Skipped';
export type FailureMode = 'ContinueOnFailure' | 'StopOnFailure';

export interface RequestTemplate {
  method: string;
  path: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: any;
}

export interface Assertion {
  type: string;
  operator: string;
  path: string;
  expected: any;
  actual: any;
  passed: boolean;
}

export interface RuntimeBinding {
  variable: string;
  source: string;
  path?: string;
}

export interface CleanupStep {
  type: string;
  action: string;
  target: string;
}

export interface ValidationResult {
  rule: {
    id: string;
    name: string;
    type: string;
    config: any;
  };
  expected: any;
  actual: any;
  status: "Passed" | "Failed" | "Warning";
  duration: number;
  error: string | null;
}

export interface ExecutionStepResult {
  stepId: string;
  executionOrder: number;
  status: StepStatus;
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
  };
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: any;
    duration: number;
  } | null;
  assertions: Assertion[];
  capturedVariables: Record<string, any>;
  error: string | null;
  startedAt: number;
  completedAt: number | null;
  validations: ValidationResult[];
  resolvedTestData?: {
    resolvedValues: Record<string, any>;
    datasetId?: string;
    sequentialPositions: [string, number][];
  };
  reusableAssertions?: Array<{
    id: string;
    name: string;
    type: string;
    enabled: boolean;
  }>;
}

export interface ExecutionSummary {
  totalSteps: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  validationPassed: number;
  validationFailed: number;
  validationWarnings: number;
}

export interface ExecutionProfileMetadata {
  profileName: string;
  profileId: string;
  profileSettings: {
    failureMode: string;
    timeout: number;
    retryPolicy: { enabled: boolean; maxRetries: number; retryDelay: number };
    assertionMode: string;
    runtimeVariableReset: boolean;
    datasetSelectionStrategy: string;
    defaultEnvironmentId: string | null;
    parallelism: { enabled: boolean; maxConcurrent: number };
  };
}

export interface ExecutionRun {
  id: string;
  projectId: string;
  requirementId: string;
  executionPlanId: string;
  executionProfileId?: string;
  failureMode: FailureMode;
  status: ExecutionRunStatus;
  context: {
    environmentId: string;
    baseUrl: string;
    environmentVariables: Record<string, string>;
    datasetValues: Record<string, any>;
    runtimeVariables: Record<string, any>;
    responses: Record<string, any>;
    headers: Record<string, string>;
  };
  stepResults: ExecutionStepResult[];
  summary: ExecutionSummary;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  executionProfile?: ExecutionProfileMetadata;
}

export interface ExecutionRunCreatePayload {
  executionPlanId: string;
  failureMode?: FailureMode;
  executionProfileId?: string;
}
