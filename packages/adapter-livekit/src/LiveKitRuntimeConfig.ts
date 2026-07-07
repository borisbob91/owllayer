import { LiveKitConfigurationError } from './errors.js';
import type {
  LiveKitDomOSOptions,
  LiveKitProviderEnvironment,
  LiveKitRuntimeConfig,
  LiveKitRuntimeEnv,
  RedactedLiveKitRuntimeConfig,
} from './types.js';

export const LIVEKIT_SERVER_ENV_KEYS = [
  'LIVEKIT_URL',
  'LIVEKIT_API_KEY',
  'LIVEKIT_API_SECRET',
  'GOOGLE_API_KEY',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GOOGLE_CLOUD_PROJECT',
  'GOOGLE_CLOUD_LOCATION',
] as const;

const DEFAULT_AGENT_NAME = 'domos-agent';

export function resolveLiveKitRuntimeConfig(
  options: LiveKitDomOSOptions = {},
  env: LiveKitRuntimeEnv = {}
): LiveKitRuntimeConfig {
  const livekitUrl = readString(options.livekitUrl ?? env.LIVEKIT_URL);
  const apiKey = readString(options.apiKey ?? env.LIVEKIT_API_KEY);
  const apiSecret = readString(options.apiSecret ?? env.LIVEKIT_API_SECRET);

  if (!livekitUrl) {
    throw new LiveKitConfigurationError(
      'LIVEKIT_URL is required to configure the LiveKit adapter runtime.',
      'MISSING_LIVEKIT_URL'
    );
  }

  if (!apiKey) {
    throw new LiveKitConfigurationError(
      'LIVEKIT_API_KEY is required to configure the LiveKit adapter runtime.',
      'MISSING_LIVEKIT_API_KEY'
    );
  }

  if (!apiSecret) {
    throw new LiveKitConfigurationError(
      'LIVEKIT_API_SECRET is required to configure the LiveKit adapter runtime.',
      'MISSING_LIVEKIT_API_SECRET'
    );
  }

  return {
    livekitUrl: normalizeLiveKitUrl(livekitUrl),
    apiKey,
    apiSecret,
    roomName: readString(options.roomName),
    agentName: readString(options.agentName) ?? DEFAULT_AGENT_NAME,
    provider: options.provider,
    providerConfig: { ...(options.providerConfig ?? {}) },
    providerEnvironment: resolveProviderEnvironment(options.providerEnvironment, env),
    systemPrompt: options.systemPrompt,
  };
}

export function isLiveKitServerEnvConfigured(env: LiveKitRuntimeEnv = {}): boolean {
  return Boolean(
    readString(env.LIVEKIT_URL) &&
    readString(env.LIVEKIT_API_KEY) &&
    readString(env.LIVEKIT_API_SECRET)
  );
}

export function redactLiveKitRuntimeConfig(
  config: LiveKitRuntimeConfig
): RedactedLiveKitRuntimeConfig {
  const { apiKey: _apiKey, apiSecret: _apiSecret, providerEnvironment, ...safeConfig } = config;
  const {
    googleApiKey,
    googleApplicationCredentials,
    ...safeProviderEnvironment
  } = providerEnvironment;

  return {
    ...safeConfig,
    apiKey: '[redacted]',
    apiSecret: '[redacted]',
    providerEnvironment: {
      ...safeProviderEnvironment,
      ...(googleApiKey ? { googleApiKey: '[redacted]' } : {}),
      ...(googleApplicationCredentials ? { googleApplicationCredentials: '[redacted]' } : {}),
    },
  };
}

function resolveProviderEnvironment(
  options: LiveKitProviderEnvironment | undefined,
  env: LiveKitRuntimeEnv
): LiveKitProviderEnvironment {
  return {
    googleApiKey: readString(options?.googleApiKey ?? env.GOOGLE_API_KEY),
    googleApplicationCredentials: readString(
      options?.googleApplicationCredentials ?? env.GOOGLE_APPLICATION_CREDENTIALS
    ),
    googleCloudProject: readString(options?.googleCloudProject ?? env.GOOGLE_CLOUD_PROJECT),
    googleCloudLocation: readString(options?.googleCloudLocation ?? env.GOOGLE_CLOUD_LOCATION),
  };
}

function normalizeLiveKitUrl(value: string): string {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch (error) {
    throw new LiveKitConfigurationError(
      'LIVEKIT_URL must be a valid ws, wss, http or https URL.',
      'INVALID_LIVEKIT_URL',
      { cause: error }
    );
  }

  if (!['ws:', 'wss:', 'http:', 'https:'].includes(parsed.protocol)) {
    throw new LiveKitConfigurationError(
      'LIVEKIT_URL must use ws, wss, http or https.',
      'INVALID_LIVEKIT_URL'
    );
  }

  return value.replace(/\/+$/, '');
}

function readString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}
