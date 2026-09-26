import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeepgramNovaSTT } from '../src/DeepgramNovaSTT.js';

function jsonResponse(status: number, body: unknown, ok = status >= 200 && status < 300) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function successBody(overrides: Record<string, unknown> = {}) {
  return {
    metadata: { request_id: 'req-abc', duration: 2.5, ...((overrides.metadata as object) ?? {}) },
    results: {
      channels: [
        {
          alternatives: [
            { transcript: 'bonjour le monde', confidence: 0.97, words: [] },
          ],
        },
      ],
    },
    ...overrides,
  };
}

const PCM_BASE64 = Buffer.from([1, 2, 3, 4]).toString('base64');

describe('DeepgramNovaSTT', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('has the fixed provider name deepgram-nova', () => {
    const stt = new DeepgramNovaSTT({ apiKey: 'k' });
    expect(stt.name).toBe('deepgram-nova');
  });

  it('authenticates with Authorization: Token and never puts the key in the URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, successBody()));
    const stt = new DeepgramNovaSTT({ apiKey: 'sk-secret-key' });

    await stt.transcribe({ mimeType: 'audio/pcm;rate=16000', audioBase64: PCM_BASE64 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).not.toContain('sk-secret-key');
    expect((init.headers as Record<string, string>).Authorization).toBe('Token sk-secret-key');
  });

  it('posts to https://api.deepgram.com/v1/listen', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, successBody()));
    const stt = new DeepgramNovaSTT({ apiKey: 'k' });

    await stt.transcribe({ mimeType: 'audio/pcm;rate=16000', audioBase64: PCM_BASE64 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url).split('?')[0]).toBe('https://api.deepgram.com/v1/listen');
    expect(init.method).toBe('POST');
  });

  it('sends the model, language, and smart_format query parameters', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, successBody()));
    const stt = new DeepgramNovaSTT({ apiKey: 'k', model: 'nova-3-medical', language: 'en', smartFormat: false });

    await stt.transcribe({ mimeType: 'audio/pcm;rate=16000', audioBase64: PCM_BASE64 });

    const [url] = fetchMock.mock.calls[0];
    const query = new URL(String(url)).searchParams;
    expect(query.get('model')).toBe('nova-3-medical');
    expect(query.get('language')).toBe('en');
    expect(query.get('smart_format')).toBe('false');
  });

  it('defaults to model nova-3 and smart_format true when unset', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, successBody()));
    const stt = new DeepgramNovaSTT({ apiKey: 'k', language: 'en' });

    await stt.transcribe({ mimeType: 'audio/pcm;rate=16000', audioBase64: PCM_BASE64 });

    const query = new URL(String(fetchMock.mock.calls[0][0])).searchParams;
    expect(query.get('model')).toBe('nova-3');
    expect(query.get('smart_format')).toBe('true');
  });

  it('repeats keyterm once per configured keyterm (Nova-3 keyterm prompting)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, successBody()));
    const stt = new DeepgramNovaSTT({ apiKey: 'k', language: 'en', keyterms: ['OwlLayer', 'AITP'] });

    await stt.transcribe({ mimeType: 'audio/pcm;rate=16000', audioBase64: PCM_BASE64 });

    const query = new URL(String(fetchMock.mock.calls[0][0])).searchParams;
    expect(query.getAll('keyterm')).toEqual(['OwlLayer', 'AITP']);
  });

  it('sends no keyterm parameter when no keyterms are configured', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, successBody()));
    const stt = new DeepgramNovaSTT({ apiKey: 'k', language: 'en' });

    await stt.transcribe({ mimeType: 'audio/pcm;rate=16000', audioBase64: PCM_BASE64 });

    const query = new URL(String(fetchMock.mock.calls[0][0])).searchParams;
    expect(query.getAll('keyterm')).toEqual([]);
  });

  it('repeats tag once per configured tag', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, successBody()));
    const stt = new DeepgramNovaSTT({ apiKey: 'k', language: 'en', tags: ['prod', 'checkout'] });

    await stt.transcribe({ mimeType: 'audio/pcm;rate=16000', audioBase64: PCM_BASE64 });

    const query = new URL(String(fetchMock.mock.calls[0][0])).searchParams;
    expect(query.getAll('tag')).toEqual(['prod', 'checkout']);
  });

  it('sends mip_opt_out=true only when configured', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, successBody()));
    const stt = new DeepgramNovaSTT({ apiKey: 'k', language: 'en', mipOptOut: true });

    await stt.transcribe({ mimeType: 'audio/pcm;rate=16000', audioBase64: PCM_BASE64 });

    const query = new URL(String(fetchMock.mock.calls[0][0])).searchParams;
    expect(query.get('mip_opt_out')).toBe('true');
  });

  it('adds encoding=linear16 and sample_rate for raw PCM audio', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, successBody()));
    const stt = new DeepgramNovaSTT({ apiKey: 'k', language: 'en' });

    await stt.transcribe({ mimeType: 'audio/pcm;rate=16000', audioBase64: PCM_BASE64 });

    const query = new URL(String(fetchMock.mock.calls[0][0])).searchParams;
    expect(query.get('encoding')).toBe('linear16');
    expect(query.get('sample_rate')).toBe('16000');
  });

  it('omits encoding and sample_rate for a containerized format (wav)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, successBody()));
    const stt = new DeepgramNovaSTT({ apiKey: 'k', language: 'en' });

    await stt.transcribe({ mimeType: 'audio/wav', audioBase64: PCM_BASE64 });

    const query = new URL(String(fetchMock.mock.calls[0][0])).searchParams;
    expect(query.has('encoding')).toBe(false);
    expect(query.has('sample_rate')).toBe(false);
  });

  it('sends the audio as a base64-decoded binary body', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, successBody()));
    const stt = new DeepgramNovaSTT({ apiKey: 'k', language: 'en' });

    await stt.transcribe({ mimeType: 'audio/pcm;rate=16000', audioBase64: PCM_BASE64 });

    const [, init] = fetchMock.mock.calls[0];
    expect(Buffer.from(init.body as Uint8Array)).toEqual(Buffer.from([1, 2, 3, 4]));
  });

  it('sets Content-Type to the configured audio mime type', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, successBody()));
    const stt = new DeepgramNovaSTT({ apiKey: 'k', language: 'en' });

    await stt.transcribe({ mimeType: 'audio/wav', audioBase64: PCM_BASE64 });

    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('audio/wav');
  });

  it('parses transcript, confidence, and audio duration from results.channels[0].alternatives[0]', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, successBody()));
    const stt = new DeepgramNovaSTT({ apiKey: 'k', language: 'fr' });

    const result = await stt.transcribe({ mimeType: 'audio/pcm;rate=16000', audioBase64: PCM_BASE64 });

    expect(result.text).toBe('bonjour le monde');
    expect(result.confidence).toBe(0.97);
    expect(result.audioDuration).toBe(2500);
  });

  it('parses metadata.detected_language into detectedLanguage when present', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, successBody({ metadata: { detected_language: 'es' } })),
    );
    const stt = new DeepgramNovaSTT({ apiKey: 'k' });

    const result = await stt.transcribe({ mimeType: 'audio/pcm;rate=16000', audioBase64: PCM_BASE64 });
    expect(result.detectedLanguage).toBe('es');
  });

  it('returns an empty transcript (text: "") when the response has no alternative', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        metadata: { request_id: 'req-empty', duration: 0.1 },
        results: { channels: [{ alternatives: [] }] },
      }),
    );
    const stt = new DeepgramNovaSTT({ apiKey: 'k' });

    const result = await stt.transcribe({ mimeType: 'audio/pcm;rate=16000', audioBase64: PCM_BASE64 });
    expect(result.text).toBe('');
  });

  it('returns an empty transcript (text: "") when the alternative transcript is an empty string', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, successBody({ results: { channels: [{ alternatives: [{ transcript: '', confidence: 0 }] }] } })),
    );
    const stt = new DeepgramNovaSTT({ apiKey: 'k' });

    const result = await stt.transcribe({ mimeType: 'audio/pcm;rate=16000', audioBase64: PCM_BASE64 });
    expect(result.text).toBe('');
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
    fetchMock.mockResolvedValue(jsonResponse(status, { err_code: 'SOME_CODE', err_msg: 'provider body', request_id: 'req-err' }, false));
    const stt = new DeepgramNovaSTT({ apiKey: 'k' });

    await expect(stt.transcribe({ mimeType: 'audio/pcm;rate=16000', audioBase64: PCM_BASE64 })).rejects.toMatchObject({
      provider: 'deepgram',
      code: expectedCode,
    });
  });

  it('never leaks the provider error body or the key in the thrown error message', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { err_code: 'INVALID_AUTH', err_msg: 'super secret provider detail' }, false));
    const stt = new DeepgramNovaSTT({ apiKey: 'sk-should-not-leak' });

    await expect(stt.transcribe({ mimeType: 'audio/pcm;rate=16000', audioBase64: PCM_BASE64 })).rejects.toSatisfy(
      (error: unknown) => {
        const message = (error as Error).message;
        return !message.includes('super secret provider detail') && !message.includes('sk-should-not-leak');
      },
    );
  });

  it('times out with a TIMEOUT SpeechServiceError when the request exceeds requestTimeoutMs', async () => {
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
    const stt = new DeepgramNovaSTT({ apiKey: 'k', requestTimeoutMs: 1000 });

    const promise = stt.transcribe({ mimeType: 'audio/pcm;rate=16000', audioBase64: PCM_BASE64 });
    const assertion = expect(promise).rejects.toMatchObject({ provider: 'deepgram', code: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  it('rejects a configured language unsupported by a listed model before any fetch call (UNSUPPORTED_LANGUAGE)', async () => {
    expect(() => new DeepgramNovaSTT({ apiKey: 'k', model: 'nova-3-medical', language: 'fr' })).toThrowError(
      expect.objectContaining({ provider: 'deepgram', code: 'UNSUPPORTED_LANGUAGE' }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts a supported language for a listed model without throwing', () => {
    expect(() => new DeepgramNovaSTT({ apiKey: 'k', model: 'nova-3-medical', language: 'en' })).not.toThrow();
  });

  it('accepts an unlisted model id without a local language check', () => {
    expect(() => new DeepgramNovaSTT({ apiKey: 'k', model: 'nova-future-model', language: 'zz' })).not.toThrow();
  });

  it('isAvailable() resolves true without making a network request', async () => {
    const stt = new DeepgramNovaSTT({ apiKey: 'k' });
    await expect(stt.isAvailable()).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('getCapabilities() is derived from the Nova catalog and reports the current model/language', () => {
    const stt = new DeepgramNovaSTT({ apiKey: 'k', model: 'nova-3-medical', language: 'en' });
    const capabilities = stt.getCapabilities!();

    expect(capabilities.provider).toBe('deepgram-nova');
    expect(capabilities.currentModel).toBe('nova-3-medical');
    expect(capabilities.currentLanguage).toBe('en');
    expect(capabilities.models?.some((m) => m.id === 'nova-3-medical')).toBe(true);
  });
});
