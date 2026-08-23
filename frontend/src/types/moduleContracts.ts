export interface TimestampedDto {
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeFlowStepDto {
  id: string;
  title: string;
  linkedApiOperationId?: string;
  description: string;
  expectedResult: string;
  notes: string;
}

export interface KnowledgeFlowDto extends TimestampedDto {
  id: string;
  projectId: string;
  name: string;
  description: string;
  tags: string[];
  status: 'Draft' | 'Confirmed' | 'Deprecated';
  steps: KnowledgeFlowStepDto[];
}

export interface BusinessRuleDto extends TimestampedDto {
  id: string;
  projectId: string;
  name: string;
  description: string;
  ruleType: string;
  condition: string;
  expectedOutcome: string;
  severity: 'High' | 'Medium' | 'Low';
  linkedApiOperationIds: string[];
  linkedRequirementIds: string[];
  tags: string[];
  isActive: boolean;
}

export interface RuntimeVariableDto extends TimestampedDto {
  id: string;
  projectId: string;
  name: string;
  description: string;
  scope: 'Global' | 'Project' | 'Environment' | 'Flow';
  defaultValue: string;
  isSensitive: boolean;
  linkedApiOperationIds: string[];
  linkedRequirementIds: string[];
  tags: string[];
}

export interface DependencyDto extends TimestampedDto {
  id: string;
  projectId: string;
  name: string;
  description: string;
  dependencyType: 'Service' | 'Database' | 'Queue' | 'Cache' | 'External' | 'Token' | 'Config';
  target: string;
  version: string;
  isRequired: boolean;
  linkedApiOperationIds: string[];
  linkedRequirementIds: string[];
  tags: string[];
}

export interface DocumentationDto extends TimestampedDto {
  id: string;
  projectId: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  linkedApiOperationIds: string[];
  linkedRequirementIds: string[];
  author: string;
  version: string;
}

export interface DatasetDto extends TimestampedDto {
  id: string;
  projectId: string;
  name: string;
  description: string;
  category: string;
  rowCount: number;
}

export interface ColumnDto extends TimestampedDto {
  id: string;
  datasetId: string;
  name: string;
  displayName: string;
  dataType: string;
  required: boolean;
  unique: boolean;
  nullable: boolean;
  description: string;
}

export interface DataSourceMappingDto extends TimestampedDto {
  id: string;
  projectId: string;
  serviceId: string;
  operationId: string;
  fieldPath: string;
  sourceType: string;
  datasetId?: string;
  datasetColumn?: string;
  environmentVariable?: string;
  runtimeOperationId?: string;
  runtimeField?: string;
  notes: string;
}

export interface PopulationProfileDto extends TimestampedDto {
  id: string;
  datasetId: string;
  columnId: string;
  strategyType: string;
  configuration: Record<string, any>;
}

export interface DatasetRowDto extends TimestampedDto {
  id: string;
  projectId: string;
  datasetId: string;
  values: Record<string, any>;
}

export interface RelationshipDto extends TimestampedDto {
  id: string;
  projectId: string;
  parentDatasetId: string;
  childDatasetId: string;
  relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  parentColumn: string;
  childColumn: string;
  cardinality: '1:1' | '1:N' | 'N:1';
  enabled: boolean;
}

export interface ProviderDto extends TimestampedDto {
  id: string;
  projectId: string;
  name: string;
  category: 'Email' | 'SMS' | 'Payment' | 'Storage' | 'Custom';
  adapter: 'Mailtrap' | 'MailHog' | 'TempMail' | 'Twilio' | 'StripeSandbox' | 'Custom';
  configuration: Record<string, any>;
  credentials: Record<string, any>;
  enabled: boolean;
  isDefault: boolean;
}

export interface ExecutionProfileDto extends TimestampedDto {
  id: string;
  projectId: string;
  name: string;
  description: string;
  defaultEnvironmentId: string;
  failureMode: 'StopOnFailure' | 'ContinueOnFailure';
  retryPolicy: {
    enabled: boolean;
    maxRetries: number;
    retryDelay: number;
  };
  timeout: number;
  parallelism: {
    enabled: boolean;
    maxConcurrent: number;
  };
  assertionMode: 'all' | 'failFast' | 'skipOnFailure';
  runtimeVariableReset: boolean;
  datasetSelectionStrategy: 'first' | 'random' | 'sequential';
  tags: string[];
  enabled: boolean;
  isDefault: boolean;
}

export interface ExecutionRunSummaryDto {
  totalSteps: number;
  passed: number;
  failed: number;
  skipped: number;
  blocked?: number;
  duration: number;
  validationPassed: number;
  validationFailed: number;
  validationWarnings: number;
}

export interface ExecutionRunStepResultDto {
  stepId: string;
  executionOrder: number;
  status: 'Pending' | 'Running' | 'Passed' | 'Failed' | 'Skipped';
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
  assertions: Array<{
    type: string;
    operator: string;
    path: string;
    expected: any;
    actual: any;
    passed: boolean;
  }>;
  capturedVariables: Record<string, any>;
  error: string | null;
  startedAt: number;
  completedAt: number | null;
  validations: Array<{
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
  }>;
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

export interface ExecutionProfileMetadataDto {
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

export interface ExecutionRunDto extends TimestampedDto {
  id: string;
  projectId: string;
  requirementId: string;
  executionPlanId: string;
  executionProfileId?: string;
  failureMode: 'ContinueOnFailure' | 'StopOnFailure';
  status: 'Pending' | 'Running' | 'Completed' | 'Failed' | 'Cancelled';
  context: {
    environmentId: string;
    baseUrl: string;
    environmentVariables: Record<string, string>;
    datasetValues: Record<string, any>;
    runtimeVariables: Record<string, any>;
    responses: Record<string, any>;
    headers: Record<string, string>;
  };
  stepResults: ExecutionRunStepResultDto[];
  summary: ExecutionRunSummaryDto;
  completedAt: number | null;
  executionProfile?: ExecutionProfileMetadataDto;
  suiteId?: string | null;
  executionPlanIds?: string[];
  dependencyGraph?: Array<{ executionPlanId: string; prerequisitePlanIds: string[] }>;
  suiteSnapshot?: Record<string, unknown> | null;
}

export interface ExecutionPlanDto extends TimestampedDto {
  id: string;
  projectId: string;
  requirementId: string;
  testDesignId: string;
  executionOrder: number;
  prerequisiteDesignIds: string[];
  operationId: string;
  environmentId: string;
  datasetId: string;
  runtimeBindings: Array<{
    variable: string;
    source: 'request' | 'response' | 'environment';
    path?: string;
  }>;
  requestTemplate: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    queryParams?: Record<string, string>;
    body?: any;
  };
  assertions: Array<{
    type: 'status' | 'body' | 'header' | 'jsonPath';
    operator: 'equals' | 'contains' | 'matches' | 'exists';
    path: string;
    expected: any;
  }>;
  cleanupSteps: Array<{
    type: 'api' | 'dataset' | 'environment';
    action: string;
    target: string;
  }>;
  status: 'Pending' | 'Ready' | 'Disabled';
}
