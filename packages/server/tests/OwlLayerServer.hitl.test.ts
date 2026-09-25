import { describe, it, expect, vi } from 'vitest';
import { OwlLayerServer } from '../src/core/OwlLayerServer.js';
import type { LLMAdapter } from '../src/llm/types.js';
import type { ApprovalRequestPayload } from '@owllayer/core';

function createMockLlm(): LLMAdapter {
  return {
    name: 'mock-llm',
    chat: vi.fn().mockResolvedValue({ text: '' }),
    handleToolResult: vi.fn().mockResolvedValue({ text: '' }),
  };
}

describe('OwlLayerServer HITL', () => {
  it('APPROVAL_REQUEST client : prolonge le timeout sans notifier la LiveSession ni le LLM texte', async () => {
    const llm = createMockLlm();
    const server = new OwlLayerServer({ llm });
    const extendSpy = vi.spyOn((server as any).toolRouter, 'extendTimeoutForApproval');

    const session = {
      id: 'sess_1',
      connId: 'conn_1',
      conversation: { addAssistantMessage: vi.fn() },
    } as any;

    const liveSession = {
      isActive: true,
      sendToolResponse: vi.fn().mockResolvedValue(undefined),
    };

    (server as any).liveSessions.set(session.id, liveSession);

    const payload: ApprovalRequestPayload = {
      callId: 'call_1',
      toolName: 'refund_payment',
      risk: 'high',
      args: { orderId: 'o_1' },
      message: 'Approval required',
    };

    await (server as any).handleApprovalRequest(session, payload);

    expect(extendSpy).toHaveBeenCalledWith('call_1', 120_000);
    // call_1 est l'ID interne du ToolRouter, inconnu du provider live
    expect(liveSession.sendToolResponse).not.toHaveBeenCalled();
    expect(llm.handleToolResult).not.toHaveBeenCalled();
  });

  it('tool client high/critical en texte avec LiveSession active : TOOL_CALL envoye au client, execute apres approbation', async () => {
    const llm = createMockLlm();
    (llm.handleToolResult as any).mockResolvedValue({ text: 'Commande confirmee' });
    const server = new OwlLayerServer({ llm });

    const send = vi.fn().mockReturnValue(true);
    (server as any).transport = { send };
    (server as any).security = {
      check: vi.fn().mockReturnValue({
        allowed: 'pending_approval',
        approvalMessage: 'Approval required',
      }),
    };

    const session = {
      id: 'sess_2',
      connId: 'conn_2',
      graph: { recordToolCall: vi.fn(), recordTokens: vi.fn() },
      conversation: { addAssistantMessage: vi.fn() },
    } as any;

    const liveSession = {
      isActive: true,
      sendToolResponse: vi.fn().mockResolvedValue(undefined),
    };

    (server as any).liveSessions.set(session.id, liveSession);

    const done = (server as any).processLLMResponse(session, {
      toolCalls: [{ callId: 'call_2', name: 'delete_account', args: { userId: 'u_1' } }],
    });

    const toolCallMsg = send.mock.calls
      .map(([, msg]) => msg)
      .find((msg) => msg.type === 'TOOL_CALL');
    expect(toolCallMsg).toBeDefined();
    expect(toolCallMsg.payload).toMatchObject({ name: 'delete_account', args: { userId: 'u_1' } });
    expect(send.mock.calls.some(([, msg]) => msg.payload?.kind === 'approval_required')).toBe(false);

    // Le client affiche la modale, l'utilisateur approuve, le client execute le handler
    const routerCallId = toolCallMsg.payload.callId;
    await (server as any).handleApprovalRequest(session, {
      callId: routerCallId,
      toolName: 'delete_account',
      risk: 'critical',
      args: { userId: 'u_1' },
      message: 'Approval required',
    });
    (server as any).handleApprovalResponse(session, {
      callId: routerCallId,
      approved: true,
      result: { deleted: true },
    });

    await done;

    expect(llm.handleToolResult).toHaveBeenCalledWith(
      'call_2',
      expect.objectContaining({ status: 'success', result: { deleted: true } }),
      expect.any(Array)
    );
    expect(liveSession.sendToolResponse).not.toHaveBeenCalled();
  });

  it('tool client refuse en texte avec LiveSession active : erreur renvoyee au LLM', async () => {
    const llm = createMockLlm();
    const server = new OwlLayerServer({ llm });

    const send = vi.fn().mockReturnValue(true);
    (server as any).transport = { send };
    (server as any).security = {
      check: vi.fn().mockReturnValue({
        allowed: 'pending_approval',
        approvalMessage: 'Approval required',
      }),
    };

    const session = {
      id: 'sess_2b',
      connId: 'conn_2b',
      graph: { recordToolCall: vi.fn(), recordTokens: vi.fn() },
      conversation: { addAssistantMessage: vi.fn() },
    } as any;

    (server as any).liveSessions.set(session.id, {
      isActive: true,
      sendToolResponse: vi.fn().mockResolvedValue(undefined),
    });

    const done = (server as any).processLLMResponse(session, {
      toolCalls: [{ callId: 'call_2b', name: 'delete_account', args: { userId: 'u_1' } }],
    });

    const toolCallMsg = send.mock.calls
      .map(([, msg]) => msg)
      .find((msg) => msg.type === 'TOOL_CALL');
    (server as any).handleApprovalResponse(session, {
      callId: toolCallMsg.payload.callId,
      approved: false,
    });

    await done;

    expect(llm.handleToolResult).toHaveBeenCalledWith(
      'call_2b',
      expect.objectContaining({ status: 'error', error: 'Action denied by user' }),
      expect.any(Array)
    );
  });

  it('tool client live : une seule reponse a la LiveSession, avec l ID du provider', async () => {
    const llm = createMockLlm();
    const server = new OwlLayerServer({ llm });

    const send = vi.fn().mockReturnValue(true);
    (server as any).transport = { send };

    const session = {
      id: 'sess_live_client',
      connId: 'conn_live_client',
      graph: { recordToolCall: vi.fn() },
      toolRegistry: { get: vi.fn(() => ({ name: 'confirm_checkout', risk: 'critical' })) },
      conversation: { addAssistantMessage: vi.fn() },
    } as any;

    const liveSession = {
      isActive: true,
      sendToolResponse: vi.fn().mockResolvedValue(undefined),
    };

    (server as any).liveSessions.set(session.id, liveSession);

    const done = (server as any).handleLiveToolCall(session, liveSession, {
      callId: 'provider_call_1',
      name: 'confirm_checkout',
      args: { total: 42 },
    });

    const toolCallMsg = send.mock.calls
      .map(([, msg]) => msg)
      .find((msg) => msg.type === 'TOOL_CALL');
    expect(toolCallMsg).toBeDefined();
    const routerCallId = toolCallMsg.payload.callId;

    await (server as any).handleApprovalRequest(session, {
      callId: routerCallId,
      toolName: 'confirm_checkout',
      risk: 'critical',
      args: { total: 42 },
      message: 'Approval required',
    });
    expect(liveSession.sendToolResponse).not.toHaveBeenCalled();

    (server as any).handleApprovalResponse(session, {
      callId: routerCallId,
      approved: true,
      result: { ordered: true },
    });

    await done;

    expect(liveSession.sendToolResponse).toHaveBeenCalledTimes(1);
    expect(liveSession.sendToolResponse).toHaveBeenCalledWith(
      'provider_call_1',
      'confirm_checkout',
      expect.objectContaining({ status: 'success', result: { ordered: true } })
    );
  });

  it('reprend un tool server-side apres approbation et notifie le LLM', async () => {
    const llm = createMockLlm();
    (llm.handleToolResult as any).mockResolvedValue({ text: '' });
    const server = new OwlLayerServer({ llm });

    const handler = vi.fn().mockResolvedValue({ ok: true });
    server.tool('server_tool', handler);

    (server as any).transport = { send: vi.fn().mockReturnValue(true) };
    (server as any).security = {
      check: vi.fn().mockReturnValue({
        allowed: 'pending_approval',
        approvalMessage: 'Approval required',
      }),
    };

    const session = {
      id: 'sess_3',
      connId: 'conn_3',
      conversation: { addAssistantMessage: vi.fn() },
    } as any;

    await (server as any).processLLMResponse(session, {
      toolCalls: [{ callId: 'call_3', name: 'server_tool', args: { x: 1 } }],
    });

    expect(handler).not.toHaveBeenCalled();

    (server as any).handleApprovalResponse(session, {
      callId: 'call_3',
      approved: true,
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(llm.handleToolResult).toHaveBeenCalled();
  });

  it('refus server-side -> erreur renvoyee au LLM', async () => {
    const llm = createMockLlm();
    (llm.handleToolResult as any).mockResolvedValue({ text: '' });
    const server = new OwlLayerServer({ llm });

    const handler = vi.fn().mockResolvedValue({ ok: true });
    server.tool('server_tool', handler);

    (server as any).transport = { send: vi.fn().mockReturnValue(true) };
    (server as any).security = {
      check: vi.fn().mockReturnValue({
        allowed: 'pending_approval',
        approvalMessage: 'Approval required',
      }),
    };

    const session = {
      id: 'sess_4',
      connId: 'conn_4',
      conversation: { addAssistantMessage: vi.fn() },
    } as any;

    await (server as any).processLLMResponse(session, {
      toolCalls: [{ callId: 'call_4', name: 'server_tool', args: { x: 2 } }],
    });

    (server as any).handleApprovalResponse(session, {
      callId: 'call_4',
      approved: false,
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(handler).not.toHaveBeenCalled();
    expect(llm.handleToolResult).toHaveBeenCalled();
  });

  it('reprend un tool server-side live apres approbation et repond a la LiveSession', async () => {
    const llm = createMockLlm();
    const server = new OwlLayerServer({ llm });

    const handler = vi.fn().mockResolvedValue({ ok: true });
    server.tool(
      'live_server_tool',
      {
        description: 'Live server tool requiring approval.',
        risk: 'high',
      },
      handler
    );

    (server as any).transport = { send: vi.fn().mockReturnValue(true) };

    const session = {
      id: 'sess_live_server',
      connId: 'conn_live_server',
      graph: { recordToolCall: vi.fn() },
      toolRegistry: { get: vi.fn(() => undefined) },
      conversation: { addAssistantMessage: vi.fn() },
    } as any;

    const liveSession = {
      isActive: true,
      sendToolResponse: vi.fn().mockResolvedValue(undefined),
    };

    (server as any).liveSessions.set(session.id, liveSession);

    await (server as any).handleLiveToolCall(session, liveSession, {
      callId: 'call_live_server',
      name: 'live_server_tool',
      args: { x: 1 },
    });

    expect(handler).not.toHaveBeenCalled();
    expect((server as any).pendingServerApprovals.has('call_live_server')).toBe(true);
    expect((server as any).transport.send).toHaveBeenCalledWith(
      session.connId,
      expect.objectContaining({
        type: 'APPROVAL_REQUEST',
        payload: expect.objectContaining({
          callId: 'call_live_server',
          toolName: 'live_server_tool',
          risk: 'high',
        }),
      })
    );

    (server as any).handleApprovalResponse(session, {
      callId: 'call_live_server',
      approved: true,
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(handler).toHaveBeenCalledWith({ x: 1 });
    expect(liveSession.sendToolResponse).toHaveBeenCalledWith(
      'call_live_server',
      'live_server_tool',
      { ok: true }
    );
    expect(llm.handleToolResult).not.toHaveBeenCalled();
  });
});
