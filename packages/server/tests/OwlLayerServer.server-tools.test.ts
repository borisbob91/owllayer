import { describe, expect, it, vi } from 'vitest';
import { MessageType, RiskLevel, ToolRegistry } from '@owllayer/core';
import { OwlLayerServer } from '../src/core/OwlLayerServer.js';
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

describe('OwlLayerServer server tools', () => {
  it('expose server.tool declaration to llm.chat and executes locally', async () => {
    const handler = vi.fn().mockResolvedValue({ pong: true });
    const llm: LLMAdapter = {
      name: 'mock-llm',
      chat: vi.fn().mockResolvedValue({
        toolCalls: [{ callId: 'call_x', name: 'x', args: { value: 42 } }],
      }),
      handleToolResult: vi.fn().mockResolvedValue({ text: 'done' }),
    };

    const server = new OwlLayerServer({ llm });
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
    expect(llm.handleToolResult).toHaveBeenCalledWith('call_x', { pong: true }, expect.any(Array));
  });

  it('applies HITL policy to declared server tool risk', async () => {
    const handler = vi.fn().mockResolvedValue({ deleted: true });
    const llm: LLMAdapter = {
      name: 'mock-llm',
      chat: vi.fn(),
      handleToolResult: vi.fn().mockResolvedValue({ text: '' }),
    };

    const server = new OwlLayerServer({ llm });
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

    const server = new OwlLayerServer({ llm });
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
    expect(llm.handleToolResult).toHaveBeenCalledWith('call_collision', { from: 'server' }, expect.any(Array));
  });

  it('publishes effective tools and ignored client collisions on context update', () => {
    const server = new OwlLayerServer({ llm: { name: 'mock-llm', chat: vi.fn() } as any });
    server.tool(
      'shared_tool',
      {
        description: 'Server authoritative tool.',
        risk: 'none',
      },
      vi.fn()
    );

    const send = vi.fn().mockReturnValue(true);
    (server as any).transport = { send };

    const session = (server as any).sessions.create('conn_effective_tools', 'pk_test');
    (server as any).handleContextUpdate(session, {
      url: '/checkout',
      title: 'Checkout',
      activeTools: [
        { name: 'shared_tool', description: 'Client shadow tool.', risk: 'high' },
        { name: 'page_tool', description: 'Page mounted tool.', risk: 'low' },
      ],
      context: { page: 'checkout' },
    });

    const event = send.mock.calls.find((call) => call[1].type === MessageType.SYSTEM_EVENT && call[1].payload.kind === 'tools_effective')?.[1];
    expect(event).toBeTruthy();
    expect(event.payload.data.effectiveTools.map((tool: any) => tool.name)).toEqual(['shared_tool', 'page_tool']);
    expect(event.payload.data.ignoredClientTools).toEqual([
      { name: 'shared_tool', description: 'Client shadow tool.', risk: 'high' },
    ]);
  });

  it('updates server session tools when component tools mount and unmount', () => {
    const server = new OwlLayerServer({ llm: { name: 'mock-llm', chat: vi.fn() } as any });
    const send = vi.fn().mockReturnValue(true);
    (server as any).transport = { send };

    const session = (server as any).sessions.create('conn_lifecycle_tools', 'pk_test');

    (server as any).handleContextUpdate(session, {
      url: '/products',
      activeTools: [
        { name: 'global_nav', description: 'Navigation globale.', risk: 'low' },
        { name: 'product_card', description: 'Tool du composant produit monte.', risk: 'low' },
      ],
      context: {},
    });

    expect(session.toolRegistry.getDeclarations().map((tool: any) => tool.name)).toEqual(['global_nav', 'product_card']);

    (server as any).handleContextUpdate(session, {
      url: '/products',
      activeTools: [
        { name: 'global_nav', description: 'Navigation globale.', risk: 'low' },
      ],
      context: {},
    });

    expect(session.toolRegistry.getDeclarations().map((tool: any) => tool.name)).toEqual(['global_nav']);
    const latestEvent = send.mock.calls
      .map((call) => call[1])
      .filter((message) => message.type === MessageType.SYSTEM_EVENT && message.payload.kind === 'tools_effective')
      .at(-1);
    expect(latestEvent.payload.data.effectiveTools.map((tool: any) => tool.name)).toEqual(['global_nav']);
  });

  it('exposes bridge snapshots and routes bridge tools through OwlLayer ownership', async () => {
    const serverHandler = vi.fn().mockResolvedValue({ server: true });
    const llm: LLMAdapter = {
      name: 'mock-llm',
      systemPrompt: 'Base prompt',
      chat: vi.fn(),
      handleToolResult: vi.fn(),
    };
    const server = new OwlLayerServer({ llm });
    server.tool(
      'server_ping',
      {
        description: 'Server bridge tool.',
        risk: 'none',
      },
      serverHandler
    );

    const send = vi.fn().mockReturnValue(true);
    (server as any).transport = { send };
    const session = (server as any).sessions.create('conn_bridge_tools', 'pk_test');

    (server as any).handleContextUpdate(session, {
      url: '/bridge',
      title: 'Bridge page',
      activeTools: [
        { name: 'client_ping', description: 'Client bridge tool.', risk: 'none' },
      ],
      context: { role: 'bridge' },
    });

    const snapshot = await server.getAgentBridgeSessionSnapshot(session.id);
    expect(snapshot).toMatchObject({
      sessionId: session.id,
      systemPrompt: 'Base prompt',
      context: expect.objectContaining({
        url: '/bridge',
        title: 'Bridge page',
      }),
    });
    expect(snapshot).not.toHaveProperty('apiKey');
    expect(server.isAgentBridgeSessionOwnedByApiKey(session.id, 'pk_test')).toBe(true);
    expect(server.isAgentBridgeSessionOwnedByApiKey(session.id, 'pk_other')).toBe(false);
    expect(snapshot?.effectiveTools.map((tool) => tool.name)).toEqual([
      'server_ping',
      'client_ping',
    ]);

    await expect(
      server.routeAgentBridgeToolCall(session.id, {
        callId: 'lk_server',
        name: 'server_ping',
        args: {},
      })
    ).resolves.toEqual({ server: true });
    expect(serverHandler).toHaveBeenCalledTimes(1);

    const clientResultPromise = server.routeAgentBridgeToolCall(session.id, {
      callId: 'lk_client',
      name: 'client_ping',
      args: { value: 1 },
    });
    const toolCallMessage = send.mock.calls
      .map((call) => call[1])
      .find((message) => message.type === MessageType.TOOL_CALL);

    expect(toolCallMessage).toBeTruthy();
    expect(toolCallMessage.payload).toMatchObject({
      name: 'client_ping',
      args: { value: 1 },
    });

    (server as any).toolRouter.handleToolResult({
      callId: toolCallMessage.payload.callId,
      status: 'success',
      result: { client: true },
    });

    await expect(clientResultPromise).resolves.toMatchObject({
      status: 'success',
      result: { client: true },
    });
  });

  it('handles LLM timeout gracefully by notifying client with friendly error message', async () => {
    const llm: LLMAdapter = {
      name: 'mock-llm',
      chat: vi.fn().mockRejectedValue(new Error('LLM request timed out after 25s (ETIMEDOUT)')),
      handleToolResult: vi.fn().mockResolvedValue({ text: 'ok' }),
    };

    const server = new OwlLayerServer({ llm, language: 'fr' });
    const send = vi.fn().mockReturnValue(true);
    (server as any).transport = { send };

    const session = createSession();
    await (server as any).handleTextInput(session, 'bonjour');

    const systemEvent = send.mock.calls.find((call) => call[1].type === MessageType.SYSTEM_EVENT);
    const agentResponse = send.mock.calls.find((call) => call[1].type === MessageType.AGENT_RESPONSE);

    expect(systemEvent).toBeTruthy();
    expect(systemEvent[1].payload.kind).toBe('error');
    expect(systemEvent[1].payload.message).toContain("délai d'attente dépassé");

    expect(agentResponse).toBeTruthy();
    expect(agentResponse[1].payload.done).toBe(true);
    expect(agentResponse[1].payload.chunk).toContain("délai d'attente dépassé");
  });

  it('handles LLM handleToolResult timeout gracefully', async () => {
    const llm: LLMAdapter = {
      name: 'mock-llm',
      chat: vi.fn().mockResolvedValue({ text: 'ok' }),
      handleToolResult: vi.fn().mockRejectedValue(new Error('LLM handleToolResult timed out after 35s')),
    };

    const server = new OwlLayerServer({ llm, language: 'en' });
    const send = vi.fn().mockReturnValue(true);
    (server as any).transport = { send };

    const session = createSession();
    await (server as any).notifyToolResult(session, 'call_1', 'tool_1', { result: 1 });

    const systemEvent = send.mock.calls.find((call) => call[1].type === MessageType.SYSTEM_EVENT);
    const agentResponse = send.mock.calls.find((call) => call[1].type === MessageType.AGENT_RESPONSE);

    expect(systemEvent).toBeTruthy();
    expect(systemEvent[1].payload.kind).toBe('error');
    expect(systemEvent[1].payload.message).toContain('timeout');

    expect(agentResponse).toBeTruthy();
    expect(agentResponse[1].payload.done).toBe(true);
    expect(agentResponse[1].payload.chunk).toContain('timeout');
  });
});
