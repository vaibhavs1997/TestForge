// DependencyRepository - Domain Repository Interface for Dependencies
import { Dependency } from './DependencyEntity';

export interface DependencyRepository {
  create(dependency: Dependency): Promise<Dependency>;
  update(id: string, data: Partial<Dependency>): Promise<Dependency>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Dependency | null>;
  findByProject(projectId: string): Promise<Dependency[]>;
  existsByName(name: string, projectId: string): Promise<boolean>;
  list(): Promise<Dependency[]>;
}

export default DependencyRepository;