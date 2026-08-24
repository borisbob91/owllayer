import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@owllayer/ui/devtools': resolve(rootDir, '../../packages/ui/dist/devtools.esm.js'),
      '@owllayer/ui/dashboard': resolve(rootDir, '../../packages/ui/dist/dashboard.esm.js'),
      '@owllayer/ui': resolve(rootDir, '../../packages/ui/dist/ui.esm.js'),
      '@owllayer/core': resolve(rootDir, '../../packages/core/src'),
    },
  },
  optimizeDeps: {
    exclude: ['@owllayer/ui', '@owllayer/ui/devtools', '@owllayer/ui/dashboard'],
  },
  server: {
    port: 4400,
  },
  test: {
    environment: 'node',
  },
});