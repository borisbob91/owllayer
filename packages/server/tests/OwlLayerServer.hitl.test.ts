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
  it('priorise live pour pending_approval et ne touche pas au LLM texte', async () => {
    const llm = createMockLlm();
    const server = new OwlLayerServer({ llm });

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

    expect(liveSession.sendToolResponse).toHaveBeenCalledTimes(1);
    expect(liveSession.sendToolResponse).toHaveBeenCalledWith('call_1', 'refund_payment', {
      status: 'pending_approval',
      message: 'Approval required',
      args: { orderId: 'o_1' },
    });
    expect(llm.handleToolResult).not.toHaveBeenCalled();
  });

  it('priorise live pour approval_required (system_event) dans processLLMResponse', async () => {
    const llm = createMockLlm();
    const server = new OwlLayerServer({ llm });

    (server as any).transport = { send: vi.fn().mockReturnValue(true) };
    (server as any).security = {
      check: vi.fn().mockReturnValue({
        allowed: 'pending_approval',
        approvalMessage: 'Approval required',
      }),
    };

    const session = {
      id: 'sess_2',
      connId: 'conn_2',
      graph: { recordToolCall: vi.fn() },
      conversation: { addAssistantMessage: vi.fn() },
    } as any;

    const liveSession = {
      isActive: true,
      sendToolResponse: vi.fn().mockResolvedValue(undefined),
    };

    (server as any).liveSessions.set(session.id, liveSession);

    await (server as any).processLLMResponse(session, {
      toolCalls: [{ callId: 'call_2', name: 'delete_account', args: { userId: 'u_1' } }],
    });

    expect(liveSession.sendToolResponse).toHaveBeenCalledTimes(1);
    expect(llm.handleToolResult).not.toHaveBeenCalled();
    expect((server as any).transport.send).toHaveBeenCalled();
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
