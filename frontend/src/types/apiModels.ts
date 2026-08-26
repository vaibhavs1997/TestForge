export interface TimestampedDto {
  createdAt: number;
  updatedAt: number;
}

export interface ProjectDto extends TimestampedDto {
  id: string;
  name: string;
  projectKey: string;
  description?: string;
  status?: 'active' | 'archived';
  lastOpenedAt?: number;
}

export interface ProjectWorkspaceModel extends ProjectDto {
  lastOpenedAt: number;
  uiStatus: 'active' | 'archived';
}

export interface ApiServiceDto extends TimestampedDto {
  id: string;
  projectId: string;
  name: string;
  description: string;
  version: string;
  tags: string[];
  baseUrl?: string;
  folderPath?: string;
  sourceContract?: {
    raw: Record<string, unknown>;
  } | null;
  contractRefreshRequired?: boolean;
  derived?: {
    baseUrl: string;
    importKey: string | null;
  };
}

export interface ApiOperationDto extends TimestampedDto {
  id: string;
  serviceId: string;
  name: string;
  method: string;
  path: string;
  requestUrl?: string | null;
  description: string;
  authenticationType: string;
  status: string;
  tags?: string[];
  sampleRequestBody?: Record<string, unknown> | null;
  requiredRequestBodyFields?: string[] | null;
  sourceOperation?: {
    raw: Record<string, unknown>;
    parameters: unknown[];
    requestBody: unknown;
    responses: unknown;
    security: unknown[];
    servers: unknown[];
    tags: string[];
    requestContentTypes: string[];
    responseContentTypes: string[];
  } | null;
  contractRefreshRequired?: boolean;
  derived?: {
    requestUrl: string | null;
    sampleRequestBody: Record<string, unknown> | null;
    requiredRequestBodyFields: string[] | null;
    authenticationType: string;
    contentTypes: string[];
  };
}

export interface EnvironmentDto extends TimestampedDto {
  id: string;
  projectId: string;
  name: string;
  baseUrl: string;
  description: string;
  authentication: unknown;
  variables: Record<string, string>;
  timeout: number;
  isDefault?: boolean;
}

export interface ApiOperationView {
  id: string;
  serviceId?: string;
  serviceName?: string;
  apiName?: string;
  name?: string;
  method: string;
  path: string;
  requestUrl?: string | null;
  description: string;
  status: 'active' | 'inactive';
  authentication?: string;
  authenticationType?: string;
  tags?: string[];
  version?: string;
  isCustom?: boolean;
  sampleRequestBody?: Record<string, unknown> | null;
  requiredRequestBodyFields?: string[] | null;
  sourceOperation?: ApiOperationDto['sourceOperation'];
  contractRefreshRequired?: boolean;
  derived?: ApiOperationDto['derived'];
  createdAt?: number;
  updatedAt?: number;
  sourceContract?: ApiServiceDto['sourceContract'];
  serviceDerived?: ApiServiceDto['derived'];
}

export interface ApiExecutionRequestDto {
  requestUrl: string;
  method: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  /** Resolve accepted Field Data rules for this one manual execution. */
  useTestData?: boolean;
  operationId?: string;
  serviceId?: string;
}

export interface ApiExecutionResponseDto {
  ok: boolean;
  requestedAt: string;
  durationMs: number;
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: unknown;
  };
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
    rawBody: string;
    contentType?: string;
  };
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export interface ApiContractRefreshResultDto {
  refreshed: boolean;
  refreshRequired: boolean;
  reason?: string;
  summary?: {
    servicesImported: number;
    servicesUpdated: number;
    operationsImported: number;
    operationsUpdated: number;
    operationsRemoved: number;
    duplicatesSkipped: number;
    warnings: string[];
    detectedEnvironments: Array<{
      name: string;
      baseUrl: string;
      description?: string;
    }>;
  };
}

export function toProjectWorkspaceModel(project: ProjectDto, lastOpenedAt: number): ProjectWorkspaceModel {
  return {
    ...project,
    lastOpenedAt,
    uiStatus: project.status === 'archived' ? 'archived' : 'active',
  };
}

export interface ApiServiceView extends ApiServiceDto {
  sourceContract?: ApiServiceDto['sourceContract'];
  derived?: ApiServiceDto['derived'];
}

export function toApiServiceView(raw: ApiServiceDto): ApiServiceView {
  return {
    ...raw,
    baseUrl: raw.baseUrl?.trim() || raw.derived?.baseUrl || '',
    sourceContract: raw.sourceContract ?? null,
    contractRefreshRequired: raw.contractRefreshRequired ?? !raw.sourceContract,
    derived: raw.derived,
  };
}

export function toApiOperationView(raw: ApiOperationDto, serviceName?: string): ApiOperationView {
  return {
    id: raw.id,
    serviceId: raw.serviceId,
    serviceName,
    apiName: raw.name,
    name: raw.name,
    method: raw.method,
    path: raw.path,
    requestUrl: raw.requestUrl?.trim() || raw.derived?.requestUrl || null,
    description: raw.description,
    status: (raw.status || 'active').toLowerCase() as ApiOperationView['status'],
    authenticationType: raw.authenticationType,
    authentication: raw.authenticationType,
    tags: raw.tags || [],
    sampleRequestBody: raw.sampleRequestBody ?? raw.derived?.sampleRequestBody ?? null,
    requiredRequestBodyFields: raw.requiredRequestBodyFields ?? raw.derived?.requiredRequestBodyFields ?? null,
    sourceOperation: raw.sourceOperation ?? null,
    contractRefreshRequired: raw.contractRefreshRequired ?? !raw.sourceOperation,
    derived: raw.derived ?? {
      requestUrl: raw.requestUrl ?? null,
      sampleRequestBody: raw.sampleRequestBody ?? null,
      requiredRequestBodyFields: raw.requiredRequestBodyFields ?? null,
      authenticationType: raw.authenticationType,
      contentTypes: raw.sourceOperation?.requestContentTypes ? [...raw.sourceOperation.requestContentTypes] : [],
    },
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    isCustom: true,
  };
}
