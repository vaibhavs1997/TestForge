// ExecutionProfileEntity - Domain Entity for Execution Profiles
// Reusable execution configurations

export class ExecutionProfileEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public name: string,
    public description: string,
    public defaultEnvironmentId: string,
    public failureMode: 'StopOnFailure' | 'ContinueOnFailure',
    public retryPolicy: {
      enabled: boolean;
      maxRetries: number;
      retryDelay: number;
    },
    public timeout: number,
    public parallelism: {
      enabled: boolean;
      maxConcurrent: number;
    },
    public assertionMode: 'all' | 'failFast' | 'skipOnFailure',
    public runtimeVariableReset: boolean,
    public datasetSelectionStrategy: 'first' | 'random' | 'sequential',
    public tags: string[],
    public enabled: boolean,
    public isDefault: boolean,
    public readonly createdAt: number,
    public updatedAt: number
  ) {}
}

export default ExecutionProfileEntity;