import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const retainedPublicPackages = new Set([
  '@owllayer/core',
  '@owllayer/ui',
  '@domos/browser',
  '@domos/react',
  '@domos/vue',
  '@domos/svelte',
  '@domos/angular',
  '@domos/server',
  '@domos/adapter-openai',
  '@domos/adapter-google',
  '@domos/adapter-anthropic',
  '@domos/adapter-livekit',
]);
const compatibilityPackages = new Set([
  '@domos/core',
  '@domos/ui',
]);
const publicPackages = new Set([...retainedPublicPackages, ...compatibilityPackages]);

async function readManifest(manifestPath) {
  return JSON.parse(await readFile(manifestPath, 'utf8'));
}

async function workspaceManifests(directory) {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true });
  return Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => ({
        path: path.join(directory, entry.name, 'package.json'),
        manifest: await readManifest(path.join(root, directory, entry.name, 'package.json')),
      })),
  );
}

const packageWorkspaces = await workspaceManifests('packages');
const actualPublicPackages = new Set(
  packageWorkspaces
    .filter(({ manifest }) => manifest.private !== true)
    .map(({ manifest }) => manifest.name),
);

const missing = [...publicPackages].filter((name) => !actualPublicPackages.has(name));
const unexpected = [...actualPublicPackages].filter((name) => !publicPackages.has(name));
if (missing.length > 0 || unexpected.length > 0) {
  throw new Error(
    `Invalid public package scope. Missing: ${missing.join(', ') || 'none'}; unexpected: ${unexpected.join(', ') || 'none'}.`,
  );
}

const privateWorkspaces = [
  ...(await workspaceManifests('apps')),
  ...(await workspaceManifests('plugins')),
  {
    path: 'docs-site/package.json',
    manifest: await readManifest(path.join(root, 'docs-site', 'package.json')),
  },
];
const nonPrivate = privateWorkspaces
  .filter(({ manifest }) => manifest.private !== true)
  .map(({ path: manifestPath, manifest }) => `${manifest.name ?? manifestPath} (${manifestPath})`);
if (nonPrivate.length > 0) {
  throw new Error(`Workspaces outside packages/ must be private: ${nonPrivate.join(', ')}.`);
}

const changesetsConfig = JSON.parse(await readFile(path.join(root, '.changeset', 'config.json'), 'utf8'));
if (changesetsConfig.privatePackages?.version !== false || changesetsConfig.privatePackages?.tag !== false) {
  throw new Error('Changesets must not version or tag private workspaces.');
}

console.log(
  `Release scope verified: ${retainedPublicPackages.size} retained public packages and ${compatibilityPackages.size} temporary public compatibility packages under packages/ only.`,
);
