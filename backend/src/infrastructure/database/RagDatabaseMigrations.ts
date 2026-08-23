import type { PostgresConnection } from './PostgresConnection.js';

const migrations = [
  {
    id: '001_knowledge_sources',
    statements: [
      'CREATE EXTENSION IF NOT EXISTS vector',
      `CREATE TABLE IF NOT EXISTS knowledge_sources (
        id UUID PRIMARY KEY,
        project_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_external_id TEXT,
        title TEXT,
        version TEXT,
        checksum TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      'CREATE INDEX IF NOT EXISTS idx_knowledge_sources_project ON knowledge_sources(project_id)',
    ],
  },
];

/** Idempotent, RAG-owned schema setup. Existing application persistence is untouched. */
export async function runRagDatabaseMigrations(connection: PostgresConnection): Promise<void> {
  await connection.query(`CREATE TABLE IF NOT EXISTS rag_schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  for (const migration of migrations) {
    for (const statement of migration.statements) {
      await connection.query(statement);
    }
    await connection.query('INSERT INTO rag_schema_migrations(id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [migration.id]);
  }
}
