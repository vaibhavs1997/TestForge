// BaseAIProviderAdapter - Shared placeholder logic for all AI provider adapters.
// Every adapter exposes: validateConfiguration(), estimateCost(), estimateTokens(),
// generate(), stream(), health().
// For now, generate() returns deterministic placeholder responses with NO external API calls.

import {
  AIProviderAdapter,
  AIProviderConfig,
  AIProviderMessage,
  AIProviderGenerateOptions,
  AIProviderGenerateResult,
  AIProviderStreamChunk,
  AIProviderHealthResult,
  AIProviderType,
} from '../../../domain/ai-provider';

export abstract class BaseAIProviderAdapter implements AIProviderAdapter {
  abstract readonly type: AIProviderType;
  abstract readonly category: string;

  /** Default model name used when config.model is empty. */
  protected abstract readonly defaultModel: string;

  /** Approximate USD cost per 1K input tokens. */
  protected abstract readonly inputCostPer1K: number;

  /** Approximate USD cost per 1K output tokens. */
  protected abstract readonly outputCostPer1K: number;

  /** Default max tokens for generation. */
  protected readonly defaultMaxTokens = 2048;

  /** Default timeout in ms. */
  protected readonly defaultTimeout = 30000;

  validateConfiguration(config: AIProviderConfig): string[] {
    const errors: string[] = [];
    if (!config.name || config.name.trim() === '') {
      errors.push('Provider name is required.');
    }
    if (!config.model || config.model.trim() === '') {
      errors.push('Model is required.');
    }
    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
      errors.push('Temperature must be between 0 and 2.');
    }
    if (config.topP !== undefined && (config.topP < 0 || config.topP > 1)) {
      errors.push('Top P must be between 0 and 1.');
    }
    if (config.maxTokens !== undefined && config.maxTokens <= 0) {
      errors.push('Max tokens must be a positive number.');
    }
    if (config.timeout !== undefined && config.timeout <= 0) {
      errors.push('Timeout must be a positive number.');
    }
    return errors;
  }

  estimateTokens(config: AIProviderConfig, messages: AIProviderMessage[], maxTokens?: number): number {
    const text = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    // Approximate: 1 token ~= 4 characters for English text
    const inputTokens = Math.ceil(text.length / 4);
    const outputTokens = maxTokens ?? config.maxTokens ?? this.defaultMaxTokens;
    return inputTokens + outputTokens;
  }

  estimateCost(config: AIProviderConfig, messages: AIProviderMessage[], maxTokens?: number): number {
    const text = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    const inputTokens = Math.ceil(text.length / 4);
    const outputTokens = maxTokens ?? config.maxTokens ?? this.defaultMaxTokens;
    const inputCost = (inputTokens / 1000) * this.inputCostPer1K;
    const outputCost = (outputTokens / 1000) * this.outputCostPer1K;
    return inputCost + outputCost;
  }

  async generate(
    config: AIProviderConfig,
    messages: AIProviderMessage[],
    options?: AIProviderGenerateOptions
  ): Promise<AIProviderGenerateResult> {
    const model = config.model || this.defaultModel;
    const maxTokens = options?.maxTokens ?? config.maxTokens ?? this.defaultMaxTokens;
    const temperature = options?.temperature ?? config.temperature ?? 0.7;
    const topP = options?.topP ?? config.topP ?? 1;

    const inputText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    const inputTokens = Math.ceil(inputText.length / 4);
    const outputTokens = Math.min(maxTokens, Math.max(64, Math.ceil(inputText.length / 8)));

    // Deterministic placeholder response - NO external API calls.
    const content = this.buildPlaceholderResponse(config, messages, model, temperature, topP, maxTokens);

    const usage = {
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      totalTokens: inputTokens + outputTokens,
    };

    const cost = {
      inputCost: (inputTokens / 1000) * this.inputCostPer1K,
      outputCost: (outputTokens / 1000) * this.outputCostPer1K,
      totalCost: ((inputTokens / 1000) * this.inputCostPer1K) + ((outputTokens / 1000) * this.outputCostPer1K),
    };

    return {
      content,
      model,
      providerType: this.type,
      usage,
      cost,
      finished: true,
    };
  }

  async *stream(
    config: AIProviderConfig,
    messages: AIProviderMessage[],
    options?: AIProviderGenerateOptions
  ): AsyncGenerator<AIProviderStreamChunk> {
    const model = config.model || this.defaultModel;
    const maxTokens = options?.maxTokens ?? config.maxTokens ?? this.defaultMaxTokens;
    const temperature = options?.temperature ?? config.temperature ?? 0.7;
    const topP = options?.topP ?? config.topP ?? 1;

    const inputText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    const inputTokens = Math.ceil(inputText.length / 4);
    const outputTokens = Math.min(maxTokens, Math.max(64, Math.ceil(inputText.length / 8)));

    const content = this.buildPlaceholderResponse(config, messages, model, temperature, topP, maxTokens);

    // Stream the placeholder response in chunks (deterministic, no external calls).
    const chunkSize = 32;
    let index = 0;
    for (let i = 0; i < content.length; i += chunkSize) {
      const chunk = content.slice(i, i + chunkSize);
      yield {
        content: chunk,
        done: false,
        index,
      };
      index++;
    }

    const usage = {
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      totalTokens: inputTokens + outputTokens,
    };

    const cost = {
      inputCost: (inputTokens / 1000) * this.inputCostPer1K,
      outputCost: (outputTokens / 1000) * this.outputCostPer1K,
      totalCost: ((inputTokens / 1000) * this.inputCostPer1K) + ((outputTokens / 1000) * this.outputCostPer1K),
    };

    yield {
      content: '',
      done: true,
      index,
      usage,
      cost,
    };
  }

  async health(config: AIProviderConfig): Promise<AIProviderHealthResult> {
    const errors = this.validateConfiguration(config);
    if (errors.length > 0) {
      return {
        healthy: false,
        message: `Configuration invalid: ${errors.join('; ')}`,
        details: { errors },
      };
    }
    // Placeholder health check - NO external API calls.
    return {
      healthy: true,
      message: `${this.category} provider "${config.name}" is configured and ready (placeholder health check).`,
      details: {
        provider: this.type,
        model: config.model || this.defaultModel,
        enabled: config.enabled,
        isDefault: config.default,
      },
    };
  }

  /**
   * Build a deterministic placeholder response based on the provider type and input.
   * This is NOT a real AI response - it is a stable, reproducible placeholder.
   */
  protected buildPlaceholderResponse(
    config: AIProviderConfig,
    messages: AIProviderMessage[],
    model: string,
    temperature: number,
    topP: number,
    maxTokens: number
  ): string {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    const promptPreview = lastUserMessage
      ? lastUserMessage.content.slice(0, 120)
      : 'No user message provided';

    return [
      `[${this.category} Placeholder Response]`,
      `Provider: ${config.name}`,
      `Model: ${model}`,
      `Temperature: ${temperature}`,
      `Top P: ${topP}`,
      `Max Tokens: ${maxTokens}`,
      '',
      `This is a deterministic placeholder generated by the ${this.category} adapter.`,
      'No external API call was made.',
      '',
      `Input prompt preview: "${promptPreview}"`,
      '',
      'The AI Provider Framework is ready for integration with the real API.',
    ].join('\n');
  }
}

export default BaseAIProviderAdapter;