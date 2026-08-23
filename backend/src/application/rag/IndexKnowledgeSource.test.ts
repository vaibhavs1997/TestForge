import { describe, expect, it, vi } from 'vitest';
import { IndexKnowledgeSource, splitText } from './IndexKnowledgeSource.js';

describe('IndexKnowledgeSource', () => {
  it('governs sensitive content before batching embeddings and persists provider metadata', async () => {
    const embeddings = { metadata: vi.fn().mockResolvedValue({ provider: 'test', model: 'configured-model', dimension: 2, available: true }), embedDocuments: vi.fn().mockResolvedValue([[1, 2]]), embedQuery: vi.fn() };
    const store = { upsertSource: vi.fn().mockResolvedValue(true), replaceSourceChunks: vi.fn(), deleteBySource: vi.fn(), listBySource: vi.fn(), search: vi.fn() };
    await new IndexKnowledgeSource(embeddings, store).execute({ id: '11111111-1111-4111-8111-111111111111', projectId: 'project-a', sourceType: 'documentation', content: 'password=super-secret policy' });
    expect(embeddings.embedDocuments).toHaveBeenCalledWith([expect.not.stringContaining('super-secret')]);
    expect(store.replaceSourceChunks).toHaveBeenCalledWith('project-a', expect.any(String), [expect.objectContaining({ embeddingProvider: 'test', embeddingModel: 'configured-model', embeddingDimension: 2 })]);
  });
  it('does not duplicate unchanged sources', async () => {
    const embeddings = { metadata: vi.fn().mockResolvedValue({ provider: 'test', model: 'configured', dimension: 2, available: true }), embedDocuments: vi.fn(), embedQuery: vi.fn() };
    const store = { upsertSource: vi.fn().mockResolvedValue(false), replaceSourceChunks: vi.fn(), deleteBySource: vi.fn(), listBySource: vi.fn(), search: vi.fn() };
    const result = await new IndexKnowledgeSource(embeddings, store).execute({ id: '11111111-1111-4111-8111-111111111111', projectId: 'project-a', sourceType: 'documentation', content: 'unchanged' });
    expect(result.indexed).toBe(false); expect(embeddings.embedDocuments).not.toHaveBeenCalled();
  });
  it('passes provider/model/dimension to the canonical source representation', async () => {
    const embeddings = { metadata: vi.fn().mockResolvedValue({ provider: 'provider-a', model: 'model-b', dimension: 768, available: true }), embedDocuments: vi.fn().mockResolvedValue([[1, 2]]), embedQuery: vi.fn() };
    const store = { upsertSource: vi.fn().mockResolvedValue(true), replaceSourceChunks: vi.fn(), deleteBySource: vi.fn(), listBySource: vi.fn(), search: vi.fn() };
    await new IndexKnowledgeSource(embeddings, store).execute({ id: '11111111-1111-4111-8111-111111111111', projectId: 'project-a', sourceType: 'documentation', content: 're-index safely' });
    expect(store.upsertSource).toHaveBeenCalledWith(expect.objectContaining({ embeddingProvider: 'provider-a', embeddingModel: 'model-b', embeddingDimension: 768 }));
  });
  it('preserves logical heading and acceptance-criterion boundaries where possible', () => {
    expect(splitText('# Account policy\n\nAC: A subscribed account cannot be deactivated.\n\n# Password policy\n\nRule: Passwords need 12 characters.', 100, 10)).toEqual([
      '# Account policy', 'AC: A subscribed account cannot be deactivated.', '# Password policy', 'Rule: Passwords need 12 characters.',
    ]);
  });
});
