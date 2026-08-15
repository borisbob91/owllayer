import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as audio from '../../../src/media/audio/index.js';

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

describe('@owllayer/core/media/audio', () => {
  it('exposes the canonical runtime contract', () => {
    for (const exportName of expectedRuntimeExports) {
      expect(audio).toHaveProperty(exportName);
    }
  });

  it('keeps audio out of the root Core entrypoint', () => {
    const rootEntry = readFileSync(new URL('../../../src/index.ts', import.meta.url), 'utf8');

    expect(rootEntry).not.toContain('media/audio');
  });
});
