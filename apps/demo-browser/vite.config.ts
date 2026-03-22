import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@domos/browser': resolve(rootDir, '../../packages/browser/src'),
      '@domos/core': resolve(rootDir, '../../packages/core/src'),
    },
  },
  server: { port: 4300 },
  build: {
    rollupOptions: {
      input: {
        index:    resolve(rootDir, 'index.html'),
        panier:   resolve(rootDir, 'panier.html'),
        checkout: resolve(rootDir, 'checkout.html'),
      },
    },
  },
});
