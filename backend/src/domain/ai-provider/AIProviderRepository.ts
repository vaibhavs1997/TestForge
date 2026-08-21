// AIProviderRepository - Domain Repository interface for AI Provider Framework

import { AIProviderEntity, AIProviderType } from './AIProviderEntity.js';

export interface AIProviderRepository {
  create(provider: AIProviderEntity): Promise<AIProviderEntity>;
  findById(id: string): Promise<AIProviderEntity | null>;
  findByProject(projectId: string): Promise<AIProviderEntity[]>;
  findByProjectAndType(projectId: string, type: AIProviderType): Promise<AIProviderEntity[]>;
  findDefault(projectId: string): Promise<AIProviderEntity | null>;
  findEnabled(projectId: string): Promise<AIProviderEntity[]>;
  findByType(type: AIProviderType): Promise<AIProviderEntity[]>;
  list(): Promise<AIProviderEntity[]>;
  update(id: string, updates: Partial<AIProviderEntity>): Promise<AIProviderEntity | null>;
  delete(id: string): Promise<void>;
}

export default AIProviderRepository;
