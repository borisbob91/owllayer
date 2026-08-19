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

console.log('\n@owllayer/browser — build\n');

let t = Date.now();
await build({
  ...shared,
  external: ['@owllayer/core', '@owllayer/ui'],
  format: 'esm',
  outfile: 'dist/owllayer.bundle.mjs',
  minify: false,
});
log('dist/owllayer.bundle.mjs', t);

t = Date.now();
await build({
  ...shared,
  external: ['@owllayer/ui'],
  format: 'iife',
  globalName: 'OwlLayer',
  outfile: 'dist/owllayer.min.js',
  minify: true,
});
log('dist/owllayer.min.js', t);

// Bundle core-only — sans Preact, sans WidgetHost, sans HitlOverlay (~8 KB gzippé)
t = Date.now();
await build({
  entryPoints: ['src/owllayer.core.ts'],
  bundle: true,
  sourcemap: true,
  target: 'es2022',
  external: ['@owllayer/core', 'preact'],
  format: 'esm',
  outfile: 'dist/owllayer.core.esm.js',
  minify: false,
});
log('dist/owllayer.core.esm.js', t);

console.log('');
