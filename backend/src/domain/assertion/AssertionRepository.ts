// AssertionRepository - Repository interface for Assertion Library

import { AssertionEntity } from './AssertionEntity.js';

export interface IAssertionRepository {
  create(assertion: Omit<AssertionEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssertionEntity>;
  update(id: string, data: Partial<Omit<AssertionEntity, 'id' | 'projectId' | 'createdAt'>>): Promise<AssertionEntity>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<AssertionEntity | null>;
  findByProject(projectId: string): Promise<AssertionEntity[]>;
  findByCategory(projectId: string, category: string): Promise<AssertionEntity[]>;
  findByTag(projectId: string, tag: string): Promise<AssertionEntity[]>;
  existsByName(name: string, projectId: string): Promise<boolean>;
  list(): Promise<AssertionEntity[]>;
}

export default IAssertionRepository;