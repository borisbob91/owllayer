import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const base = process.argv.find((arg) => arg.startsWith('--base='))?.slice('--base='.length) ?? 'origin/master';
const diff = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { cwd: root, encoding: 'utf8' });
const changedFiles = diff.split(/\r?\n/).filter(Boolean);
const packageDirs = await readdir(path.join(root, 'packages'), { withFileTypes: true });
const publicPackages = new Map();

for (const entry of packageDirs.filter((entry) => entry.isDirectory())) {
  const manifest = JSON.parse(await readFile(path.join(root, 'packages', entry.name, 'package.json'), 'utf8'));
  if (!manifest.private) publicPackages.set(entry.name, manifest.name);
}

const changedPackages = new Set();
for (const file of changedFiles) {
  const match = /^packages\/([^/]+)\/(.+)$/.exec(file);
  if (!match || !publicPackages.has(match[1])) continue;
  const relative = match[2];
  if (/^(package\.json|README|CHANGELOG).*\.md?$/i.test(relative) || relative === 'package.json' || /(^|\/)(__tests__|tests|test)(\/|$)|\.(test|spec)\.[^.]+$/i.test(relative)) continue;
  changedPackages.add(publicPackages.get(match[1]));
}

if (changedPackages.size === 0) process.exit(0);

const changesetDir = path.join(root, '.changeset');
const changesetFiles = (await readdir(changesetDir)).filter((file) => file.endsWith('.md') && file !== 'README.md');
const declared = new Set();
for (const file of changesetFiles) {
  const content = await readFile(path.join(changesetDir, file), 'utf8');
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content)?.[1] ?? '';
  for (const match of frontmatter.matchAll(/^['"]?(@(?:owllayer|owllayer)\/[^'":]+)['"]?\s*:/gm)) declared.add(match[1]);
}

const missing = [...changedPackages].filter((name) => !declared.has(name));
if (missing.length > 0) throw new Error(`Changeset requis pour : ${missing.join(', ')}.`);
