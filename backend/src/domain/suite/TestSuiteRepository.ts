// TestSuiteRepository - Domain Repository Interface for Test Suite Management
import { TestSuiteEntity } from './TestSuiteEntity.js';

export interface TestSuiteRepository {
  create(suite: TestSuiteEntity): Promise<TestSuiteEntity>;
  update(id: string, data: Partial<TestSuiteEntity>): Promise<TestSuiteEntity>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<TestSuiteEntity | null>;
  findByProject(projectId: string): Promise<TestSuiteEntity[]>;
  list(): Promise<TestSuiteEntity[]>;
}

export default TestSuiteRepository;