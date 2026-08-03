// AIProviderResolutionService - Resolves the correct adapter for a provider entity
// and delegates operations (validate, estimate, generate, stream, health).
// Reuses the AIProviderRegistry for adapter resolution.

import {
  AIProviderEntity,
  AIProviderConfig,
  AIProviderMessage,
  AIProviderGenerateOptions,
  AIProviderGenerateResult,
  AIProviderStreamChunk,
  AIProviderHealthResult,
  AIProviderEstimate,
} from '../../domain/ai-provider';
import { AIProviderRegistry } from './AIProviderRegistry';

export class AIProviderResolutionService {
  constructor(private readonly registry: AIProviderRegistry) {}

  /** Convert an entity to a config object for adapter operations. */
  toConfig(entity: AIProviderEntity): AIProviderConfig {
    return {
      name: entity.name,
      provider: entity.provider,
      model: entity.model,
      endpoint: entity.endpoint || undefined,
      apiKey: entity.apiKey || undefined,
      organization: entity.organization || undefined,
      temperature: entity.temperature,
      topP: entity.topP,
      maxTokens: entity.maxTokens,
      timeout: entity.timeout,
      enabled: entity.enabled,
      default: entity.isDefault,
      projectId: entity.projectId,
    };
  }

  /** Validate a provider configuration. Returns array of error strings (empty = valid). */
  validateConfiguration(entity: AIProviderEntity): string[] {
    const adapter = this.registry.resolve(entity.provider);
    return adapter.validateConfiguration(this.toConfig(entity));
  }

  /** Estimate token count for the given messages. */
  estimateTokens(entity: AIProviderEntity, messages: AIProviderMessage[], maxTokens?: number): number {
    const adapter = this.registry.resolve(entity.provider);
    return adapter.estimateTokens(this.toConfig(entity), messages, maxTokens);
  }

  /** Estimate cost (USD) for the given messages. */
  estimateCost(entity: AIProviderEntity, messages: AIProviderMessage[], maxTokens?: number): number {
    const adapter = this.registry.resolve(entity.provider);
    return adapter.estimateCost(this.toConfig(entity), messages, maxTokens);
  }

  /** Get a full cost/token estimate breakdown. */
  estimate(entity: AIProviderEntity, messages: AIProviderMessage[], maxTokens?: number): AIProviderEstimate {
    const adapter = this.registry.resolve(entity.provider);
    const config = this.toConfig(entity);
    const inputTokens = Math.ceil(messages.map(m => `${m.role}: ${m.content}`).join('\n').length / 4);
    const outputTokens = maxTokens ?? entity.maxTokens ?? 2048;
    const inputCost = adapter.estimateCost(config, messages, maxTokens) * (inputTokens / (inputTokens + outputTokens));
    const outputCost = adapter.estimateCost(config, messages, maxTokens) * (outputTokens / (inputTokens + outputTokens));
    return {
      inputTokens,
      outputTokens,
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      totalTokens: inputTokens + outputTokens,
    };
  }

  /** Generate a deterministic placeholder response. NO external API calls. */
  async generate(
    entity: AIProviderEntity,
    messages: AIProviderMessage[],
    options?: AIProviderGenerateOptions
  ): Promise<AIProviderGenerateResult> {
    const adapter = this.registry.resolve(entity.provider);
    return adapter.generate(this.toConfig(entity), messages, options);
  }

  /** Stream a deterministic placeholder response. NO external API calls. */
  async *stream(
    entity: AIProviderEntity,
    messages: AIProviderMessage[],
    options?: AIProviderGenerateOptions
  ): AsyncGenerator<AIProviderStreamChunk> {
    const adapter = this.registry.resolve(entity.provider);
    yield* adapter.stream(this.toConfig(entity), messages, options);
  }

  /** Perform a health check on the provider configuration. */
  async health(entity: AIProviderEntity): Promise<AIProviderHealthResult> {
    const adapter = this.registry.resolve(entity.provider);
    return adapter.health(this.toConfig(entity));
  }
}

export default AIProviderResolutionService;