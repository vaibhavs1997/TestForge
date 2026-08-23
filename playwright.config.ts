import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3101',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: [
    {
      command: 'node e2e/fixture-api-server.mjs',
      url: 'http://127.0.0.1:3102/health',
      reuseExistingServer: false,
    },
    {
      command: 'node dist/index.js',
      cwd: 'backend',
      url: 'http://127.0.0.1:3100/health',
      reuseExistingServer: false,
      env: {
        NODE_ENV: 'production', PORT: '3100', CORS_ORIGIN: 'http://127.0.0.1:3101',
        TESTFORGE_JWT_SECRET: 'e2e-only-jwt-secret-not-for-production', RATE_LIMIT_ENABLED: 'false',
        TESTFORGE_SECRET_STORE_KEY: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
        TESTFORGE_ALLOW_SINGLE_NODE_JSON: 'true',
        AI_ENABLED: 'false', RAG_ENABLED: 'false', EMBEDDING_ENABLED: 'false',
      },
    },
    {
      command: 'node ../node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 3101',
      cwd: 'frontend',
      url: 'http://127.0.0.1:3101',
      reuseExistingServer: false,
      env: { TESTFORGE_E2E_BACKEND_URL: 'http://127.0.0.1:3100' },
    },
  ],
});
