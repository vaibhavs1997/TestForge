// AIProviderRepository - Infrastructure implementation for AI Provider Framework
// Uses in-memory storage. Can be swapped for DB implementation.

import { AIProviderEntity } from '../../domain/ai-provider';
import type { AIProviderType, AIProviderRepository } from '../../domain/ai-provider';

export class InMemoryAIProviderRepository implements AIProviderRepository {
  private providers: Map<string, AIProviderEntity> = new Map();

  async create(provider: AIProviderEntity): Promise<AIProviderEntity> {
    this.providers.set(provider.id, provider);
    return provider;
  }

  async findById(id: string): Promise<AIProviderEntity | null> {
    return this.providers.get(id) || null;
  }

  async findByProject(projectId: string): Promise<AIProviderEntity[]> {
    return Array.from(this.providers.values()).filter(p => p.projectId === projectId);
  }

  async findByProjectAndType(projectId: string, type: AIProviderType): Promise<AIProviderEntity[]> {
    return Array.from(this.providers.values()).filter(
      p => p.projectId === projectId && p.provider === type
    );
  }

  async findDefault(projectId: string): Promise<AIProviderEntity | null> {
    return Array.from(this.providers.values()).find(
      p => p.projectId === projectId && p.isDefault
    ) || null;
  }

  async findEnabled(projectId: string): Promise<AIProviderEntity[]> {
    return Array.from(this.providers.values()).filter(
      p => p.projectId === projectId && p.enabled
    );
  }

  async findByType(type: AIProviderType): Promise<AIProviderEntity[]> {
    return Array.from(this.providers.values()).filter(p => p.provider === type);
  }

  async list(): Promise<AIProviderEntity[]> {
    return Array.from(this.providers.values());
  }

  async update(id: string, updates: Partial<AIProviderEntity>): Promise<AIProviderEntity | null> {
    const existing = this.providers.get(id);
    if (!existing) return null;

    const updated = new AIProviderEntity(
      existing.id,
      existing.projectId,
      updates.name !== undefined ? updates.name : existing.name,
      updates.provider !== undefined ? updates.provider : existing.provider,
      updates.model !== undefined ? updates.model : existing.model,
      updates.endpoint !== undefined ? updates.endpoint : existing.endpoint,
      updates.apiKey !== undefined ? updates.apiKey : existing.apiKey,
      updates.organization !== undefined ? updates.organization : existing.organization,
      updates.temperature !== undefined ? updates.temperature : existing.temperature,
      updates.topP !== undefined ? updates.topP : existing.topP,
      updates.maxTokens !== undefined ? updates.maxTokens : existing.maxTokens,
      updates.timeout !== undefined ? updates.timeout : existing.timeout,
      updates.enabled !== undefined ? updates.enabled : existing.enabled,
      updates.isDefault !== undefined ? updates.isDefault : existing.isDefault,
      existing.createdAt,
      Date.now()
    );

    this.providers.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.providers.delete(id);
  }
}

export default InMemoryAIProviderRepository;