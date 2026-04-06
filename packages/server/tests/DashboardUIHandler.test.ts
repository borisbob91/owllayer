import { describe, expect, it } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'http';
import { DashboardUIHandler } from '../src/admin/DashboardUIHandler.js';

type MockResponse = {
  statusCode: number;
  headers: Record<string, string>;
  body: Buffer;
  writeHead: (statusCode: number, headers?: Record<string, string>) => MockResponse;
  end: (chunk?: string | Buffer) => void;
};

function createMockResponse(): MockResponse {
  return {
    statusCode: 0,
    headers: {},
    body: Buffer.alloc(0),
    writeHead(statusCode: number, headers: Record<string, string> = {}) {
      this.statusCode = statusCode;
      this.headers = headers;
      return this;
    },
    end(chunk?: string | Buffer) {
      if (!chunk) {
        this.body = Buffer.alloc(0);
        return;
      }

      this.body = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
    },
  };
}

describe('DashboardUIHandler', () => {
  it('sert le bundle dashboard depuis @domos/ui quand le package est installé', () => {
    const handler = new DashboardUIHandler({ path: '/domos-ui' });
    const req = { url: '/domos-ui/bundle.js' } as IncomingMessage;
    const res = createMockResponse();

    const handled = handler.handleRequest(req, res as unknown as ServerResponse);

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toContain('application/javascript');
    expect(res.body.length).toBeGreaterThan(0);
  });
});