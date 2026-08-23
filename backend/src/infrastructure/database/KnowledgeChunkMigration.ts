import type { PostgresConnection } from './PostgresConnection.js';

/** Creates the model-specific vector table only after the provider has validated its dimension. */
export async function runKnowledgeChunkMigration(connection: PostgresConnection, dimension: number): Promise<void> {
  if (!Number.isInteger(dimension) || dimension <= 0) throw new Error('Embedding dimension must be a positive integer.');
  await connection.query(`CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id UUID PRIMARY KEY,
    source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding vector(${dimension}) NOT NULL,
    embedding_provider TEXT NOT NULL,
    embedding_model TEXT NOT NULL,
    embedding_dimension INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(source_id, chunk_index)
  )`);
  // pgvector stores vector(n)'s dimension directly in atttypmod (unlike
  // several PostgreSQL varlena types, there is no four-byte adjustment).
  const existing = await connection.query<{ dimension: number }>("SELECT atttypmod AS dimension FROM pg_attribute WHERE attrelid = 'knowledge_chunks'::regclass AND attname = 'embedding'");
  if (existing.rows[0] && existing.rows[0].dimension !== dimension) throw new Error('Configured embedding dimension does not match the existing knowledge_chunks schema.');
  await connection.query('CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_project ON knowledge_chunks(project_id)');
  await connection.query('CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_source ON knowledge_chunks(source_id)');
  await connection.query("ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS index_status TEXT NOT NULL DEFAULT 'CURRENT'");
  await connection.query('ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS index_provider TEXT');
  await connection.query('ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS index_model TEXT');
  await connection.query('ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS index_dimension INTEGER');
}
