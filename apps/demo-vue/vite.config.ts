import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      { find: '@domos/ui/devtools',  replacement: resolve(rootDir, '../../packages/ui/dist/devtools.esm.js') },
      { find: '@domos/ui/dashboard', replacement: resolve(rootDir, '../../packages/ui/dist/dashboard.esm.js') },
      { find: '@domos/ui',           replacement: resolve(rootDir, '../../packages/ui/dist/ui.esm.js') },
      { find: '@domos/vue',          replacement: resolve(rootDir, '../../packages/vue/src') },
      { find: '@domos/core',         replacement: resolve(rootDir, '../../packages/core/src') },
    ],
  },
  optimizeDeps: {
    exclude: ['@domos/ui', '@domos/ui/devtools', '@domos/ui/dashboard'],
  },
  server: {
    port: 4200,
  },
});
