// ExecutionPlanEntity - Domain Entity for Execution Planner
// Converts Test Designs into executable execution plans.
// Does NOT execute APIs. It prepares execution.

export type ExecutionPlanStatus = 'Pending' | 'Ready' | 'Disabled';

export interface RequestTemplate {
  method: string;
  path: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: any;
}

export class ExecutionPlanEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly requirementId: string,
    public readonly testDesignId: string,
    public executionOrder: number,
    public prerequisiteDesignIds: string[],
    public readonly operationId: string,
    public readonly environmentId: string,
    public readonly datasetId: string,
    public readonly runtimeBindings: any[],
    public readonly requestTemplate: RequestTemplate,
    public readonly assertions: any[],
    public readonly cleanupSteps: any[],
    public status: ExecutionPlanStatus,
    public readonly createdAt: number,
    public updatedAt: number,
    public readonly testCaseId?: string,
    public readonly testCaseVersionId?: string,
    public readonly testCaseVersion?: number,
  ) {}
}

export default ExecutionPlanEntity;
