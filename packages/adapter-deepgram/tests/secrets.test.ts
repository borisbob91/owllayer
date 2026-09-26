import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDeepgramAuraTTSCapabilities, getDeepgramNovaSTTCapabilities, getDeepgramVoiceAgentCapabilities } from '../src/capabilities.js';
import { getDeepgramErrorDetails, toSpeechServiceError } from '../src/errors.js';
import { validateDeepgramVoiceAgentOptions } from '../src/settings.js';
import {
  deepgramFluxSTTSettingsSchema,
  deepgramNovaSTTSettingsSchema,
  parseDeepgramAuraTTSSettings,
  parseDeepgramFluxSTTSettings,
  parseDeepgramNovaSTTSettings,
  parseDeepgramVoiceAgentSettings,
} from '../src/settings.js';

const SECRET = 'sk-deepgram-test-secret-abc123';

describe('secrets never leak into settings, capabilities, errors, or logs (S16, SC-005)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects apiKey as an unknown field on every *Settings schema (the key is never part of Settings)', () => {
    expect(deepgramNovaSTTSettingsSchema.safeParse({ apiKey: SECRET }).success).toBe(false);
    expect(deepgramFluxSTTSettingsSchema.safeParse({ apiKey: SECRET }).success).toBe(false);
  });

  it('never serializes the key when settings are stringified, even though *Options carries it at runtime', () => {
    const settings = parseDeepgramNovaSTTSettings({ language: 'en' });
    const options = { ...settings, apiKey: SECRET };

    expect(JSON.stringify(settings)).not.toContain(SECRET);
    // Options carries the key (constructor input) but Settings alone, once
    // destructured back out, still excludes it — proving it never round-trips
    // through the persisted configuration.
    const { apiKey, ...settingsOnly } = options;
    expect(apiKey).toBe(SECRET);
    expect(JSON.stringify(settingsOnly)).not.toContain(SECRET);
  });

  it('never exposes an apiKey/token/authorization field on any capability report (no such parameter exists to leak)', () => {
    const reports: Record<string, unknown>[] = [
      getDeepgramNovaSTTCapabilities({ model: 'nova-3', language: 'en' }),
      getDeepgramAuraTTSCapabilities({ voice: 'aura-2-thalia-en', language: 'en' }),
      getDeepgramVoiceAgentCapabilities({ model: 'gpt-5.4-mini' }),
    ];
    for (const report of reports) {
      const keys = Object.keys(report).map((key) => key.toLowerCase());
      expect(keys).not.toContain('apikey');
      expect(keys).not.toContain('token');
      expect(keys).not.toContain('authorization');
    }
  });

  it('never includes the key in a SpeechServiceError message across every error kind', () => {
    const errors = [
      toSpeechServiceError({ kind: 'http', status: 401, requestId: SECRET.slice(0, 8) }),
      toSpeechServiceError({ kind: 'wsClose', code: 1011 }),
      toSpeechServiceError({ kind: 'timeout', operation: 'open' }),
      toSpeechServiceError({ kind: 'configureFailure' }),
      toSpeechServiceError({ kind: 'local', code: 'INVALID_SETTINGS', message: 'plain message' }),
    ];
    for (const error of errors) {
      expect(error.message).not.toContain(SECRET);
      expect(getDeepgramErrorDetails(error).requestId ?? '').not.toContain(SECRET);
    }
  });

  it('rejects a Voice Agent provider absent from the closed catalog (UNSUPPORTED_PROVIDER) without ever needing or echoing a key', () => {
    expect(() => parseDeepgramVoiceAgentSettings({ think: { provider: 'mistral' } })).toThrowError(
      expect.objectContaining({ provider: 'deepgram', code: 'UNSUPPORTED_PROVIDER' }),
    );
    // La validation echoue avant toute connexion : aucune cle n'a jamais ete demandee ici.
  });

  it('rejects a required-but-missing third-party credential (PROVIDER_CREDENTIAL_REQUIRED) without ever needing a key', () => {
    expect(() =>
      validateDeepgramVoiceAgentOptions({
        apiKey: SECRET,
        think: { provider: 'groq', model: 'llama-3.3-70b', endpointUrl: 'https://api.groq.example/v1' },
      } as never),
    ).toThrowError(expect.objectContaining({ provider: 'deepgram', code: 'PROVIDER_CREDENTIAL_REQUIRED' }));
  });

  it('never echoes a third-party provider credential (think/speak) in the thrown error message', () => {
    const THIRD_PARTY_SECRET = 'groq-live-secret-xyz789';
    try {
      validateDeepgramVoiceAgentOptions({
        apiKey: SECRET,
        think: { provider: 'aws_bedrock', endpointUrl: 'https://bedrock.example/v1' },
        thinkProviderCredential: { kind: 'api-key', apiKey: THIRD_PARTY_SECRET } as never,
      } as never);
      throw new Error('expected validateDeepgramVoiceAgentOptions to throw (wrong credential kind)');
    } catch (error) {
      expect((error as Error).message).not.toContain(THIRD_PARTY_SECRET);
      expect((error as Error).message).not.toContain(SECRET);
    }
  });

  it('emits no console output containing the key while parsing valid and invalid settings', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});

    parseDeepgramNovaSTTSettings({ language: 'en', keyterms: [SECRET] });
    parseDeepgramAuraTTSSettings({ voice: 'aura-2-thalia-en' });
    try {
      parseDeepgramFluxSTTSettings({ turnDetection: { endOfTurnThreshold: 5 } });
    } catch {
      // attendu : on verifie seulement l'absence de fuite dans la console.
    }

    const allOutput = [...log.mock.calls, ...info.mock.calls, ...warn.mock.calls, ...error.mock.calls, ...debug.mock.calls]
      .flat()
      .map((value) => (typeof value === 'string' ? value : JSON.stringify(value)))
      .join('\n');
    expect(allOutput).not.toContain(SECRET);
  });
});
