import { build } from 'esbuild';
import { statSync } from 'fs';

const shared = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  sourcemap: true,
  target: 'es2022',
  jsx: 'automatic',
  jsxImportSource: 'preact',
};

function kb(file) {
  try { return (statSync(file).size / 1024).toFixed(1) + ' KB'; } catch { return '?'; }
}

function log(outfile, start) {
  const elapsed = Date.now() - start;
  console.log(`  ✓ ${outfile.padEnd(32)} ${kb(outfile).padStart(8)}   ${elapsed}ms`);
}

console.log('\n@domos/browser — build\n');

let t = Date.now();
await build({
  ...shared,
  external: ['@domos/core'],
  format: 'esm',
  outfile: 'dist/domos.bundle.mjs',
  minify: false,
});
log('dist/domos.bundle.mjs', t);

t = Date.now();
await build({
  ...shared,
  format: 'iife',
  globalName: 'DomOS',
  outfile: 'dist/domos.min.js',
  minify: true,
});
log('dist/domos.min.js', t);

// Bundle core-only — sans Preact, sans WidgetHost, sans HitlOverlay (~8 KB gzippé)
t = Date.now();
await build({
  entryPoints: ['src/domos.core.ts'],
  bundle: true,
  sourcemap: true,
  target: 'es2022',
  external: ['@domos/core', 'preact'],
  format: 'esm',
  outfile: 'dist/domos.core.esm.js',
  minify: false,
});
log('dist/domos.core.esm.js', t);

console.log('');
