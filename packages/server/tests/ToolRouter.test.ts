import { describe, it, expect, vi } from 'vitest';
import { ToolRouter } from '../src/core/ToolRouter.js';

function createSession(connId: string, sessionId: string) {
  return {
    connId,
    id: sessionId,
  } as any;
}

describe('ToolRouter', () => {
  it('cancelByConnection rejette les tool calls en attente de la connexion', async () => {
    const sendToClient = vi.fn().mockReturnValue(true);
    const router = new ToolRouter(sendToClient, 10_000);
    const session = createSession('conn_1', 'sess_1');

    const promise = router.route(session, 'client_tool', { foo: 'bar' });

    expect(router.pendingCount).toBe(1);

    router.cancelByConnection('conn_1');

    await expect(promise).rejects.toThrow('annule');
    expect(router.pendingCount).toBe(0);
  });

  it('cancelAll rejette tous les tool calls en attente', async () => {
    const sendToClient = vi.fn().mockReturnValue(true);
    const router = new ToolRouter(sendToClient, 10_000);
    const s1 = createSession('conn_1', 'sess_1');
    const s2 = createSession('conn_2', 'sess_2');

    const p1 = router.route(s1, 'client_tool_1', {});
    const p2 = router.route(s2, 'client_tool_2', {});

    expect(router.pendingCount).toBe(2);

    router.cancelAll();

    await expect(p1).rejects.toThrow('annule');
    await expect(p2).rejects.toThrow('annule');
    expect(router.pendingCount).toBe(0);
  });
});
