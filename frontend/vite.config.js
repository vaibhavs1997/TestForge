import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = fileURLToPath(new URL('.', import.meta.url));
const srcRoot = path.resolve(frontendRoot, 'src');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendPort = env.PORT || '3000';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': srcRoot,
      },
    },
    server: {
      proxy: {
        '/api': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: [],
      css: true,
      pool: 'threads',
      maxWorkers: 1,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-router': ['react-router-dom'],
            'vendor-ui': ['zustand', 'react-hook-form', '@hookform/resolvers', 'zod', 'axios'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
  };
});
