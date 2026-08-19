import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const commandOptions = process.platform === 'win32' ? { shell: true } : {};
const artifactDir = await mkdtemp(path.join(tmpdir(), 'owllayer-packs-'));
const packageDirs = await readdir(path.join(root, 'packages'), { withFileTypes: true });

function runPack(dir, destination) {
  const packArgs = ['--dir', dir, 'pack', '--pack-destination', destination];
  try {
    execFileSync(pnpm, packArgs, { cwd: root, stdio: 'inherit', ...commandOptions });
  } catch (err) {
    if (err.code === 'ENOENT') {
      execFileSync('corepack', ['pnpm', ...packArgs], { cwd: root, stdio: 'inherit', ...commandOptions });
    } else {
      throw err;
    }
  }
}

import { existsSync } from 'node:fs';

try {
  for (const entry of packageDirs.filter((entry) => entry.isDirectory())) {
    const manifestPath = path.join(root, 'packages', entry.name, 'package.json');
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    if (manifest.private) continue;
    runPack(path.join(root, 'packages', entry.name), artifactDir);
  }

  for (const tarball of await readdir(artifactDir)) {
    const tarballPath = path.join(artifactDir, tarball);
    const entries = execFileSync('tar', ['-tzf', tarballPath], { encoding: 'utf8' });
    if (/^package\/(src|tests?|__tests__)\//m.test(entries)) throw new Error(`${tarball} contient des sources ou tests non publies.`);
    const packedManifest = execFileSync('tar', ['-xOf', tarballPath, 'package/package.json'], { encoding: 'utf8' });
    if (packedManifest.includes('workspace:')) throw new Error(`${tarball} contient une dependance workspace:* non resolue.`);
  }
} finally {
  await rm(artifactDir, { recursive: true, force: true });
}
