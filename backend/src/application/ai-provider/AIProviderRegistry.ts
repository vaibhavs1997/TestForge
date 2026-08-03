// AIProviderRegistry - Central registry for AI provider adapters.
// Registers all supported provider adapters and resolves them by type.
// Reuses the Plugin Framework pattern for registration/resolution.

import { AIProviderAdapter, AIProviderType } from '../../domain/ai-provider';
import {
  OpenAIAdapter,
  ClaudeAdapter,
  GeminiAdapter,
  OllamaAdapter,
  AzureOpenAIAdapter,
  AWSBedrockAdapter,
  CustomAdapter,
} from './adapters';

export class AIProviderRegistry {
  private adapters: Map<AIProviderType, AIProviderAdapter> = new Map();

  constructor() {
    this.registerBuiltInAdapters();
  }

  /** Register a custom adapter for a provider type. */
  register(adapter: AIProviderAdapter): void {
    this.adapters.set(adapter.type, adapter);
  }

  /** Resolve an adapter by provider type. */
  resolve(type: AIProviderType): AIProviderAdapter {
    const adapter = this.adapters.get(type);
    if (!adapter) {
      throw new Error(`No AI provider adapter registered for type: ${type}`);
    }
    return adapter;
  }

  /** Check if an adapter exists for a provider type. */
  has(type: AIProviderType): boolean {
    return this.adapters.has(type);
  }

  /** List all registered adapters. */
  listAdapters(): AIProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  /** List all supported provider types. */
  listTypes(): AIProviderType[] {
    return Array.from(this.adapters.keys());
  }

  /** Register all built-in provider adapters. */
  private registerBuiltInAdapters(): void {
    this.register(new OpenAIAdapter());
    this.register(new ClaudeAdapter());
    this.register(new GeminiAdapter());
    this.register(new OllamaAdapter());
    this.register(new AzureOpenAIAdapter());
    this.register(new AWSBedrockAdapter());
    this.register(new CustomAdapter());
  }
}

export default AIProviderRegistry;