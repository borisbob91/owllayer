import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@domos/ui/devtools': resolve(rootDir, '../../packages/ui/dist/devtools.esm.js'),
      '@domos/ui/dashboard': resolve(rootDir, '../../packages/ui/dist/dashboard.esm.js'),
      '@domos/ui': resolve(rootDir, '../../packages/ui/dist/ui.esm.js'),
      '@domos/svelte': resolve(rootDir, '../../packages/svelte/src'),
      '@domos/core': resolve(rootDir, '../../packages/core/src'),
    },
  },
  optimizeDeps: {
    exclude: ['@domos/ui', '@domos/ui/devtools', '@domos/ui/dashboard'],
  },
  server: { port: 4300 },
});
