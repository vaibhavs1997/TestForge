import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core frameworks
          'vendor-react': ['react', 'react-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-router': ['react-router-dom'],
          'vendor-ui': ['zustand', 'react-hook-form', '@hookform/resolvers', 'zod', 'axios'],
        },
      },
    },
    // Increase chunk size warning limit since we're intentionally splitting
    chunkSizeWarningLimit: 1000,
  },
});
