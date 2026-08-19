import { readFile, writeFile } from 'node:fs/promises';

const manifestPath = new URL('../../packages/core/package.json', import.meta.url);
const constantsPath = new URL('../../packages/core/src/protocol/aitp.constants.ts', import.meta.url);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const source = await readFile(constantsPath, 'utf8');
const sdkVersionPattern = /export const SDK_VERSION = '[^']+';/;
if (!sdkVersionPattern.test(source)) throw new Error('SDK_VERSION introuvable dans aitp.constants.ts.');

const next = source.replace(
  sdkVersionPattern,
  `export const SDK_VERSION = '${manifest.version}';`,
);

await writeFile(constantsPath, next);
console.log(`SDK_VERSION synchronisee avec @owllayer/core@${manifest.version}.`);
