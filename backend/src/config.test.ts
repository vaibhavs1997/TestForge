import { describe, expect, it } from 'vitest';
import { getEnterpriseAuthConfig, validateConfig } from './config.js';

const baseEnv = {
  PORT: '3001',
  NODE_ENV: 'development',
} as NodeJS.ProcessEnv;
const deploymentSecrets = {
  TESTFORGE_JWT_SECRET: 'test-secret-for-config-validation-only-32-bytes',
  TESTFORGE_SECRET_STORE_KEY: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
} as NodeJS.ProcessEnv;

describe('validateConfig', () => {
  it('honors an explicit development auth disable override even when MongoDB is configured', () => {
    expect(getEnterpriseAuthConfig({ MONGODB_URI: 'mongodb://configured', TESTFORGE_AUTH_ENABLED: 'false' })).toEqual({ requireLogin: false });
    expect(getEnterpriseAuthConfig({ MONGODB_URI: 'mongodb://configured', TESTFORGE_AUTH_ENABLED: 'true' })).toEqual({ requireLogin: true });
  });

  it('uses a custom CORS origin when provided', () => {
    const config = validateConfig({
      ...baseEnv,
      CORS_ORIGIN: 'https://example.com',
    });

    expect(config.corsOrigin).toBe('https://example.com');
  });

  it('falls back to the development default when CORS_ORIGIN is missing', () => {
    const config = validateConfig(baseEnv);

    expect(config.corsOrigin).toBe('http://localhost:3000,http://localhost:5173');
  });

  it('requires an explicit single-node acknowledgement for production JSON persistence', () => {
    expect(() => validateConfig({ PORT: '3001', NODE_ENV: 'production', ...deploymentSecrets, CORS_ORIGIN: 'https://example.com' })).toThrow('JSON persistence is single-node only');
    expect(validateConfig({ PORT: '3001', NODE_ENV: 'production', ...deploymentSecrets, CORS_ORIGIN: 'https://example.com', TESTFORGE_ALLOW_SINGLE_NODE_JSON: 'true' }).persistenceDriver).toBe('json');
  });

  it('requires a supplied encryption key in staging and production', () => {
    expect(() => validateConfig({ PORT: '3001', NODE_ENV: 'staging', ...deploymentSecrets, TESTFORGE_SECRET_STORE_KEY: undefined, TESTFORGE_ALLOW_SINGLE_NODE_JSON: 'true', CORS_ORIGIN: 'https://example.com' })).toThrow('TESTFORGE_SECRET_STORE_KEY is required');
    expect(() => validateConfig({ PORT: '3001', NODE_ENV: 'production', ...deploymentSecrets, TESTFORGE_SECRET_STORE_KEY: 'not-a-key', TESTFORGE_ALLOW_SINGLE_NODE_JSON: 'true', CORS_ORIGIN: 'https://example.com' })).toThrow('base64-encoded 32-byte key');
  });

  it('requires a real authentication credential and public CORS origin in deployment environments', () => {
    expect(() => validateConfig({ PORT: '3001', NODE_ENV: 'production', TESTFORGE_AUTH_ENABLED: 'true', TESTFORGE_SECRET_STORE_KEY: deploymentSecrets.TESTFORGE_SECRET_STORE_KEY, TESTFORGE_ALLOW_SINGLE_NODE_JSON: 'true', CORS_ORIGIN: 'https://example.com' })).toThrow('Set TESTFORGE_API_KEY or TESTFORGE_JWT_SECRET');
    expect(() => validateConfig({ PORT: '3001', NODE_ENV: 'production', ...deploymentSecrets, TESTFORGE_ALLOW_SINGLE_NODE_JSON: 'true', CORS_ORIGIN: '*' })).toThrow('CORS_ORIGIN must be an explicit non-wildcard');
    expect(() => validateConfig({ PORT: '3001', NODE_ENV: 'production', ...deploymentSecrets, TESTFORGE_ALLOW_SINGLE_NODE_JSON: 'true', CORS_ORIGIN: 'https://example.com', TESTFORGE_JWT_SECRET: 'short' })).toThrow('TESTFORGE_JWT_SECRET must contain at least 32 bytes');
  });
});
