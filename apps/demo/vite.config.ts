import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@domos/react': resolve(rootDir, '../../packages/react/src'),
      '@domos/core': resolve(rootDir, '../../packages/core/src'),
      '@domos-plugins/demo-crm': resolve(rootDir, '../../plugins/demo-crm/src'),
    },
  },
  server: {
    port: 4100,
  },
});
