import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { AddressInfo } from 'net';
import { describe, expect, it, vi } from 'vitest';
import { OwlLayerServer } from '../src/core/OwlLayerServer.js';
import { AITPTransport } from '../src/transport/aitp.transport.js';
import { WebRTCTransport } from '../src/transport/WebRTCTransport.js';
import type { LLMAdapter } from '../src/llm/types.js';

function createLLM(): LLMAdapter {
  return {
    name: 'mock-llm',
    chat: vi.fn().mockResolvedValue({ text: 'ok' }),
    handleToolResult: vi.fn().mockResolvedValue({ text: 'ok' }),
  };
}

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

async function request(port: number, path: string): Promise<{ status: number; body: string }> {
  const http = await import('http');
  return new Promise((resolve, reject) => {
    const req = http.get({ port, path }, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk.toString();
      });
      res.on('end', () => {
        resolve({ status: res.statusCode ?? 0, body });
      });
    });
    req.on('error', reject);
  });
}

describe('OwlLayerServer lifecycle and hosting', () => {
  it('wires line HTTP routes when configureLines is called after construction', () => {
    const server = new OwlLayerServer({ llm: createLLM() });
    server.configureLines('pk_dynamic_lines', 1);

    const handler = (server as any).transport.options.httpHandler as (
      req: IncomingMessage,
      res: ServerResponse
    ) => boolean;
    const res = createResponse();
    const handled = handler(
      {
        method: 'POST',
        url: '/lines/acquire?apiKey=pk_dynamic_lines',
        headers: { host: 'localhost' },
      } as IncomingMessage,
      res as unknown as ServerResponse
    );

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({
      success: true,
      waiting: false,
    });
  });

  it('does not write a OwlLayer 404 over routes owned by an embedded HTTP server', async () => {
    const httpServer = createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('ok');
        return;
      }
      res.writeHead(404);
      res.end('missing');
    });

    const transport = new AITPTransport(
      {
        server: httpServer,
        path: '/owllayer',
        httpHandler: () => false,
      },
      {
        onConnection: vi.fn(),
        onMessage: vi.fn(),
        onClose: vi.fn(),
        onError: vi.fn(),
      }
    );

    transport.start();
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));

    try {
      const port = (httpServer.address() as AddressInfo).port;
      await expect(request(port, '/health')).resolves.toEqual({ status: 200, body: 'ok' });
    } finally {
      await transport.stop();
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err?: Error) => (err ? reject(err) : resolve()));
      });
    }
  });

  it('serves embedded HTTP handlers in WebRTC mode', async () => {
    const httpServer = createServer();
    const transport = new WebRTCTransport(
      {
        server: httpServer,
        signalingPath: '/owllayer/rtc',
        httpHandler: (req, res) => {
          if (req.url === '/owllayer-ui/status') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
            return true;
          }
          return false;
        },
      },
      {
        onConnection: vi.fn(),
        onMessage: vi.fn(),
        onClose: vi.fn(),
        onError: vi.fn(),
      }
    );

    transport.start();
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));

    try {
      const port = (httpServer.address() as AddressInfo).port;
      await expect(request(port, '/owllayer-ui/status')).resolves.toEqual({
        status: 200,
        body: JSON.stringify({ ok: true }),
      });
    } finally {
      await transport.stop();
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err?: Error) => (err ? reject(err) : resolve()));
      });
    }
  });

  it('keeps AdminAPI in sync when configureLines is called after construction', async () => {
    const server = new OwlLayerServer({
      llm: createLLM(),
      admin: {
        username: 'admin',
        password: 'admin-password-123456',
      },
    });

    try {
      server.configureLines('pk_admin_lines', 1);
      const token = await (server as any).adminAuth.login(
        'admin',
        'admin-password-123456',
        '127.0.0.10'
      );

      const res = createResponse();
      server.getAdminAPI()!.handleRequest(
        {
          method: 'GET',
          url: '/admin/lines',
          headers: {
            authorization: `Bearer ${token}`,
            host: 'localhost',
          },
          socket: { remoteAddress: '127.0.0.10' },
        } as IncomingMessage,
        res as unknown as ServerResponse
      );

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toMatchObject({
        enabled: true,
        pools: [
          {
            apiKey: 'pk_***nes',
            total: 1,
          },
        ],
      });
    } finally {
      await server.shutdown();
    }
  });

  it('releases client connection slots when virtual line validation rejects the connection', async () => {
    const server = new OwlLayerServer({
      llm: createLLM(),
      client: { requireApiKey: true, maxConnectionsPerKey: 1 },
      virtualLines: { lines: [{ apiKey: 'pk_line', count: 1 }] },
    });
    server.addApiKey('pk_line');

    (server as any).transport = {
      close: vi.fn(),
      send: vi.fn(),
    };

    const req = {
      url: '/owllayer',
      headers: {
        authorization: 'Bearer pk_line',
        host: 'localhost',
      },
    };

    await (server as any).handleConnection('conn_1', req);
    await (server as any).handleConnection('conn_2', req);

    const stats = (server as any).clientAuth.getStats();
    expect(stats.connectionCounts.pk_line).toBe(0);
    expect((server as any).transport.close).toHaveBeenCalledTimes(2);
    expect((server as any).transport.close.mock.calls[0][2]).toMatch(/lineToken (required|requis)/);
    expect((server as any).transport.close.mock.calls[1][2]).toMatch(/lineToken (required|requis)/);
  });

  it('shutdown waits for agent flushes and async transport stop', async () => {
    const server = new OwlLayerServer({ llm: createLLM() });
    const events: string[] = [];
    const agent = {
      flush: vi.fn(async () => {
        await Promise.resolve();
        events.push('agent-flushed');
      }),
    };

    (server as any).sessionAgents.set('sess_1', agent);
    (server as any).transport = {
      stop: vi.fn(async () => {
        events.push('transport-start');
        await Promise.resolve();
        events.push('transport-stopped');
      }),
      send: vi.fn(),
      broadcast: vi.fn(),
      close: vi.fn(),
      isConnected: vi.fn(),
      connectionCount: 0,
    };

    await server.shutdown();

    expect(agent.flush).toHaveBeenCalledTimes(1);
    expect((server as any).transport.stop).toHaveBeenCalledTimes(1);
    expect(events).toEqual(['agent-flushed', 'transport-start', 'transport-stopped']);
  });
});
