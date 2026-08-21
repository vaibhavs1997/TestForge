import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = fileURLToPath(new URL('.', import.meta.url));
const srcRoot = path.resolve(frontendRoot, 'src');

export default defineConfig({
  resolve: {
    alias: {
      '@': srcRoot,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    css: true,
    pool: 'threads',
    maxWorkers: 1,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage',
      thresholds: { statements: 60, branches: 45, functions: 55, lines: 62 },
    },
  },
});
