import { SpeechServiceError } from '@owllayer/core';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_GEMINI_TTS_MODEL,
  GeminiTTSService,
  type GeminiTTSClientOptions,
  type GeminiTTSSynthesizedAudio,
} from '../src/index.js';

const liveKitGoogleMock = vi.hoisted(() => {
  const synthesize = vi.fn();
  const TTS = vi.fn((_options: unknown) => ({ synthesize }));

  return { synthesize, TTS };
});

vi.mock('@livekit/agents-plugin-google', () => ({
  beta: {
    TTS: liveKitGoogleMock.TTS,
  },
}));

function buildFrame(
  samples: number[],
  sampleRate = 24000,
  channels = 1
): GeminiTTSSynthesizedAudio {
  return {
    frame: {
      data: new Int16Array(samples),
      sampleRate,
      channels,
      samplesPerChannel: Math.floor(samples.length / channels),
    },
    final: true,
  };
}

async function* buildStream(events: GeminiTTSSynthesizedAudio[]) {
  for (const event of events) {
    yield event;
  }
}

describe('GeminiTTSService', () => {
  it('constructs the real LiveKit Google TTS plugin boundary through dynamic import', async () => {
    liveKitGoogleMock.synthesize.mockReturnValueOnce(buildStream([buildFrame([10, 20])]));

    const service = new GeminiTTSService({
      apiKey: 'test-api-key',
      env: {},
      defaultVoice: 'Kore',
    });

    const result = await service.synthesize({ text: 'Salut', voice: 'Puck' });

    expect(liveKitGoogleMock.TTS).toHaveBeenCalledWith({
      model: DEFAULT_GEMINI_TTS_MODEL,
      voiceName: 'Puck',
      apiKey: 'test-api-key',
      vertexai: false,
    });
    expect(liveKitGoogleMock.synthesize).toHaveBeenCalledWith('Salut', undefined, expect.any(AbortSignal));
    expect(result.audioBase64).toBe(Buffer.from(new Int16Array([10, 20]).buffer).toString('base64'));
  });

  it('synthesizes OwlLayer TTSConfig through a LiveKit Gemini TTS client', async () => {
    const synthesize = vi.fn(() => buildStream([
      buildFrame([1, 2, 3, 4]),
      buildFrame([5, 6]),
    ]));
    const clientFactory = vi.fn(() => ({ synthesize }));
    const service = new GeminiTTSService({
      apiKey: 'test-api-key',
      env: {},
      model: 'gemini-2.5-flash-tts',
      defaultVoice: 'Kore',
      instructions: 'Speak clearly.',
      customPronunciations: [
        { phrase: 'LiveKit', pronunciation: 'Live Kit' },
      ],
      clientFactory,
    });

    const result = await service.synthesize({
      text: '  Bonjour OwlLayer  ',
      voice: 'Zephyr',
      speed: 1.2,
      outputFormat: 'pcm',
    });

    expect(clientFactory).toHaveBeenCalledWith({
      model: 'gemini-2.5-flash-tts',
      voiceName: 'Zephyr',
      apiKey: 'test-api-key',
      vertexai: false,
      instructions: 'Speak clearly.',
      customPronunciations: {
        pronunciations: [
          { phrase: 'LiveKit', pronunciation: 'Live Kit' },
        ],
      },
    } satisfies GeminiTTSClientOptions);
    expect(synthesize).toHaveBeenCalledWith('Bonjour OwlLayer', undefined, expect.any(AbortSignal));
    expect(result.mimeType).toBe('audio/pcm;rate=24000');
    expect(Buffer.from(result.audioBase64, 'base64')).toEqual(Buffer.from(new Int16Array([1, 2, 3, 4, 5, 6]).buffer));
    expect(result.characterCount).toBe('Bonjour OwlLayer'.length);
    expect(result.metadata).toMatchObject({
      provider: 'livekit-google-gemini',
      model: 'gemini-2.5-flash-tts',
      voice: 'Zephyr',
      sampleRate: 24000,
      channels: 1,
      outputFormat: 'pcm_s16le',
      requestedSpeed: 1.2,
      requestedFormat: 'pcm',
    });
  });

  it('fails safely when Google API credentials are missing', () => {
    expect(() => new GeminiTTSService({ env: {} })).toThrow(SpeechServiceError);
    expect(() => new GeminiTTSService({ env: {} })).toThrow('Google API key is required');
  });

  it('supports Vertex AI credentials without an API key', async () => {
    const service = new GeminiTTSService({
      env: {},
      vertexai: true,
      project: 'owllayer-project',
      location: 'europe-west1',
      clientFactory: () => ({ synthesize: () => buildStream([buildFrame([1, 2])]) }),
    });

    await expect(service.isAvailable()).resolves.toBe(true);
    await service.synthesize({ text: 'Salut' });
  });

  it('sanitizes provider errors before exposing SpeechServiceError', async () => {
    const service = new GeminiTTSService({
      apiKey: 'secret-key',
      env: {},
      clientFactory: () => ({
        synthesize: () => (async function* () {
          throw new Error('provider failed with secret-key and Bearer abc.def.ghi');
        })(),
      }),
    });

    await expect(service.synthesize({ text: 'Bonjour' })).rejects.toMatchObject({
      name: 'SpeechServiceError',
      provider: 'gemini-tts',
      code: 'SYNTHESIS_ERROR',
    });

    await service.synthesize({ text: 'Bonjour' }).catch((error) => {
      expect(String(error.message)).not.toContain('secret-key');
      expect(String(error.message)).toContain('Bearer [redacted]');
    });
  });

  it('fails safely when Gemini TTS returns no audio frames', async () => {
    const service = new GeminiTTSService({
      apiKey: 'test-api-key',
      env: {},
      clientFactory: () => ({
        synthesize: () => buildStream([]),
      }),
    });

    await expect(service.synthesize({ text: 'Bonjour' })).rejects.toMatchObject({
      code: 'EMPTY_AUDIO',
      provider: 'gemini-tts',
    });
  });

  it('returns Gemini TTS voices and capabilities', async () => {
    const service = new GeminiTTSService({
      apiKey: 'test-api-key',
      env: {},
      defaultVoice: 'Aoede',
      model: DEFAULT_GEMINI_TTS_MODEL,
    });

    const voices = await service.listVoices('fr-FR');
    const capabilities = service.getCapabilities();

    expect(voices.some((voice) => voice.id === 'Aoede')).toBe(true);
    expect(capabilities).toMatchObject({
      provider: 'gemini-tts',
      providerName: 'Gemini TTS via LiveKit',
      currentVoice: 'Aoede',
      currentLanguage: 'fr-FR',
    });
    expect(capabilities.models?.some((model) => model.id === DEFAULT_GEMINI_TTS_MODEL)).toBe(true);
    expect(capabilities.voices?.some((voice) => voice.id === 'Aoede')).toBe(true);
  });

  it('rejects mixed LiveKit audio frame formats', async () => {
    const service = new GeminiTTSService({
      apiKey: 'test-api-key',
      env: {},
      clientFactory: () => ({
        synthesize: () => buildStream([
          buildFrame([1, 2], 24000, 1),
          buildFrame([3, 4], 16000, 1),
        ]),
      }),
    });

    await expect(service.synthesize({ text: 'Bonjour' })).rejects.toMatchObject({
      code: 'INVALID_AUDIO_FORMAT',
      provider: 'gemini-tts',
    });
  });
});
