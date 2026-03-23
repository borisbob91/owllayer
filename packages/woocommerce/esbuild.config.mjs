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

console.log('\n@domos/woocommerce — build\n');

// ESM bundle — @domos/browser et @domos/core fournis par le consommateur (npm/bundler)
let t = Date.now();
await build({
  ...shared,
  external: ['@domos/browser', '@domos/core'],
  format: 'esm',
  outfile: 'dist/domos-woocommerce.bundle.mjs',
  minify: false,
});
log('dist/domos-woocommerce.bundle.mjs', t);

// IIFE CDN — bundle autonome pour <script> WordPress (wp_enqueue_script)
// DomOSWoo exposé en global window.DomOSWoo
t = Date.now();
await build({
  ...shared,
  format: 'iife',
  globalName: 'DomOSWooExports',
  // Expose DomOSWoo sur window directement via le banner
  banner: {
    js: `(function(g){ var _exports = `,
  },
  footer: {
    js: `; g.DomOSWoo = _exports.DomOSWoo; })(typeof globalThis !== 'undefined' ? globalThis : window);`,
  },
  outfile: 'dist/domos-woocommerce.min.js',
  minify: true,
});
log('dist/domos-woocommerce.min.js', t);

// Copy IIFE to plugin/assets/ if plugin directory exists
try {
  mkdirSync('plugin/assets', { recursive: true });
  copyFileSync('dist/domos-woocommerce.min.js', 'plugin/assets/domos-woocommerce.min.js');
  console.log('  ✓ plugin/assets/domos-woocommerce.min.js (copied)');
} catch { /* plugin dir not yet created — skip */ }

console.log('');
