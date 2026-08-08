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
}

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
  const apiKey = env.TESTFORGE_API_KEY?.trim() || undefined;
  const mongoUri = env.MONGODB_URI?.trim() || undefined;
  const jwtSecret = env.TESTFORGE_JWT_SECRET?.trim() || undefined;
  const enterpriseLogin = Boolean(mongoUri);

  if (enterpriseLogin && !jwtSecret) {
    throw new Error(
      'Configuration validation failed. MONGODB_URI is set but TESTFORGE_JWT_SECRET is missing. Set a strong JWT secret for enterprise login.',
    );
  }

  return {
    enabled: Boolean(apiKey || jwtSecret || enterpriseLogin),
    apiKey,
    jwtSecret: jwtSecret,
    enterpriseLogin,
  };
}

export function getEnterpriseAuthConfig(env: NodeJS.ProcessEnv = process.env): EnterpriseAuthConfig {
  return { requireLogin: Boolean(env.MONGODB_URI?.trim()) };
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

  // Require authentication in production
  const nodeEnv = env.NODE_ENV || 'development';
  if (nodeEnv === 'production' && !auth.enabled) {
    throw new Error(
      'Configuration validation failed. Authentication is required in production. Set TESTFORGE_API_KEY or TESTFORGE_JWT_SECRET.'
    );
  }

  return {
    port,
    nodeEnv,
    dbPath: env.DB_PATH || './data/testforge.db',
    persistenceDriver,
    corsOrigin: env.CORS_ORIGIN || '*',
    logLevel: env.LOG_LEVEL || 'info',
    version: env.npm_package_version || APP_VERSION,
    buildTimestamp: env.BUILD_TIMESTAMP || BUILD_TIMESTAMP,
    gitCommit: env.GIT_COMMIT || GIT_COMMIT,
    mongodbUri,
    auth,
  };
}
