// ManageAIProviders - Application Service for AI Provider Framework
// Manages provider lifecycle (CRUD, enable/disable, default, test).
// Reuses the Plugin Framework pattern for service orchestration.

import { randomUUID } from 'node:crypto';
import { AIProviderEntity } from '../../domain/ai-provider';
import type {
  AIProviderType,
  AIProviderRepository,
  AIProviderMessage,
  AIProviderGenerateOptions,
  AIProviderGenerateResult,
  AIProviderHealthResult,
  AIProviderEstimate,
} from '../../domain/ai-provider';
import { AIProviderRegistry } from './AIProviderRegistry';
import { AIProviderResolutionService } from './AIProviderResolutionService';

export interface CreateAIProviderInput {
  projectId: string;
  name: string;
  provider: AIProviderType;
  model: string;
  endpoint?: string;
  apiKey?: string;
  organization?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  timeout?: number;
  enabled?: boolean;
  default?: boolean;
}

export interface UpdateAIProviderInput {
  name?: string;
  provider?: AIProviderType;
  model?: string;
  endpoint?: string;
  apiKey?: string;
  organization?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  timeout?: number;
  enabled?: boolean;
  default?: boolean;
}

export class ManageAIProviders {
  constructor(
    private readonly providerRepository: AIProviderRepository,
    private readonly registry: AIProviderRegistry,
    private readonly resolutionService: AIProviderResolutionService
  ) {}

  async create(input: CreateAIProviderInput): Promise<AIProviderEntity> {
    // Validate the provider type is supported
    if (!this.registry.has(input.provider)) {
      throw new Error(`Unsupported AI provider type: ${input.provider}`);
    }

    const now = Date.now();
    const provider = new AIProviderEntity(
      randomUUID(),
      input.projectId,
      input.name,
      input.provider,
      input.model,
      input.endpoint || null,
      input.apiKey || null,
      input.organization || null,
      input.temperature ?? 0.7,
      input.topP ?? 1,
      input.maxTokens ?? 2048,
      input.timeout ?? 30000,
      input.enabled ?? true,
      input.default ?? false,
      now,
      now
    );

    // If this provider is set as default, clear existing defaults for the project
    if (provider.isDefault) {
      await this.clearDefault(provider.projectId);
    }

    return this.providerRepository.create(provider);
  }

  async getProvider(id: string): Promise<AIProviderEntity> {
    const provider = await this.providerRepository.findById(id);
    if (!provider) {
      throw new Error(`AI provider with id ${id} not found`);
    }
    return provider;
  }

  async listByProject(projectId: string): Promise<AIProviderEntity[]> {
    return this.providerRepository.findByProject(projectId);
  }

  async listEnabled(projectId: string): Promise<AIProviderEntity[]> {
    return this.providerRepository.findEnabled(projectId);
  }

  async getDefault(projectId: string): Promise<AIProviderEntity | null> {
    return this.providerRepository.findDefault(projectId);
  }

  async update(id: string, updates: UpdateAIProviderInput): Promise<AIProviderEntity> {
    const existing = await this.getProvider(id);

    // If updating to a new provider type, validate it's supported
    if (updates.provider && !this.registry.has(updates.provider)) {
      throw new Error(`Unsupported AI provider type: ${updates.provider}`);
    }

    // If setting as default, clear existing defaults for the project
    if (updates.default === true) {
      await this.clearDefault(existing.projectId);
    }

    const updated = await this.providerRepository.update(id, updates);
    if (!updated) {
      throw new Error(`AI provider with id ${id} not found`);
    }
    return updated;
  }

  async enable(id: string): Promise<AIProviderEntity> {
    const updated = await this.providerRepository.update(id, { enabled: true });
    if (!updated) {
      throw new Error(`AI provider with id ${id} not found`);
    }
    return updated;
  }

  async disable(id: string): Promise<AIProviderEntity> {
    const updated = await this.providerRepository.update(id, { enabled: false });
    if (!updated) {
      throw new Error(`AI provider with id ${id} not found`);
    }
    return updated;
  }

  async setDefault(id: string): Promise<AIProviderEntity> {
    const existing = await this.getProvider(id);
    await this.clearDefault(existing.projectId);
    const updated = await this.providerRepository.update(id, { isDefault: true });
    if (!updated) {
      throw new Error(`AI provider with id ${id} not found`);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.providerRepository.delete(id);
  }

  /** Test a provider connection (placeholder - no external calls). */
  async testConnection(id: string): Promise<AIProviderHealthResult> {
    const provider = await this.getProvider(id);
    return this.resolutionService.health(provider);
  }

  /** Validate a provider configuration. */
  async validate(id: string): Promise<string[]> {
    const provider = await this.getProvider(id);
    return this.resolutionService.validateConfiguration(provider);
  }

  /** Estimate tokens for a provider. */
  async estimateTokens(id: string, messages: AIProviderMessage[], maxTokens?: number): Promise<number> {
    const provider = await this.getProvider(id);
    return this.resolutionService.estimateTokens(provider, messages, maxTokens);
  }

  /** Estimate cost for a provider. */
  async estimateCost(id: string, messages: AIProviderMessage[], maxTokens?: number): Promise<number> {
    const provider = await this.getProvider(id);
    return this.resolutionService.estimateCost(provider, messages, maxTokens);
  }

  /** Get a full cost/token estimate breakdown. */
  async estimate(id: string, messages: AIProviderMessage[], maxTokens?: number): Promise<AIProviderEstimate> {
    const provider = await this.getProvider(id);
    return this.resolutionService.estimate(provider, messages, maxTokens);
  }

  /** Generate a deterministic placeholder response. NO external API calls. */
  async generate(
    id: string,
    messages: AIProviderMessage[],
    options?: AIProviderGenerateOptions
  ): Promise<AIProviderGenerateResult> {
    const provider = await this.getProvider(id);
    return this.resolutionService.generate(provider, messages, options);
  }

  /** Stream a deterministic placeholder response. NO external API calls. */
  async *stream(
    id: string,
    messages: AIProviderMessage[],
    options?: AIProviderGenerateOptions
  ): AsyncGenerator<any> {
    const provider = await this.getProvider(id);
    yield* this.resolutionService.stream(provider, messages, options);
  }

  /** List all supported provider types. */
  listSupportedTypes(): AIProviderType[] {
    return this.registry.listTypes();
  }

  /** List all registered adapters with metadata. */
  listAdapters(): { type: AIProviderType; category: string }[] {
    return this.registry.listAdapters().map(a => ({ type: a.type, category: a.category }));
  }

  /** Clear the default flag on all providers for a project. */
  private async clearDefault(projectId: string): Promise<void> {
    const providers = await this.providerRepository.findByProject(projectId);
    for (const provider of providers) {
      if (provider.isDefault) {
        await this.providerRepository.update(provider.id, { isDefault: false });
      }
    }
  }
}

export default ManageAIProviders;