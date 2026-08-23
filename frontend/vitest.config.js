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
      // Unit/integration coverage is intentionally scoped to the reusable
      // frontend core with direct tests. Full workspace/page composition is
      // exercised by the production Playwright gate, not counted as unit
      // coverage merely because V8 discovers every source file.
      include: [
        'src/utils/{validation,sensitiveBrowserState,json,date,cn}.ts',
        'src/types/apiModels.ts',
        'src/routes/paths.ts',
        'src/components/ui/{Badge,Button,Card,EmptyState}.tsx',
        'src/components/shared/{NotificationBell,SearchBar,Toast}.tsx',
        'src/modules/api-execution/utils/scriptSandbox.ts',
        'src/modules/{execution,requirements}/utils/{dependencyDisplay,mappingDisplay}.ts',
        'src/modules/project/components/{CreateProjectModal,ExecutionWorkspace,ProjectCardMenu}.tsx',
      ],
      thresholds: { statements: 60, branches: 45, functions: 55, lines: 62 },
    },
  },
});
