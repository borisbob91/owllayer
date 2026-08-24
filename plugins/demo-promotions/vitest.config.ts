import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      // Point directly at source so tests run without needing a prior build
      '@owllayer/server': resolve(root, '../../packages/server/src/index.ts'),
    },
  },
});
