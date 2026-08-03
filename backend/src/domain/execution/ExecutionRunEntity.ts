// ExecutionRunEntity - Domain Entity for Execution Engine
// Executes an existing Execution Plan. Does NOT generate plans or reports.

export type RunStatus = 'Pending' | 'Running' | 'Completed' | 'Failed' | 'Cancelled';
export type StepStatus = 'Pending' | 'Running' | 'Passed' | 'Failed' | 'Skipped';
export type FailureMode = 'ContinueOnFailure' | 'StopOnFailure';

export interface ExecutionContext {
  environmentId: string;
  baseUrl: string;
  environmentVariables: Record<string, string>;
  datasetValues: Record<string, any>;
  runtimeVariables: Record<string, any>;
  responses: Record<string, any>;
  headers: Record<string, string>;
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
  assertions: {
    type: string;
    operator: string;
    path: string;
    expected: any;
    actual: any;
    passed: boolean;
  }[];
  capturedVariables: Record<string, any>;
  error: string | null;
  startedAt: number;
  completedAt: number | null;
  validations: {
    rule: {
      id: string;
      name: string;
      type: string;
      config: any;
    };
    expected: any;
    actual: any;
    status: 'Passed' | 'Failed' | 'Warning';
    duration: number;
    error: string | null;
  }[];
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

export class ExecutionRunEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly requirementId: string,
    public readonly executionPlanId: string,
    public readonly failureMode: FailureMode,
    public status: RunStatus,
    public context: ExecutionContext,
    public stepResults: ExecutionStepResult[],
    public validationResults: any[],
    public summary: ExecutionSummary,
    public readonly createdAt: number,
    public updatedAt: number,
    public completedAt: number | null
  ) {}
}

export default ExecutionRunEntity;