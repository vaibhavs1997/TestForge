// ExecutionRunEntity - Domain Entity for Execution Engine
// Executes an existing Execution Plan. Does NOT generate plans or reports.

export type RunStatus = 'Pending' | 'Running' | 'Completed' | 'Failed' | 'Cancelled';
export type StepStatus = 'Pending' | 'Running' | 'Passed' | 'Failed' | 'Skipped' | 'Blocked';
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

export interface ExecutionDependencyRecord {
  executionPlanId: string;
  prerequisitePlanIds: string[];
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
  blocked: number;
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
    public completedAt: number | null,
    public readonly executionProfileId: string | null = null,
    public readonly executionProfile: ExecutionProfileMetadata | null = null,
    public readonly suiteId: string | null = null,
    public readonly executionPlanIds: string[] = [],
    public readonly dependencyGraph: ExecutionDependencyRecord[] = [],
    /** Immutable audit record of the approved suite definition used for this run. */
    public readonly suiteSnapshot: Record<string, unknown> | null = null,
    public readonly testCaseReferences: Array<{ testCaseId: string; testCaseVersionId: string; version: number }> = []
  ) {}
}

export default ExecutionRunEntity;
