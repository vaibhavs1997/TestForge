import { randomUUID } from 'node:crypto';
import type { SecretStore } from '../../domain/security/SecretStore.js';
import { LocalSecretStore } from '../security/LocalSecretStore.js';
// AIProviderRepository - Infrastructure implementation for AI Provider Framework
// Uses the same locked JSON persistence pattern as the other project repositories.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { AIProviderEntity } from '../../domain/ai-provider/index.js';
import type { AIProviderType, AIProviderRepository } from '../../domain/ai-provider/index.js';
import { readJsonArray, updateJsonArray } from '../persistence/JsonFileStore.js';

function getDataRoot(): string {
  return path.join(process.cwd(), 'data', 'ai-providers');
}

type StoredProvider = AIProviderEntity & { apiKeyRef?: string };
export class FileAIProviderRepository implements AIProviderRepository {
  constructor(private readonly secrets: SecretStore = new LocalSecretStore()) {}

  private async encode(provider: StoredProvider): Promise<StoredProvider> {
    if (!provider.apiKey) return provider;
    const apiKeyRef = 'ai-provider-' + randomUUID();
    await this.secrets.set({ id: apiKeyRef, projectId: provider.projectId, value: provider.apiKey, classification: 'provider-credential' });
    return { ...provider, apiKey: null, apiKeyRef };
  }

  private async decode(provider: StoredProvider): Promise<AIProviderEntity> {
    const { apiKeyRef, ...publicFields } = provider;
    if (!apiKeyRef) return publicFields;
    const metadata = await this.secrets.metadata(apiKeyRef);
    if (!metadata || metadata.projectId !== provider.projectId) throw new Error('Provider credential is unavailable');
    const apiKey = await this.secrets.get(apiKeyRef);
    if (apiKey === null) throw new Error('Provider credential is unavailable');
    return { ...publicFields, apiKey };
  }

  async migrateSecrets(): Promise<void> {
    for (const projectId of this.listProjectIds()) await this.readProject(projectId);
  }
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
    const file = this.getProjectFilePath(projectId);
    let stored = await readJsonArray<StoredProvider>(file);
    if (stored.some(provider => provider.apiKey)) {
      stored = await updateJsonArray<StoredProvider>(file, [], providers => Promise.all(providers.map(provider => this.encode(provider))));
    }
    return Promise.all(stored.map(provider => this.decode(provider)));
  }

  async create(provider: AIProviderEntity): Promise<AIProviderEntity> {
    await updateJsonArray<AIProviderEntity>(this.getProjectFilePath(provider.projectId), [], async (providers) => [
      ...providers,
      await this.encode(provider),
    ]);
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

    let updated: AIProviderEntity | null = null;
    await updateJsonArray<StoredProvider>(this.getProjectFilePath(existing.projectId), [], async (providers) => {
      const stored = providers.find((provider) => provider.id === id);
      if (!stored) return providers;
      const current = await this.decode(stored);

      const nextProvider = new AIProviderEntity(
        current.id,
        current.projectId,
        updates.name !== undefined ? updates.name : current.name,
        updates.provider !== undefined ? updates.provider : current.provider,
        updates.model !== undefined ? updates.model : current.model,
        updates.endpoint !== undefined ? updates.endpoint : current.endpoint,
        updates.apiKey !== undefined ? updates.apiKey : current.apiKey,
        updates.organization !== undefined ? updates.organization : current.organization,
        updates.temperature !== undefined ? updates.temperature : current.temperature,
        updates.topP !== undefined ? updates.topP : current.topP,
        updates.maxTokens !== undefined ? updates.maxTokens : current.maxTokens,
        updates.timeout !== undefined ? updates.timeout : current.timeout,
        updates.enabled !== undefined ? updates.enabled : current.enabled,
        updates.isDefault !== undefined ? updates.isDefault : current.isDefault,
        current.createdAt,
        Date.now()
      );
      updated = nextProvider;

      const encoded = updates.apiKey === undefined
        ? { ...nextProvider, apiKey: null, apiKeyRef: stored.apiKeyRef }
        : await this.encode(nextProvider);
      return providers.map((provider) => provider.id === id ? encoded : provider);
    });
    return updated;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) return;

    await updateJsonArray<AIProviderEntity>(this.getProjectFilePath(existing.projectId), [], (providers) =>
      providers.filter((provider) => provider.id !== id)
    );
  }
}

export { FileAIProviderRepository as InMemoryAIProviderRepository };
export default FileAIProviderRepository;
