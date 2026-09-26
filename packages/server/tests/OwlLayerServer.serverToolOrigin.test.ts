import { describe, it, expect, vi } from 'vitest';
import { OwlLayerServer } from '../src/core/OwlLayerServer.js';
import type { LLMAdapter } from '../src/llm/types.js';

function setup({ liveActive }: { liveActive: boolean }) {
  const llm: LLMAdapter = {
    name: 'mock-llm',
    chat: vi.fn().mockResolvedValue({ text: '' }),
    handleToolResult: vi.fn().mockResolvedValue({ text: 'Remboursement effectue.' }),
  };
  const server = new OwlLayerServer({ llm });
  const handler = vi.fn().mockResolvedValue({ refunded: true });
  server.tool('refund_order', { description: 'Rembourser une commande', risk: 'high' }, handler);

  const send = vi.fn().mockReturnValue(true);
  (server as any).transport = { send };

  const session = {
    id: 'sess_1',
    connId: 'conn_1',
    graph: { recordToolCall: vi.fn(), recordTokens: vi.fn() },
    toolRegistry: { get: vi.fn(() => undefined), getDeclarations: () => [] },
    conversation: { addAssistantMessage: vi.fn() },
  } as any;
  (server as any).sessions.get = vi.fn(() => session);

  const liveSession = { isActive: liveActive, sendToolResponse: vi.fn().mockResolvedValue(undefined) };
  (server as any).liveSessions.set(session.id, liveSession);

  const agentTexts = () =>
    send.mock.calls.map(([, m]) => m).filter((m) => m.type === 'AGENT_RESPONSE').map((m) => m.payload.chunk);

  return { server, llm, handler, session, liveSession, agentTexts };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('OwlLayerServer — reponse d un tool serveur approuve, selon l origine de l appel', () => {
  it('appel du LLM texte avec une session vocale active : le resultat revient au LLM texte, pas au fournisseur vocal', async () => {
    const { server, llm, handler, session, liveSession, agentTexts } = setup({ liveActive: true });

    await (server as any).processLLMResponse(session, {
      toolCalls: [{ callId: 'call_text_1', name: 'refund_order', args: { orderId: 'o_1' } }],
    });
    // L'identifiant call_text_1 est inconnu du fournisseur vocal
    expect(liveSession.sendToolResponse).not.toHaveBeenCalled();

    (server as any).handleApprovalResponse(session, { callId: 'call_text_1', approved: true });
    await flush();

    expect(handler).toHaveBeenCalledWith({ orderId: 'o_1' });
    expect(liveSession.sendToolResponse).not.toHaveBeenCalled();
    expect(llm.handleToolResult).toHaveBeenCalledWith('call_text_1', { refunded: true }, expect.any(Array));
    expect(agentTexts()).toEqual(['Remboursement effectue.']);
  });

  it('appel du LLM texte refuse avec une session vocale active : l erreur revient au LLM texte', async () => {
    const { server, llm, session, liveSession } = setup({ liveActive: true });

    await (server as any).processLLMResponse(session, {
      toolCalls: [{ callId: 'call_text_2', name: 'refund_order', args: {} }],
    });
    (server as any).handleApprovalResponse(session, { callId: 'call_text_2', approved: false });
    await flush();

    expect(liveSession.sendToolResponse).not.toHaveBeenCalled();
    expect(llm.handleToolResult).toHaveBeenCalledWith(
      'call_text_2',
      { error: 'Action denied by user' },
      expect.any(Array)
    );
  });

  it('appel du fournisseur vocal : le resultat revient au fournisseur vocal avec son identifiant', async () => {
    const { server, llm, session, liveSession } = setup({ liveActive: true });

    await (server as any).handleLiveToolCall(session, liveSession, {
      callId: 'provider_call_1',
      name: 'refund_order',
      args: { orderId: 'o_2' },
    });
    (server as any).handleApprovalResponse(session, { callId: 'provider_call_1', approved: true });
    await flush();

    expect(liveSession.sendToolResponse).toHaveBeenLastCalledWith('provider_call_1', 'refund_order', { refunded: true });
    expect(llm.handleToolResult).not.toHaveBeenCalled();
  });

  it('appel du fournisseur vocal, session vocale fermee avant l approbation : rien n est envoye au LLM texte', async () => {
    const { server, llm, handler, session, liveSession, agentTexts } = setup({ liveActive: true });

    await (server as any).handleLiveToolCall(session, liveSession, {
      callId: 'provider_call_2',
      name: 'refund_order',
      args: {},
    });
    liveSession.isActive = false;
    (server as any).handleApprovalResponse(session, { callId: 'provider_call_2', approved: true });
    await flush();

    // L'utilisateur a approuve : l'action est executee, mais personne n'attend la reponse
    expect(handler).toHaveBeenCalled();
    expect(llm.handleToolResult).not.toHaveBeenCalled();
    expect(agentTexts()).toEqual([]);
  });

  it('appel du LLM texte sans session vocale : le resultat revient au LLM texte (inchange)', async () => {
    const { server, llm, session } = setup({ liveActive: false });

    await (server as any).processLLMResponse(session, {
      toolCalls: [{ callId: 'call_text_3', name: 'refund_order', args: {} }],
    });
    (server as any).handleApprovalResponse(session, { callId: 'call_text_3', approved: true });
    await flush();

    expect(llm.handleToolResult).toHaveBeenCalledWith('call_text_3', { refunded: true }, expect.any(Array));
  });
});
