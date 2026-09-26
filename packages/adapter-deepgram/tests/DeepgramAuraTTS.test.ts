import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeepgramAuraTTS } from '../src/DeepgramAuraTTS.js';

const AUDIO_BYTES = new Uint8Array([10, 20, 30, 40, 50]);

function binaryResponse(status = 200, bytes: Uint8Array = AUDIO_BYTES) {
  return {
    ok: status >= 200 && status < 300,
    status,
    arrayBuffer: vi.fn().mockResolvedValue(bytes.buffer),
    json: vi.fn().mockResolvedValue({ request_id: 'req-err' }),
  } as unknown as Response;
}

describe('DeepgramAuraTTS', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('has the fixed provider name deepgram-aura', () => {
    const tts = new DeepgramAuraTTS({ apiKey: 'k' });
    expect(tts.name).toBe('deepgram-aura');
  });

  it('authenticates with Authorization: Token and never puts the key in the URL', async () => {
    fetchMock.mockResolvedValue(binaryResponse());
    const tts = new DeepgramAuraTTS({ apiKey: 'sk-secret-key' });

    await tts.synthesize({ text: 'bonjour' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).not.toContain('sk-secret-key');
    expect((init.headers as Record<string, string>).Authorization).toBe('Token sk-secret-key');
  });

  it('posts to https://api.deepgram.com/v1/speak with a JSON { text } body', async () => {
    fetchMock.mockResolvedValue(binaryResponse());
    const tts = new DeepgramAuraTTS({ apiKey: 'k' });

    await tts.synthesize({ text: 'hello world' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url).split('?')[0]).toBe('https://api.deepgram.com/v1/speak');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ text: 'hello world' });
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('sends the voice as the model query parameter', async () => {
    fetchMock.mockResolvedValue(binaryResponse());
    const tts = new DeepgramAuraTTS({ apiKey: 'k', voice: 'aura-2-hector-fr', language: 'fr' });

    await tts.synthesize({ text: 'bonjour' });

    const query = new URL(String(fetchMock.mock.calls[0][0])).searchParams;
    expect(query.get('model')).toBe('aura-2-hector-fr');
  });

  it('sends speed and mip_opt_out only when configured', async () => {
    fetchMock.mockResolvedValue(binaryResponse());
    const tts = new DeepgramAuraTTS({ apiKey: 'k', speed: 1.2, mipOptOut: true });

    await tts.synthesize({ text: 'bonjour' });

    const query = new URL(String(fetchMock.mock.calls[0][0])).searchParams;
    expect(query.get('speed')).toBe('1.2');
    expect(query.get('mip_opt_out')).toBe('true');
  });

  it('omits mip_opt_out when not configured', async () => {
    fetchMock.mockResolvedValue(binaryResponse());
    const tts = new DeepgramAuraTTS({ apiKey: 'k' });

    await tts.synthesize({ text: 'bonjour' });

    const query = new URL(String(fetchMock.mock.calls[0][0])).searchParams;
    expect(query.has('mip_opt_out')).toBe(false);
  });

  describe('format -> encoding/container/sample_rate/MIME (from the Deepgram docs)', () => {
    it('pcm: encoding=linear16, container=none, sample_rate sent, MIME audio/pcm;rate=<sampleRate>', async () => {
      fetchMock.mockResolvedValue(binaryResponse());
      const tts = new DeepgramAuraTTS({ apiKey: 'k', batchOutputFormat: 'pcm', sampleRate: 16000 });

      const result = await tts.synthesize({ text: 'bonjour' });

      const query = new URL(String(fetchMock.mock.calls[0][0])).searchParams;
      expect(query.get('encoding')).toBe('linear16');
      expect(query.get('container')).toBe('none');
      expect(query.get('sample_rate')).toBe('16000');
      expect(result.mimeType).toBe('audio/pcm;rate=16000');
    });

    it('wav: encoding=linear16, container=wav, sample_rate sent, MIME audio/wav', async () => {
      fetchMock.mockResolvedValue(binaryResponse());
      const tts = new DeepgramAuraTTS({ apiKey: 'k', batchOutputFormat: 'wav', sampleRate: 24000 });

      const result = await tts.synthesize({ text: 'bonjour' });

      const query = new URL(String(fetchMock.mock.calls[0][0])).searchParams;
      expect(query.get('encoding')).toBe('linear16');
      expect(query.get('container')).toBe('wav');
      expect(query.get('sample_rate')).toBe('24000');
      expect(result.mimeType).toBe('audio/wav');
    });

    it('mp3: encoding=mp3, no container, no sample_rate, MIME audio/mpeg', async () => {
      fetchMock.mockResolvedValue(binaryResponse());
      const tts = new DeepgramAuraTTS({ apiKey: 'k', batchOutputFormat: 'mp3' });

      const result = await tts.synthesize({ text: 'bonjour' });

      const query = new URL(String(fetchMock.mock.calls[0][0])).searchParams;
      expect(query.get('encoding')).toBe('mp3');
      expect(query.has('container')).toBe(false);
      expect(query.has('sample_rate')).toBe(false);
      expect(result.mimeType).toBe('audio/mpeg');
    });

    it('opus: encoding=opus, container=ogg, no sample_rate, MIME audio/ogg;codecs=opus', async () => {
      fetchMock.mockResolvedValue(binaryResponse());
      const tts = new DeepgramAuraTTS({ apiKey: 'k', batchOutputFormat: 'opus' });

      const result = await tts.synthesize({ text: 'bonjour' });

      const query = new URL(String(fetchMock.mock.calls[0][0])).searchParams;
      expect(query.get('encoding')).toBe('opus');
      expect(query.get('container')).toBe('ogg');
      expect(query.has('sample_rate')).toBe(false);
      expect(result.mimeType).toBe('audio/ogg;codecs=opus');
    });

    it('flac: encoding=flac, no container, sample_rate sent, MIME audio/flac', async () => {
      fetchMock.mockResolvedValue(binaryResponse());
      const tts = new DeepgramAuraTTS({ apiKey: 'k', batchOutputFormat: 'flac', sampleRate: 8000 });

      const result = await tts.synthesize({ text: 'bonjour' });

      const query = new URL(String(fetchMock.mock.calls[0][0])).searchParams;
      expect(query.get('encoding')).toBe('flac');
      expect(query.has('container')).toBe(false);
      expect(query.get('sample_rate')).toBe('8000');
      expect(result.mimeType).toBe('audio/flac');
    });

    it('aac: encoding=aac, no container, no sample_rate, MIME audio/aac', async () => {
      fetchMock.mockResolvedValue(binaryResponse());
      const tts = new DeepgramAuraTTS({ apiKey: 'k', batchOutputFormat: 'aac' });

      const result = await tts.synthesize({ text: 'bonjour' });

      const query = new URL(String(fetchMock.mock.calls[0][0])).searchParams;
      expect(query.get('encoding')).toBe('aac');
      expect(query.has('container')).toBe(false);
      expect(query.has('sample_rate')).toBe(false);
      expect(result.mimeType).toBe('audio/aac');
    });

    it('defaults to pcm output when unset', async () => {
      fetchMock.mockResolvedValue(binaryResponse());
      const tts = new DeepgramAuraTTS({ apiKey: 'k' });

      const result = await tts.synthesize({ text: 'bonjour' });
      expect(result.mimeType).toBe('audio/pcm;rate=24000');
    });
  });

  it('returns the exact bytes of the stubbed response, base64-encoded', async () => {
    fetchMock.mockResolvedValue(binaryResponse(200, AUDIO_BYTES));
    const tts = new DeepgramAuraTTS({ apiKey: 'k' });

    const result = await tts.synthesize({ text: 'bonjour' });
    expect(Buffer.from(result.audioBase64, 'base64')).toEqual(Buffer.from(AUDIO_BYTES));
  });

  it('reports characterCount equal to the synthesized text length', async () => {
    fetchMock.mockResolvedValue(binaryResponse());
    const tts = new DeepgramAuraTTS({ apiKey: 'k' });

    const result = await tts.synthesize({ text: 'twelve chars' });
    expect(result.characterCount).toBe('twelve chars'.length);
  });

  it('rejects empty text before any fetch call', async () => {
    const tts = new DeepgramAuraTTS({ apiKey: 'k' });
    await expect(tts.synthesize({ text: '' })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects text over the documented 2000-character limit before any fetch call', async () => {
    const tts = new DeepgramAuraTTS({ apiKey: 'k' });
    const tooLong = 'a'.repeat(2001);

    await expect(tts.synthesize({ text: tooLong })).rejects.toMatchObject({
      provider: 'deepgram',
      code: 'PAYLOAD_TOO_LARGE',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts text exactly at the 2000-character limit', async () => {
    fetchMock.mockResolvedValue(binaryResponse());
    const tts = new DeepgramAuraTTS({ apiKey: 'k' });
    const exact = 'a'.repeat(2000);

    await expect(tts.synthesize({ text: exact })).resolves.toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects a voice/language mismatch (UNSUPPORTED_LANGUAGE) at construction', () => {
    expect(() => new DeepgramAuraTTS({ apiKey: 'k', voice: 'aura-2-agathe-fr', language: 'en' })).toThrowError(
      expect.objectContaining({ provider: 'deepgram', code: 'UNSUPPORTED_LANGUAGE' }),
    );
  });

  it('defaults the voice to aura-2-agathe-fr for French', () => {
    const tts = new DeepgramAuraTTS({ apiKey: 'k', language: 'fr' });
    expect(tts.getCapabilities!().currentVoice).toBe('aura-2-agathe-fr');
  });

  it('defaults the voice to aura-2-thalia-en for English', () => {
    const tts = new DeepgramAuraTTS({ apiKey: 'k', language: 'en' });
    expect(tts.getCapabilities!().currentVoice).toBe('aura-2-thalia-en');
  });

  it('lets TTSConfig.voice/languageCode override the constructor defaults, consistently validated together', async () => {
    fetchMock.mockResolvedValue(binaryResponse());
    const tts = new DeepgramAuraTTS({ apiKey: 'k', language: 'en' }); // defaults to aura-2-thalia-en

    await tts.synthesize({ text: 'bonjour', voice: 'aura-2-hector-fr', languageCode: 'fr' });

    const query = new URL(String(fetchMock.mock.calls[0][0])).searchParams;
    expect(query.get('model')).toBe('aura-2-hector-fr');
  });

  it('rejects a per-call voice/languageCode override that mismatch, before any fetch call', async () => {
    const tts = new DeepgramAuraTTS({ apiKey: 'k', language: 'en' });

    await expect(tts.synthesize({ text: 'bonjour', voice: 'aura-2-hector-fr', languageCode: 'en' })).rejects.toMatchObject({
      provider: 'deepgram',
      code: 'UNSUPPORTED_LANGUAGE',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [400, 'INVALID_REQUEST'],
    [401, 'AUTH_FAILED'],
    [402, 'QUOTA_EXCEEDED'],
    [403, 'AUTH_FAILED'],
    [413, 'PAYLOAD_TOO_LARGE'],
    [429, 'RATE_LIMITED'],
    [500, 'PROVIDER_UNAVAILABLE'],
  ] as const)('maps an HTTP %i response to SpeechServiceError code %s', async (status, expectedCode) => {
    fetchMock.mockResolvedValue(binaryResponse(status));
    const tts = new DeepgramAuraTTS({ apiKey: 'k' });

    await expect(tts.synthesize({ text: 'bonjour' })).rejects.toMatchObject({
      provider: 'deepgram',
      code: expectedCode,
    });
  });

  it('times out with a TIMEOUT SpeechServiceError when the request takes too long', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url: string, init: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const abortError = new Error('aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        }),
    );
    const tts = new DeepgramAuraTTS({ apiKey: 'k', limits: { openTimeoutMs: 1000 } });

    const promise = tts.synthesize({ text: 'bonjour' });
    const assertion = expect(promise).rejects.toMatchObject({ provider: 'deepgram', code: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  it('getCapabilities() is derived from the Aura catalog and reports the current voice/language', () => {
    const tts = new DeepgramAuraTTS({ apiKey: 'k', voice: 'aura-2-hector-fr', language: 'fr' });
    const capabilities = tts.getCapabilities!();

    expect(capabilities.provider).toBe('deepgram-aura');
    expect(capabilities.currentVoice).toBe('aura-2-hector-fr');
    expect(capabilities.currentLanguage).toBe('fr');
    expect(capabilities.voices?.some((v) => v.id === 'aura-2-hector-fr')).toBe(true);
  });
});
