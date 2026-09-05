// Ollama adapter — calls a local Ollama server (e.g. llama3.2 via `ollama run llama3.2`).
import axios from 'axios';
import type {
  AIProviderConfig,
  AIProviderMessage,
  AIProviderGenerateOptions,
  AIProviderGenerateResult,
  AIProviderHealthResult,
  AIProviderType,
} from '../../../domain/ai-provider/index.js';
import { BaseAIProviderAdapter } from './BaseAIProviderAdapter.js';
import { secureHttpExecutor } from '../../../infrastructure/http/SecureHttpExecutor.js';

const DEFAULT_OLLAMA_BASE = 'http://127.0.0.1:11434';
const localInfrastructurePolicy = process.env.TESTFORGE_ALLOW_LOCAL_INFRASTRUCTURE === 'true'
  ? { allowPrivateNetworks: true, allowLoopback: true }
  : undefined;

function resolveOllamaBase(config: AIProviderConfig): string {
  const raw = (config.endpoint || DEFAULT_OLLAMA_BASE).trim();
  return raw.replace(/\/+$/, '');
}

export class OllamaAdapter extends BaseAIProviderAdapter {
  readonly type: AIProviderType = 'Ollama';
  readonly category = 'Ollama';
  override readonly capability = 'LOCAL' as const;
  protected readonly defaultModel = 'llama3.2';
  protected readonly inputCostPer1K = 0;
  protected readonly outputCostPer1K = 0;

  override validateConfiguration(config: AIProviderConfig): string[] {
    const errors = super.validateConfiguration(config);
    if (config.endpoint && !/^https?:\/\//i.test(config.endpoint)) {
      errors.push('Endpoint must be a valid HTTP(S) URL (e.g. http://127.0.0.1:11434).');
    }
    return errors;
  }

  override async health(config: AIProviderConfig): Promise<AIProviderHealthResult> {
    const errors = this.validateConfiguration(config);
    if (errors.length > 0) {
      return { healthy: false, message: errors.join('; '), details: { errors } };
    }

    const base = resolveOllamaBase(config);
    const model = config.model || this.defaultModel;
    try {
      const { data } = await secureHttpExecutor.execute<any>({
        url: `${base}/api/tags`,
        method: 'GET',
        timeout: config.timeout ?? this.defaultTimeout,
        egressPolicy: localInfrastructurePolicy,
      });
      const models: { name?: string }[] = data?.models ?? [];
      const names = models.map((m) => m.name ?? '').filter(Boolean);
      const hasModel = names.some(
        (n) => n === model || n.startsWith(`${model}:`) || n.split(':')[0] === model,
      );
      if (!hasModel && names.length > 0) {
        return {
          healthy: false,
          message: `Model "${model}" not found in Ollama. Available: ${names.slice(0, 8).join(', ')}${names.length > 8 ? '…' : ''}. Run: ollama pull ${model}`,
          details: { models: names },
        };
      }
      return {
        healthy: true,
        message: `Connected to Ollama at ${base}${hasModel ? ` (model "${model}" available)` : ''}.`,
        details: { endpoint: base, model, models: names },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        healthy: false,
        message: `Cannot reach Ollama at ${base}. Is \`ollama serve\` running? ${message}`,
        details: { endpoint: base },
      };
    }
  }

  override async generate(
    config: AIProviderConfig,
    messages: AIProviderMessage[],
    options?: AIProviderGenerateOptions,
  ): Promise<AIProviderGenerateResult> {
    const base = resolveOllamaBase(config);
    const model = config.model || this.defaultModel;
    const maxTokens = options?.maxTokens ?? config.maxTokens ?? this.defaultMaxTokens;
    const temperature = options?.temperature ?? config.temperature ?? 0.7;
    const topP = options?.topP ?? config.topP ?? 1;
    const timeout = config.timeout ?? this.defaultTimeout;

    const ollamaMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const { data } = await secureHttpExecutor.execute<any>({
        url: `${base}/api/chat`,
        method: 'POST',
        data: {
          model,
          messages: ollamaMessages,
          stream: false,
          options: {
            temperature,
            top_p: topP,
            num_predict: maxTokens,
          },
        },
        timeout,
        egressPolicy: localInfrastructurePolicy,
      });

      const content = data?.message?.content ?? '';
      const promptTokens = data?.prompt_eval_count ?? Math.ceil(
        messages.map((m) => m.content).join('').length / 4,
      );
      const completionTokens = data?.eval_count ?? Math.ceil(content.length / 4);

      return {
        content,
        model,
        providerType: this.type,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        cost: { inputCost: 0, outputCost: 0, totalCost: 0 },
        finished: Boolean(data?.done ?? true),
      };
    } catch (err: unknown) {
      const detail = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : err instanceof Error
          ? err.message
          : String(err);
      throw new Error(`Ollama request failed (${base}, model "${model}"): ${detail}`);
    }
  }
}

export default OllamaAdapter;
