import { describe, expect, it } from 'vitest';
import {
  LiveKitConfigurationError,
  isLiveKitServerEnvConfigured,
  redactLiveKitRuntimeConfig,
  resolveLiveKitRuntimeConfig,
} from '../src/index.js';

const baseEnv = {
  LIVEKIT_URL: 'wss://livekit.example.com/',
  LIVEKIT_API_KEY: 'server-key',
  LIVEKIT_API_SECRET: 'server-secret',
};

describe('resolveLiveKitRuntimeConfig', () => {
  it('resolves required LiveKit settings from server env', () => {
    const config = resolveLiveKitRuntimeConfig({}, baseEnv);

    expect(config.livekitUrl).toBe('wss://livekit.example.com');
    expect(config.apiKey).toBe('server-key');
    expect(config.apiSecret).toBe('server-secret');
    expect(config.agentName).toBe('owllayer-agent');
    expect(config.provider).toBeUndefined();
  });

  it('lets explicit options override env without forcing Gemini', () => {
    const config = resolveLiveKitRuntimeConfig(
      {
        livekitUrl: 'https://override.example.com/',
        apiKey: 'explicit-key',
        apiSecret: 'explicit-secret',
        agentName: 'support-agent',
        provider: 'openai',
        providerConfig: { realtimeModel: 'realtime-model', voice: 'alloy' },
      },
      baseEnv
    );

    expect(config.livekitUrl).toBe('https://override.example.com');
    expect(config.agentName).toBe('support-agent');
    expect(config.provider).toBe('openai');
    expect(config.providerConfig).toEqual({
      realtimeModel: 'realtime-model',
      voice: 'alloy',
    });
  });

  it('throws typed configuration errors for missing required secrets', () => {
    expect(() => resolveLiveKitRuntimeConfig({}, {})).toThrow(LiveKitConfigurationError);
    expect(() => resolveLiveKitRuntimeConfig({}, {})).toThrow('LIVEKIT_URL is required');
  });

  it('redacts LiveKit and provider secrets for logs or dashboards', () => {
    const config = resolveLiveKitRuntimeConfig(
      {},
      {
        ...baseEnv,
        GOOGLE_API_KEY: 'google-secret',
        GOOGLE_APPLICATION_CREDENTIALS: 'C:/secrets/google-service-account.json',
        GOOGLE_CLOUD_PROJECT: 'owllayer-project',
      }
    );

    expect(redactLiveKitRuntimeConfig(config)).toEqual({
      livekitUrl: 'wss://livekit.example.com',
      roomName: undefined,
      agentName: 'owllayer-agent',
      provider: undefined,
      providerConfig: {},
      systemPrompt: undefined,
      apiKey: '[redacted]',
      apiSecret: '[redacted]',
      providerEnvironment: {
        googleCloudProject: 'owllayer-project',
        googleCloudLocation: undefined,
        googleApiKey: '[redacted]',
        googleApplicationCredentials: '[redacted]',
      },
    });
  });

  it('rejects invalid LiveKit URLs', () => {
    expect(() =>
      resolveLiveKitRuntimeConfig({}, {
        ...baseEnv,
        LIVEKIT_URL: 'ftp://livekit.example.com',
      })
    ).toThrow('LIVEKIT_URL must use ws, wss, http or https.');

    expect(() =>
      resolveLiveKitRuntimeConfig({}, {
        ...baseEnv,
        LIVEKIT_URL: 'not a url',
      })
    ).toThrow('LIVEKIT_URL must be a valid ws, wss, http or https URL.');
  });
});

describe('isLiveKitServerEnvConfigured', () => {
  it('requires url, api key and api secret', () => {
    expect(isLiveKitServerEnvConfigured(baseEnv)).toBe(true);
    expect(isLiveKitServerEnvConfigured({ LIVEKIT_URL: baseEnv.LIVEKIT_URL })).toBe(false);
  });
});
