import type { ApiOperationEntity } from '../../domain/api/ApiOperationEntity.js';
import type { ApiServiceEntity } from '../../domain/api/ApiServiceEntity.js';

export interface ApiSourceContractDto {
  raw: Record<string, unknown>;
}

export interface ApiSourceOperationDto {
  raw: Record<string, unknown>;
  parameters: unknown[];
  requestBody: unknown;
  responses: unknown;
  security: unknown[];
  servers: unknown[];
  tags: string[];
  requestContentTypes: string[];
  responseContentTypes: string[];
}

export interface ApiServiceDerivedDto {
  baseUrl: string;
  importKey: string | null;
}

export interface ApiOperationDerivedDto {
  requestUrl: string | null;
  sampleRequestBody: Record<string, unknown> | null;
  requiredRequestBodyFields: string[] | null;
  authenticationType: string;
  contentTypes: string[];
}

export interface ApiServiceDto {
  id: string;
  projectId: string;
  name: string;
  description: string;
  version: string;
  tags: string[];
  baseUrl: string;
  folderPath?: string;
  sourceContract: ApiSourceContractDto | null;
  contractRefreshRequired: boolean;
  derived: ApiServiceDerivedDto;
  createdAt: number;
  updatedAt: number;
}

export interface ApiOperationDto {
  id: string;
  serviceId: string;
  name: string;
  method: string;
  path: string;
  description: string;
  authenticationType: string;
  status: string;
  tags: string[];
  requestUrl: string | null;
  sampleRequestBody: Record<string, unknown> | null;
  requiredRequestBodyFields: string[] | null;
  sourceOperation: ApiSourceOperationDto | null;
  contractRefreshRequired: boolean;
  derived: ApiOperationDerivedDto;
  createdAt: number;
  updatedAt: number;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function cloneRecord(value: unknown): Record<string, unknown> | null {
  const record = toRecord(value);
  if (!record) return null;
  return JSON.parse(JSON.stringify(record)) as Record<string, unknown>;
}

function cloneArray<T>(value: unknown, fallback: T[] = []): T[] {
  if (!Array.isArray(value)) return [...fallback];
  return JSON.parse(JSON.stringify(value)) as T[];
}

export function serializeApiService(service: ApiServiceEntity): ApiServiceDto {
  return {
    id: service.id,
    projectId: service.projectId,
    name: service.name,
    description: service.description,
    version: service.version,
    tags: [...(service.tags || [])],
    baseUrl: service.baseUrl,
    folderPath: service.folderPath,
    sourceContract: service.sourceContract ? { raw: cloneRecord(service.sourceContract) ?? {} } : null,
    contractRefreshRequired: !service.sourceContract,
    derived: {
      baseUrl: service.baseUrl,
      importKey: service.importKey,
    },
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
}

export function serializeApiOperation(operation: ApiOperationEntity): ApiOperationDto {
  const sourceOperationSnapshot = toRecord(operation.sourceOperation);
  const sourceOperationRaw = cloneRecord(sourceOperationSnapshot?.rawOperation ?? sourceOperationSnapshot);
  const savedRequestEditor = cloneRecord(sourceOperationSnapshot?.requestEditor);
  if (sourceOperationRaw && savedRequestEditor) sourceOperationRaw.requestEditor = savedRequestEditor;
  const requestBody = cloneRecord(sourceOperationSnapshot?.requestBody);
  const responses = cloneRecord(sourceOperationSnapshot?.responses);
  const security = cloneArray(sourceOperationSnapshot?.security, []);
  const servers = cloneArray(sourceOperationSnapshot?.servers, []);
  const tags = cloneArray(sourceOperationSnapshot?.tags, operation.tags || []);
  const requestContentTypes = cloneArray(sourceOperationSnapshot?.requestContentTypes, operation.contentTypes || []);
  const responseContentTypes = cloneArray(sourceOperationSnapshot?.responseContentTypes, []);

  return {
    id: operation.id,
    serviceId: operation.serviceId,
    name: operation.name,
    method: operation.method,
    path: operation.path,
    description: operation.description,
    authenticationType: operation.authenticationType,
    status: operation.status,
    tags: [...(operation.tags || [])],
    requestUrl: operation.requestUrl,
    sampleRequestBody: operation.sampleRequestBody ? JSON.parse(JSON.stringify(operation.sampleRequestBody)) as Record<string, unknown> : null,
    requiredRequestBodyFields: operation.requiredRequestBodyFields ? [...operation.requiredRequestBodyFields] : null,
    sourceOperation: sourceOperationRaw
      ? {
          raw: sourceOperationRaw,
          parameters: cloneArray(sourceOperationSnapshot?.parameters, []),
          requestBody,
          responses,
          security,
          servers,
          tags,
          requestContentTypes,
          responseContentTypes,
        }
      : null,
    contractRefreshRequired: !sourceOperationRaw,
    derived: {
      requestUrl: operation.requestUrl,
      sampleRequestBody: operation.sampleRequestBody ? JSON.parse(JSON.stringify(operation.sampleRequestBody)) as Record<string, unknown> : null,
      requiredRequestBodyFields: operation.requiredRequestBodyFields ? [...operation.requiredRequestBodyFields] : null,
      authenticationType: operation.authenticationType,
      contentTypes: [...(operation.contentTypes || [])],
    },
    createdAt: operation.createdAt,
    updatedAt: operation.updatedAt,
  };
}
