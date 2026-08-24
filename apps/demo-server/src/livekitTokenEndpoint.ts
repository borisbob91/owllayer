import type { IncomingMessage, ServerResponse } from 'http';
import {
  createLiveKitRoomToken,
  DEFAULT_LIVEKIT_TOKEN_ALLOWED_ORIGINS,
  isLiveKitServerEnvConfigured,
  parseLiveKitTokenAllowedOrigins,
  resolveLiveKitRuntimeConfig,
  resolveLiveKitTokenCorsOrigin,
  type LiveKitRoomTokenRequest,
  type LiveKitRoomTokenResult,
  type LiveKitRoomTokenServiceOptions,
  type LiveKitRuntimeEnv,
} from '@owllayer/adapter-livekit';

export interface LiveKitTokenSessionSnapshot {
  sessionId: string;
}

export interface LiveKitTokenEndpointOptions {
  path: string;
  env: LiveKitRuntimeEnv;
  allowedOrigins?: readonly string[];
  isClientApiKeyAllowed: (apiKey: string | undefined) => boolean;
  getSessionSnapshot: (sessionId: string) => Promise<LiveKitTokenSessionSnapshot | null>;
  isSessionOwnedByApiKey: (sessionId: string, apiKey: string) => boolean | Promise<boolean>;
  createRoomToken?: (
    request: LiveKitRoomTokenRequest,
    options: LiveKitRoomTokenServiceOptions
  ) => Promise<LiveKitRoomTokenResult>;
}

export function createLiveKitTokenRequestHandler(options: LiveKitTokenEndpointOptions) {
  return async function handleLiveKitTokenRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<boolean> {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    if (url.pathname !== options.path) {
      return false;
    }

    if (!setCorsHeaders(req, res, options.allowedOrigins)) {
      writeJson(res, 403, { error: 'origin_not_allowed' });
      return true;
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return true;
    }

    if (req.method !== 'POST') {
      writeJson(res, 405, { error: 'method_not_allowed' }, { Allow: 'POST, OPTIONS' });
      return true;
    }

    if (!isLiveKitServerEnvConfigured(options.env)) {
      writeJson(res, 503, { error: 'livekit_not_configured', enabled: false });
      return true;
    }

    const clientApiKey = readClientApiKey(req);
    if (!options.isClientApiKeyAllowed(clientApiKey)) {
      writeJson(res, 401, { error: 'invalid_api_key' });
      return true;
    }

    try {
      const body = await readJsonBody(req);
      const sessionId = readBodyString(body, 'sessionId');
      if (!sessionId) {
        writeJson(res, 400, { error: 'session_id_required' });
        return true;
      }

      if (clientApiKey) {
        const ownsSession = await options.isSessionOwnedByApiKey(sessionId, clientApiKey);
        if (!ownsSession) {
          writeJson(res, 404, { error: 'owllayer_session_not_found' });
          return true;
        }
      }

      const sessionSnapshot = await options.getSessionSnapshot(sessionId);
      if (!sessionSnapshot) {
        writeJson(res, 404, { error: 'owllayer_session_not_found' });
        return true;
      }

      const livekitConfig = resolveLiveKitRuntimeConfig({}, options.env);
      const token = await (options.createRoomToken ?? createLiveKitRoomToken)(
        {
          sessionId: sessionSnapshot.sessionId,
          roomName: readBodyString(body, 'roomName'),
          participantIdentity: readBodyString(body, 'participantIdentity'),
          participantName: readBodyString(body, 'participantName'),
          ttlSeconds: readBodyNumber(body, 'ttlSeconds'),
          metadata: { source: 'owllayer-demo-server' },
          attributes: { 'owllayer.demo': 'true' },
        },
        { config: livekitConfig }
      );

      writeJson(res, 200, token);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = message === 'request_body_too_large' ? 413 : 400;
      writeJson(res, status, { error: status === 413 ? 'request_body_too_large' : 'invalid_request' });
    }

    return true;
  };
}

export function readLiveKitAllowedOrigins(value: string | undefined): string[] {
  return parseLiveKitTokenAllowedOrigins(value);
}

function setCorsHeaders(
  req: IncomingMessage,
  res: ServerResponse,
  configuredOrigins: readonly string[] | undefined
): boolean {
  const origin = Array.isArray(req.headers.origin) ? req.headers.origin[0] : req.headers.origin;

  if (!origin) {
    return true;
  }

  const allowedOrigins = configuredOrigins && configuredOrigins.length > 0
    ? configuredOrigins
    : DEFAULT_LIVEKIT_TOKEN_ALLOWED_ORIGINS;
  const allowedOrigin = resolveLiveKitTokenCorsOrigin(origin, allowedOrigins);
  if (!allowedOrigin) {
    return false;
  }

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type, x-owllayer-api-key');
  return true;
}

function readClientApiKey(req: IncomingMessage): string | undefined {
  const authorization = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;
  const bearerMatch = authorization?.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch?.[1]) {
    return bearerMatch[1].trim();
  }

  const headerKey = req.headers['x-owllayer-api-key'];
  return Array.isArray(headerKey) ? headerKey[0] : headerKey;
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;
    if (totalBytes > 8_192) {
      throw new Error('request_body_too_large');
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return {};
  }

  const rawBody = Buffer.concat(chunks).toString('utf8').trim();
  if (!rawBody) {
    return {};
  }

  const parsed = JSON.parse(rawBody);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }
  return parsed as Record<string, unknown>;
}

function readBodyString(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readBodyNumber(body: Record<string, unknown>, key: string): number | undefined {
  const value = body[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function writeJson(
  res: ServerResponse,
  statusCode: number,
  payload: unknown,
  headers: Record<string, string> = {}
): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    ...headers,
  });
  res.end(JSON.stringify(payload));
}
