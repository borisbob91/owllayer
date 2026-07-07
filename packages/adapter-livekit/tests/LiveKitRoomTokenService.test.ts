import { describe, expect, it, vi } from 'vitest';
import {
  LiveKitConfigurationError,
  LiveKitRoomTokenService,
  type LiveKitAccessTokenFactory,
  type LiveKitAccessTokenOptions,
} from '../src/index.js';
import type { VideoGrant } from 'livekit-server-sdk';

const config = {
  livekitUrl: 'wss://livekit.example.com',
  apiKey: 'server-key',
  apiSecret: 'server-secret',
  agentName: 'domos-agent',
  providerConfig: {},
  providerEnvironment: {},
};

function createTokenFactoryMock() {
  const grants: VideoGrant[] = [];
  const options: LiveKitAccessTokenOptions[] = [];
  const factory: LiveKitAccessTokenFactory = vi.fn((_apiKey, _apiSecret, tokenOptions) => {
    options.push(tokenOptions);
    return {
      addGrant: (grant) => {
        grants.push(grant);
      },
      toJwt: async () => 'signed-room-token',
    };
  });

  return { factory, grants, options };
}

describe('LiveKitRoomTokenService', () => {
  it('creates a scoped room token tied to a DomOS session', async () => {
    const { factory, grants, options } = createTokenFactoryMock();
    const service = new LiveKitRoomTokenService({
      config,
      tokenFactory: factory,
      now: () => 1_700_000_000_000,
    });

    const result = await service.createToken({ sessionId: 'sess_123' });

    expect(factory).toHaveBeenCalledWith('server-key', 'server-secret', expect.any(Object));
    expect(options[0]).toMatchObject({
      ttl: 300,
      identity: 'domos-user-sess_123',
      attributes: { 'domos.sessionId': 'sess_123' },
    });
    expect(JSON.parse(options[0].metadata ?? '{}')).toEqual({ domosSessionId: 'sess_123' });
    expect(grants[0]).toEqual({
      roomJoin: true,
      room: 'domos-sess_123',
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    expect(result).toEqual({
      token: 'signed-room-token',
      livekitUrl: 'wss://livekit.example.com',
      roomName: 'domos-sess_123',
      participantIdentity: 'domos-user-sess_123',
      expiresAt: 1_700_000_300_000,
    });
  });

  it('caps requested ttl and keeps secrets out of public metadata', async () => {
    const { factory, options } = createTokenFactoryMock();
    const service = new LiveKitRoomTokenService({
      config,
      tokenFactory: factory,
      now: () => 0,
    });

    const result = await service.createToken({
      sessionId: 'sess-public',
      ttlSeconds: 3600,
      metadata: { source: 'demo' },
    });

    expect(options[0].ttl).toBe(900);
    expect(options[0].metadata).toContain('sess-public');
    expect(options[0].metadata).not.toContain('server-key');
    expect(options[0].metadata).not.toContain('server-secret');
    expect(JSON.stringify(result)).not.toContain('server-key');
    expect(JSON.stringify(result)).not.toContain('server-secret');
  });

  it('sanitizes LiveKit room and participant labels', async () => {
    const { factory, grants, options } = createTokenFactoryMock();
    const service = new LiveKitRoomTokenService({ config, tokenFactory: factory });

    await service.createToken({
      sessionId: 'sess/with spaces',
      roomName: 'room with spaces!',
      participantIdentity: 'user:42@example.com',
    });

    expect(grants[0].room).toBe('room-with-spaces');
    expect(options[0].identity).toBe('user:42-example.com');
  });

  it('rejects missing session ids and oversized metadata', async () => {
    const { factory } = createTokenFactoryMock();
    const service = new LiveKitRoomTokenService({ config, tokenFactory: factory });

    await expect(service.createToken({ sessionId: '' })).rejects.toThrow(LiveKitConfigurationError);
    await expect(
      service.createToken({
        sessionId: 'sess-large',
        metadata: { value: 'x'.repeat(3_000) },
      })
    ).rejects.toThrow('LiveKit token metadata is too large.');
  });
});
