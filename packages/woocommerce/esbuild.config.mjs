import { build } from 'esbuild';
import { statSync, copyFileSync, mkdirSync } from 'fs';

const shared = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  sourcemap: true,
  target: 'es2022',
  loader: { '.tsx': 'tsx', '.ts': 'ts' },
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
  jsxImportSource: 'preact',
};

function kb(file) {
  try { return (statSync(file).size / 1024).toFixed(1) + ' KB'; } catch { return '?'; }
}

function log(outfile, start) {
  const elapsed = Date.now() - start;
  console.log(`  ✓ ${outfile.padEnd(42)} ${kb(outfile).padStart(8)}   ${elapsed}ms`);
}

console.log('\n@owllayer/woocommerce — build\n');

// ESM bundle — @owllayer/browser et @owllayer/core fournis par le consommateur (npm/bundler)
let t = Date.now();
await build({
  ...shared,
  external: ['@owllayer/browser', '@owllayer/core', '@owllayer/browser', '@owllayer/core'],
  format: 'esm',
  outfile: 'dist/owllayer-woocommerce.bundle.mjs',
  minify: false,
});
log('dist/owllayer-woocommerce.bundle.mjs', t);

// IIFE CDN — bundle autonome pour <script> WordPress (wp_enqueue_script)
// OwlLayerWoo exposé en global window.OwlLayerWoo
// @owllayer/ui est dev-only (DevTools) : jamais dans un bundle CDN
t = Date.now();
await build({
  ...shared,
  external: ['@owllayer/ui', '@owllayer/ui/devtools', '@owllayer/ui', '@owllayer/ui/devtools'],
  format: 'iife',
  globalName: 'OwlLayerWooExports',
  footer: {
    js: `(typeof globalThis !== 'undefined' ? globalThis : window).OwlLayerWoo = OwlLayerWooExports.OwlLayerWoo;`,
  },
  outfile: 'dist/owllayer-woocommerce.min.js',
  minify: true,
});
log('dist/owllayer-woocommerce.min.js', t);

// Copy IIFE to plugin/assets/ if plugin directory exists
try {
  mkdirSync('plugin/assets', { recursive: true });
  copyFileSync('dist/owllayer-woocommerce.min.js', 'plugin/assets/owllayer-woocommerce.min.js');
  console.log('  ✓ plugin/assets/owllayer-woocommerce.min.js (copied)');
} catch { /* plugin dir not yet created — skip */ }

console.log('');
