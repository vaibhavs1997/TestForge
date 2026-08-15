import { describe, expect, it } from 'vitest';
import { validateConfig } from './config';

const baseEnv = {
  PORT: '3001',
  NODE_ENV: 'development',
} as NodeJS.ProcessEnv;

describe('validateConfig', () => {
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
});
