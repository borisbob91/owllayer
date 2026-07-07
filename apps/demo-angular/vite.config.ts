import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@domos/ui/devtools': resolve(rootDir, '../../packages/ui/dist/devtools.esm.js'),
      '@domos/ui/dashboard': resolve(rootDir, '../../packages/ui/dist/dashboard.esm.js'),
      '@domos/ui': resolve(rootDir, '../../packages/ui/dist/ui.esm.js'),
      '@domos/core': resolve(rootDir, '../../packages/core/src'),
    },
  },
  optimizeDeps: {
    exclude: ['@domos/ui', '@domos/ui/devtools', '@domos/ui/dashboard'],
  },
  server: {
    port: 4400,
  },
  test: {
    environment: 'node',
  },
});