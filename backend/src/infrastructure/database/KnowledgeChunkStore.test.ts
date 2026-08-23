import { describe, expect, it, vi } from 'vitest';
import { runKnowledgeChunkMigration } from './KnowledgeChunkMigration.js';
import { PgVectorStore } from './PgVectorStore.js';

describe('knowledge chunk schema and pgvector store', () => {
  it('creates an idempotent model-dimension-aware chunk schema', async () => {
    const connection = { query: vi.fn().mockResolvedValue({ rows: [{ dimension: 768 }] }) } as any;
    await runKnowledgeChunkMigration(connection, 768);
    const sql = connection.query.mock.calls.map(([statement]: [string]) => statement).join('\n');
    expect(sql).toContain('embedding vector(768)');
    expect(sql).toContain('UNIQUE(source_id, chunk_index)');
    expect(sql).toContain('idx_knowledge_chunks_project');
    await expect(runKnowledgeChunkMigration(connection, 0)).rejects.toThrow('positive integer');
  });
  it('uses a project/source-scoped transaction and rejects mismatched vectors', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const connection = { withTransaction: vi.fn(async (work) => work({ query })), query } as any;
    const store = new PgVectorStore(connection, 2);
    await store.replaceSourceChunks('p1', 'source-1', [{ id: 'c1', sourceId: 'source-1', projectId: 'p1', chunkIndex: 0, content: 'safe', metadata: {}, embedding: [1, 2], embeddingProvider: 'ollama', embeddingModel: 'configured', embeddingDimension: 2 }]);
    expect(query).toHaveBeenCalledWith('DELETE FROM knowledge_chunks WHERE project_id = $1 AND source_id = $2', ['p1', 'source-1']);
    await expect(store.replaceSourceChunks('p1', 'source-1', [{ id: 'c1', sourceId: 'source-1', projectId: 'other', chunkIndex: 0, content: 'safe', metadata: {}, embedding: [1], embeddingProvider: 'ollama', embeddingModel: 'configured', embeddingDimension: 1 }])).rejects.toThrow('provenance or vector dimension');
  });
  it('requires a re-index when the embedding representation changes', async () => {
    const connection = { query: vi.fn().mockResolvedValueOnce({ rows: [{ checksum: 'same', version: null }] }).mockResolvedValueOnce({ rows: [{ embedding_provider: 'ollama', embedding_model: 'old-model', embedding_dimension: 768 }] }).mockResolvedValue({ rows: [] }) } as any;
    const store = new PgVectorStore(connection, 768);
    await expect(store.upsertSource({ id: 'source-1', projectId: 'p1', sourceType: 'documentation', checksum: 'same', embeddingProvider: 'ollama', embeddingModel: 'new-model', embeddingDimension: 768 })).resolves.toBe(true);
    expect(connection.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO knowledge_sources'), expect.any(Array));
  });
  it('builds project/profile-scoped parameterized semantic search', async () => {
    const connection = { query: vi.fn().mockResolvedValue({ rows: [{ id: 'c1', content: 'policy', metadata: { operationRefs: ['op-1'] }, chunk_index: 0, source_id: 'source-1', source_type: 'documentation', title: 'Policy', version: 'v1', similarity: 0.91 }] }) } as any;
    const results = await new PgVectorStore(connection, 2).search({ projectId: 'project-a', embedding: [0.1, 0.2], provider: 'provider', model: 'model', dimension: 2, limit: 3, minimumSimilarity: 0.5, filters: { sourceType: 'documentation', operationRef: 'op-1' } });
    const [sql, values] = connection.query.mock.calls[0];
    expect(sql).toContain('c.project_id = $1'); expect(sql).toContain('c.embedding_model = $3'); expect(sql).toContain('c.embedding_dimension = $4'); expect(sql).toContain('c.metadata');
    expect(values).toContain('project-a'); expect(results[0]).toMatchObject({ score: 0.91, citation: { sourceId: 'source-1', operationRefs: ['op-1'] } });
  });
});
