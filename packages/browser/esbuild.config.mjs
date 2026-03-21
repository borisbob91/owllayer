import { build } from 'esbuild';

const shared = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  sourcemap: true,
  target: 'es2022',
  jsx: 'automatic',
  jsxImportSource: 'preact',
};

await build({
  ...shared,
  external: ['@domos/core'],
  format: 'esm',
  outfile: 'dist/index.mjs',
  minify: false,
});

await build({
  ...shared,
  format: 'iife',
  globalName: 'DomOS',
  outfile: 'dist/domos.min.js',
  minify: true,
});
