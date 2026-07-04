import { describe, expect, it, vi } from 'vitest';
import { RiskLevel, ToolRegistry } from '@domos/core';
import { DomOSServer } from '../src/core/DomOSServer.js';
import type { LLMAdapter } from '../src/llm/types.js';

function createSession() {
  return {
    id: 'sess_server_tool',
    connId: 'conn_server_tool',
    apiKey: 'pk_test',
    context: {
      url: 'https://example.test',
      data: {},
      updatedAt: Date.now(),
    },
    toolRegistry: new ToolRegistry(),
    conversation: {
      addUserMessage: vi.fn(),
      addAssistantMessage: vi.fn(),
      getMessages: vi.fn(() => [{ role: 'user', content: 'ping' }]),
    },
    graph: {
      recordTokens: vi.fn(),
      recordToolCall: vi.fn(),
    },
  };
}

describe('DomOSServer server tools', () => {
  it('expose server.tool declaration to llm.chat and executes locally', async () => {
    const handler = vi.fn().mockResolvedValue({ pong: true });
    const llm: LLMAdapter = {
      name: 'mock-llm',
      chat: vi.fn().mockResolvedValue({
        toolCalls: [{ callId: 'call_x', name: 'x', args: { value: 42 } }],
      }),
      handleToolResult: vi.fn().mockResolvedValue({ text: 'done' }),
    };

    const server = new DomOSServer({ llm });
    server.tool(
      'x',
      {
        description: 'Execute x on the server.',
        parameters: {
          type: 'OBJECT',
          properties: {
            value: { type: 'NUMBER', description: 'Value to echo' },
          },
          required: ['value'],
        },
        risk: 'none',
      },
      handler
    );

    (server as any).transport = { send: vi.fn().mockReturnValue(true) };

    const session = createSession();
    await (server as any).handleTextInput(session, 'ping');

    expect(llm.chat).toHaveBeenCalledTimes(1);
    expect((llm.chat as any).mock.calls[0][0].tools).toContainEqual({
      name: 'x',
      description: 'Execute x on the server.',
      parameters: {
        type: 'OBJECT',
        properties: {
          value: { type: 'NUMBER', description: 'Value to echo' },
        },
        required: ['value'],
      },
      risk: 'none',
    });
    expect(handler).toHaveBeenCalledWith({ value: 42 });
    expect(llm.handleToolResult).toHaveBeenCalledWith('call_x', { pong: true });
  });

  it('applies HITL policy to declared server tool risk', async () => {
    const handler = vi.fn().mockResolvedValue({ deleted: true });
    const llm: LLMAdapter = {
      name: 'mock-llm',
      chat: vi.fn(),
      handleToolResult: vi.fn().mockResolvedValue({ text: '' }),
    };

    const server = new DomOSServer({ llm });
    server.tool(
      'delete_record',
      {
        description: 'Delete a record on the server.',
        parameters: {
          type: 'OBJECT',
          properties: {
            id: { type: 'STRING', description: 'Record id' },
          },
          required: ['id'],
        },
        risk: 'high',
      },
      handler
    );

    (server as any).transport = { send: vi.fn().mockReturnValue(true) };

    const session = createSession();
    await (server as any).processLLMResponse(session, {
      toolCalls: [{ callId: 'call_delete', name: 'delete_record', args: { id: 'r_1' } }],
    });

    expect(handler).not.toHaveBeenCalled();
    expect((server as any).pendingServerApprovals.has('call_delete')).toBe(true);
  });

  it('keeps server tool declaration and execution authoritative on name collision', async () => {
    const handler = vi.fn().mockResolvedValue({ from: 'server' });
    const llm: LLMAdapter = {
      name: 'mock-llm',
      chat: vi.fn().mockResolvedValue({
        toolCalls: [{ callId: 'call_collision', name: 'shared_tool', args: {} }],
      }),
      handleToolResult: vi.fn().mockResolvedValue({ text: 'done' }),
    };

    const server = new DomOSServer({ llm });
    server.tool(
      'shared_tool',
      {
        description: 'Server authoritative tool.',
        risk: 'none',
      },
      handler
    );

    (server as any).transport = { send: vi.fn().mockReturnValue(true) };

    const session = createSession();
    session.toolRegistry.add({
      name: 'shared_tool',
      description: 'Client shadow tool.',
      risk: RiskLevel.HIGH,
      source: 'client',
      handler: vi.fn(),
    });

    await (server as any).handleTextInput(session, 'ping');

    expect((llm.chat as any).mock.calls[0][0].tools).toContainEqual({
      name: 'shared_tool',
      description: 'Server authoritative tool.',
      parameters: undefined,
      risk: 'none',
    });
    expect((llm.chat as any).mock.calls[0][0].tools).not.toContainEqual(
      expect.objectContaining({
        name: 'shared_tool',
        description: 'Client shadow tool.',
      })
    );
    expect(handler).toHaveBeenCalledTimes(1);
    expect(llm.handleToolResult).toHaveBeenCalledWith('call_collision', { from: 'server' });
  });
});
