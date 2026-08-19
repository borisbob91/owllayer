import { build } from 'esbuild';
import { statSync } from 'fs';

const shared = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  sourcemap: true,
  target: 'es2022',
  jsx: 'transform',
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
};

function kb(file) {
  try { return (statSync(file).size / 1024).toFixed(1) + ' KB'; } catch { return '?'; }
}

function log(outfile, start) {
  const elapsed = Date.now() - start;
  console.log(`  ✓ ${outfile.padEnd(40)} ${kb(outfile).padStart(8)}   ${elapsed}ms`);
}

console.log('\n@owllayer/shopify — build\n');

// ESM bundle — @owllayer/browser et @owllayer/core fournis par le consommateur (npm/bundler)
let t = Date.now();
await build({
  ...shared,
  external: ['@owllayer/browser', '@owllayer/core', '@owllayer/browser', '@owllayer/core'],
  format: 'esm',
  outfile: 'dist/owllayer-shopify.bundle.mjs',
  minify: false,
});
log('dist/owllayer-shopify.bundle.mjs', t);

// IIFE CDN — bundle autonome, @owllayer/browser inclus, pour <script> Liquid
// @owllayer/ui est dev-only (DevTools) : jamais dans un bundle CDN
t = Date.now();
await build({
  ...shared,
  external: ['@owllayer/ui', '@owllayer/ui/devtools', '@owllayer/ui', '@owllayer/ui/devtools'],
  format: 'iife',
  globalName: 'OwlLayerShopify',
  outfile: 'dist/owllayer-shopify.min.js',
  minify: true,
});
log('dist/owllayer-shopify.min.js', t);

console.log('');
