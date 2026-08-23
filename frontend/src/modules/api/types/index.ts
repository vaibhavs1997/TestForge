// Domain model for services
export type ServiceProtocol = 'REST' | 'GraphQL' | 'SOAP' | 'gRPC' | 'Other';
export type ServiceStatus = 'Active' | 'Inactive';

export interface Service {
  id: string;
  projectId: string;
  name: string;
  description: string;
  /** Frontend UI field – not persisted by the backend */
  protocol?: ServiceProtocol;
  /** Optional API base URL (from import or manual entry) */
  baseUrl?: string;
  version: string;
  /** Frontend UI field – not persisted by the backend */
  status?: ServiceStatus;
  /** Backend-provided tags */
  tags?: string[];
  /** Backend-provided timestamps (epoch milliseconds) */
  createdAt?: number;
  updatedAt?: number;
  /** Legacy ISO-string timestamps used by older UI code */
  createdDate?: string;
  updatedDate?: string;
  /** Folder path from imported API contract (e.g., "folder/subfolder") */
  folderPath?: string;
  /** Raw source contract snapshot preserved by the backend */
  sourceContract?: {
    raw: Record<string, unknown>;
  } | null;
  contractRefreshRequired?: boolean;
  /** Derived service metadata used by TestForge */
  derived?: {
    baseUrl: string;
    importKey: string | null;
  };
}

export interface ServiceFormData {
  projectId: string;
  name: string;
  description: string;
  protocol?: ServiceProtocol;
  baseUrl?: string;
  version: string;
  status?: ServiceStatus;
  tags?: string[];
}

// ─── Operations ──────────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
export type OperationStatus = 'active' | 'inactive';

/**
 * Front-end representation of an API operation.
 *
 * The backend stores the same concept as `ApiOperationDto` with slightly
 * different field names (e.g. `name` → `apiName`, `authenticationType` →
 * `authentication`).  This interface keeps the names the rest of the UI
 * already expects so that existing JSX continues to compile.
 */
export interface Operation {
  id: string;
  serviceId?: string;
  serviceName?: string;
  apiName?: string;
  name?: string;
  method: string;
  path: string;
  requestUrl?: string | null;
  description: string;
  status: OperationStatus;
  authentication?: string;
  authenticationType?: string;
  tags?: string[];
  version?: string;
  isCustom?: boolean;
  /** Example request JSON from OpenAPI / Postman import */
  sampleRequestBody?: Record<string, unknown> | null;
  /** OpenAPI request body schema `required` property names (mandatory fields only) */
  requiredRequestBodyFields?: string[] | null;
  /** Raw source operation snapshot preserved by the backend */
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
  /** Derived operation data used by TestForge */
  derived?: {
    requestUrl: string | null;
    sampleRequestBody: Record<string, unknown> | null;
    requiredRequestBodyFields: string[] | null;
    authenticationType: string;
    contentTypes: string[];
  };
  createdAt?: number;
  updatedAt?: number;
}

export interface OperationFormData {
  serviceId: string;
  name: string;
  method: string;
  path: string;
  description?: string;
  authenticationType?: string;
  status?: string;
  sampleRequestBody?: Record<string, unknown> | null;
}

// ─── Import Contract ─────────────────────────────────────────

export interface ImportSummary {
  servicesImported: number;
  servicesUpdated?: number;
  operationsImported: number;
  operationsUpdated?: number;
  operationsRemoved?: number;
  duplicatesSkipped: number;
  warnings: string[];
  detectedEnvironments: DetectedEnvironment[];
  preview?: boolean;
  changes?: Array<{ operationId?: string; method: string; path: string; status: 'ADDED' | 'UNCHANGED' | 'NON_MATERIAL_CHANGE' | 'MATERIAL_CHANGE' | 'BREAKING_CHANGE' | 'REMOVED'; reasons: string[]; manual?: boolean; reviewRequired: boolean }>;
  impacts?: { requirementMappings: number; testCases: number; testCaseVersions: number; suites: number; schedules: number; runtimeLinks: number; fieldDataRules: number };
}

export interface DetectedEnvironment {
  name: string;
  baseUrl: string;
  description?: string;
}
