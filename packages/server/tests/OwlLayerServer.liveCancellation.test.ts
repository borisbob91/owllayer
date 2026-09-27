import { describe, it, expect, vi } from 'vitest';
import { OwlLayerServer } from '../src/core/OwlLayerServer.js';
import type { LLMAdapter, LiveAdapter, LiveSession, LiveSessionConfig } from '../src/llm/types.js';
import type { ChatMessage } from '@owllayer/core';

function createMockLlm(): LLMAdapter {
  return {
    name: 'mock-llm',
    chat: vi.fn().mockResolvedValue({ text: '' }),
    handleToolResult: vi.fn().mockResolvedValue({ text: '' }),
  };
}

describe('OwlLayerServer live tool-call cancellation', () => {
  it('onToolCallCancelled withdraws a pending server approval and prevents sendToolResponse (S8)', async () => {
    const llm = createMockLlm();
    const server = new OwlLayerServer({ llm });

    const handler = vi.fn().mockResolvedValue({ ok: true });
    server.tool('refund_payment', { description: 'Refund a payment.', risk: 'high' }, handler);

    (server as any).transport = { send: vi.fn().mockReturnValue(true) };
    (server as any).security = {
      check: vi.fn().mockReturnValue({ allowed: 'pending_approval', approvalMessage: 'Approval required' }),
    };

    const session = {
      id: 'sess_cancel_1',
      connId: 'conn_cancel_1',
      graph: { recordToolCall: vi.fn() },
      conversation: { addAssistantMessage: vi.fn() },
    } as any;

    const liveSession = {
      isActive: true,
      sendToolResponse: vi.fn().mockResolvedValue(undefined),
    };
    (server as any).liveSessions.set(session.id, liveSession);

    await (server as any).handleLiveToolCall(session, liveSession, {
      callId: 'call_cancel_1',
      name: 'refund_payment',
      args: { orderId: 'o_1' },
    });

    expect((server as any).pendingServerApprovals.has('call_cancel_1')).toBe(true);
    // Notification "en attente d'approbation" envoyee au provider — comportement existant,
    // distinct de la reponse finale qui doit etre bloquee par l'annulation.
    expect(liveSession.sendToolResponse).toHaveBeenCalledTimes(1);
    const callsBeforeCancellation = liveSession.sendToolResponse.mock.calls.length;

    // Le provider live annule cet appel pendant l'attente d'approbation.
    (server as any).cancelLiveToolCalls(session.id, ['call_cancel_1']);

    expect((server as any).pendingServerApprovals.has('call_cancel_1')).toBe(false);

    // Une reponse d'approbation tardive (l'utilisateur clique quand meme) ne doit rien declencher.
    (server as any).handleApprovalResponse(session, {
      callId: 'call_cancel_1',
      approved: true,
      result: { refunded: true },
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(handler).not.toHaveBeenCalled();
    expect(liveSession.sendToolResponse).toHaveBeenCalledTimes(callsBeforeCancellation);
    expect(llm.handleToolResult).not.toHaveBeenCalled();
  });

  it('drops the result of an approved server tool when the call is cancelled while the tool runs (S8)', async () => {
    const llm = createMockLlm();
    const server = new OwlLayerServer({ llm });

    let finishTool!: (value: unknown) => void;
    const handler = vi.fn(() => new Promise((resolve) => { finishTool = resolve; }));
    server.tool('refund_payment', { description: 'Refund a payment.', risk: 'high' }, handler);

    (server as any).transport = { send: vi.fn().mockReturnValue(true) };
    (server as any).security = {
      check: vi.fn().mockReturnValue({ allowed: 'pending_approval', approvalMessage: 'Approval required' }),
    };
    const session = {
      id: 'sess_cancel_run',
      connId: 'conn_cancel_run',
      graph: { recordToolCall: vi.fn() },
      conversation: { addAssistantMessage: vi.fn() },
    } as any;
    const liveSession = { isActive: true, sendToolResponse: vi.fn().mockResolvedValue(undefined) };
    (server as any).liveSessions.set(session.id, liveSession);

    await (server as any).handleLiveToolCall(session, liveSession, {
      callId: 'call_run_1',
      name: 'refund_payment',
      args: { orderId: 'o_2' },
    });
    const callsBeforeApproval = liveSession.sendToolResponse.mock.calls.length;

    (server as any).handleApprovalResponse(session, { callId: 'call_run_1', approved: true });
    await new Promise((r) => setTimeout(r, 0));
    expect(handler).toHaveBeenCalledTimes(1);

    (server as any).cancelLiveToolCalls(session.id, ['call_run_1']);
    finishTool({ refunded: true });
    await new Promise((r) => setTimeout(r, 0));

    expect(liveSession.sendToolResponse).toHaveBeenCalledTimes(callsBeforeApproval);
    expect(llm.handleToolResult).not.toHaveBeenCalled();
  });

  it('drops a late TOOL_RESULT for a client-side tool cancelled while awaiting the client (S8)', async () => {
    const llm = createMockLlm();
    const server = new OwlLayerServer({ llm });

    const send = vi.fn().mockReturnValue(true);
    (server as any).transport = { send };
    // Tool low-risk : execution immediate, routee au client (pas d'approbation serveur).
    (server as any).security = { check: vi.fn().mockReturnValue({ allowed: true }) };

    const session = {
      id: 'sess_cancel_2',
      connId: 'conn_cancel_2',
      graph: { recordToolCall: vi.fn() },
      toolRegistry: { get: vi.fn(() => ({ name: 'confirm_checkout', risk: 'low' })) },
      conversation: { addAssistantMessage: vi.fn() },
    } as any;

    const liveSession = {
      isActive: true,
      sendToolResponse: vi.fn().mockResolvedValue(undefined),
    };
    (server as any).liveSessions.set(session.id, liveSession);

    const done = (server as any).handleLiveToolCall(session, liveSession, {
      callId: 'provider_call_cancel',
      name: 'confirm_checkout',
      args: { total: 42 },
    });

    const toolCallMsg = send.mock.calls.map(([, msg]) => msg).find((msg) => msg.type === 'TOOL_CALL');
    expect(toolCallMsg).toBeDefined();
    const routerCallId = toolCallMsg.payload.callId;

    // Le provider annule l'appel (barge-in / interruption) alors que le client n'a pas encore repondu.
    (server as any).cancelLiveToolCalls(session.id, ['provider_call_cancel']);

    // TOOL_RESULT tardif du client, apres l'annulation.
    (server as any).toolRouter.handleToolResult({
      callId: routerCallId,
      result: { ordered: true },
      status: 'success',
    });

    await done;

    expect(liveSession.sendToolResponse).not.toHaveBeenCalled();
  });

  it('refuses a tool call for a tool unmounted after navigation, without waiting for the client (S9)', async () => {
    const llm = createMockLlm();
    const server = new OwlLayerServer({ llm });

    (server as any).transport = { send: vi.fn().mockReturnValue(true) };

    const session = {
      id: 'sess_unmounted',
      connId: 'conn_unmounted',
      graph: { recordToolCall: vi.fn() },
      // Le composant qui declarait ce tool a ete demonte : plus dans le registre de la session.
      toolRegistry: { get: vi.fn(() => undefined) },
      conversation: { addAssistantMessage: vi.fn() },
    } as any;

    const liveSession = {
      isActive: true,
      sendToolResponse: vi.fn().mockResolvedValue(undefined),
    };
    (server as any).liveSessions.set(session.id, liveSession);

    await (server as any).handleLiveToolCall(session, liveSession, {
      callId: 'call_unmounted',
      name: 'no_longer_mounted_tool',
      args: {},
    });

    expect(liveSession.sendToolResponse).toHaveBeenCalledTimes(1);
    const [callId, name, result] = liveSession.sendToolResponse.mock.calls[0]!;
    expect(callId).toBe('call_unmounted');
    expect(name).toBe('no_longer_mounted_tool');
    expect(result).toMatchObject({ error: expect.stringContaining('not available') });
  });

  it('passes conversationHistory on creation and on re-creation of a live session (S10)', async () => {
    const llm = createMockLlm();

    const createSession = vi.fn(async (config: LiveSessionConfig): Promise<LiveSession> => ({
      sendAudio: vi.fn(),
      sendText: vi.fn(),
      sendToolResponse: vi.fn(),
      close: vi.fn(),
      isActive: true,
    }));
    const fakeLive: LiveAdapter = {
      name: 'fake-live',
      createSession,
    };

    const server = new OwlLayerServer({ llm, live: fakeLive });
    (server as any).transport = { send: vi.fn().mockReturnValue(true) };

    let history: ChatMessage[] = [{ role: 'user', content: 'first turn' }];
    const session = {
      id: 'sess_history',
      connId: 'conn_history',
      apiKey: undefined,
      context: {},
      graph: { recordToolCall: vi.fn() },
      toolRegistry: { getDeclarations: vi.fn(() => []) },
      conversation: { getMessages: vi.fn(() => history) },
    } as any;

    await (server as any).getOrCreateLiveSession(session);

    expect(createSession).toHaveBeenCalledTimes(1);
    expect(createSession.mock.calls[0]![0]).toMatchObject({
      conversationHistory: [{ role: 'user', content: 'first turn' }],
    });

    // La connexion tombe (ex. le provider a coupe) : la session live est retiree.
    (server as any).liveSessions.delete(session.id);

    // Nouvel historique au moment de la reconnexion.
    history = [
      { role: 'user', content: 'first turn' },
      { role: 'assistant', content: 'first reply' },
      { role: 'user', content: 'second turn' },
    ];

    await (server as any).getOrCreateLiveSession(session);

    expect(createSession).toHaveBeenCalledTimes(2);
    expect(createSession.mock.calls[1]![0]).toMatchObject({
      conversationHistory: history,
    });
  });

  it('cleans up cancelledToolCallIds when the connection closes', async () => {
    const llm = createMockLlm();
    const server = new OwlLayerServer({ llm });

    (server as any).cancelLiveToolCalls('sess_cleanup', ['call_x']);
    expect((server as any).cancelledToolCallIds.get('sess_cleanup')?.has('call_x')).toBe(true);

    (server as any).clientAuth = { releaseConnection: vi.fn() };
    (server as any).sessions = {
      getByConnection: vi.fn(() => ({ id: 'sess_cleanup', apiKey: undefined })),
      destroyByConnection: vi.fn().mockResolvedValue(undefined),
      touch: vi.fn(),
    };
    (server as any).pool = { unregister: vi.fn(), recordActivity: vi.fn() };

    await (server as any).handleClose('conn_cleanup');

    expect((server as any).cancelledToolCallIds.has('sess_cleanup')).toBe(false);
  });
});
