// AIProviderRepository - Infrastructure implementation for AI Provider Framework
// Uses the same locked JSON persistence pattern as the other project repositories.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { AIProviderEntity } from '../../domain/ai-provider/index.js';
import type { AIProviderType, AIProviderRepository } from '../../domain/ai-provider/index.js';
import { readJsonArray, writeJsonArray } from '../persistence/JsonFileStore.js';

function getDataRoot(): string {
  return path.join(process.cwd(), 'data', 'ai-providers');
}

export class FileAIProviderRepository implements AIProviderRepository {
  private getProjectFilePath(projectId: string): string {
    return path.join(getDataRoot(), projectId, 'providers.json');
  }

  private listProjectIds(): string[] {
    if (!fs.existsSync(getDataRoot())) return [];
    return fs.readdirSync(getDataRoot(), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  }

  private async readProject(projectId: string): Promise<AIProviderEntity[]> {
    return readJsonArray<AIProviderEntity>(this.getProjectFilePath(projectId));
  }

  private async writeProject(projectId: string, providers: AIProviderEntity[]): Promise<void> {
    await writeJsonArray(this.getProjectFilePath(projectId), providers);
  }

  async create(provider: AIProviderEntity): Promise<AIProviderEntity> {
    const providers = await this.readProject(provider.projectId);
    providers.push(provider);
    await this.writeProject(provider.projectId, providers);
    return provider;
  }

  async findById(id: string): Promise<AIProviderEntity | null> {
    for (const projectId of this.listProjectIds()) {
      const provider = (await this.readProject(projectId)).find((item) => item.id === id);
      if (provider) return provider;
    }
    return null;
  }

  async findByProject(projectId: string): Promise<AIProviderEntity[]> {
    return this.readProject(projectId);
  }

  async findByProjectAndType(projectId: string, type: AIProviderType): Promise<AIProviderEntity[]> {
    return (await this.readProject(projectId)).filter(
      p => p.projectId === projectId && p.provider === type
    );
  }

  async findDefault(projectId: string): Promise<AIProviderEntity | null> {
    return (await this.readProject(projectId)).find(
      p => p.projectId === projectId && p.isDefault
    ) || null;
  }

  async findEnabled(projectId: string): Promise<AIProviderEntity[]> {
    return (await this.readProject(projectId)).filter(
      p => p.projectId === projectId && p.enabled
    );
  }

  async findByType(type: AIProviderType): Promise<AIProviderEntity[]> {
    const providers = await Promise.all(this.listProjectIds().map((projectId) => this.readProject(projectId)));
    return providers.flat().filter((provider) => provider.provider === type);
  }

  async list(): Promise<AIProviderEntity[]> {
    const providers = await Promise.all(this.listProjectIds().map((projectId) => this.readProject(projectId)));
    return providers.flat();
  }

  async update(id: string, updates: Partial<AIProviderEntity>): Promise<AIProviderEntity | null> {
    const existing = await this.findById(id);
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

    const providers = await this.readProject(existing.projectId);
    await this.writeProject(existing.projectId, providers.map((provider) => provider.id === id ? updated : provider));
    return updated;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) return;
    const providers = await this.readProject(existing.projectId);
    await this.writeProject(existing.projectId, providers.filter((provider) => provider.id !== id));
  }
}

export { FileAIProviderRepository as InMemoryAIProviderRepository };
export default FileAIProviderRepository;
