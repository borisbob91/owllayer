import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@domos/vue': resolve(rootDir, '../../packages/vue/src'),
      '@domos/core': resolve(rootDir, '../../packages/core/src'),
    },
  },
  server: {
    port: 4200,
  },
});
