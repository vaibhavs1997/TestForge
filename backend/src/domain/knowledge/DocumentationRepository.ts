// DocumentationRepository - Domain Repository Interface for Documentation
import { Documentation } from './DocumentationEntity.js';

export interface DocumentationRepository {
  create(doc: Documentation): Promise<Documentation>;
  update(id: string, data: Partial<Documentation>): Promise<Documentation>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Documentation | null>;
  findByProject(projectId: string): Promise<Documentation[]>;
  existsByName(name: string, projectId: string): Promise<boolean>;
  list(): Promise<Documentation[]>;
}

export default DocumentationRepository;