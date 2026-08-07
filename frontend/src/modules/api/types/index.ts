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
  description: string;
  status: OperationStatus;
  authentication?: string;
  authenticationType?: string;
  tags?: string[];
  version?: string;
  isCustom?: boolean;
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
}

export interface DetectedEnvironment {
  name: string;
  baseUrl: string;
  description?: string;
}
