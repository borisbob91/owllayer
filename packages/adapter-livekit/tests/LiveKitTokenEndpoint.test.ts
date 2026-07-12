import { Readable } from 'stream';
import { describe, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'http';
import { createLiveKitTokenRequestHandler } from '../../../apps/demo-server/src/livekitTokenEndpoint.js';

const livekitEnv = {
  LIVEKIT_URL: 'wss://livekit.example.com',
  LIVEKIT_API_KEY: 'server-key',
  LIVEKIT_API_SECRET: 'server-secret',
};

class MockResponse {
  statusCode = 0;
  headers = new Map<string, string | number | readonly string[]>();
  body = '';

  setHeader(name: string, value: string | number | readonly string[]): void {
    this.headers.set(name.toLowerCase(), value);
  }

  writeHead(statusCode: number, headers: Record<string, string> = {}): this {
    this.statusCode = statusCode;
    for (const [name, value] of Object.entries(headers)) {
      this.setHeader(name, value);
    }
    return this;
  }

  end(chunk?: string | Buffer): void {
    if (chunk) {
      this.body += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;
    }
  }

  json(): unknown {
    return this.body ? JSON.parse(this.body) : undefined;
  }
}

function createRequest(options: {
  method?: string;
  url?: string;
  origin?: string;
  apiKey?: string;
  body?: Record<string, unknown>;
}): IncomingMessage {
  const body = options.body ? JSON.stringify(options.body) : '';
  const req = Readable.from(body ? [Buffer.from(body)] : []) as IncomingMessage;
  req.method = options.method ?? 'POST';
  req.url = options.url ?? '/domos/livekit/token';
  req.headers = {
    host: 'localhost:3001',
    ...(options.origin ? { origin: options.origin } : {}),
    ...(options.apiKey ? { authorization: `Bearer ${options.apiKey}` } : {}),
    ...(body ? { 'content-type': 'application/json' } : {}),
  };
  return req;
}

function createHandler() {
  const createRoomToken = vi.fn(async (request) => ({
    token: 'signed-room-token',
    livekitUrl: 'wss://livekit.example.com',
    roomName: `domos-${request.sessionId}`,
    participantIdentity: `domos-user-${request.sessionId}`,
    expiresAt: 1_700_000_300_000,
  }));
  const getSessionSnapshot = vi.fn(async (sessionId: string) =>
    sessionId === 'sess_owner' || sessionId === 'sess_other'
      ? { sessionId }
      : null
  );
  const isSessionOwnedByApiKey = vi.fn((sessionId: string, apiKey: string) =>
    sessionId === 'sess_owner' && apiKey === 'pk_owner'
  );
  const handler = createLiveKitTokenRequestHandler({
    path: '/domos/livekit/token',
    env: livekitEnv,
    allowedOrigins: ['https://app.example.com'],
    isClientApiKeyAllowed: (apiKey) => apiKey === 'pk_owner' || apiKey === 'pk_other',
    getSessionSnapshot,
    isSessionOwnedByApiKey,
    createRoomToken,
  });

  return { handler, createRoomToken, getSessionSnapshot, isSessionOwnedByApiKey };
}

describe('LiveKit token endpoint', () => {
  it('returns a token for an allowed origin and owning API key', async () => {
    const { handler, createRoomToken } = createHandler();
    const res = new MockResponse();

    await handler(createRequest({
      origin: 'https://app.example.com',
      apiKey: 'pk_owner',
      body: { sessionId: 'sess_owner', ttlSeconds: 300 },
    }), res as unknown as ServerResponse);

    expect(res.statusCode).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://app.example.com');
    expect(res.json()).toMatchObject({
      token: 'signed-room-token',
      livekitUrl: 'wss://livekit.example.com',
    });
    expect(createRoomToken).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'sess_owner', ttlSeconds: 300 }),
      expect.objectContaining({
        config: expect.objectContaining({
          apiKey: 'server-key',
          apiSecret: 'server-secret',
        }),
      })
    );
  });

  it('rejects browser origins outside the server allowlist', async () => {
    const { handler, createRoomToken } = createHandler();
    const res = new MockResponse();

    await handler(createRequest({
      origin: 'https://evil.example.com',
      apiKey: 'pk_owner',
      body: { sessionId: 'sess_owner' },
    }), res as unknown as ServerResponse);

    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'origin_not_allowed' });
    expect(createRoomToken).not.toHaveBeenCalled();
  });

  it('rejects invalid API keys before looking up sessions', async () => {
    const { handler, createRoomToken, getSessionSnapshot } = createHandler();
    const res = new MockResponse();

    await handler(createRequest({
      origin: 'https://app.example.com',
      apiKey: 'pk_invalid',
      body: { sessionId: 'sess_owner' },
    }), res as unknown as ServerResponse);

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'invalid_api_key' });
    expect(getSessionSnapshot).not.toHaveBeenCalled();
    expect(createRoomToken).not.toHaveBeenCalled();
  });

  it('returns not found for unknown sessions', async () => {
    const { handler, createRoomToken } = createHandler();
    const res = new MockResponse();

    await handler(createRequest({
      origin: 'https://app.example.com',
      apiKey: 'pk_owner',
      body: { sessionId: 'sess_missing' },
    }), res as unknown as ServerResponse);

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'domos_session_not_found' });
    expect(createRoomToken).not.toHaveBeenCalled();
  });

  it('rejects a valid API key for another key owned session', async () => {
    const { handler, createRoomToken, getSessionSnapshot } = createHandler();
    const res = new MockResponse();

    await handler(createRequest({
      origin: 'https://app.example.com',
      apiKey: 'pk_other',
      body: { sessionId: 'sess_owner' },
    }), res as unknown as ServerResponse);

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'domos_session_not_found' });
    expect(getSessionSnapshot).not.toHaveBeenCalled();
    expect(createRoomToken).not.toHaveBeenCalled();
  });

  it('answers allowed preflight requests without requiring a token', async () => {
    const { handler } = createHandler();
    const res = new MockResponse();

    await handler(createRequest({
      method: 'OPTIONS',
      origin: 'https://app.example.com',
    }), res as unknown as ServerResponse);

    expect(res.statusCode).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://app.example.com');
  });
});
