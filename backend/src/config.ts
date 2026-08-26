// Production configuration validation and version info

export interface AppConfig {
  port: number;
  nodeEnv: string;
  dbPath: string;
  persistenceDriver: PersistenceDriver;
  corsOrigin: string;
  logLevel: string;
  version: string;
  buildTimestamp: string;
  gitCommit: string;
  mongodbUri?: string;
  auth: AuthConfig;
  runtimeMode: 'local-node' | 'distributed';
  rag: RagDatabaseConfig;
  embedding: EmbeddingConfig;
  ai: AiCapabilityConfig;
}

/** Staging intentionally follows the same safety requirements as production. */
function isDeploymentEnvironment(nodeEnv: string): boolean {
  return nodeEnv === 'production' || nodeEnv === 'staging';
}

function assertSecretStoreKey(value: string | undefined, required: boolean): void {
  if (!value) {
    if (required) {
      throw new Error('Configuration validation failed. TESTFORGE_SECRET_STORE_KEY is required in staging/production. Provide a base64-encoded 32-byte key; it is never generated automatically in a deployment.');
    }
    return;
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || Buffer.from(value, 'base64').length !== 32) {
    throw new Error('Configuration validation failed. TESTFORGE_SECRET_STORE_KEY must be a base64-encoded 32-byte key.');
  }
}

/** Configuration boundary for the optional PostgreSQL/pgvector RAG subsystem. */
export interface RagDatabaseConfig {
  enabled: boolean;
  databaseUrl?: string;
  connectionTimeoutMs: number;
  maxPoolSize: number;
  ssl: boolean;
}

/** Optional embedding configuration; independent from chat/reasoning providers. */
export interface EmbeddingConfig {
  enabled: boolean;
  provider?: string;
  model?: string;
  ollamaBaseUrl?: string;
  timeoutMs: number;
  batchSize: number;
}
export interface AiCapabilityConfig { enabled: boolean; defaultProvider?: string; defaultModel?: string; fallbackProvider?: string; fallbackModel?: string; timeoutMs: number; retryLimit: number; temperature: number; externalGovernanceMode: 'ALLOW' | 'REDACT' | 'LOCAL_ONLY'; }

export type PersistenceDriver = 'json' | 'memory' | 'sqlite';

export interface AuthConfig {
  enabled: boolean;
  apiKey?: string;
  jwtSecret?: string;
  /** MongoDB-backed user login (enterprise SaaS mode). */
  enterpriseLogin: boolean;
}

export interface EnterpriseAuthConfig {
  requireLogin: boolean;
}

export function getAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const authEnabledOverride = env.TESTFORGE_AUTH_ENABLED?.trim().toLowerCase();
  const authEnabled = authEnabledOverride === 'false' ? false : authEnabledOverride === 'true' ? true : undefined;
  const apiKey = env.TESTFORGE_API_KEY?.trim() || undefined;
  const mongoUri = env.MONGODB_URI?.trim() || undefined;
  const jwtSecret = env.TESTFORGE_JWT_SECRET?.trim() || undefined;
  const enterpriseLogin = authEnabled === false ? false : Boolean(mongoUri);

  if (enterpriseLogin && !jwtSecret) {
    throw new Error(
      'Configuration validation failed. MONGODB_URI is set but TESTFORGE_JWT_SECRET is missing. Set a strong JWT secret for enterprise login.',
    );
  }

  return {
    enabled: authEnabled ?? Boolean(apiKey || jwtSecret || enterpriseLogin),
    apiKey,
    jwtSecret: jwtSecret,
    enterpriseLogin,
  };
}

export function getEnterpriseAuthConfig(env: NodeJS.ProcessEnv = process.env): EnterpriseAuthConfig {
  const authEnabledOverride = env.TESTFORGE_AUTH_ENABLED?.trim().toLowerCase();
  return { requireLogin: authEnabledOverride === 'false' ? false : Boolean(env.MONGODB_URI?.trim()) };
}

export const APP_VERSION = process.env.npm_package_version || '0.1.0';
export const BUILD_TIMESTAMP = process.env.BUILD_TIMESTAMP || new Date().toISOString();
export const GIT_COMMIT = process.env.GIT_COMMIT || 'unknown';

export function validateConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const required = ['PORT', 'NODE_ENV'];
  const missing = required.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Configuration validation failed. Missing required environment variables: ${missing.join(', ')}`
    );
  }

  const port = Number(env.PORT);
  if (Number.isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`Configuration validation failed. PORT must be a valid port number, got: ${env.PORT}`);
  }

  const driverRaw = (env.PERSISTENCE_DRIVER || 'json').toLowerCase();
  const persistenceDriver: PersistenceDriver =
    driverRaw === 'memory' || driverRaw === 'sqlite' ? driverRaw : 'json';

  const mongodbUri = env.MONGODB_URI?.trim() || undefined;
  const auth = getAuthConfig(env);
  const nodeEnv = env.NODE_ENV || 'development';
  const deploymentEnvironment = isDeploymentEnvironment(nodeEnv);
  assertSecretStoreKey(env.TESTFORGE_SECRET_STORE_KEY?.trim(), deploymentEnvironment);
  if (deploymentEnvironment && auth.jwtSecret && Buffer.byteLength(auth.jwtSecret, 'utf8') < 32) {
    throw new Error('Configuration validation failed. TESTFORGE_JWT_SECRET must contain at least 32 bytes in staging/production.');
  }
  if (deploymentEnvironment && auth.apiKey && Buffer.byteLength(auth.apiKey, 'utf8') < 32) {
    throw new Error('Configuration validation failed. TESTFORGE_API_KEY must contain at least 32 bytes in staging/production.');
  }
  const runtimeMode = env.RUNTIME_COORDINATION_MODE === 'distributed' ? 'distributed' : 'local-node';
  const ragEnabled = env.RAG_ENABLED?.trim().toLowerCase() === 'true';
  const embeddingEnabled = env.EMBEDDING_ENABLED?.trim().toLowerCase() === 'true';
  const ragDatabaseUrl = env.RAG_DATABASE_URL?.trim() || undefined;
  if (ragEnabled && !ragDatabaseUrl) {
    throw new Error('Configuration validation failed. RAG_ENABLED=true requires RAG_DATABASE_URL.');
  }
  if (ragDatabaseUrl) {
    try {
      const parsed = new URL(ragDatabaseUrl);
      if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
        throw new Error('unsupported protocol');
      }
    } catch {
      throw new Error('Configuration validation failed. RAG_DATABASE_URL must be a valid PostgreSQL connection URL.');
    }
  }
  const embeddingProvider = env.EMBEDDING_PROVIDER?.trim() || undefined;
  const embeddingModel = env.EMBEDDING_MODEL?.trim() || undefined;
  const ollamaBaseUrl = env.OLLAMA_BASE_URL?.trim() || undefined;
  if (embeddingEnabled && (!ragEnabled || !embeddingProvider || !embeddingModel)) {
    throw new Error('Configuration validation failed. Embedding support requires RAG_ENABLED=true, EMBEDDING_PROVIDER, and EMBEDDING_MODEL.');
  }
  if (embeddingEnabled && embeddingProvider === 'ollama' && !ollamaBaseUrl) {
    throw new Error('Configuration validation failed. Ollama embeddings require OLLAMA_BASE_URL.');
  }
  if (deploymentEnvironment && env.BACKEND_REPLICAS && Number(env.BACKEND_REPLICAS) > 1 && runtimeMode !== 'distributed') {
    throw new Error('Configuration validation failed. Multi-instance staging/production requires RUNTIME_COORDINATION_MODE=distributed with atomic job/lease adapters.');
  }
  if (deploymentEnvironment && persistenceDriver === 'json' && env.TESTFORGE_ALLOW_SINGLE_NODE_JSON !== 'true') {
    throw new Error('Configuration validation failed. JSON persistence is single-node only. Set TESTFORGE_ALLOW_SINGLE_NODE_JSON=true only for an explicitly single-node deployment, or configure durable database-backed repositories.');
  }
  if (deploymentEnvironment && runtimeMode === 'distributed' && persistenceDriver !== 'sqlite') {
    throw new Error('Configuration validation failed. Distributed production is not supported by the JSON repository set. Use a database-backed repository deployment before enabling distributed coordination.');
  }
  const defaultCorsOrigin =
    nodeEnv === 'production'
      ? 'https://your-domain.com'
      : 'http://localhost:3000,http://localhost:5173';
  const corsOrigin = env.CORS_ORIGIN?.trim() || defaultCorsOrigin;
  if (deploymentEnvironment && (!env.CORS_ORIGIN?.trim() || corsOrigin === '*')) {
    throw new Error('Configuration validation failed. CORS_ORIGIN must be an explicit non-wildcard public origin in staging/production.');
  }

  // Require authentication in production
  if (deploymentEnvironment && (!auth.enabled || (!auth.apiKey && !auth.jwtSecret && !auth.enterpriseLogin))) {
    throw new Error(
      'Configuration validation failed. Authentication is required in staging/production. Set TESTFORGE_API_KEY or TESTFORGE_JWT_SECRET.'
    );
  }

  return {
    port,
    nodeEnv,
    dbPath: env.DB_PATH || './data/testforge.db',
    persistenceDriver,
    corsOrigin,
    logLevel: env.LOG_LEVEL || 'info',
    version: env.npm_package_version || APP_VERSION,
    buildTimestamp: env.BUILD_TIMESTAMP || BUILD_TIMESTAMP,
    gitCommit: env.GIT_COMMIT || GIT_COMMIT,
    mongodbUri,
    auth,
    runtimeMode,
    rag: {
      enabled: ragEnabled,
      databaseUrl: ragDatabaseUrl,
      connectionTimeoutMs: Number(env.RAG_DB_CONNECTION_TIMEOUT_MS || 5_000),
      maxPoolSize: Number(env.RAG_DB_POOL_MAX || 5),
      ssl: env.RAG_DB_SSL === 'true',
    },
    embedding: { enabled: embeddingEnabled, provider: embeddingProvider, model: embeddingModel, ollamaBaseUrl, timeoutMs: Number(env.EMBEDDING_TIMEOUT_MS || 30_000), batchSize: Number(env.EMBEDDING_BATCH_SIZE || 32) },
    ai: { enabled: env.AI_ENABLED?.trim().toLowerCase() === 'true', defaultProvider: env.AI_DEFAULT_PROVIDER?.trim() || undefined, defaultModel: env.AI_DEFAULT_MODEL?.trim() || undefined, fallbackProvider: env.AI_FALLBACK_PROVIDER?.trim() || undefined, fallbackModel: env.AI_FALLBACK_MODEL?.trim() || undefined, timeoutMs: Number(env.AI_TIMEOUT_MS || 30_000), retryLimit: Number(env.AI_RETRY_LIMIT || 0), temperature: Number(env.AI_DEFAULT_TEMPERATURE || 0.2), externalGovernanceMode: env.AI_EXTERNAL_GOVERNANCE_MODE === 'LOCAL_ONLY' ? 'LOCAL_ONLY' : env.AI_EXTERNAL_GOVERNANCE_MODE === 'REDACT' ? 'REDACT' : 'ALLOW' },
  };
}
