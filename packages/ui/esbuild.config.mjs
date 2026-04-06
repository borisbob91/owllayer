import { build } from 'esbuild';
import { statSync } from 'fs';

const shared = {
  bundle: true,
  sourcemap: true,
  target: 'es2022',
  jsx: 'automatic',
  jsxImportSource: 'preact',
  external: ['@domos/core'],
  // treat .ts files as tsx so index.ts can contain JSX mount calls
  loader: { '.ts': 'tsx' },
};

function kb(file) {
  try { return (statSync(file).size / 1024).toFixed(1) + ' KB'; } catch { return '?'; }
}

function log(outfile, start) {
  const elapsed = Date.now() - start;
  console.log(`  ✓ ${outfile.padEnd(36)} ${kb(outfile).padStart(8)}   ${elapsed}ms`);
}

console.log('\n@domos/ui — build\n');

let t = Date.now();
await build({ ...shared, entryPoints: ['src/index.ts'], format: 'esm', outfile: 'dist/ui.esm.js' });
log('dist/ui.esm.js', t);

t = Date.now();
await build({ ...shared, entryPoints: ['src/dashboard/index.ts'], format: 'esm', outfile: 'dist/dashboard.esm.js' });
log('dist/dashboard.esm.js', t);

t = Date.now();
await build({ ...shared, entryPoints: ['src/devtools/index.ts'], format: 'esm', outfile: 'dist/devtools.esm.js' });
log('dist/devtools.esm.js', t);

console.log('');
