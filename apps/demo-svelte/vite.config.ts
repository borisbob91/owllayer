import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@owllayer/ui/devtools': resolve(rootDir, '../../packages/ui/dist/devtools.esm.js'),
      '@owllayer/ui/dashboard': resolve(rootDir, '../../packages/ui/dist/dashboard.esm.js'),
      '@owllayer/ui': resolve(rootDir, '../../packages/ui/dist/ui.esm.js'),
      '@owllayer/svelte': resolve(rootDir, '../../packages/svelte/src'),
      '@owllayer/core': resolve(rootDir, '../../packages/core/src'),
      '@owllayer/ui/devtools': resolve(rootDir, '../../packages/ui/dist/devtools.esm.js'),
      '@owllayer/ui/dashboard': resolve(rootDir, '../../packages/ui/dist/dashboard.esm.js'),
      '@owllayer/ui': resolve(rootDir, '../../packages/ui/dist/ui.esm.js'),
      '@owllayer/svelte': resolve(rootDir, '../../packages/svelte/src'),
      '@owllayer/core': resolve(rootDir, '../../packages/core/src'),
    },
  },
  optimizeDeps: {
    exclude: ['@owllayer/ui', '@owllayer/ui/devtools', '@owllayer/ui/dashboard', '@owllayer/ui', '@owllayer/ui/devtools', '@owllayer/ui/dashboard'],
  },
  server: { port: 4300 },
});
