import { describe, it, expect, vi } from 'vitest';
import { OwlLayerServer } from '../src/core/OwlLayerServer.js';
import type { LLMAdapter } from '../src/llm/types.js';

function makeSession(id: string, connId: string, apiKey = 'pk_a') {
  return {
    id,
    connId,
    apiKey,
    graph: { recordToolCall: vi.fn(), recordTokens: vi.fn() },
    toolRegistry: { get: vi.fn(() => undefined), getDeclarations: () => [] },
    conversation: { addAssistantMessage: vi.fn() },
  } as any;
}

function setup() {
  const llm: LLMAdapter = {
    name: 'mock-llm',
    chat: vi.fn().mockResolvedValue({ text: '' }),
    handleToolResult: vi.fn().mockResolvedValue({ text: 'ok' }),
  };
  const server = new OwlLayerServer({ llm });
  const handler = vi.fn().mockResolvedValue({ refunded: true });
  server.tool('refund_order', { description: 'Rembourser une commande', risk: 'high' }, handler);
  (server as any).transport = { send: vi.fn().mockReturnValue(true) };

  const victim = makeSession('sess_victim', 'conn_victim', 'pk_shop');
  const attacker = makeSession('sess_attacker', 'conn_attacker', 'pk_other');
  const byId: Record<string, any> = { [victim.id]: victim, [attacker.id]: attacker };
  (server as any).sessions.get = vi.fn((id: string) => byId[id]);

  return { server, handler, victim, attacker };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('OwlLayerServer — isolation des approbations et des resultats entre sessions', () => {
  it('ignore l approbation d un tool serveur envoyee par une autre session', async () => {
    const { server, handler, victim, attacker } = setup();
    await (server as any).processLLMResponse(victim, {
      toolCalls: [{ callId: 'call_refund', name: 'refund_order', args: { orderId: 'o_1' } }],
    });

    (server as any).handleApprovalResponse(attacker, { callId: 'call_refund', approved: true });
    await flush();

    expect(handler).not.toHaveBeenCalled();
    // La demande reste en attente pour la bonne session
    expect((server as any).pendingServerApprovals.has('call_refund')).toBe(true);

    (server as any).handleApprovalResponse(victim, { callId: 'call_refund', approved: true });
    await flush();
    expect(handler).toHaveBeenCalledWith({ orderId: 'o_1' });
  });

  it('ignore un TOOL_RESULT envoye par une autre connexion', async () => {
    const { server, victim } = setup();
    const router = (server as any).toolRouter;
    const pending = router.route(victim, 'fill_form', { email: 'a@b.c' });
    const callId = [...router.pendingCalls.keys()][0];

    router.handleToolResult({ callId, status: 'success', result: { forged: true } }, 'conn_attacker');
    expect(router.pendingCount).toBe(1);

    router.handleToolResult({ callId, status: 'success', result: { ok: true } }, 'conn_victim');
    await expect(pending).resolves.toMatchObject({ result: { ok: true } });
  });

  it('genere des identifiants d appel non devinables (UUID complet)', () => {
    const { server, victim } = setup();
    const router = (server as any).toolRouter;
    void router.route(victim, 'fill_form', {}).catch(() => {});
    const callId = [...router.pendingCalls.keys()][0];

    expect(callId).toMatch(/^call_[0-9a-f-]{36}$/);
    router.cancelAll();
  });

  it('purge les approbations en attente a la fermeture de la session', async () => {
    const { server, victim } = setup();
    await (server as any).processLLMResponse(victim, {
      toolCalls: [{ callId: 'call_refund', name: 'refund_order', args: {} }],
    });
    (server as any).sessions.getByConnection = vi.fn(() => victim);
    (server as any).sessions.destroyByConnection = vi.fn().mockResolvedValue(undefined);

    await (server as any).handleClose('conn_victim');

    expect((server as any).pendingServerApprovals.size).toBe(0);
  });
});
