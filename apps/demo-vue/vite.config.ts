import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      { find: '@owllayer/ui/devtools',  replacement: resolve(rootDir, '../../packages/ui/dist/devtools.esm.js') },
      { find: '@owllayer/ui/dashboard', replacement: resolve(rootDir, '../../packages/ui/dist/dashboard.esm.js') },
      { find: '@owllayer/ui',           replacement: resolve(rootDir, '../../packages/ui/dist/ui.esm.js') },
      { find: '@owllayer/vue',          replacement: resolve(rootDir, '../../packages/vue/src') },
      { find: '@owllayer/core',         replacement: resolve(rootDir, '../../packages/core/src') },
      { find: '@owllayer/ui/devtools',  replacement: resolve(rootDir, '../../packages/ui/dist/devtools.esm.js') },
      { find: '@owllayer/ui/dashboard', replacement: resolve(rootDir, '../../packages/ui/dist/dashboard.esm.js') },
      { find: '@owllayer/ui',           replacement: resolve(rootDir, '../../packages/ui/dist/ui.esm.js') },
      { find: '@owllayer/vue',          replacement: resolve(rootDir, '../../packages/vue/src') },
      { find: '@owllayer/core',         replacement: resolve(rootDir, '../../packages/core/src') },
    ],
  },
  optimizeDeps: {
    exclude: ['@owllayer/ui', '@owllayer/ui/devtools', '@owllayer/ui/dashboard', '@owllayer/ui', '@owllayer/ui/devtools', '@owllayer/ui/dashboard'],
  },
  server: {
    port: 4200,
  },
});
