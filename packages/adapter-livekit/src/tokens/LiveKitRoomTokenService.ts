import { AccessToken, type VideoGrant } from 'livekit-server-sdk';
import { LiveKitConfigurationError } from '../errors.js';
import type { LiveKitRuntimeConfig } from '../types.js';

export const DEFAULT_LIVEKIT_ROOM_TOKEN_TTL_SECONDS = 300;
export const MAX_LIVEKIT_ROOM_TOKEN_TTL_SECONDS = 900;
const MAX_LIVEKIT_TOKEN_METADATA_BYTES = 2048;
const MAX_LIVEKIT_LABEL_LENGTH = 128;

export interface LiveKitRoomTokenRequest {
  sessionId: string;
  roomName?: string;
  participantIdentity?: string;
  participantName?: string;
  ttlSeconds?: number;
  canPublish?: boolean;
  canSubscribe?: boolean;
  canPublishData?: boolean;
  metadata?: Record<string, unknown>;
  attributes?: Record<string, string>;
}

export interface LiveKitRoomTokenResult {
  token: string;
  livekitUrl: string;
  roomName: string;
  participantIdentity: string;
  expiresAt: number;
}

export interface LiveKitAccessTokenOptions {
  ttl: number;
  identity: string;
  name?: string;
  metadata?: string;
  attributes?: Record<string, string>;
}

export interface LiveKitAccessTokenLike {
  addGrant(grant: VideoGrant): void;
  toJwt(): Promise<string>;
}

export type LiveKitAccessTokenFactory = (
  apiKey: string,
  apiSecret: string,
  options: LiveKitAccessTokenOptions
) => LiveKitAccessTokenLike;

export interface LiveKitRoomTokenServiceOptions {
  config: LiveKitRuntimeConfig;
  now?: () => number;
  tokenFactory?: LiveKitAccessTokenFactory;
  defaultTtlSeconds?: number;
  maxTtlSeconds?: number;
}

export class LiveKitRoomTokenService {
  private readonly config: LiveKitRuntimeConfig;
  private readonly now: () => number;
  private readonly tokenFactory: LiveKitAccessTokenFactory;
  private readonly defaultTtlSeconds: number;
  private readonly maxTtlSeconds: number;

  constructor(options: LiveKitRoomTokenServiceOptions) {
    this.config = options.config;
    this.now = options.now ?? Date.now;
    this.tokenFactory = options.tokenFactory ?? createDefaultAccessToken;
    this.defaultTtlSeconds = normalizePositiveInteger(
      options.defaultTtlSeconds,
      DEFAULT_LIVEKIT_ROOM_TOKEN_TTL_SECONDS
    );
    this.maxTtlSeconds = normalizePositiveInteger(
      options.maxTtlSeconds,
      MAX_LIVEKIT_ROOM_TOKEN_TTL_SECONDS
    );
  }

  async createToken(request: LiveKitRoomTokenRequest): Promise<LiveKitRoomTokenResult> {
    const sessionId = readRequiredString(request.sessionId, 'sessionId');
    const roomName = toLiveKitLabel(
      request.roomName ?? this.config.roomName ?? `owllayer-${sessionId}`,
      'owllayer-session'
    );
    const participantIdentity = toLiveKitLabel(
      request.participantIdentity ?? `owllayer-user-${sessionId}`,
      'owllayer-user'
    );
    const ttlSeconds = this.resolveTtl(request.ttlSeconds);
    const metadata = serializeMetadata({
      ...(request.metadata ?? {}),
      owllayerSessionId: sessionId,
    });
    const attributes = {
      ...(request.attributes ?? {}),
      'owllayer.sessionId': sessionId,
    };

    const accessToken = this.tokenFactory(this.config.apiKey, this.config.apiSecret, {
      ttl: ttlSeconds,
      identity: participantIdentity,
      name: request.participantName,
      metadata,
      attributes,
    });

    accessToken.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: request.canPublish ?? true,
      canSubscribe: request.canSubscribe ?? true,
      canPublishData: request.canPublishData ?? true,
    });

    return {
      token: await accessToken.toJwt(),
      livekitUrl: this.config.livekitUrl,
      roomName,
      participantIdentity,
      expiresAt: this.now() + ttlSeconds * 1000,
    };
  }

  private resolveTtl(ttlSeconds: number | undefined): number {
    const requestedTtl = normalizePositiveInteger(ttlSeconds, this.defaultTtlSeconds);
    return Math.min(requestedTtl, this.maxTtlSeconds);
  }
}

export function createLiveKitRoomToken(
  request: LiveKitRoomTokenRequest,
  options: LiveKitRoomTokenServiceOptions
): Promise<LiveKitRoomTokenResult> {
  return new LiveKitRoomTokenService(options).createToken(request);
}

function createDefaultAccessToken(
  apiKey: string,
  apiSecret: string,
  options: LiveKitAccessTokenOptions
): LiveKitAccessTokenLike {
  return new AccessToken(apiKey, apiSecret, options);
}

function readRequiredString(value: string | undefined, fieldName: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new LiveKitConfigurationError(`${fieldName} is required to create a LiveKit room token.`);
  }
  return normalized;
}

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value) || value === undefined) {
    return fallback;
  }

  return Math.max(1, Math.floor(value));
}

function toLiveKitLabel(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .replace(/[^A-Za-z0-9_.:-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LIVEKIT_LABEL_LENGTH);

  return normalized || fallback;
}

function serializeMetadata(metadata: Record<string, unknown>): string {
  const serialized = JSON.stringify(metadata);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_LIVEKIT_TOKEN_METADATA_BYTES) {
    throw new LiveKitConfigurationError('LiveKit token metadata is too large.');
  }
  return serialized;
}
