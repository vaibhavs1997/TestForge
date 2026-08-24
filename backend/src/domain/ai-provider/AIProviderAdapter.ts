// AIProviderAdapter - Domain Adapter interface for AI Provider Framework
// Every adapter exposes: validateConfiguration(), estimateCost(), estimateTokens(),
// generate(), stream(), health().
// For now, generate() returns deterministic placeholder responses with NO external API calls.

import type { AIProviderEntity, AIProviderConfig, AIProviderType } from './AIProviderEntity.js';
export type AIProviderCapability = 'LIVE' | 'LOCAL' | 'SIMULATED' | 'UNAVAILABLE';

export interface AIProviderMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIProviderUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIProviderCost {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export interface AIProviderGenerateOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
}

export interface AIProviderGenerateResult {
  content: string;
  model: string;
  providerType: AIProviderType;
  usage: AIProviderUsage;
  cost: AIProviderCost;
  finished: boolean;
}

export interface AIProviderStreamChunk {
  content: string;
  done: boolean;
  index?: number;
  usage?: AIProviderUsage;
  cost?: AIProviderCost;
}

export interface AIProviderHealthResult {
  healthy: boolean;
  message: string;
  details?: Record<string, any>;
}

export type AIProviderEstimate = {
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  totalTokens: number;
};

export interface AIProviderAdapter {
  /** Unique provider type this adapter handles */
  readonly type: AIProviderType;
  /** Human-readable category label */
  readonly category: string;
  /** Truthful execution capability; placeholders are never production AI. */
  readonly capability: AIProviderCapability;

  /** Validate the provider configuration; returns array of error strings (empty = valid). */
  validateConfiguration(config: AIProviderConfig): string[];

  /** Estimate token count for the given messages + optional max tokens. */
  estimateTokens(config: AIProviderConfig, messages: AIProviderMessage[], maxTokens?: number): number;

  /** Estimate cost (USD) for the given messages + optional max tokens. */
  estimateCost(config: AIProviderConfig, messages: AIProviderMessage[], maxTokens?: number): number;

  /** Generate a deterministic placeholder response. NO external API calls. */
  generate(
    config: AIProviderConfig,
    messages: AIProviderMessage[],
    options?: AIProviderGenerateOptions
  ): Promise<AIProviderGenerateResult>;

  /** Stream a deterministic placeholder response. NO external API calls. */
  stream(
    config: AIProviderConfig,
    messages: AIProviderMessage[],
    options?: AIProviderGenerateOptions
  ): AsyncGenerator<AIProviderStreamChunk>;

  /** Perform a health check on the provider configuration. No external calls for placeholders. */
  health(config: AIProviderConfig): Promise<AIProviderHealthResult>;
}

export default AIProviderAdapter;
