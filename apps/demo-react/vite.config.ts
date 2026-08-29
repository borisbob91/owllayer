import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@owllayer/react': resolve(rootDir, '../../packages/react/src'),
      '@owllayer/core': resolve(rootDir, '../../packages/core/src'),
      '@owllayer/ui/devtools': resolve(rootDir, '../../packages/ui/dist/devtools.esm.js'),
      '@owllayer/ui/dashboard': resolve(rootDir, '../../packages/ui/dist/dashboard.esm.js'),
      '@owllayer/ui': resolve(rootDir, '../../packages/ui/dist/ui.esm.js'),
      '@owllayer-plugins/demo-crm': resolve(rootDir, '../../plugins/demo-crm/src'),
      '@owllayer-plugins/bar-chart/react': resolve(rootDir, '../../plugins/bar-chart/src/react'),
      '@owllayer-plugins/bar-chart': resolve(rootDir, '../../plugins/bar-chart/src'),
      '@owllayer-plugins/form-filler/react': resolve(rootDir, '../../plugins/form-filler/src/react'),
      '@owllayer-plugins/form-filler': resolve(rootDir, '../../plugins/form-filler/src'),
      '@owllayer-plugins/scroll': resolve(rootDir, '../../plugins/scroll/src'),
    },
  },
  server: {
    port: 4100,
  },
});
