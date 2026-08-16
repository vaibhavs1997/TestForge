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
}

export interface ProjectWorkspaceModel extends ProjectDto {
  lastOpenedAt: number;
  uiStatus: 'active' | 'paused';
}

export interface ApiServiceDto extends TimestampedDto {
  id: string;
  projectId: string;
  name: string;
  description: string;
  version: string;
  tags: string[];
  baseUrl?: string;
}

export interface ApiOperationDto extends TimestampedDto {
  id: string;
  serviceId: string;
  name: string;
  method: string;
  path: string;
  description: string;
  authenticationType: string;
  status: string;
  tags?: string[];
  sampleRequestBody?: Record<string, unknown> | null;
  requiredRequestBodyFields?: string[] | null;
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
}

export interface ApiOperationView {
  id: string;
  serviceId?: string;
  serviceName?: string;
  apiName?: string;
  name?: string;
  method: string;
  path: string;
  description: string;
  status: 'active' | 'inactive';
  authentication?: string;
  authenticationType?: string;
  tags?: string[];
  version?: string;
  isCustom?: boolean;
  sampleRequestBody?: Record<string, unknown> | null;
  requiredRequestBodyFields?: string[] | null;
  createdAt?: number;
  updatedAt?: number;
}

export function toProjectWorkspaceModel(project: ProjectDto, lastOpenedAt: number): ProjectWorkspaceModel {
  return {
    ...project,
    lastOpenedAt,
    uiStatus: project.status === 'archived' ? 'paused' : 'active',
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
    description: raw.description,
    status: (raw.status || 'active').toLowerCase() as ApiOperationView['status'],
    authenticationType: raw.authenticationType,
    authentication: raw.authenticationType,
    tags: raw.tags || [],
    sampleRequestBody: raw.sampleRequestBody ?? null,
    requiredRequestBodyFields: raw.requiredRequestBodyFields ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    isCustom: true,
  };
}
