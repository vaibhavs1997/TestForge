// ProviderRepository - Domain Repository Interface for Provider Framework
import { ProviderEntity } from './ProviderEntity.js';

export interface ProviderRepository {
  create(provider: ProviderEntity): Promise<ProviderEntity>;
  findById(id: string): Promise<ProviderEntity | null>;
  findByProject(projectId: string): Promise<ProviderEntity[]>;
  findByProjectAndCategory(projectId: string, category: string): Promise<ProviderEntity[]>;
  findDefault(projectId: string): Promise<ProviderEntity | null>;
  list(): Promise<ProviderEntity[]>;
  update(id: string, updates: Partial<ProviderEntity>): Promise<ProviderEntity | null>;
  delete(id: string): Promise<void>;
}

export default ProviderRepository;