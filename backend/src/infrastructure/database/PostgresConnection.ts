import { Pool, type PoolConfig, type QueryResultRow } from 'pg';
import type { RagDatabaseConfig } from '../../config.js';

export interface PostgresPool {
  query<T extends QueryResultRow = QueryResultRow>(text: string, values?: readonly unknown[]): Promise<{ rows: T[] }>;
  end(): Promise<void>;
  connect(): Promise<PostgresClient>;
}

export interface PostgresClient {
  query<T extends QueryResultRow = QueryResultRow>(text: string, values?: readonly unknown[]): Promise<{ rows: T[] }>;
  release(): void;
}

export type PostgresPoolFactory = (config: PoolConfig) => PostgresPool;

/**
 * Infrastructure-only boundary for the optional RAG database. It deliberately
 * has no knowledge of projects, contracts, or the application's JSON/SQLite stores.
 */
export class PostgresConnection {
  private pool?: PostgresPool;

  constructor(
    private readonly config: RagDatabaseConfig,
    private readonly createPool: PostgresPoolFactory = (poolConfig) => new Pool(poolConfig),
  ) {}

  isEnabled(): boolean {
    return this.config.enabled;
  }

  async getPool(): Promise<PostgresPool> {
    if (!this.config.enabled) {
      throw new Error('RAG database is disabled.');
    }
    if (!this.config.databaseUrl) {
      throw new Error('RAG database configuration is missing.');
    }
    if (!this.pool) {
      this.pool = this.createPool({
        connectionString: this.config.databaseUrl,
        connectionTimeoutMillis: this.config.connectionTimeoutMs,
        max: this.config.maxPoolSize,
        ssl: this.config.ssl ? { rejectUnauthorized: true } : undefined,
      });
    }
    return this.pool;
  }

  async query<T extends QueryResultRow = QueryResultRow>(text: string, values?: readonly unknown[]): Promise<{ rows: T[] }> {
    const pool = await this.getPool();
    return pool.query<T>(text, values);
  }

  async verifyConnection(): Promise<void> {
    await this.query('SELECT 1');
  }

  async close(): Promise<void> {
    const pool = this.pool;
    this.pool = undefined;
    await pool?.end();
  }

  async withTransaction<T>(work: (client: PostgresClient) => Promise<T>): Promise<T> {
    const client = await (await this.getPool()).connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}
