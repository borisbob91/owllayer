import { describe, it, expect } from 'vitest';
import {
  deepgramAuraTTSSettingsSchema,
  deepgramConnectionLimitsSchema,
  deepgramFluxSTTSettingsSchema,
  deepgramNovaSTTSettingsSchema,
  deepgramVoiceAgentSettingsSchema,
  parseDeepgramAuraTTSSettings,
  parseDeepgramFluxSTTSettings,
  parseDeepgramNovaSTTSettings,
  parseDeepgramVoiceAgentSettings,
  validateDeepgramVoiceAgentOptions,
  type DeepgramFluxSTTOptions,
  type DeepgramFluxSTTSettings,
  type DeepgramVoiceAgentOptions,
} from '../src/settings.js';

describe('deepgramConnectionLimitsSchema', () => {
  it('fills in every documented default when parsing an empty object', () => {
    expect(deepgramConnectionLimitsSchema.parse({})).toEqual({
      openTimeoutMs: 10000,
      handshakeTimeoutMs: 5000,
      acknowledgementTimeoutMs: 5000,
      maxQueuedAudioMs: 2000,
      maxQueuedTextSegments: 8,
      keepAliveIntervalMs: 8000,
      maxHistoryMessages: 50,
    });
  });

  it('rejects an unknown field', () => {
    expect(() => deepgramConnectionLimitsSchema.parse({ unknownField: 1 })).toThrow();
  });
});

describe('deepgramNovaSTTSettingsSchema', () => {
  it('round-trips through JSON with defaults applied', () => {
    const settings = deepgramNovaSTTSettingsSchema.parse({ language: 'fr', keyterms: ['OwlLayer'] });
    const roundTripped = deepgramNovaSTTSettingsSchema.parse(JSON.parse(JSON.stringify(settings)));
    expect(roundTripped).toEqual(settings);
    expect(settings.smartFormat).toBe(true);
    expect(settings.requestTimeoutMs).toBe(30000);
  });

  it('rejects an unknown field', () => {
    expect(() => deepgramNovaSTTSettingsSchema.parse({ notARealField: true })).toThrow();
  });

  it('rejects more than 100 keyterms', () => {
    const keyterms = Array.from({ length: 101 }, (_, i) => `term-${i}`);
    expect(() => deepgramNovaSTTSettingsSchema.parse({ keyterms })).toThrow();
  });

  it('accepts exactly 100 keyterms', () => {
    const keyterms = Array.from({ length: 100 }, (_, i) => `term-${i}`);
    expect(() => deepgramNovaSTTSettingsSchema.parse({ keyterms })).not.toThrow();
  });
});

describe('deepgramFluxSTTSettingsSchema — turn detection thresholds', () => {
  it('applies the documented defaults (0.7 / unset / 5000)', () => {
    const settings = deepgramFluxSTTSettingsSchema.parse({});
    expect(settings.turnDetection).toEqual({ endOfTurnThreshold: 0.7, endOfTurnTimeoutMs: 5000 });
  });

  it.each([0.5, 0.7, 1.0])('accepts endOfTurnThreshold at the bound or within range (%f)', (value) => {
    expect(() => deepgramFluxSTTSettingsSchema.parse({ turnDetection: { endOfTurnThreshold: value } })).not.toThrow();
  });

  it.each([0.49, 1.01])('rejects endOfTurnThreshold just outside [0.5, 1.0] (%f)', (value) => {
    expect(() => deepgramFluxSTTSettingsSchema.parse({ turnDetection: { endOfTurnThreshold: value } })).toThrow();
  });

  it.each([0.3, 0.9])('accepts tentativeEndOfTurnThreshold at the bound (%f) when <= endOfTurnThreshold', (value) => {
    expect(() =>
      deepgramFluxSTTSettingsSchema.parse({
        turnDetection: { endOfTurnThreshold: 0.95, tentativeEndOfTurnThreshold: value },
      }),
    ).not.toThrow();
  });

  it.each([0.29, 0.91])('rejects tentativeEndOfTurnThreshold just outside [0.3, 0.9] (%f)', (value) => {
    expect(() =>
      deepgramFluxSTTSettingsSchema.parse({
        turnDetection: { endOfTurnThreshold: 0.95, tentativeEndOfTurnThreshold: value },
      }),
    ).toThrow();
  });

  it('accepts tentativeEndOfTurnThreshold exactly equal to endOfTurnThreshold', () => {
    expect(() =>
      deepgramFluxSTTSettingsSchema.parse({ turnDetection: { endOfTurnThreshold: 0.7, tentativeEndOfTurnThreshold: 0.7 } }),
    ).not.toThrow();
  });

  it('rejects tentativeEndOfTurnThreshold greater than endOfTurnThreshold (inconsistent pair)', () => {
    expect(() =>
      deepgramFluxSTTSettingsSchema.parse({ turnDetection: { endOfTurnThreshold: 0.6, tentativeEndOfTurnThreshold: 0.65 } }),
    ).toThrow();
  });

  it.each([500, 60000])('accepts endOfTurnTimeoutMs at the bound (%i)', (value) => {
    expect(() => deepgramFluxSTTSettingsSchema.parse({ turnDetection: { endOfTurnTimeoutMs: value } })).not.toThrow();
  });

  it.each([499, 60001])('rejects endOfTurnTimeoutMs just outside [500, 60000] (%i)', (value) => {
    expect(() => deepgramFluxSTTSettingsSchema.parse({ turnDetection: { endOfTurnTimeoutMs: value } })).toThrow();
  });

  it('rejects an unknown field anywhere in the settings, including nested turnDetection', () => {
    expect(() => deepgramFluxSTTSettingsSchema.parse({ turnDetection: { notReal: 1 } })).toThrow();
    expect(() => deepgramFluxSTTSettingsSchema.parse({ notReal: 1 })).toThrow();
  });

  it('round-trips through JSON, including nested limits and turnDetection', () => {
    const settings = deepgramFluxSTTSettingsSchema.parse({
      language: 'fr',
      turnDetection: { endOfTurnThreshold: 0.8, tentativeEndOfTurnThreshold: 0.4 },
      limits: { openTimeoutMs: 5000 },
    });
    const roundTripped: DeepgramFluxSTTSettings = deepgramFluxSTTSettingsSchema.parse(JSON.parse(JSON.stringify(settings)));
    expect(roundTripped).toEqual(settings);
    expect(settings.limits.openTimeoutMs).toBe(5000);
    expect(settings.limits.handshakeTimeoutMs).toBe(5000); // defaut documente, non fourni
  });
});

describe('deepgramAuraTTSSettingsSchema', () => {
  it.each([0.7, 1.5])('accepts speed at the bound (%f)', (value) => {
    expect(() => deepgramAuraTTSSettingsSchema.parse({ speed: value })).not.toThrow();
  });

  it.each([0.69, 1.51])('rejects speed just outside [0.7, 1.5] (%f)', (value) => {
    expect(() => deepgramAuraTTSSettingsSchema.parse({ speed: value })).toThrow();
  });

  it.each([8000, 16000, 24000, 32000, 48000])('accepts a documented sample rate (%i)', (value) => {
    expect(() => deepgramAuraTTSSettingsSchema.parse({ sampleRate: value })).not.toThrow();
  });

  it('rejects a sample rate outside the documented set', () => {
    expect(() => deepgramAuraTTSSettingsSchema.parse({ sampleRate: 22050 })).toThrow();
  });

  it('rejects an unlisted batchOutputFormat', () => {
    expect(() => deepgramAuraTTSSettingsSchema.parse({ batchOutputFormat: 'ogg' })).toThrow();
  });

  it('defaults to pcm output, 24000 Hz, and speed 1', () => {
    const settings = deepgramAuraTTSSettingsSchema.parse({});
    expect(settings.batchOutputFormat).toBe('pcm');
    expect(settings.sampleRate).toBe(24000);
    expect(settings.speed).toBe(1);
  });
});

describe('parseDeepgram*Settings — SpeechServiceError translation', () => {
  it('wraps a Nova schema violation into INVALID_SETTINGS', () => {
    expect(() => parseDeepgramNovaSTTSettings({ smartFormat: 'yes' })).toThrowError(
      expect.objectContaining({ provider: 'deepgram', code: 'INVALID_SETTINGS' }),
    );
  });

  it('wraps a Flux threshold-order violation into INVALID_SETTINGS', () => {
    expect(() =>
      parseDeepgramFluxSTTSettings({ turnDetection: { endOfTurnThreshold: 0.6, tentativeEndOfTurnThreshold: 0.65 } }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_SETTINGS' }));
  });

  it('wraps an Aura unknown-field violation into INVALID_SETTINGS', () => {
    expect(() => parseDeepgramAuraTTSSettings({ pitch: 5 })).toThrowError(
      expect.objectContaining({ code: 'INVALID_SETTINGS' }),
    );
  });

  it('accepts a Voice Agent configuration using a Deepgram-managed provider', () => {
    const settings = parseDeepgramVoiceAgentSettings({ think: { provider: 'anthropic', model: 'claude-haiku-4-5' } });
    expect(settings.think.provider).toBe('anthropic');
  });

  it('accepts a Voice Agent configuration naming groq (revised R6: supported with its own credential)', () => {
    const settings = parseDeepgramVoiceAgentSettings({
      think: { provider: 'groq', model: 'llama-3.3-70b', endpointUrl: 'https://api.groq.example/v1' },
    });
    expect(settings.think.provider).toBe('groq');
  });

  it('rejects a Voice Agent configuration naming a provider absent from the closed catalog (S14)', () => {
    expect(() => parseDeepgramVoiceAgentSettings({ think: { provider: 'mistral' } })).toThrowError(
      expect.objectContaining({ provider: 'deepgram', code: 'UNSUPPORTED_PROVIDER' }),
    );
  });

  it('rejects an unknown speak provider the same way', () => {
    expect(() => parseDeepgramVoiceAgentSettings({ speak: { provider: 'azure_speech' } })).toThrowError(
      expect.objectContaining({ provider: 'deepgram', code: 'UNSUPPORTED_PROVIDER' }),
    );
  });

  it('deepgramVoiceAgentSettingsSchema.safeParse itself rejects an unlisted think/speak provider', () => {
    expect(deepgramVoiceAgentSettingsSchema.safeParse({ think: { provider: 'mistral' } }).success).toBe(false);
    expect(deepgramVoiceAgentSettingsSchema.safeParse({ speak: { provider: 'azure_speech' } }).success).toBe(false);
  });

  it('requires think.endpointUrl for provider groq', () => {
    expect(() => parseDeepgramVoiceAgentSettings({ think: { provider: 'groq', model: 'llama-3.3-70b' } })).toThrowError(
      expect.objectContaining({ code: 'INVALID_SETTINGS' }),
    );
  });

  it('requires speak.endpointUrl for a non-Deepgram speak provider', () => {
    expect(() =>
      parseDeepgramVoiceAgentSettings({ speak: { provider: 'eleven_labs', model: 'eleven_turbo_v2' } }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_SETTINGS' }));
  });

  it('accepts a non-Deepgram speak provider once speak.endpointUrl is set', () => {
    const settings = parseDeepgramVoiceAgentSettings({
      speak: { provider: 'eleven_labs', model: 'eleven_turbo_v2', endpointUrl: 'https://api.elevenlabs.example/v1' },
    });
    expect(settings.speak.provider).toBe('eleven_labs');
  });

  it.each(['http://api.groq.example/v1', 'ftp://x', 'not-a-url'])('rejects a non-https endpointUrl (%s)', (url) => {
    expect(() => parseDeepgramVoiceAgentSettings({ think: { provider: 'groq', endpointUrl: url } })).toThrowError(
      expect.objectContaining({ code: 'INVALID_SETTINGS' }),
    );
  });

  it('accepts an https:// endpointUrl', () => {
    expect(() =>
      parseDeepgramVoiceAgentSettings({ think: { provider: 'groq', endpointUrl: 'https://api.groq.example/v1' } }),
    ).not.toThrow();
  });

  it('rejects speak.voice unsupported by the configured language for the deepgram speak provider (S13)', () => {
    expect(() =>
      parseDeepgramVoiceAgentSettings({ language: 'fr', speak: { voice: 'aura-2-thalia-en' } }),
    ).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_LANGUAGE' }));
  });

  it('accepts speak.voice matching the configured language for the deepgram speak provider', () => {
    expect(() =>
      parseDeepgramVoiceAgentSettings({ language: 'fr', speak: { voice: 'aura-2-agathe-fr' } }),
    ).not.toThrow();
  });

  it('rejects a think model that belongs to a different provider than the one configured', () => {
    expect(() =>
      parseDeepgramVoiceAgentSettings({ think: { provider: 'anthropic', model: 'gpt-5.4-mini' } }),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_SETTINGS' }));
  });

  it('defaults the Voice Agent to the open_ai provider and gpt-5.4-mini model', () => {
    const settings = parseDeepgramVoiceAgentSettings({});
    expect(settings.think.provider).toBe('open_ai');
    expect(settings.think.model).toBe('gpt-5.4-mini');
  });

  it('rejects a Voice Agent listen model that does not support the configured language', () => {
    expect(() =>
      parseDeepgramVoiceAgentSettings({ language: 'fr', listen: { model: 'flux-general-en' } }),
    ).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED_LANGUAGE' }));
  });
});

describe('*Options = stored settings + a separately supplied key', () => {
  it('builds constructor options from parsed settings plus an apiKey never stored alongside them', () => {
    const settings: DeepgramFluxSTTSettings = parseDeepgramFluxSTTSettings({ language: 'fr' });
    const options: DeepgramFluxSTTOptions = { ...settings, apiKey: 'sk-test-only' };

    expect(options.apiKey).toBe('sk-test-only');
    expect(JSON.stringify(settings)).not.toContain('sk-test-only');
  });
});

describe('validateDeepgramVoiceAgentOptions — provider credential policy (recherche R6)', () => {
  const base = { apiKey: 'sk-deepgram-test' };

  it('accepts a Deepgram-managed think provider (open_ai) with no provider credential supplied', () => {
    const settings = validateDeepgramVoiceAgentOptions({
      ...base,
      think: { provider: 'open_ai' },
    } as DeepgramVoiceAgentOptions);
    expect(settings.think.provider).toBe('open_ai');
  });

  it('accepts a Deepgram-managed think provider (open_ai) WITH an optional provider credential supplied', () => {
    const settings = validateDeepgramVoiceAgentOptions({
      ...base,
      think: { provider: 'open_ai' },
      thinkProviderCredential: { kind: 'api-key', apiKey: 'sk-openai-test' },
    } as DeepgramVoiceAgentOptions);
    expect(settings.think.provider).toBe('open_ai');
  });

  it('rejects a required-but-missing think provider credential (groq) with PROVIDER_CREDENTIAL_REQUIRED', () => {
    expect(() =>
      validateDeepgramVoiceAgentOptions({
        ...base,
        think: { provider: 'groq', model: 'llama-3.3-70b', endpointUrl: 'https://api.groq.example/v1' },
      } as DeepgramVoiceAgentOptions),
    ).toThrowError(expect.objectContaining({ provider: 'deepgram', code: 'PROVIDER_CREDENTIAL_REQUIRED' }));
  });

  it('accepts groq once a think provider credential of the right kind (api-key) is supplied', () => {
    const settings = validateDeepgramVoiceAgentOptions({
      ...base,
      think: { provider: 'groq', model: 'llama-3.3-70b', endpointUrl: 'https://api.groq.example/v1' },
      thinkProviderCredential: { kind: 'api-key', apiKey: 'gsk-test' },
    } as DeepgramVoiceAgentOptions);
    expect(settings.think.provider).toBe('groq');
  });

  it('rejects aws_bedrock given an api-key credential instead of the required aws kind', () => {
    expect(() =>
      validateDeepgramVoiceAgentOptions({
        ...base,
        think: { provider: 'aws_bedrock', endpointUrl: 'https://bedrock.example/v1' },
        thinkProviderCredential: { kind: 'api-key', apiKey: 'wrong-kind' },
      } as DeepgramVoiceAgentOptions),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_SETTINGS' }));
  });

  it('accepts aws_bedrock given an aws credential', () => {
    const settings = validateDeepgramVoiceAgentOptions({
      ...base,
      think: { provider: 'aws_bedrock', endpointUrl: 'https://bedrock.example/v1' },
      thinkProviderCredential: {
        kind: 'aws',
        region: 'us-east-1',
        accessKeyId: 'AKIA_TEST',
        secretAccessKey: 'secret_test',
      },
    } as DeepgramVoiceAgentOptions);
    expect(settings.think.provider).toBe('aws_bedrock');
  });

  it('rejects a speak provider credential supplied for the deepgram speak provider (policy "none")', () => {
    expect(() =>
      validateDeepgramVoiceAgentOptions({
        ...base,
        speakProviderCredential: { kind: 'api-key', apiKey: 'unexpected' },
      } as DeepgramVoiceAgentOptions),
    ).toThrowError(expect.objectContaining({ code: 'INVALID_SETTINGS' }));
  });

  it('rejects a required-but-missing speak provider credential (eleven_labs) with PROVIDER_CREDENTIAL_REQUIRED', () => {
    expect(() =>
      validateDeepgramVoiceAgentOptions({
        ...base,
        speak: { provider: 'eleven_labs', model: 'eleven_turbo_v2', endpointUrl: 'https://api.elevenlabs.example/v1' },
      } as DeepgramVoiceAgentOptions),
    ).toThrowError(expect.objectContaining({ code: 'PROVIDER_CREDENTIAL_REQUIRED' }));
  });

  it('accepts eleven_labs once a speak provider credential is supplied', () => {
    const settings = validateDeepgramVoiceAgentOptions({
      ...base,
      speak: { provider: 'eleven_labs', model: 'eleven_turbo_v2', endpointUrl: 'https://api.elevenlabs.example/v1' },
      speakProviderCredential: { kind: 'api-key', apiKey: 'el-test' },
    } as DeepgramVoiceAgentOptions);
    expect(settings.speak.provider).toBe('eleven_labs');
  });

  it('never includes a supplied provider credential value in the returned settings', () => {
    const settings = validateDeepgramVoiceAgentOptions({
      ...base,
      think: { provider: 'groq', model: 'llama-3.3-70b', endpointUrl: 'https://api.groq.example/v1' },
      thinkProviderCredential: { kind: 'api-key', apiKey: 'gsk-should-not-leak' },
    } as DeepgramVoiceAgentOptions);
    expect(JSON.stringify(settings)).not.toContain('gsk-should-not-leak');
  });
});
