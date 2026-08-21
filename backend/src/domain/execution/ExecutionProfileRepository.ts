// ExecutionProfileRepository - Repository interface for Execution Profiles

import { ExecutionProfileEntity } from './ExecutionProfileEntity.js';

export interface IExecutionProfileRepository {
  create(profile: Omit<ExecutionProfileEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExecutionProfileEntity>;
  update(id: string, data: Partial<Omit<ExecutionProfileEntity, 'id' | 'projectId' | 'createdAt'>>): Promise<ExecutionProfileEntity>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<ExecutionProfileEntity | null>;
  listByProject(projectId: string): Promise<ExecutionProfileEntity[]>;
  findDefault(projectId: string): Promise<ExecutionProfileEntity | null>;
  existsByName(name: string, projectId: string): Promise<boolean>;
}

export default IExecutionProfileRepository;