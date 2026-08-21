// ProviderAdapters - Concrete adapter implementations for each supported AI provider category.

import type { AIProviderType } from '../../../domain/ai-provider/index.js';
import { BaseAIProviderAdapter } from './BaseAIProviderAdapter.js';
import { OllamaAdapter } from './OllamaAdapter.js';
import axios from 'axios';

export { OllamaAdapter };

export class OpenAIAdapter extends BaseAIProviderAdapter {
  readonly type: AIProviderType = 'OpenAI';
  readonly category: string = 'OpenAI';
  protected readonly defaultModel: string = 'gpt-4o';
  protected readonly defaultEndpoint: string = 'https://api.openai.com/v1';
  protected readonly inputCostPer1K = 0.005;
  protected readonly outputCostPer1K = 0.015;

  override validateConfiguration(config: import('../../../domain/ai-provider/index.js').AIProviderConfig): string[] {
    const errors = super.validateConfiguration(config);
    if (!config.apiKey?.trim()) errors.push('API key is required for OpenAI.');
    if (config.endpoint && !/^https?:\/\//i.test(config.endpoint)) {
      errors.push('Endpoint must be a valid HTTP(S) URL (e.g. https://api.openai.com/v1).');
    }
    return errors;
  }

  override async health(config: import('../../../domain/ai-provider/index.js').AIProviderConfig): Promise<import('../../../domain/ai-provider/index.js').AIProviderHealthResult> {
    const errors = this.validateConfiguration(config);
    if (errors.length > 0) return { healthy: false, message: errors.join('; '), details: { errors } };

    const base = resolveOpenAIBase(config, this.defaultEndpoint);
    try {
      await axios.get(`${base}/models/${encodeURIComponent(config.model)}`, {
        headers: openAIHeaders(config),
        timeout: config.timeout ?? this.defaultTimeout,
      });
      return { healthy: true, message: `Connected to OpenAI model "${config.model}".`, details: { endpoint: base, model: config.model } };
    } catch (err: unknown) {
      return { healthy: false, message: `OpenAI health check failed: ${formatOpenAIError(err)}`, details: { endpoint: base, model: config.model } };
    }
  }

  override async generate(
    config: import('../../../domain/ai-provider/index.js').AIProviderConfig,
    messages: import('../../../domain/ai-provider/index.js').AIProviderMessage[],
    options?: import('../../../domain/ai-provider/index.js').AIProviderGenerateOptions,
  ): Promise<import('../../../domain/ai-provider/index.js').AIProviderGenerateResult> {
    const errors = this.validateConfiguration(config);
    if (errors.length > 0) throw new Error(errors.join('; '));

    const model = config.model || this.defaultModel;
    const maxTokens = options?.maxTokens ?? config.maxTokens ?? this.defaultMaxTokens;
    const base = resolveOpenAIBase(config, this.defaultEndpoint);

    try {
      const { data } = await axios.post(
        `${base}/chat/completions`,
        {
          model,
          messages,
          temperature: options?.temperature ?? config.temperature ?? 0.7,
          top_p: options?.topP ?? config.topP ?? 1,
          max_tokens: maxTokens,
          ...(options?.stop?.length ? { stop: options.stop } : {}),
        },
        { headers: openAIHeaders(config), timeout: config.timeout ?? this.defaultTimeout },
      );

      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('OpenAI returned no assistant content.');

      const promptTokens = Number(data?.usage?.prompt_tokens ?? Math.ceil(messages.map((m) => m.content).join('').length / 4));
      const completionTokens = Number(data?.usage?.completion_tokens ?? Math.ceil(content.length / 4));
      return {
        content,
        model: data?.model || model,
        providerType: this.type,
        usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
        cost: {
          inputCost: (promptTokens / 1000) * this.inputCostPer1K,
          outputCost: (completionTokens / 1000) * this.outputCostPer1K,
          totalCost: (promptTokens / 1000) * this.inputCostPer1K + (completionTokens / 1000) * this.outputCostPer1K,
        },
        finished: data?.choices?.[0]?.finish_reason !== 'length',
      };
    } catch (err: unknown) {
      throw new Error(`OpenAI request failed (model "${model}"): ${formatOpenAIError(err)}`);
    }
  }
}

/** Groq exposes an OpenAI-compatible chat completions API. */
export class GroqAdapter extends OpenAIAdapter {
  override readonly type: AIProviderType = 'Groq';
  override readonly category: string = 'Groq';
  protected override readonly defaultModel: string = 'llama-3.3-70b-versatile';
  protected override readonly defaultEndpoint: string = 'https://api.groq.com/openai/v1';
}

function resolveOpenAIBase(config: import('../../../domain/ai-provider/index.js').AIProviderConfig, fallback: string): string {
  return (config.endpoint || fallback).trim().replace(/\/+$/, '');
}

function openAIHeaders(config: import('../../../domain/ai-provider/index.js').AIProviderConfig): Record<string, string> {
  return {
    Authorization: `Bearer ${config.apiKey}`,
    ...(config.organization ? { 'OpenAI-Organization': config.organization } : {}),
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

function formatOpenAIError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.error?.message || err.response?.data?.message || err.message;
    return String(detail).slice(0, 500);
  }
  return err instanceof Error ? err.message : String(err);
}

export class ClaudeAdapter extends BaseAIProviderAdapter {
  readonly type: AIProviderType = 'Claude';
  readonly category = 'Claude';
  protected readonly defaultModel = 'claude-3-5-sonnet-20241022';
  protected readonly inputCostPer1K = 0.003;
  protected readonly outputCostPer1K = 0.015;
}

export class GeminiAdapter extends BaseAIProviderAdapter {
  readonly type: AIProviderType = 'Gemini';
  readonly category = 'Gemini';
  protected readonly defaultModel = 'gemini-1.5-pro';
  protected readonly inputCostPer1K = 0.00125;
  protected readonly outputCostPer1K = 0.005;
}

// OllamaAdapter is implemented in OllamaAdapter.ts (real local API calls).

export class AzureOpenAIAdapter extends BaseAIProviderAdapter {
  readonly type: AIProviderType = 'Azure OpenAI';
  readonly category = 'Azure OpenAI';
  protected readonly defaultModel = 'gpt-4o';
  protected readonly inputCostPer1K = 0.005;
  protected readonly outputCostPer1K = 0.015;
}

export class AWSBedrockAdapter extends BaseAIProviderAdapter {
  readonly type: AIProviderType = 'AWS Bedrock';
  readonly category = 'AWS Bedrock';
  protected readonly defaultModel = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
  protected readonly inputCostPer1K = 0.003;
  protected readonly outputCostPer1K = 0.015;
}

export class CustomAdapter extends BaseAIProviderAdapter {
  readonly type: AIProviderType = 'Custom';
  readonly category = 'Custom';
  protected readonly defaultModel = 'custom-model';
  protected readonly inputCostPer1K = 0;
  protected readonly outputCostPer1K = 0;
}
