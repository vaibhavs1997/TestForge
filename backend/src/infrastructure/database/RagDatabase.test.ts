import { describe, expect, it, vi } from 'vitest';
import { validateConfig } from '../../config.js';
import { PostgresConnection } from './PostgresConnection.js';
import { RagDatabaseHealthService } from './RagDatabaseHealthService.js';
import { runRagDatabaseMigrations } from './RagDatabaseMigrations.js';

const enabledConfig = {
  enabled: true,
  databaseUrl: 'postgresql://user:password@postgres:5432/testforge',
  connectionTimeoutMs: 5000,
  maxPoolSize: 5,
  ssl: false,
};

describe('optional RAG PostgreSQL infrastructure', () => {
  it('requires a database URL only when RAG is enabled', () => {
    expect(() => validateConfig({ PORT: '3000', NODE_ENV: 'development', RAG_ENABLED: 'true' })).toThrow(
      'RAG_ENABLED=true requires RAG_DATABASE_URL',
    );
    expect(validateConfig({ PORT: '3000', NODE_ENV: 'development', RAG_ENABLED: 'false' }).rag.enabled).toBe(false);
  });

  it('does not create a pool while disabled', async () => {
    const factory = vi.fn();
    const connection = new PostgresConnection({ ...enabledConfig, enabled: false, databaseUrl: undefined }, factory as never);
    await expect(connection.getPool()).rejects.toThrow('disabled');
    expect(factory).not.toHaveBeenCalled();
  });

  it('lazily creates one pool and closes it gracefully', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [] }), end: vi.fn().mockResolvedValue(undefined), connect: vi.fn() };
    const factory = vi.fn(() => pool);
    const connection = new PostgresConnection(enabledConfig, factory);
    await connection.query('SELECT 1');
    await connection.query('SELECT 1');
    expect(factory).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledWith(expect.objectContaining({ max: 5, connectionTimeoutMillis: 5000 }));
    await connection.close();
    expect(pool.end).toHaveBeenCalledTimes(1);
  });

  it('reports pgvector health without exposing connection credentials', async () => {
    const connection = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ current_database: 'testforge' }] })
        .mockResolvedValueOnce({ rows: [{ extversion: '0.8.6' }] }),
    } as unknown as PostgresConnection;
    const health = await new RagDatabaseHealthService(enabledConfig, connection).check();
    expect(health).toEqual(expect.objectContaining({ connected: true, database: 'testforge', pgvectorEnabled: true, pgvectorVersion: '0.8.6' }));
    expect(JSON.stringify(health)).not.toContain('password');
  });

  it('returns a sanitized unavailable status when PostgreSQL cannot be reached', async () => {
    const connection = { query: vi.fn().mockRejectedValue(new Error('postgresql://user:secret@host failed')) } as unknown as PostgresConnection;
    const health = await new RagDatabaseHealthService(enabledConfig, connection).check();
    expect(health).toEqual({ enabled: true, connected: false, pgvectorEnabled: false, error: 'unavailable' });
    expect(JSON.stringify(health)).not.toContain('secret');
  });

  it('runs idempotent RAG migrations', async () => {
    const connection = { query: vi.fn().mockResolvedValue({ rows: [] }) } as unknown as PostgresConnection;
    await runRagDatabaseMigrations(connection);
    await runRagDatabaseMigrations(connection);
    const sql = vi.mocked(connection.query).mock.calls.map(([statement]) => statement).join('\n');
    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS vector');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS knowledge_sources');
    expect(sql).toContain('idx_knowledge_sources_project');
    expect(sql).toContain('ON CONFLICT (id) DO NOTHING');
  });
});
