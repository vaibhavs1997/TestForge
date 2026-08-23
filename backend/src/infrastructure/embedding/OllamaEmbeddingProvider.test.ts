import { describe, expect, it, vi } from 'vitest';
import { OllamaEmbeddingProvider } from './OllamaEmbeddingProvider.js';

const response = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 503, json: async () => body }) as Response;
describe('OllamaEmbeddingProvider', () => {
  it('embeds a query and discovers its runtime dimension', async () => {
    const fetcher = vi.fn().mockResolvedValue(response({ embeddings: [[0.1, 0.2, 0.3]] }));
    const provider = new OllamaEmbeddingProvider({ baseUrl: 'http://ollama', model: 'model-from-config', timeoutMs: 50 }, fetcher as any);
    await expect(provider.embedQuery('hello')).resolves.toEqual([0.1, 0.2, 0.3]);
    await expect(provider.metadata()).resolves.toEqual({ provider: 'ollama', model: 'model-from-config', dimension: 3, available: true });
  });
  it('uses one batched request and validates result count and dimensions', async () => {
    const provider = new OllamaEmbeddingProvider({ baseUrl: 'http://ollama/', model: 'configured', timeoutMs: 50 }, vi.fn().mockResolvedValue(response({ embeddings: [[1, 2], [3, 4]] })) as any);
    await expect(provider.embedDocuments(['one', 'two'])).resolves.toEqual([[1, 2], [3, 4]]);
    const invalid = new OllamaEmbeddingProvider({ baseUrl: 'http://ollama', model: 'configured', timeoutMs: 50 }, vi.fn().mockResolvedValue(response({ embeddings: [[1], [2, 3]] })) as any);
    await expect(invalid.embedDocuments(['one', 'two'])).rejects.toThrow('inconsistent vector dimensions');
  });
  it('returns a sanitized provider failure', async () => {
    const provider = new OllamaEmbeddingProvider({ baseUrl: 'http://ollama', model: 'configured', timeoutMs: 50 }, vi.fn().mockRejectedValue(new Error('token=secret')) as any);
    await expect(provider.embedQuery('hello')).rejects.toThrow('Embedding provider is unavailable.');
  });
});
