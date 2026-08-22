import type { RagDatabaseConfig } from '../../config.js';
import type { PostgresConnection } from './PostgresConnection.js';

export interface RagDatabaseHealth {
  enabled: boolean;
  connected: boolean;
  database?: string;
  pgvectorEnabled: boolean;
  pgvectorVersion?: string;
  error?: 'unavailable';
}

export class RagDatabaseHealthService {
  constructor(private readonly config: RagDatabaseConfig, private readonly connection: PostgresConnection) {}

  async check(): Promise<RagDatabaseHealth> {
    if (!this.config.enabled) {
      return { enabled: false, connected: false, pgvectorEnabled: false };
    }

    try {
      const database = await this.connection.query<{ current_database: string }>('SELECT current_database()');
      const vector = await this.connection.query<{ extversion: string }>(
        "SELECT extversion FROM pg_extension WHERE extname = 'vector'",
      );
      return {
        enabled: true,
        connected: true,
        database: database.rows[0]?.current_database,
        pgvectorEnabled: vector.rows.length > 0,
        pgvectorVersion: vector.rows[0]?.extversion,
      };
    } catch {
      // Database driver messages may include a connection string; never return them.
      return { enabled: true, connected: false, pgvectorEnabled: false, error: 'unavailable' };
    }
  }
}
