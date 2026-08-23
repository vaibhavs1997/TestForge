import type { EmbeddingProvider, EmbeddingProviderMetadata } from '../../domain/rag/index.js';

export interface OllamaEmbeddingOptions { baseUrl: string; model: string; timeoutMs: number; }
type FetchLike = typeof fetch;

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  private dimension?: number;
  constructor(private readonly options: OllamaEmbeddingOptions, private readonly fetcher: FetchLike = fetch) {}

  async embedQuery(text: string): Promise<number[]> {
    const [embedding] = await this.embedDocuments([text]);
    return embedding;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];
    if (texts.some((text) => !text.trim())) throw new Error('Embedding input must not be empty.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await this.fetcher(`${this.options.baseUrl.replace(/\/$/, '')}/api/embed`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: this.options.model, input: texts }), signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Embedding provider returned HTTP ${response.status}.`);
      const body = await response.json() as { embeddings?: unknown };
      if (!Array.isArray(body.embeddings) || body.embeddings.length !== texts.length) throw new Error('Embedding provider returned an unexpected embedding count.');
      const vectors = body.embeddings.map((vector) => {
        if (!Array.isArray(vector) || !vector.length || vector.some((value) => typeof value !== 'number' || !Number.isFinite(value))) throw new Error('Embedding provider returned an invalid vector.');
        return vector as number[];
      });
      const dimension = vectors[0].length;
      if (vectors.some((vector) => vector.length !== dimension)) throw new Error('Embedding provider returned inconsistent vector dimensions.');
      if (this.dimension && this.dimension !== dimension) throw new Error('Embedding provider dimension changed unexpectedly.');
      this.dimension = dimension;
      return vectors;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Embedding')) throw error;
      throw new Error('Embedding provider is unavailable.');
    } finally { clearTimeout(timeout); }
  }

  async metadata(): Promise<EmbeddingProviderMetadata> {
    if (!this.dimension) await this.embedQuery('dimension probe');
    return { provider: 'ollama', model: this.options.model, dimension: this.dimension!, available: true };
  }
}
