import { describe, it, expect, vi } from 'vitest';
import { DomOSServer } from '../src/core/DomOSServer.js';
import type { LLMAdapter } from '../src/llm/types.js';
import type { ApprovalRequestPayload } from '@domos/core';

function createMockLlm(): LLMAdapter {
  return {
    name: 'mock-llm',
    chat: vi.fn().mockResolvedValue({ text: '' }),
    handleToolResult: vi.fn().mockResolvedValue({ text: '' }),
  };
}

describe('DomOSServer HITL', () => {
  it('priorise live pour pending_approval et ne touche pas au LLM texte', async () => {
    const llm = createMockLlm();
    const server = new DomOSServer({ llm });

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
    const server = new DomOSServer({ llm });

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
    const server = new DomOSServer({ llm });

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
    const server = new DomOSServer({ llm });

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
});
