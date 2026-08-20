import type {
  BusinessRuleDto,
  ColumnDto,
  DatasetDto,
  DatasetRowDto,
  DependencyDto,
  DocumentationDto,
  ExecutionPlanDto,
  ExecutionProfileDto,
  ExecutionRunDto,
  ExecutionRunStepResultDto,
  KnowledgeFlowDto,
  KnowledgeFlowStepDto,
  PopulationProfileDto,
  ProviderDto,
  RelationshipDto,
  RuntimeVariableDto,
  DataSourceMappingDto,
} from '../types/moduleContracts';

function normalizeStringArray(value: string[] | null | undefined): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeObject<T extends Record<string, any>>(value: T | null | undefined, fallback: T): T {
  return value && typeof value === 'object' ? value : fallback;
}

function normalizeKnowledgeFlowStep(step: KnowledgeFlowStepDto): KnowledgeFlowStepDto {
  return {
    ...step,
    description: step.description ?? '',
    expectedResult: step.expectedResult ?? '',
    notes: step.notes ?? '',
  };
}

export function normalizeKnowledgeFlow(raw: KnowledgeFlowDto): KnowledgeFlowDto {
  return {
    ...raw,
    description: raw.description ?? '',
    tags: normalizeStringArray(raw.tags),
    steps: Array.isArray(raw.steps) ? raw.steps.map(normalizeKnowledgeFlowStep) : [],
  };
}

export function normalizeBusinessRule(raw: BusinessRuleDto): BusinessRuleDto {
  return {
    ...raw,
    description: raw.description ?? '',
    linkedApiOperationIds: normalizeStringArray(raw.linkedApiOperationIds),
    linkedRequirementIds: normalizeStringArray(raw.linkedRequirementIds),
    tags: normalizeStringArray(raw.tags),
  };
}

export function normalizeRuntimeVariable(raw: RuntimeVariableDto): RuntimeVariableDto {
  return {
    ...raw,
    description: raw.description ?? '',
    linkedApiOperationIds: normalizeStringArray(raw.linkedApiOperationIds),
    linkedRequirementIds: normalizeStringArray(raw.linkedRequirementIds),
    tags: normalizeStringArray(raw.tags),
  };
}

export function normalizeDependency(raw: DependencyDto): DependencyDto {
  return {
    ...raw,
    description: raw.description ?? '',
    linkedApiOperationIds: normalizeStringArray(raw.linkedApiOperationIds),
    linkedRequirementIds: normalizeStringArray(raw.linkedRequirementIds),
    tags: normalizeStringArray(raw.tags),
  };
}

export function normalizeDocumentation(raw: DocumentationDto): DocumentationDto {
  return {
    ...raw,
    content: raw.content ?? '',
    category: raw.category ?? 'General',
    tags: normalizeStringArray(raw.tags),
    linkedApiOperationIds: normalizeStringArray(raw.linkedApiOperationIds),
    linkedRequirementIds: normalizeStringArray(raw.linkedRequirementIds),
    author: raw.author ?? '',
    version: raw.version ?? '',
  };
}

export function normalizeDataset(raw: DatasetDto): DatasetDto {
  return {
    ...raw,
    name: typeof raw?.name === 'string' && raw.name.trim() ? raw.name : 'Untitled dataset',
    description: raw.description ?? '',
    category: raw.category ?? 'General',
    rowCount: typeof raw.rowCount === 'number' ? raw.rowCount : 0,
  };
}

export function normalizeColumn(raw: ColumnDto): ColumnDto {
  return {
    ...raw,
    description: raw.description ?? '',
    displayName: raw.displayName ?? raw.name ?? '',
    dataType: raw.dataType ?? 'string',
    required: Boolean(raw.required),
    unique: Boolean(raw.unique),
    nullable: Boolean(raw.nullable),
  };
}

export function normalizeDataSourceMapping(raw: DataSourceMappingDto): DataSourceMappingDto {
  return {
    ...raw,
    notes: raw.notes ?? '',
  };
}

export function normalizePopulationProfile(raw: PopulationProfileDto): PopulationProfileDto {
  return {
    ...raw,
    configuration: normalizeObject(raw.configuration, {}),
  };
}

export function normalizeDatasetRow(raw: DatasetRowDto): DatasetRowDto {
  return {
    ...raw,
    values: normalizeObject(raw.values, {}),
  };
}

export function normalizeRelationship(raw: RelationshipDto): RelationshipDto {
  return {
    ...raw,
    enabled: Boolean(raw.enabled),
  };
}

export function normalizeProvider(raw: ProviderDto): ProviderDto {
  return {
    ...raw,
    configuration: normalizeObject(raw.configuration, {}),
    credentials: normalizeObject(raw.credentials, {}),
    enabled: Boolean(raw.enabled),
    isDefault: Boolean(raw.isDefault),
  };
}

const defaultExecutionSummary = {
  totalSteps: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  duration: 0,
  validationPassed: 0,
  validationFailed: 0,
  validationWarnings: 0,
};

const defaultExecutionContext = {
  environmentId: '',
  baseUrl: '',
  environmentVariables: {},
  datasetValues: {},
  runtimeVariables: {},
  responses: {},
  headers: {},
};

export function normalizeExecutionRunStepResult(raw: ExecutionRunStepResultDto): ExecutionRunStepResultDto {
  return {
    ...raw,
    assertions: Array.isArray(raw.assertions) ? raw.assertions : [],
    capturedVariables: normalizeObject(raw.capturedVariables, {}),
    validations: Array.isArray(raw.validations) ? raw.validations : [],
    resolvedTestData: raw.resolvedTestData
      ? {
          resolvedValues: normalizeObject(raw.resolvedTestData.resolvedValues, {}),
          datasetId: raw.resolvedTestData.datasetId,
          sequentialPositions: Array.isArray(raw.resolvedTestData.sequentialPositions)
            ? raw.resolvedTestData.sequentialPositions
            : [],
        }
      : undefined,
    reusableAssertions: Array.isArray(raw.reusableAssertions) ? raw.reusableAssertions : undefined,
  };
}

export function normalizeExecutionRun(raw: ExecutionRunDto): ExecutionRunDto {
  return {
    ...raw,
    // Older or partially persisted execution records may omit identifiers.
    // Keep them renderable so one malformed run cannot blank the workspace.
    id: typeof raw?.id === 'string' ? raw.id : String(raw?.id ?? ''),
    projectId: typeof raw?.projectId === 'string' ? raw.projectId : String(raw?.projectId ?? ''),
    requirementId: typeof raw?.requirementId === 'string' ? raw.requirementId : String(raw?.requirementId ?? ''),
    executionPlanId: typeof raw?.executionPlanId === 'string' ? raw.executionPlanId : String(raw?.executionPlanId ?? ''),
    context: normalizeObject(raw.context, defaultExecutionContext),
    stepResults: Array.isArray(raw.stepResults) ? raw.stepResults.map(normalizeExecutionRunStepResult) : [],
    summary: normalizeObject(raw.summary, defaultExecutionSummary),
    completedAt: raw.completedAt ?? null,
    executionProfile: raw.executionProfile
      ? {
          ...raw.executionProfile,
          profileSettings: normalizeObject(raw.executionProfile.profileSettings, {
            failureMode: '',
            timeout: 0,
            retryPolicy: { enabled: false, maxRetries: 0, retryDelay: 0 },
            assertionMode: '',
            runtimeVariableReset: false,
            datasetSelectionStrategy: '',
            defaultEnvironmentId: null,
            parallelism: { enabled: false, maxConcurrent: 0 },
          }),
        }
      : undefined,
  };
}

export function normalizeExecutionProfile(raw: ExecutionProfileDto): ExecutionProfileDto {
  return {
    ...raw,
    description: raw.description ?? '',
    defaultEnvironmentId: raw.defaultEnvironmentId ?? '',
    tags: normalizeStringArray(raw.tags),
    enabled: Boolean(raw.enabled),
    isDefault: Boolean(raw.isDefault),
  };
}

export function normalizeExecutionPlan(raw: ExecutionPlanDto): ExecutionPlanDto {
  return {
    ...raw,
    status: raw.status ?? 'Draft',
  };
}
