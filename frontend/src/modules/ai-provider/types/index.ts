// AI Provider module types

export type AIProviderType =
  | 'OpenAI'
  | 'Claude'
  | 'Gemini'
  | 'Ollama'
  | 'Azure OpenAI'
  | 'AWS Bedrock'
  | 'Custom';

export interface AIProvider {
  id: string;
  projectId: string;
  name: string;
  provider: AIProviderType;
  model: string;
  endpoint: string | null;
  apiKey: string | null;
  organization: string | null;
  temperature: number;
  topP: number;
  maxTokens: number;
  timeout: number;
  enabled: boolean;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AIProviderHealth {
  healthy: boolean;
  message: string;
  details?: Record<string, any>;
}

export interface AIProviderEstimate {
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  totalTokens: number;
}

export interface AIProviderMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIProviderGenerateResult {
  content: string;
  model: string;
  providerType: AIProviderType;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
  finished: boolean;
}

export interface AIProviderAdapterInfo {
  type: AIProviderType;
  category: string;
}

export interface AIProviderFormData {
  name: string;
  provider: AIProviderType;
  model: string;
  endpoint: string;
  apiKey: string;
  organization: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  timeout: number;
  enabled: boolean;
  default: boolean;
}