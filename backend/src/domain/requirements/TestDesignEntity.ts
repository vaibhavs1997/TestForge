// TestDesignEntity - Domain Entity for Test Design
// Converts approved Test Strategy items into executable designs.
// Does NOT execute tests or generate reports.

export type DesignPriority = 'High' | 'Medium' | 'Low';
export type DesignStatus = 'Draft' | 'Ready' | 'Disabled';
export type TestCaseType = 'Positive' | 'Negative' | 'Security';

export interface RequestOverride {
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: any;
}

export interface RuntimeBinding {
  variable: string;
  source: 'request' | 'response' | 'environment';
  path?: string;
}

export interface Assertion {
  type: 'status' | 'body' | 'header' | 'jsonPath';
  operator: 'equals' | 'contains' | 'matches' | 'exists';
  path: string;
  expected: any;
}

export interface AssertionReference {
  assertionId: string;
  enabled: boolean;
}

export interface CleanupStep {
  type: 'api' | 'dataset' | 'environment';
  action: string;
  target: string;
}

export class TestDesignEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly requirementId: string,
    public readonly strategyItemId: string,
    public readonly title: string,
    public readonly operationId: string,
    public readonly environmentId: string,
    public readonly datasetId: string,
    public readonly datasetRowReference: string,
    public readonly requestOverrides: RequestOverride,
    public readonly runtimeBindings: RuntimeBinding[],
    public readonly assertions: Assertion[],
    public readonly cleanup: CleanupStep[],
    public readonly priority: DesignPriority,
    public readonly status: DesignStatus,
    public readonly createdAt: number,
    public readonly updatedAt: number,
    public readonly assertionIds: AssertionReference[] = [],
    public readonly testCaseType?: TestCaseType,
    public readonly expectedHttpStatus?: number
  ) {}
}

export default TestDesignEntity;