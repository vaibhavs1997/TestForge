// Domain model for services
export type ServiceProtocol = 'REST' | 'GraphQL' | 'SOAP' | 'gRPC' | 'Other';
export type ServiceStatus = 'Active' | 'Inactive';

export interface Service {
  id: string;
  projectId: string;
  name: string;
  description: string;
  protocol: ServiceProtocol;
  baseUrl: string;
  version: string;
  status: ServiceStatus;
  createdDate: string;
  updatedDate: string;
}

export interface ServiceFormData {
  projectId: string;
  name: string;
  description: string;
  protocol: ServiceProtocol;
  baseUrl: string;
  version: string;
  status: ServiceStatus;
}
