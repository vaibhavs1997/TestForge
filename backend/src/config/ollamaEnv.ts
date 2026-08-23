/** Reads local Ollama settings from environment (repository root `.env`). */

export interface OllamaEnvConfig {
  baseUrl: string;
  model: string;
  timeout: number;
}

export function getOllamaEnvConfig(env: NodeJS.ProcessEnv = process.env): OllamaEnvConfig | null {
  const baseUrl = env.OLLAMA_BASE_URL?.trim();
  if (!baseUrl) {
    return null;
  }

  const timeoutRaw = env.OLLAMA_TIMEOUT_MS?.trim();
  const timeout = timeoutRaw ? Number(timeoutRaw) : 300_000;

  return {
    baseUrl,
    model: env.OLLAMA_MODEL?.trim() || 'llama3.2',
    timeout: Number.isFinite(timeout) && timeout > 0 ? timeout : 300_000,
  };
}
