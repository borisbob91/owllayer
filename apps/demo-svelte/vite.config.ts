import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@domos/svelte': resolve(rootDir, '../../packages/svelte/src'),
      '@domos/core':   resolve(rootDir, '../../packages/core/src'),
    },
  },
  server: { port: 4300 },
});
