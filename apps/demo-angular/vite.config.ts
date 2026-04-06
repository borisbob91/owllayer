import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 4400,
  },
  test: {
    environment: 'node',
  },
});