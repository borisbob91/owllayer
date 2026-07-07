import type {
  LiveAdapter,
  LiveSession,
  LiveSessionConfig,
  SpeechCapabilities,
  STTService,
  SystemPrompt,
  TTSService,
} from '@domos/core';

export type LiveKitModelProvider =
  | 'gemini'
  | 'openai'
  | 'livekit-inference'
  | (string & {});

export interface LiveKitModelProviderConfig {
  realtimeModel?: string;
  llmModel?: string;
  sttModel?: string;
  ttsModel?: string;
  voice?: string;
  language?: string;
}

export interface LiveKitProviderEnvironment {
  googleApiKey?: string;
  googleApplicationCredentials?: string;
  googleCloudProject?: string;
  googleCloudLocation?: string;
}

export interface LiveKitDomOSOptions {
  livekitUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  roomName?: string;
  agentName?: string;
  provider?: LiveKitModelProvider;
  providerConfig?: LiveKitModelProviderConfig;
  providerEnvironment?: LiveKitProviderEnvironment;
  systemPrompt?: SystemPrompt;
}

export interface LiveKitRuntimeEnv {
  LIVEKIT_URL?: string;
  LIVEKIT_API_KEY?: string;
  LIVEKIT_API_SECRET?: string;
  GOOGLE_API_KEY?: string;
  GOOGLE_APPLICATION_CREDENTIALS?: string;
  GOOGLE_CLOUD_PROJECT?: string;
  GOOGLE_CLOUD_LOCATION?: string;
  [key: string]: string | undefined;
}

export interface LiveKitRuntimeConfig {
  livekitUrl: string;
  apiKey: string;
  apiSecret: string;
  roomName?: string;
  agentName: string;
  provider?: LiveKitModelProvider;
  providerConfig: LiveKitModelProviderConfig;
  providerEnvironment: LiveKitProviderEnvironment;
  systemPrompt?: SystemPrompt;
}

export interface RedactedLiveKitRuntimeConfig
  extends Omit<LiveKitRuntimeConfig, 'apiKey' | 'apiSecret' | 'providerEnvironment'> {
  apiKey: '[redacted]';
  apiSecret: '[redacted]';
  providerEnvironment: Omit<
    LiveKitProviderEnvironment,
    'googleApiKey' | 'googleApplicationCredentials'
  > & {
    googleApiKey?: '[redacted]';
    googleApplicationCredentials?: '[redacted]';
  };
}

export type DomOSLiveAdapterContract = LiveAdapter;
export type DomOSLiveSessionContract = LiveSession;
export type DomOSLiveSessionConfigContract = LiveSessionConfig;
export type DomOSTTSServiceContract = TTSService;
export type DomOSSTTServiceContract = STTService;
export type DomOSSpeechCapabilitiesContract = SpeechCapabilities;
