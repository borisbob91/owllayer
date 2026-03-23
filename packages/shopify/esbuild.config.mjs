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

console.log('\n@domos/shopify — build\n');

// ESM bundle — @domos/browser et @domos/core fournis par le consommateur (npm/bundler)
let t = Date.now();
await build({
  ...shared,
  external: ['@domos/browser', '@domos/core'],
  format: 'esm',
  outfile: 'dist/domos-shopify.bundle.mjs',
  minify: false,
});
log('dist/domos-shopify.bundle.mjs', t);

// IIFE CDN — bundle autonome, @domos/browser inclus, pour <script> Liquid
t = Date.now();
await build({
  ...shared,
  format: 'iife',
  globalName: 'DomOSShopify',
  outfile: 'dist/domos-shopify.min.js',
  minify: true,
});
log('dist/domos-shopify.min.js', t);

console.log('');
