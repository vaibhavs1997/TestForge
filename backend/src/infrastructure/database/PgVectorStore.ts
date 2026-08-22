import type { EmbeddedChunk, EmbeddedKnowledgeSource, KnowledgeSearchResult, VectorSearchInput, VectorStore } from '../../domain/rag/index.js';
import type { PostgresConnection } from './PostgresConnection.js';

const vectorLiteral = (vector: number[]) => `[${vector.join(',')}]`;

export class PgVectorStore implements VectorStore {
  constructor(private readonly connection: PostgresConnection, private readonly dimension: number) {}
  async upsertSource(source: EmbeddedKnowledgeSource): Promise<boolean> {
    const current = await this.connection.query<{ checksum: string; version: string | null; index_provider: string | null; index_model: string | null; index_dimension: number | null }>('SELECT checksum, version, index_provider, index_model, index_dimension FROM knowledge_sources WHERE id = $1 AND project_id = $2', [source.id, source.projectId]);
    const representation = await this.connection.query<{ embedding_provider: string; embedding_model: string; embedding_dimension: number }>(
      'SELECT embedding_provider, embedding_model, embedding_dimension FROM knowledge_chunks WHERE project_id = $1 AND source_id = $2 LIMIT 1', [source.projectId, source.id],
    );
    const isCompatible = representation.rows[0]?.embedding_provider === source.embeddingProvider
      && representation.rows[0]?.embedding_model === source.embeddingModel
      && representation.rows[0]?.embedding_dimension === source.embeddingDimension;
    // A model/provider/dimension change must re-index even when the source text is unchanged.
    if (current.rows[0]?.checksum === source.checksum && current.rows[0]?.version === (source.version ?? null) && isCompatible) return false;
    await this.connection.query(`INSERT INTO knowledge_sources (id, project_id, source_type, source_external_id, title, version, checksum, index_status, index_provider, index_model, index_dimension, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'INDEXING',$8,$9,$10,NOW()) ON CONFLICT (id) DO UPDATE SET project_id=EXCLUDED.project_id, source_type=EXCLUDED.source_type, source_external_id=EXCLUDED.source_external_id, title=EXCLUDED.title, version=EXCLUDED.version, checksum=EXCLUDED.checksum, index_status='INDEXING', index_provider=EXCLUDED.index_provider, index_model=EXCLUDED.index_model, index_dimension=EXCLUDED.index_dimension, updated_at=NOW()`,
      [source.id, source.projectId, source.sourceType, source.sourceExternalId ?? null, source.title ?? null, source.version ?? null, source.checksum, source.embeddingProvider, source.embeddingModel, source.embeddingDimension]);
    return true;
  }
  async replaceSourceChunks(projectId: string, sourceId: string, chunks: EmbeddedChunk[]): Promise<void> {
    if (chunks.some((chunk) => chunk.projectId !== projectId || chunk.sourceId !== sourceId || chunk.embedding.length !== this.dimension)) {
      throw new Error('Embedded chunk provenance or vector dimension is invalid.');
    }
    await this.connection.withTransaction(async (client) => {
      await client.query('DELETE FROM knowledge_chunks WHERE project_id = $1 AND source_id = $2', [projectId, sourceId]);
      for (const chunk of chunks) {
        await client.query(`INSERT INTO knowledge_chunks (id, source_id, project_id, chunk_index, content, metadata, embedding, embedding_provider, embedding_model, embedding_dimension)
          VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::vector,$8,$9,$10)`, [chunk.id, sourceId, projectId, chunk.chunkIndex, chunk.content, JSON.stringify(chunk.metadata), vectorLiteral(chunk.embedding), chunk.embeddingProvider, chunk.embeddingModel, chunk.embeddingDimension]);
      }
    });
    await this.connection.query("UPDATE knowledge_sources SET index_status = 'CURRENT', updated_at = NOW() WHERE id = $1 AND project_id = $2", [sourceId, projectId]);
  }
  async deleteBySource(projectId: string, sourceId: string): Promise<void> { await this.connection.query('DELETE FROM knowledge_chunks WHERE project_id = $1 AND source_id = $2', [projectId, sourceId]); }
  async listBySource(projectId: string, sourceId: string): Promise<EmbeddedChunk[]> {
    const result = await this.connection.query<any>('SELECT id, source_id, project_id, chunk_index, content, metadata, embedding_provider, embedding_model, embedding_dimension FROM knowledge_chunks WHERE project_id = $1 AND source_id = $2 ORDER BY chunk_index', [projectId, sourceId]);
    return result.rows.map((row) => ({ id: row.id, sourceId: row.source_id, projectId: row.project_id, chunkIndex: row.chunk_index, content: row.content, metadata: row.metadata, embedding: [], embeddingProvider: row.embedding_provider, embeddingModel: row.embedding_model, embeddingDimension: row.embedding_dimension }));
  }
  async search(input: VectorSearchInput): Promise<KnowledgeSearchResult[]> {
    if (input.embedding.length !== input.dimension) throw new Error('Query embedding dimension does not match the requested index profile.');
    const values: unknown[] = [input.projectId, input.provider, input.model, input.dimension, vectorLiteral(input.embedding)];
    const clauses = ['c.project_id = $1', 'c.embedding_provider = $2', 'c.embedding_model = $3', 'c.embedding_dimension = $4'];
    const add = (sql: string, value: unknown) => { values.push(value); clauses.push(sql.replace('?', `$${values.length}`)); };
    if (input.minimumSimilarity !== undefined) add('1 - (c.embedding <=> $5::vector) >= ?', input.minimumSimilarity);
    if (input.filters?.sourceType) add('s.source_type = ?', input.filters.sourceType);
    if (input.filters?.sourceId) add('c.source_id = ?::uuid', input.filters.sourceId);
    if (input.filters?.operationRef) add("c.metadata -> 'operationRefs' ? ?", input.filters.operationRef);
    if (input.filters?.requirementRef) add("c.metadata -> 'requirementRefs' ? ?", input.filters.requirementRef);
    if (input.filters?.tag) add("c.metadata -> 'tags' ? ?", input.filters.tag);
    const ranking = input.ranking ?? {};
    const boost = (filter: string | undefined, key: 'operationRefs' | 'requirementRefs' | 'tags', amount: number | undefined) => {
      if (!filter || !amount) return '0'; values.push(filter, amount);
      return `CASE WHEN c.metadata -> '${key}' ? $${values.length - 1} THEN $${values.length} ELSE 0 END`;
    };
    const sourceBoost = () => { if (!input.filters?.sourceType || !ranking.sourceTypeBoost) return '0'; values.push(input.filters.sourceType, ranking.sourceTypeBoost); return `CASE WHEN s.source_type = $${values.length - 1} THEN $${values.length} ELSE 0 END`; };
    const metadataBoost = `${boost(input.filters?.operationRef, 'operationRefs', ranking.operationRefBoost)} + ${boost(input.filters?.requirementRef, 'requirementRefs', ranking.requirementRefBoost)} + ${boost(input.filters?.tag, 'tags', ranking.tagBoost)} + ${sourceBoost()}`;
    const fullText = input.queryText && ranking.fullTextWeight ? `ts_rank(to_tsvector('simple', c.content), websearch_to_tsquery('simple', $${values.push(input.queryText)})) * ${Number(ranking.fullTextWeight)}` : '0';
    values.push(input.limit);
    const result = await this.connection.query<any>(`SELECT c.id, c.content, c.metadata, c.chunk_index, c.source_id, s.source_type, s.title, s.version,
      1 - (c.embedding <=> $5::vector) AS similarity, (${metadataBoost}) AS metadata_boost, (${fullText}) AS full_text_score,
      (1 - (c.embedding <=> $5::vector)) + (${metadataBoost}) + (${fullText}) AS final_score
      FROM knowledge_chunks c JOIN knowledge_sources s ON s.id = c.source_id
      WHERE ${clauses.join(' AND ')} ORDER BY final_score DESC LIMIT $${values.length}`, values);
    return result.rows.map((row) => ({ chunkId: row.id, content: row.content, score: Number(row.final_score ?? row.similarity), metadata: row.metadata ?? {}, citation: { sourceId: row.source_id, sourceType: row.source_type, title: row.title ?? undefined, version: row.version ?? undefined, chunkIndex: row.chunk_index, section: row.metadata?.section, page: row.metadata?.page, operationRefs: row.metadata?.operationRefs, requirementRefs: row.metadata?.requirementRefs } }));
  }
}
