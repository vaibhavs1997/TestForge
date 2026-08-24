// ManageAIProviders - Application Service for AI Provider Framework
// Manages provider lifecycle (CRUD, enable/disable, default, test).
// Reuses the Plugin Framework pattern for service orchestration.

import { randomUUID } from 'node:crypto';
import { AIProviderEntity } from '../../domain/ai-provider/index.js';
import type {
  AIProviderType,
  AIProviderRepository,
  AIProviderMessage,
  AIProviderGenerateOptions,
  AIProviderGenerateResult,
  AIProviderHealthResult,
  AIProviderEstimate,
} from '../../domain/ai-provider/index.js';
import { AIProviderRegistry } from './AIProviderRegistry.js';
import { AIProviderResolutionService } from './AIProviderResolutionService.js';
import { getOllamaEnvConfig } from '../../config/ollamaEnv.js';
import { DEFAULT_TIMEOUT_MS, DEFAULT_MAX_TOKENS } from '../../constants/defaults.js';

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

    const configurationErrors = this.registry.resolve(input.provider).validateConfiguration({
      ...input,
      enabled: input.enabled ?? true,
      default: input.default ?? false,
    });
    if (configurationErrors.length > 0) {
      throw new Error(configurationErrors.join('; '));
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
      input.maxTokens ?? DEFAULT_MAX_TOKENS,
      input.timeout ?? DEFAULT_TIMEOUT_MS,
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

  async listByProject(projectId: string): Promise<Array<AIProviderEntity & { capability: string; status: string }>> {
    await this.ensureOllamaFromEnv(projectId);
    return (await this.providerRepository.findByProject(projectId)).map(provider => this.withStatus(provider));
  }

  async listEnabled(projectId: string): Promise<AIProviderEntity[]> {
    await this.ensureOllamaFromEnv(projectId);
    return this.providerRepository.findEnabled(projectId);
  }

  async getDefault(projectId: string): Promise<AIProviderEntity | null> {
    await this.ensureOllamaFromEnv(projectId);
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

    const updated = await this.providerRepository.update(id, {
      ...updates,
      isDefault: updates.default,
    });
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
  listAdapters(): { type: AIProviderType; category: string; capability: string; productionReady: boolean }[] {
    return this.registry.listAdapters().map(a => ({ type: a.type, category: a.category, capability: a.capability, productionReady: a.capability === 'LIVE' || a.capability === 'LOCAL' }));
  }

  private withStatus(provider: AIProviderEntity): AIProviderEntity & { capability: string; status: string } { const capability = this.registry.resolve(provider.provider).capability; return Object.assign(provider, { capability, status: !provider.enabled ? 'DISABLED' : capability === 'SIMULATED' ? 'SIMULATED' : capability === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'CONFIGURED' }); }

  /** Clear the default flag on all providers for a project. */
  private async clearDefault(projectId: string): Promise<void> {
    const providers = await this.providerRepository.findByProject(projectId);
    for (const provider of providers) {
      if (provider.isDefault) {
        await this.providerRepository.update(provider.id, { isDefault: false });
      }
    }
  }

  /**
   * When OLLAMA_BASE_URL is set in `.env`, ensure each project has a usable Ollama provider
   * (in-memory store is empty after restart until users add one in the UI).
   */
  private async ensureOllamaFromEnv(projectId: string): Promise<void> {
    const envOllama = getOllamaEnvConfig();
    if (!envOllama) {
      return;
    }

    const existing = await this.providerRepository.findByProjectAndType(projectId, 'Ollama');
    const fromEnv = existing.find((p) => p.name === 'Ollama (from .env)');
    if (fromEnv) {
      await this.providerRepository.update(fromEnv.id, {
        endpoint: envOllama.baseUrl,
        model: envOllama.model,
        timeout: envOllama.timeout,
      });
      return;
    }
    if (existing.length > 0) {
      return;
    }

    const projectProviders = await this.providerRepository.findByProject(projectId);
    const hasDefault = projectProviders.some((p) => p.isDefault);

    await this.create({
      projectId,
      name: 'Ollama (from .env)',
      provider: 'Ollama',
      model: envOllama.model,
      endpoint: envOllama.baseUrl,
      timeout: envOllama.timeout,
      enabled: true,
      default: !hasDefault,
    });
  }
}

export default ManageAIProviders;
