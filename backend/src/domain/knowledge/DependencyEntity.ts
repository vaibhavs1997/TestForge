// DependencyEntity - Domain Entity for Dependencies in Knowledge Hub
// Describes how components and tokens depend on each other.

export type DependencyType = 'Service' | 'Database' | 'Queue' | 'Cache' | 'External' | 'Token' | 'Config';

export interface Dependency {
  id: string;
  projectId: string;
  name: string;
  description: string;
  dependencyType: DependencyType;
  target: string;
  version: string;
  isRequired: boolean;
  linkedApiOperationIds: string[];
  linkedRequirementIds: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export default Dependency;