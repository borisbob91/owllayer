export interface DomOSConfig {
  mode: 'self' | 'cloud';
  port: number;
  host: string;
  path: string;

  llm: LLMConfig;
  live?: LiveConfig;
  stt?: STTConfig;
  tts?: TTSConfig;

  admin: AdminConfig;
  client: ClientConfig;
  rateLimit: RateLimitConfig;
  ui: UIConfig;

  apiKeys?: ApiKeyConfig[];

  virtualLines?: VirtualLinesConfig;

  // Cloud Pro (Sprint 5)
  cloud?: CloudConfig;
}

export interface LLMConfig {
  provider: 'google' | 'openai' | 'anthropic';
  model?: string;
  // apiKey lu depuis env, JAMAIS dans le YAML
}

export interface LiveConfig {
  enabled: boolean;
  voice?: string;
  model?: string;
}

export interface STTConfig {
  provider: 'google' | 'whisper';
  language?: string;
  model?: string;
}

export interface TTSConfig {
  provider: 'google' | 'openai' | 'elevenlabs';
  voice?: string;
  language?: string;
  voiceType?: string;
}

export interface AdminConfig {
  username: string;
  password?: string;  // lu depuis env ADMIN_PASSWORD
  path: string;
}

export interface ClientConfig {
  requireApiKey: boolean;
  enableApiKeyManagement?: boolean;
  maxConnectionsPerKey: number;
}

export interface RateLimitConfig {
  disabled: boolean;
  burstLimit: number;
  burstWindowMs?: number;
  burstCloseAfter?: number;
  maxRequests: number;
  windowMs: number;
}

export interface UIConfig {
  enabled: boolean;
}

export interface ApiKeyConfig {
  key: string;
  name?: string;
  description?: string;
  prompt?: string;
  clientType?: string[];
}

export interface VirtualLinesConfig {
  lines: Array<{
    apiKey: string;
    count: number;
    ttlMs: number;
    waitingTtlMs?: number;
  }>;
}

export interface CloudConfig {
  jwtSecret?: string;
  refreshTokenSecret?: string;
  redisUrl?: string;
  databaseUrl?: string;
  encryptionKey?: string;
  multiTenant?: boolean;
  billing?: { enabled: boolean };
  analytics?: { retentionDays: number };
}
