// AIProviderEntity - Domain Entity for AI Provider Framework
// Represents a configured AI model provider (OpenAI, Claude, Gemini, etc.)
// Configuration is stored; NO external API calls are made.

export type AIProviderType =
  | 'OpenAI'
  | 'Claude'
  | 'Gemini'
  | 'Ollama'
  | 'Azure OpenAI'
  | 'AWS Bedrock'
  | 'Custom';

export interface AIProviderConfig {
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
  enabled: boolean;
  default: boolean;
  projectId: string;
}

export class AIProviderEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly name: string,
    public readonly provider: AIProviderType,
    public readonly model: string,
    public readonly endpoint: string | null,
    public readonly apiKey: string | null,
    public readonly organization: string | null,
    public readonly temperature: number,
    public readonly topP: number,
    public readonly maxTokens: number,
    public readonly timeout: number,
    public readonly enabled: boolean,
    public readonly isDefault: boolean,
    public readonly createdAt: number,
    public readonly updatedAt: number
  ) {}
}

export default AIProviderEntity;
