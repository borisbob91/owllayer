import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'http';
import { AdminAPI, type BridgeStats, type RuntimeVoiceConfig } from '../src/admin/AdminAPI.js';
import { AdminAuthManager } from '../src/auth/AdminAuthManager.js';
import { ClientAuthManager } from '../src/auth/ClientAuthManager.js';
import { SessionManager } from '../src/core/SessionManager.js';
import { ToolRouter } from '../src/core/ToolRouter.js';
import { ConnectionPool } from '../src/transport/ConnectionPool.js';
import { MemoryAgentStore } from '../src/persistence/MemoryAgentStore.js';
import { VirtualLineManager } from '../src/lines/VirtualLineManager.js';

function createResponse() {
  return {
    statusCode: 0,
    headers: {} as Record<string, unknown>,
    body: '',
    setHeader(name: string, value: unknown) {
      this.headers[name] = value;
    },
    writeHead(statusCode: number, headers?: Record<string, unknown>) {
      this.statusCode = statusCode;
      if (headers) Object.assign(this.headers, headers);
    },
    end(chunk?: unknown) {
      this.body += chunk ? String(chunk) : '';
    },
  };
}

function createRequest(token: string, method: string, url: string, body?: unknown): IncomingMessage {
  const req = new Readable({
    read() {
      if (body !== undefined) {
        this.push(JSON.stringify(body));
      }
      this.push(null);
    },
  }) as IncomingMessage;
  req.method = method;
  req.url = url;
  req.headers = {
    authorization: `Bearer ${token}`,
    host: 'localhost',
    'content-type': 'application/json',
  };
  (req as any).socket = { remoteAddress: '127.0.0.20' };
  return req;
}

async function callAdmin(api: AdminAPI, token: string, method: string, url: string, body?: unknown) {
  const res = createResponse();
  api.handleRequest(createRequest(token, method, url, body), res as unknown as ServerResponse);
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { status: res.statusCode, data: JSON.parse(res.body) };
}

async function createFixture(options: {
  bridge?: {
    getStats(): Promise<BridgeStats> | BridgeStats;
    getEvents?(limit?: number): Promise<unknown[]> | unknown[];
  };
} = {}) {
  const adminAuth = new AdminAuthManager({
    username: 'admin',
    password: 'admin-password-123456',
  });
  const token = await adminAuth.login('admin', 'admin-password-123456', '127.0.0.20');
  if (!token) throw new Error('missing admin token');

  const sessions = new SessionManager();
  const pool = new ConnectionPool();
  const toolRouter = new ToolRouter(vi.fn());
  const clientAuth = new ClientAuthManager({ requireApiKey: true, enableApiKeyManagement: true });
  const agentStore = new MemoryAgentStore();
  const runtimeVoiceConfig: RuntimeVoiceConfig = {};
  const closeConnection = vi.fn();

  const api = new AdminAPI(
    {
      sessions,
      pool,
      toolRouter,
      startedAt: Date.now(),
      adminAuth,
      clientAuth,
      agentStore,
      llmAdapter: {
        name: 'mock-llm',
        systemPrompt: { name: 'Default Agent', role: 'Default role' },
        chat: vi.fn(),
        handleToolResult: vi.fn(),
      },
      runtimeVoiceConfig,
      setRuntimeVoiceConfig(config) {
        runtimeVoiceConfig.liveVoice = config.liveVoice;
        runtimeVoiceConfig.ttsVoice = config.ttsVoice;
        runtimeVoiceConfig.language = config.language;
      },
      closeConnection,
      bridge: options.bridge,
    },
    { enableClientKeyManagement: true }
  );

  return { api, token, sessions, pool, toolRouter, clientAuth, agentStore, adminAuth, runtimeVoiceConfig, closeConnection };
}

describe('AdminAPI dashboard runtime data', () => {
  it('exposes agent identity and effective tools without raw API keys in sessions', async () => {
    const { api, token, sessions, pool, toolRouter, clientAuth, agentStore, adminAuth } = await createFixture();
    try {
      await clientAuth.addKeyRecord({
        key: 'pk_agent_secret',
        name: 'Shop public key',
        clientType: ['react'],
        createdAt: 1,
      });
      await agentStore.save({
        apiKey: 'pk_agent_secret',
        prompt: { name: 'Mira', role: 'Assistant shopping' },
        createdAt: 1,
        updatedAt: 2,
      });
      toolRouter.registerServerTool('shared_tool', { description: 'Server wins', risk: 'low' }, () => 'ok');
      toolRouter.registerServerTool('server_only', { description: 'Server only', risk: 'none' }, () => 'ok');

      const session = sessions.create('conn_1', 'pk_agent_secret');
      sessions.activate(session.id);
      pool.register('conn_1', 'pk_agent_secret', session.id);
      sessions.updateContext(session.id, '/checkout', 'Checkout', [
        { name: 'shared_tool', description: 'Client duplicate', risk: 'high' },
      ]);

      const sessionsResponse = await callAdmin(api, token, 'GET', '/admin/sessions');
      expect(sessionsResponse.status).toBe(200);
      expect(sessionsResponse.data.sessions[0]).toMatchObject({
        agentName: 'Mira',
        apiKey: 'pk_***ret',
        apiKeyName: 'Shop public key',
        promptSource: 'dashboardOverride',
        toolsCount: 1,
        effectiveToolsCount: 2,
      });
      expect(JSON.stringify(sessionsResponse.data)).not.toContain('pk_agent_secret');

      const toolsResponse = await callAdmin(api, token, 'GET', '/admin/tools');
      expect(toolsResponse.status).toBe(200);
      expect(toolsResponse.data.effectiveToolsBySession[session.id].map((tool: any) => tool.name)).toEqual([
        'shared_tool',
        'server_only',
      ]);
      expect(toolsResponse.data.ignoredClientToolsBySession[session.id]).toMatchObject([
        { name: 'shared_tool', description: 'Client duplicate' },
      ]);
    } finally {
      adminAuth.stop();
    }
  });

  it('configures prompts via keyId while key lists stay masked', async () => {
    const { api, token, clientAuth, adminAuth } = await createFixture();
    try {
      await clientAuth.addKeyRecord({
        key: 'pk_config_secret',
        name: 'Configurable agent',
        createdAt: 1,
      });

      const keysResponse = await callAdmin(api, token, 'GET', '/admin/client/keys');
      expect(keysResponse.status).toBe(200);
      expect(keysResponse.data.keys[0]).toMatchObject({
        masked: 'pk_***ret',
        name: 'Configurable agent',
      });
      expect(keysResponse.data.keys[0].id).toMatch(/^key_/);
      expect(keysResponse.data.keys[0].key).toBeUndefined();
      expect(JSON.stringify(keysResponse.data)).not.toContain('pk_config_secret');

      const keyId = keysResponse.data.keys[0].id;
      const saveResponse = await callAdmin(api, token, 'POST', '/admin/prompts', {
        keyRef: keyId,
        prompt: { name: 'Dashboard Agent', role: 'Configured from dashboard' },
      });
      expect(saveResponse.status).toBe(200);
      expect(saveResponse.data).toMatchObject({ success: true, keyId, apiKey: 'pk_***ret' });

      const promptsResponse = await callAdmin(api, token, 'GET', '/admin/prompts');
      expect(promptsResponse.status).toBe(200);
      expect(promptsResponse.data.prompts[0]).toMatchObject({
        keyId,
        apiKey: 'pk_***ret',
        prompt: { name: 'Dashboard Agent' },
      });
      expect(JSON.stringify(promptsResponse.data)).not.toContain('pk_config_secret');
    } finally {
      adminAuth.stop();
    }
  });

  it('updates runtime voice config through the admin API', async () => {
    const { api, token, runtimeVoiceConfig, adminAuth } = await createFixture();
    try {
      const response = await callAdmin(api, token, 'POST', '/admin/voice-config', {
        liveVoice: 'puck',
        ttsVoice: 'alloy',
        language: 'fr-FR',
      });

      expect(response.status).toBe(200);
      expect(response.data.voiceConfig).toMatchObject({
        configurable: true,
        liveVoice: 'puck',
        ttsVoice: 'alloy',
        language: 'fr-FR',
      });
      expect(runtimeVoiceConfig).toMatchObject({
        liveVoice: 'puck',
        ttsVoice: 'alloy',
        language: 'fr-FR',
      });
    } finally {
      adminAuth.stop();
    }
  });

  it('exposes bridge stats through status and a dedicated endpoint', async () => {
    const bridgeStats: BridgeStats = {
      enabled: true,
      activeBridges: 1,
      sessions: [{
        sessionId: 'sess_bridge',
        roomName: 'domos-sess_bridge',
        agentIdentity: 'domos-agent-sess_bridge',
        startedAt: 1_700_000_000_000,
      }],
    };
    const rawEvents = [
      {
        type: 'agent_session.started',
        sessionId: 'sess_bridge',
        room: {
          roomName: 'domos-sess_bridge',
          token: 'lk_secret_room_token',
          apiSecret: 'lk_secret_api',
        },
        context: {
          instructions: 'contains private prompt',
        },
      },
      {
        type: 'tool.call_started',
        sessionId: 'sess_bridge',
        toolCall: {
          name: 'checkout_confirm',
          args: { cardToken: 'tok_secret_payment' },
        },
      },
      {
        type: 'error',
        sessionId: 'sess_bridge',
        message: 'Provider unavailable with cardToken tok_secret_payment',
      },
      {
        type: 'tool.call_failed',
        sessionId: 'sess_bridge',
        toolCall: {
          name: 'checkout_confirm',
          args: { cardToken: 'tok_secret_payment_2' },
        },
        error: 'cardToken tok_secret_payment_2 invalid',
      },
    ];
    const { api, token, adminAuth } = await createFixture({
      bridge: {
        getStats: vi.fn(() => bridgeStats),
        getEvents: vi.fn(() => rawEvents),
      },
    });
    try {
      const statusResponse = await callAdmin(api, token, 'GET', '/admin/status');
      expect(statusResponse.status).toBe(200);
      expect(statusResponse.data.bridge).toMatchObject({
        enabled: true,
        activeBridges: 1,
        sessions: bridgeStats.sessions,
        lastError: 'Tool call failed; details redacted',
      });

      const bridgeResponse = await callAdmin(api, token, 'GET', '/admin/bridge');
      expect(bridgeResponse.status).toBe(200);
      expect(bridgeResponse.data.events).toEqual([
        {
          type: 'agent_session.started',
          sessionId: 'sess_bridge',
          roomName: 'domos-sess_bridge',
        },
        {
          type: 'tool.call_started',
          sessionId: 'sess_bridge',
          toolName: 'checkout_confirm',
        },
        {
          type: 'error',
          sessionId: 'sess_bridge',
          message: 'Bridge error; details redacted',
        },
        {
          type: 'tool.call_failed',
          sessionId: 'sess_bridge',
          message: 'Tool call failed; details redacted',
          toolName: 'checkout_confirm',
        },
      ]);

      const eventsResponse = await callAdmin(api, token, 'GET', '/admin/bridge/events');
      expect(eventsResponse.status).toBe(200);
      expect(eventsResponse.data.events).toEqual(bridgeResponse.data.events);

      const serialized = JSON.stringify({ status: statusResponse.data, bridge: bridgeResponse.data, events: eventsResponse.data });
      expect(serialized).not.toContain('lk_secret_room_token');
      expect(serialized).not.toContain('lk_secret_api');
      expect(serialized).not.toContain('tok_secret_payment');
      expect(serialized).not.toContain('tok_secret_payment_2');
      expect(serialized).not.toContain('private prompt');
    } finally {
      adminAuth.stop();
    }
  });

  it('keeps bridge status available when optional bridge events fail', async () => {
    const bridgeStats: BridgeStats = {
      enabled: true,
      activeBridges: 1,
      sessions: [{
        sessionId: 'sess_bridge',
        roomName: 'domos-sess_bridge',
        agentIdentity: 'domos-agent-sess_bridge',
        startedAt: 1_700_000_000_000,
      }],
    };
    const { api, token, adminAuth } = await createFixture({
      bridge: {
        getStats: vi.fn(() => bridgeStats),
        getEvents: vi.fn(() => {
          throw new Error('lk_secret_api failed');
        }),
      },
    });
    try {
      const statusResponse = await callAdmin(api, token, 'GET', '/admin/status');
      expect(statusResponse.status).toBe(200);
      expect(statusResponse.data.bridge).toMatchObject({
        enabled: true,
        activeBridges: 1,
        sessions: bridgeStats.sessions,
        events: [],
      });

      const bridgeResponse = await callAdmin(api, token, 'GET', '/admin/bridge');
      expect(bridgeResponse.status).toBe(200);
      expect(bridgeResponse.data.events).toEqual([]);

      const eventsResponse = await callAdmin(api, token, 'GET', '/admin/bridge/events');
      expect(eventsResponse.status).toBe(200);
      expect(eventsResponse.data.events).toEqual([]);
      expect(JSON.stringify({ status: statusResponse.data, bridge: bridgeResponse.data, events: eventsResponse.data })).not.toContain('lk_secret_api');
    } finally {
      adminAuth.stop();
    }
  });

  it('redacts bridge lastError supplied directly by stats', async () => {
    const bridgeStats: BridgeStats = {
      enabled: true,
      activeBridges: 1,
      lastError: 'provider failed with lk_secret_api and tok_secret_payment',
      sessions: [{
        sessionId: 'sess_bridge',
        roomName: 'domos-sess_bridge',
        agentIdentity: 'domos-agent-sess_bridge',
        startedAt: 1_700_000_000_000,
      }],
    };
    const { api, token, adminAuth } = await createFixture({
      bridge: {
        getStats: vi.fn(() => bridgeStats),
        getEvents: vi.fn(() => []),
      },
    });
    try {
      const bridgeResponse = await callAdmin(api, token, 'GET', '/admin/bridge');
      expect(bridgeResponse.status).toBe(200);
      expect(bridgeResponse.data.lastError).toBe('Bridge error; details redacted');
      expect(JSON.stringify(bridgeResponse.data)).not.toContain('lk_secret_api');
      expect(JSON.stringify(bridgeResponse.data)).not.toContain('tok_secret_payment');
    } finally {
      adminAuth.stop();
    }
  });

  it('returns disabled bridge stats when no bridge is injected', async () => {
    const { api, token, adminAuth } = await createFixture();
    try {
      const bridgeResponse = await callAdmin(api, token, 'GET', '/admin/bridge');
      expect(bridgeResponse.status).toBe(200);
      expect(bridgeResponse.data).toEqual({
        enabled: false,
        activeBridges: 0,
        sessions: [],
      });
    } finally {
      adminAuth.stop();
    }
  });

  it('manages API key lifecycle and closes active sessions on revoke', async () => {
    const { api, token, sessions, pool, clientAuth, adminAuth, closeConnection } = await createFixture();
    try {
      await clientAuth.addKeyRecord({
        key: 'pk_lifecycle_secret',
        name: 'Lifecycle agent',
        createdAt: 1,
      });

      const authResult = await clientAuth.authenticate({
        url: '/connect?apiKey=pk_lifecycle_secret',
        headers: { host: 'localhost' },
      });
      expect(authResult.authenticated).toBe(true);

      const keysAfterUse = await callAdmin(api, token, 'GET', '/admin/client/keys');
      const keyId = keysAfterUse.data.keys[0].id;
      expect(keysAfterUse.data.keys[0].lastUsedAt).toEqual(expect.any(Number));

      const session = sessions.create('conn_lifecycle', 'pk_lifecycle_secret');
      pool.register('conn_lifecycle', 'pk_lifecycle_secret', session.id);
      clientAuth.registerConnection('pk_lifecycle_secret');

      const revokeResponse = await callAdmin(api, token, 'POST', `/admin/client/keys/${keyId}/status`, {
        status: 'revoked',
      });
      expect(revokeResponse.status).toBe(200);
      expect(revokeResponse.data).toMatchObject({ success: true, status: 'revoked', closedSessions: 1 });
      expect(sessions.get(session.id)).toBeUndefined();
      expect(pool.size).toBe(0);
      expect(closeConnection).toHaveBeenCalledWith('conn_lifecycle', 1008, 'API key revoked');

      const revokedAuth = await clientAuth.authenticate({
        url: '/connect?apiKey=pk_lifecycle_secret',
        headers: { host: 'localhost' },
      });
      expect(revokedAuth.authenticated).toBe(false);
    } finally {
      adminAuth.stop();
    }
  });

  it('masks virtual line keys and force-releases lines by keyId', async () => {
    const { api, token, adminAuth } = await createFixture();
    const lines = new VirtualLineManager([{ apiKey: 'pk_line_secret', count: 1, ttlMs: 60_000 }]);
    api.setVirtualLines(lines);
    try {
      const initial = await callAdmin(api, token, 'GET', '/admin/lines');
      expect(initial.status).toBe(200);
      expect(initial.data.pools[0]).toMatchObject({
        apiKey: 'pk_***ret',
        total: 1,
        available: 1,
      });
      expect(initial.data.pools[0].keyId).toMatch(/^key_/);
      expect(JSON.stringify(initial.data)).not.toContain('pk_line_secret');

      const keyId = initial.data.pools[0].keyId;
      const acquire = await callAdmin(api, token, 'POST', '/admin/lines/acquire', { keyRef: keyId });
      expect(acquire.status).toBe(200);
      expect(acquire.data.success).toBe(true);

      const busy = await callAdmin(api, token, 'GET', '/admin/lines');
      expect(busy.data.pools[0].lines[0].state).toBe('busy');

      const released = await callAdmin(api, token, 'POST', '/admin/lines/force-release', {
        keyRef: keyId,
        lineId: 'line_001',
      });
      expect(released.status).toBe(200);
      expect(released.data).toMatchObject({ success: true, lineId: 'line_001' });

      const afterRelease = await callAdmin(api, token, 'GET', '/admin/lines');
      expect(afterRelease.data.pools[0].lines[0].state).toBe('available');
    } finally {
      lines.stop();
      adminAuth.stop();
    }
  });
});
