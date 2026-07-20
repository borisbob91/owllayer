import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const commandOptions = process.platform === 'win32' ? { shell: true } : {};
const artifactDir = await mkdtemp(path.join(tmpdir(), 'domos-packs-'));
const packageDirs = await readdir(path.join(root, 'packages'), { withFileTypes: true });

try {
  for (const entry of packageDirs.filter((entry) => entry.isDirectory())) {
    const manifestPath = path.join(root, 'packages', entry.name, 'package.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    if (manifest.private) continue;
    execFileSync(pnpm, ['--dir', path.join(root, 'packages', entry.name), 'pack', '--pack-destination', artifactDir], {
      cwd: root,
      stdio: 'inherit',
      ...commandOptions,
    });
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
