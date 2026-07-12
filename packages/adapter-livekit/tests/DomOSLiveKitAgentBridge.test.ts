import type { LLMToolCall } from '@domos/core';
import { describe, expect, it, vi } from 'vitest';
import {
  DefaultLiveKitAgentSessionFactory,
  DomOSContextBridge,
  DomOSLiveKitAgentBridge,
  DomOSToolBridge,
  LiveKitRoomManager,
  type DomOSBridgeSessionSnapshot,
  type DomOSContextSnapshot,
  type DomOSLiveKitBridgeEvent,
  type LiveKitAgentRuntime,
  type LiveKitAgentSessionFactory,
  type LiveKitAgentSessionFactoryInput,
  type LiveKitAgentSessionLike,
  type LiveKitRoomHandle,
} from '../src/index.js';

class MockAgentSession implements LiveKitAgentSessionLike {
  readonly start = vi.fn(async () => undefined);
  readonly close = vi.fn(async () => undefined);
  readonly updateAgent = vi.fn();
  private readonly listeners = new Map<string, Array<(...args: unknown[]) => void>>();

  on(event: string, listener: (...args: unknown[]) => void): unknown {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
  }

  emit(event: string, ...args: unknown[]): void {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(...args);
    }
  }
}

class MockAgentSessionFactory implements LiveKitAgentSessionFactory {
  readonly session = new MockAgentSession();
  readonly create = vi.fn(async (input: LiveKitAgentSessionFactoryInput) => {
    this.lastInput = input;
    await this.session.start({
      agent: { type: 'mock-agent' },
      room: input.room.room,
    });
    return this.session;
  });
  readonly updateContext = vi.fn(async (
    _agentSession: LiveKitAgentSessionLike,
    input: LiveKitAgentSessionFactoryInput
  ) => {
    this.lastInput = input;
  });
  lastInput?: LiveKitAgentSessionFactoryInput;
}

function buildSession(overrides: Partial<DomOSBridgeSessionSnapshot> = {}): DomOSBridgeSessionSnapshot {
  return {
    sessionId: 'sess_1234',
    apiKey: 'pk_demo',
    systemPrompt: 'Tu es DomOS.',
    context: {
      url: '/cart',
      title: 'Panier',
      data: {
        role: 'shopping',
        cart: {
          itemCount: 2,
          internalNotes: 'x'.repeat(800),
        },
      },
      updatedAt: 1000,
    },
    effectiveTools: [
      {
        name: 'cart_summary',
        description: 'Resume le panier courant',
        risk: 'none',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'checkout_confirm',
        description: 'Confirme la commande',
        risk: 'critical',
        parameters: {
          type: 'OBJECT',
          properties: {
            confirm: { type: 'BOOLEAN' },
          },
          required: ['confirm'],
        },
      },
    ],
    ...overrides,
  };
}

describe('DomOS LiveKit Agent bridge', () => {
  it('builds compact Shadow Context instructions without duplicating audio/tool ownership', () => {
    const bridge = new DomOSContextBridge({
      dataAllowList: ['role', 'cart'],
      maxStringLength: 64,
    });

    const snapshot = bridge.buildSnapshot(buildSession());

    expect(snapshot.instructions).toContain('[DOMOS_SHADOW_CONTEXT]');
    expect(snapshot.instructions).toContain('[DOMOS_NEURAL_BINDING]');
    expect(snapshot.instructions).toContain('Client tools must be executed by DomOS through ADTP');
    expect(snapshot.toolSummary).toContain('cart_summary');
    expect(snapshot.toolSummary).toContain('checkout_confirm risk=critical');
    expect(JSON.stringify(snapshot.context.data)).toContain('[truncated]');
  });

  it('does not forward arbitrary context data by default', () => {
    const snapshot = new DomOSContextBridge().buildSnapshot(buildSession({
      context: {
        url: '/checkout',
        title: 'Checkout',
        data: {
          role: 'shopping',
          cart: { itemCount: 2 },
          internalNotes: 'private',
          paymentToken: 'tok_secret',
        },
        updatedAt: 1000,
      },
    }));

    expect(snapshot.context.data).toEqual({ role: 'shopping' });
    expect(snapshot.instructions).toContain('"role":"shopping"');
    expect(snapshot.instructions).not.toContain('internalNotes');
    expect(snapshot.instructions).not.toContain('paymentToken');
    expect(snapshot.instructions).not.toContain('tok_secret');
  });

  it('starts a mocked AgentSession and routes LiveKit tool calls back through DomOS', async () => {
    const events: DomOSLiveKitBridgeEvent[] = [];
    const factory = new MockAgentSessionFactory();
    const responseTarget = {
      sendToolResponse: vi.fn(async () => undefined),
    };
    const toolExecutor = vi.fn(async (toolCall: LLMToolCall) => ({
      handledBy: 'domos',
      tool: toolCall.name,
    }));
    const bridge = new DomOSLiveKitAgentBridge({
      agentSessionFactory: factory,
      roomManager: new LiveKitRoomManager({
        provisionRoom: ({ session, roomName, agentIdentity }) => ({
          sessionId: session.sessionId,
          roomName,
          agentIdentity,
          room: { fake: true },
        }),
      }),
      toolExecutor,
      responseTargetFactory: () => responseTarget,
      onEvent: (event) => events.push(event),
    });

    const state = await bridge.start(buildSession());
    const toolCall: LLMToolCall = {
      callId: 'call-1',
      name: 'cart_summary',
      args: {},
    };
    const outcome = await factory.lastInput?.toolBridge.handleToolCall(toolCall);

    expect(state.agentSession).toBe(factory.session);
    expect(factory.session.start).toHaveBeenCalled();
    expect(toolExecutor).toHaveBeenCalledWith(toolCall, { sessionId: 'sess_1234' });
    expect(responseTarget.sendToolResponse).toHaveBeenCalledWith(
      'call-1',
      'cart_summary',
      { handledBy: 'domos', tool: 'cart_summary' }
    );
    expect(outcome).toMatchObject({ ok: true });
    expect(events.map((event) => event.type)).toEqual([
      'room.ready',
      'agent_session.started',
      'tool.call_started',
      'tool.call_completed',
    ]);
  });

  it('closes and evicts the room when AgentSession startup fails', async () => {
    const events: DomOSLiveKitBridgeEvent[] = [];
    const closeRoom = vi.fn(async () => undefined);
    const roomManager = new LiveKitRoomManager({
      provisionRoom: ({ session, roomName, agentIdentity }) => ({
        sessionId: session.sessionId,
        roomName,
        agentIdentity,
        close: closeRoom,
      }),
    });
    const factory: LiveKitAgentSessionFactory = {
      create: vi.fn(async () => {
        throw new Error('AgentSession failed to start');
      }),
    };
    const bridge = new DomOSLiveKitAgentBridge({
      agentSessionFactory: factory,
      roomManager,
      toolExecutor: vi.fn(),
      onEvent: (event) => events.push(event),
    });

    await expect(bridge.start(buildSession())).rejects.toThrow('AgentSession failed to start');

    expect(closeRoom).toHaveBeenCalledTimes(1);
    expect(roomManager.getRoom('sess_1234')).toBeUndefined();
    expect(bridge.getState('sess_1234')).toBeUndefined();
    expect(events.map((event) => event.type)).toEqual([
      'room.ready',
      'error',
    ]);
    expect(events.at(-1)).toMatchObject({
      type: 'error',
      sessionId: 'sess_1234',
      message: 'AgentSession failed to start',
    });
  });

  it('returns DomOS tool errors to LiveKit without bypassing the bridge', async () => {
    const events: DomOSLiveKitBridgeEvent[] = [];
    const responseTarget = {
      sendToolResponse: vi.fn(async () => undefined),
    };
    const toolBridge = new DomOSToolBridge({
      sessionId: 'sess_1234',
      executor: vi.fn(async () => {
        throw new Error('checkout rejected');
      }),
      responseTarget,
      onEvent: (event) => events.push(event),
    });

    const outcome = await toolBridge.handleToolCall({
      callId: 'call-error',
      name: 'checkout_confirm',
      args: { confirm: true },
    });

    expect(outcome).toEqual({
      ok: false,
      error: 'checkout rejected',
      result: { error: 'checkout rejected' },
    });
    expect(responseTarget.sendToolResponse).toHaveBeenCalledWith(
      'call-error',
      'checkout_confirm',
      { error: 'checkout rejected' }
    );
    expect(events.map((event) => event.type)).toEqual([
      'tool.call_started',
      'tool.call_failed',
    ]);
  });

  it('updates context and effective tools through the injected AgentSession factory', async () => {
    const events: DomOSLiveKitBridgeEvent[] = [];
    const factory = new MockAgentSessionFactory();
    const bridge = new DomOSLiveKitAgentBridge({
      agentSessionFactory: factory,
      toolExecutor: vi.fn(),
      onEvent: (event) => events.push(event),
    });
    await bridge.start(buildSession());
    const startedAt = bridge.getStats().sessions[0]?.startedAt;

    await bridge.updateContext(buildSession({
      context: {
        url: '/checkout',
        title: 'Checkout',
        data: { step: 'payment' },
        updatedAt: 2000,
      },
      effectiveTools: [
        {
          name: 'select_payment',
          description: 'Selectionne le mode de paiement',
          risk: 'low',
          parameters: {
            type: 'OBJECT',
            properties: {
              method: { type: 'STRING' },
            },
            required: ['method'],
          },
        },
      ],
    }));

    expect(factory.updateContext).toHaveBeenCalled();
    expect(factory.lastInput?.context.context.url).toBe('/checkout');
    expect(factory.lastInput?.context.tools).toHaveLength(1);
    expect(bridge.getStats().sessions[0]?.startedAt).toBe(startedAt);
    expect(events.some((event) => event.type === 'context.updated')).toBe(true);
  });

  it('closes AgentSession and room resources when the DomOS session closes', async () => {
    const closeRoom = vi.fn(async () => undefined);
    const factory = new MockAgentSessionFactory();
    const bridge = new DomOSLiveKitAgentBridge({
      agentSessionFactory: factory,
      roomManager: new LiveKitRoomManager({
        provisionRoom: ({ session, roomName, agentIdentity }) => ({
          sessionId: session.sessionId,
          roomName,
          agentIdentity,
          close: closeRoom,
        }),
      }),
      toolExecutor: vi.fn(),
    });
    await bridge.start(buildSession());

    await bridge.close('sess_1234');

    expect(factory.session.close).toHaveBeenCalled();
    expect(closeRoom).toHaveBeenCalled();
    expect(bridge.getState('sess_1234')).toBeUndefined();
  });

  it('does not duplicate room cleanup or close events when manual close emits AgentSession close', async () => {
    const events: DomOSLiveKitBridgeEvent[] = [];
    const closeRoom = vi.fn(async () => undefined);
    const factory = new MockAgentSessionFactory();
    factory.session.close.mockImplementation(async () => {
      factory.session.emit('close');
    });
    const bridge = new DomOSLiveKitAgentBridge({
      agentSessionFactory: factory,
      roomManager: new LiveKitRoomManager({
        provisionRoom: ({ session, roomName, agentIdentity }) => ({
          sessionId: session.sessionId,
          roomName,
          agentIdentity,
          close: closeRoom,
        }),
      }),
      toolExecutor: vi.fn(),
      onEvent: (event) => events.push(event),
    });
    await bridge.start(buildSession());

    await bridge.close('sess_1234');

    const closeEvents = events.filter((event) => event.type === 'agent_session.closed');
    expect(factory.session.close).toHaveBeenCalledTimes(1);
    expect(closeRoom).toHaveBeenCalledTimes(1);
    expect(closeEvents).toEqual([
      expect.objectContaining({
        type: 'agent_session.closed',
        sessionId: 'sess_1234',
        reason: 'domos_session_closed',
      }),
    ]);
  });

  it('closes room resources when LiveKit closes the AgentSession first', async () => {
    const events: DomOSLiveKitBridgeEvent[] = [];
    const closeRoom = vi.fn(async () => undefined);
    const factory = new MockAgentSessionFactory();
    const bridge = new DomOSLiveKitAgentBridge({
      agentSessionFactory: factory,
      roomManager: new LiveKitRoomManager({
        provisionRoom: ({ session, roomName, agentIdentity }) => ({
          sessionId: session.sessionId,
          roomName,
          agentIdentity,
          close: closeRoom,
        }),
      }),
      toolExecutor: vi.fn(),
      onEvent: (event) => events.push(event),
    });
    await bridge.start(buildSession());

    factory.session.emit('close');

    expect(bridge.getState('sess_1234')).toBeUndefined();
    expect(closeRoom).toHaveBeenCalled();
    expect(events.some((event) => (
      event.type === 'agent_session.closed' &&
      event.reason === 'livekit_agent_session_closed'
    ))).toBe(true);
  });

  it('creates public LiveKit AgentSession tools that delegate execution to DomOS', async () => {
    const captured: {
      sessionOptions?: Record<string, unknown>;
      agentOptions?: Record<string, unknown>;
      started?: { agent: unknown; room?: unknown };
      updatedAgent?: unknown;
    } = {};
    const livekitTool = vi.fn((config: unknown) => config);
    const runtime: LiveKitAgentRuntime = {
      AgentSession: class RuntimeAgentSession implements LiveKitAgentSessionLike {
        constructor(options?: Record<string, unknown>) {
          captured.sessionOptions = options;
        }

        async start(options: { agent: unknown; room?: unknown }): Promise<void> {
          captured.started = options;
        }

        updateAgent(agent: unknown): void {
          captured.updatedAgent = agent;
        }
      },
      Agent: {
        create: vi.fn((options: Record<string, unknown>) => {
          captured.agentOptions = options;
          return { type: 'agent', options };
        }),
      },
      llm: {
        tool: livekitTool,
      },
    };
    const executor = vi.fn(async () => ({ ok: true }));
    const toolBridge = new DomOSToolBridgeForTest('sess_1234', executor);
    const context: DomOSContextSnapshot = new DomOSContextBridge().buildSnapshot(buildSession());
    const room: LiveKitRoomHandle = {
      sessionId: 'sess_1234',
      roomName: 'room',
      agentIdentity: 'agent',
      room: { connected: true },
    };
    const factory = new DefaultLiveKitAgentSessionFactory({
      sessionOptions: { llm: 'fake-llm' },
      runtimeFactory: async () => runtime,
    });

    await factory.create({
      session: buildSession(),
      context,
      room,
      toolBridge,
    });

    const tools = captured.agentOptions?.tools as Array<{
      name: string;
      execute: (args: Record<string, unknown>, options: { toolCallId?: string }) => Promise<unknown>;
    }>;
    const result = await tools[0]?.execute({}, { toolCallId: 'call-1' });

    expect(livekitTool).toHaveBeenCalledWith(expect.objectContaining({
      name: 'cart_summary',
      parameters: expect.objectContaining({ type: 'object' }),
      execute: expect.any(Function),
    }));
    expect(captured.started?.room).toEqual({ connected: true });
    expect(captured.sessionOptions?.tools).toBeUndefined();
    expect(executor).toHaveBeenCalledWith(
      { callId: 'call-1', name: 'cart_summary', args: {} },
      { sessionId: 'sess_1234' }
    );
    expect(result).toEqual({ ok: true });
  });
});

class DomOSToolBridgeForTest extends DomOSToolBridge {
  constructor(sessionId: string, executor: (toolCall: LLMToolCall) => Promise<unknown>) {
    super({ sessionId, executor });
  }
}
