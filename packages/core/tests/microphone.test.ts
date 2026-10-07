import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMicrophoneSource, downsamplePcm, getMicrophoneErrorKind } from '../src/index.js';

const stream = {} as MediaStream;

function fakeAudioContext(refuseRate?: number, nativeRate = 48000) {
  const created: Array<{ sampleRate: number; close: ReturnType<typeof vi.fn> }> = [];
  class FakeContext {
    sampleRate: number;
    close = vi.fn(async () => {});
    constructor(options?: { sampleRate?: number }) {
      this.sampleRate = options?.sampleRate ?? nativeRate;
      created.push(this);
    }
    createMediaStreamSource() {
      if (this.sampleRate === refuseRate) {
        const err = new Error('different sample-rate');
        err.name = 'NotSupportedError';
        throw err;
      }
      return { kind: 'source' };
    }
  }
  vi.stubGlobal('AudioContext', FakeContext);
  return created;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createMicrophoneSource', () => {
  it('connecte le micro a la frequence demandee quand le navigateur l\'accepte', () => {
    const created = fakeAudioContext();
    const mic = createMicrophoneSource(stream, 16000);
    expect(mic.ratio).toBe(1);
    expect(mic.context.sampleRate).toBe(16000);
    expect(created).toHaveLength(1);
  });

  it('repli sur la frequence native quand la connexion est refusee (Firefox)', () => {
    const created = fakeAudioContext(16000, 48000);
    const mic = createMicrophoneSource(stream, 16000);
    expect(mic.context.sampleRate).toBe(48000);
    expect(mic.ratio).toBe(3);
    expect(created[0].close).toHaveBeenCalled();
  });
});

describe('downsamplePcm', () => {
  it('ne touche pas un signal deja a la bonne frequence', () => {
    const input = new Float32Array([0.1, 0.2]);
    expect(downsamplePcm(input, 1)).toBe(input);
  });

  it('moyenne chaque fenetre de ratio echantillons', () => {
    const out = downsamplePcm(new Float32Array([0, 0.3, 0.6, 1, 1, 1, 0.5]), 3);
    expect(out).toHaveLength(2);
    expect(out[0]).toBeCloseTo(0.3);
    expect(out[1]).toBeCloseTo(1);
  });
});

describe('getMicrophoneErrorKind', () => {
  const named = (name: string) => Object.assign(new Error(name), { name });
  it('classe les erreurs du navigateur', () => {
    expect(getMicrophoneErrorKind(named('NotAllowedError'))).toBe('permission');
    expect(getMicrophoneErrorKind(named('SecurityError'))).toBe('permission');
    expect(getMicrophoneErrorKind(named('NotFoundError'))).toBe('no-device');
    expect(getMicrophoneErrorKind(named('NotReadableError'))).toBe('unavailable');
    expect(getMicrophoneErrorKind(null)).toBe('unavailable');
  });
});
