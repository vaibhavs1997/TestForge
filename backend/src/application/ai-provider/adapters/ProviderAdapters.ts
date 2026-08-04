// ProviderAdapters - Concrete adapter implementations for each supported AI provider category.
// All adapters extend BaseAIProviderAdapter and provide deterministic placeholder responses.
// NO external API calls are made.

import type { AIProviderType } from '../../../domain/ai-provider';
import { BaseAIProviderAdapter } from './BaseAIProviderAdapter';

export class OpenAIAdapter extends BaseAIProviderAdapter {
  readonly type: AIProviderType = 'OpenAI';
  readonly category = 'OpenAI';
  protected readonly defaultModel = 'gpt-4o';
  protected readonly inputCostPer1K = 0.005;
  protected readonly outputCostPer1K = 0.015;
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

export class OllamaAdapter extends BaseAIProviderAdapter {
  readonly type: AIProviderType = 'Ollama';
  readonly category = 'Ollama';
  protected readonly defaultModel = 'llama3.1';
  protected readonly inputCostPer1K = 0;
  protected readonly outputCostPer1K = 0;
}

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