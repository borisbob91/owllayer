import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const expectedRuntimeExports = [
  'base64EncodeAudio',
  'decodeAudio',
  'decodeAudioToFloat32',
  'decodeWAVFromBase64',
  'decodeWAVFromBuffer',
  'getWAVMetadata',
  'decodeOpusFromBase64',
  'decodeOpusPackets',
  'getOpusPacketDuration',
  'detectFormatFromBase64',
  'detectFormatFromBuffer',
  'getMimeType',
  'getFormatFromMimeType',
];

describe('@domos/audio compatibility shim', () => {
  it('builds Core before generating shim declarations', () => {
    const manifest = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    ) as { scripts?: { build?: string } };

    expect(manifest.scripts?.build).toContain('pnpm --filter @owllayer/core build');
  });

  it('keeps the source as a Core Media re-export', () => {
    const source = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8').trim();

    expect(source).toBe("export * from '@owllayer/core/media/audio';");
  });

  it('exposes the Core Media contract after build', async () => {
    const builtShim = new URL('../dist/index.js', import.meta.url);

    expect(existsSync(builtShim)).toBe(true);

    const audio = await import('../dist/index.js');
    for (const exportName of expectedRuntimeExports) {
      expect(audio).toHaveProperty(exportName);
    }
  });
});
