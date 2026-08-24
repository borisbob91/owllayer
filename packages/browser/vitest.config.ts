import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@owllayer/ui/devtools': path.resolve(__dirname, '../ui/src/devtools/index.ts'),
      '@owllayer/ui/devtools': path.resolve(__dirname, '../ui/src/devtools/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
