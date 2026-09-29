import { describe, it, expect, vi } from 'vitest';
import { OwlLayerServer } from '../src/core/OwlLayerServer.js';

function createSession() {
  return {
    id: 'sess_err',
    connId: 'conn_err',
    apiKey: 'pk_test',
    context: { url: '/', data: {} },
    toolRegistry: { getDeclarations: () => [] },
    graph: { recordToolCall: vi.fn(), recordTokens: vi.fn(), recordContextChange: vi.fn() },
    conversation: { addUserMessage: vi.fn(), addAssistantMessage: vi.fn(), getMessages: () => [] },
  } as any;
}

function createServer(live: unknown) {
  const llm = {
    name: 'mock-llm',
    chat: vi.fn().mockResolvedValue({ text: 'ok' }),
    handleToolResult: vi.fn().mockResolvedValue({ text: '' }),
  };
  const server = new OwlLayerServer({ llm, live } as any);
  const send = vi.fn().mockReturnValue(true);
  (server as any).transport = { send };
  return { server, send };
}

describe('OwlLayerServer live session errors', () => {
  it('closes the live session it drops on onError, exactly once', async () => {
    const liveSession = { isActive: true, close: vi.fn(), updateTools: vi.fn() };
    let reportError!: (error: Error) => void;
    const live = {
      name: 'mock-live',
      createSession: vi.fn(async (config: { onError: (error: Error) => void }) => {
        reportError = config.onError;
        return liveSession;
      }),
    };
    const { server, send } = createServer(live);
    const session = createSession();

    await (server as any).getOrCreateLiveSession(session);
    reportError(new Error('provider failure'));

    expect(liveSession.close).toHaveBeenCalledTimes(1);
    expect((server as any).liveSessions.has(session.id)).toBe(false);
    expect(send).toHaveBeenCalledWith(session.connId, expect.objectContaining({ payload: expect.objectContaining({ message: 'Audio session error' }) }));
  });

  it('does not throw when the error is reported while the session is still being created', async () => {
    const live = {
      name: 'mock-live',
      createSession: vi.fn(async (config: { onError: (error: Error) => void }) => {
        config.onError(new Error('handshake failure'));
        throw new Error('handshake failure');
      }),
    };
    const { server } = createServer(live);

    await expect((server as any).getOrCreateLiveSession(createSession())).rejects.toThrow('handshake failure');
  });
});
