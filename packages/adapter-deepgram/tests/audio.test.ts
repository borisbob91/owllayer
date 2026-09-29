import { describe, it, expect } from 'vitest';
import { createEvenByteAligner, mimeTypeToDeepgramEncoding } from '../src/audio.js';

describe('mimeTypeToDeepgramEncoding', () => {
  it('maps audio/pcm;rate=16000 to linear16 at 16000 Hz (input format)', () => {
    expect(mimeTypeToDeepgramEncoding('audio/pcm;rate=16000')).toEqual({ encoding: 'linear16', sampleRate: 16000 });
  });

  it('maps audio/pcm;rate=24000 to linear16 at 24000 Hz (output format)', () => {
    expect(mimeTypeToDeepgramEncoding('audio/pcm;rate=24000')).toEqual({ encoding: 'linear16', sampleRate: 24000 });
  });

  it('defaults to 16000 Hz when audio/pcm has no rate parameter', () => {
    expect(mimeTypeToDeepgramEncoding('audio/pcm')).toEqual({ encoding: 'linear16', sampleRate: 16000 });
  });

  it('returns undefined for a non-PCM mime type', () => {
    expect(mimeTypeToDeepgramEncoding('audio/mpeg')).toBeUndefined();
    expect(mimeTypeToDeepgramEncoding('audio/wav')).toBeUndefined();
  });
});

describe('createEvenByteAligner', () => {
  it('passes through a chunk that is already even-length', () => {
    const align = createEvenByteAligner();
    const chunk = Buffer.from([1, 2, 3, 4]);
    expect(align(chunk)).toEqual(chunk);
  });

  it('holds back the trailing odd byte and prepends it to the next chunk', () => {
    const align = createEvenByteAligner();

    const first = align(Buffer.from([1, 2, 3])); // 3 octets : 1 sample pair + 1 octet en attente
    expect(first).toEqual(Buffer.from([1, 2]));

    const second = align(Buffer.from([4, 5])); // l'octet 3 en attente + [4, 5] = [3, 4, 5] -> pair
    expect(second).toEqual(Buffer.from([3, 4]));
  });

  it('never emits a chunk with an odd byte length across a stream of odd-length inputs', () => {
    const align = createEvenByteAligner();
    const outputs = [
      align(Buffer.from([1])),
      align(Buffer.from([2, 3, 4])),
      align(Buffer.from([5])),
      align(Buffer.from([6, 7])),
    ];

    for (const output of outputs) {
      expect(output.length % 2).toBe(0);
    }

    // Le flux complet reconstruit doit conserver tous les octets, dans l'ordre.
    const rebuilt = Buffer.concat(outputs);
    expect(Array.from(rebuilt)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('carries the pending byte across an empty chunk without losing it', () => {
    const align = createEvenByteAligner();
    expect(align(Buffer.from([9]))).toEqual(Buffer.alloc(0));
    expect(align(Buffer.from([]))).toEqual(Buffer.alloc(0));
    expect(align(Buffer.from([10]))).toEqual(Buffer.from([9, 10]));
  });
});
