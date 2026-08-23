import { describe, expect, it, vi } from 'vitest';
import { RetrieveProjectKnowledge } from './RetrieveProjectKnowledge.js';

const provider = { metadata: vi.fn().mockResolvedValue({ provider: 'provider', model: 'model', dimension: 2, available: true }), embedQuery: vi.fn().mockResolvedValue([0.1, 0.2]), embedDocuments: vi.fn() };
describe('RetrieveProjectKnowledge', () => {
  it('uses a project-scoped compatible profile and returns persisted citations', async () => {
    const store = { search: vi.fn().mockResolvedValue([{ chunkId: 'chunk-1', content: 'password=secret requires 12 characters', score: 0.9, metadata: { requirementRefs: ['AC-1'] }, citation: { sourceId: 'source-1', sourceType: 'documentation', title: 'Policy', chunkIndex: 0, requirementRefs: ['AC-1'] } }]) };
    const result = await new RetrieveProjectKnowledge(provider, store as any).execute({ projectId: 'project-a', query: 'password rules', limit: 4, filters: { requirementRef: 'AC-1' } });
    expect(store.search).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'project-a', provider: 'provider', model: 'model', dimension: 2, limit: 4, filters: { requirementRef: 'AC-1' } }));
    expect(result[0].citation).toMatchObject({ sourceId: 'source-1', requirementRefs: ['AC-1'] });
    expect(result[0].content).not.toContain('secret');
  });
  it('rejects disabled and malformed queries without searching', async () => {
    await expect(new RetrieveProjectKnowledge(undefined, undefined).execute({ projectId: 'p', query: 'hello' })).rejects.toThrow('disabled');
    const store = { search: vi.fn() }; await expect(new RetrieveProjectKnowledge(provider, store as any).execute({ projectId: 'p', query: ' ' })).rejects.toThrow('must not be empty');
    expect(store.search).not.toHaveBeenCalled();
  });
});
