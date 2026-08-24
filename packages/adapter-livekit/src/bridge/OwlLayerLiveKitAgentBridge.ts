import type { LLMToolCall, ToolDeclaration } from '@owllayer/core';
import { toLiveKitToolSchema } from '../live/toolMapping.js';
import {
  OwlLayerContextBridge,
  type OwlLayerBridgeSessionSnapshot,
  type OwlLayerContextSnapshot,
} from './OwlLayerContextBridge.js';
import {
  OwlLayerToolBridge,
  type OwlLayerToolExecutor,
  type OwlLayerToolResponseTarget,
} from './OwlLayerToolBridge.js';
import {
  LiveKitRoomManager,
  type LiveKitRoomHandle,
} from './LiveKitRoomManager.js';
import {
  emitBridgeEvent,
  type OwlLayerLiveKitBridgeEvent,
  type OwlLayerLiveKitBridgeEventListener,
} from './events.js';

const MAX_BRIDGE_EVENT_LOG_SIZE = 200;

export interface LiveKitAgentSessionLike {
  start(options: {
    agent: unknown;
    room?: unknown;
    inputOptions?: unknown;
    outputOptions?: unknown;
    record?: boolean | Record<string, unknown>;
  }): Promise<void>;
  close?: () => Promise<void> | void;
  shutdown?: () => Promise<void> | void;
  updateAgent?: (agent: unknown) => void;
  on?: (event: string, listener: (...args: unknown[]) => void) => unknown;
  off?: (event: string, listener: (...args: unknown[]) => void) => unknown;
}

export interface LiveKitAgentSessionFactoryInput {
  session: OwlLayerBridgeSessionSnapshot;
  context: OwlLayerContextSnapshot;
  room: LiveKitRoomHandle;
  toolBridge: OwlLayerToolBridge;
}

export interface LiveKitAgentSessionFactory {
  create(input: LiveKitAgentSessionFactoryInput): Promise<LiveKitAgentSessionLike>;
  updateContext?(
    agentSession: LiveKitAgentSessionLike,
    input: LiveKitAgentSessionFactoryInput
  ): Promise<void> | void;
}

export interface LiveKitAgentRuntime {
  AgentSession: new (options?: Record<string, unknown>) => LiveKitAgentSessionLike;
  Agent: {
    create(options: Record<string, unknown>): unknown;
  };
  llm?: {
    tool(config: LiveKitFunctionToolConfig): unknown;
  };
  tool?: (config: LiveKitFunctionToolConfig) => unknown;
}

interface LiveKitFunctionToolConfig {
  name: string;
  description: string;
  parameters: unknown;
  execute: (
    args: Record<string, unknown>,
    options: { toolCallId?: string }
  ) => Promise<unknown>;
}

export interface DefaultLiveKitAgentSessionFactoryOptions {
  sessionOptions?: Record<string, unknown>;
  agentOptions?: Record<string, unknown>;
  inputOptions?: unknown;
  outputOptions?: unknown;
  record?: boolean | Record<string, unknown>;
  runtimeFactory?: () => Promise<LiveKitAgentRuntime>;
}

export class DefaultLiveKitAgentSessionFactory implements LiveKitAgentSessionFactory {
  constructor(private readonly options: DefaultLiveKitAgentSessionFactoryOptions = {}) {}

  async create(input: LiveKitAgentSessionFactoryInput): Promise<LiveKitAgentSessionLike> {
    const runtime = await this.loadRuntime();
    const tools = createAgentSessionTools(runtime, input.context.tools, input.toolBridge);
    const agentSession = new runtime.AgentSession({
      ...this.options.sessionOptions,
      userData: {
        ...(this.options.sessionOptions?.userData as Record<string, unknown> | undefined),
        owllayerSessionId: input.session.sessionId,
      },
    });
    const agent = runtime.Agent.create({
      ...this.options.agentOptions,
      instructions: input.context.instructions,
      tools,
    });

    await agentSession.start({
      agent,
      room: input.room.room,
      inputOptions: this.options.inputOptions,
      outputOptions: this.options.outputOptions,
      record: this.options.record,
    });

    return agentSession;
  }

  async updateContext(
    agentSession: LiveKitAgentSessionLike,
    input: LiveKitAgentSessionFactoryInput
  ): Promise<void> {
    if (!agentSession.updateAgent) {
      return;
    }

    const runtime = await this.loadRuntime();
    const tools = createAgentSessionTools(runtime, input.context.tools, input.toolBridge);
    const agent = runtime.Agent.create({
      ...this.options.agentOptions,
      instructions: input.context.instructions,
      tools,
    });
    agentSession.updateAgent(agent);
  }

  private async loadRuntime(): Promise<LiveKitAgentRuntime> {
    if (this.options.runtimeFactory) {
      return this.options.runtimeFactory();
    }

    return await import('@livekit/agents') as unknown as LiveKitAgentRuntime;
  }
}

export interface OwlLayerLiveKitAgentBridgeOptions {
  toolExecutor: OwlLayerToolExecutor;
  contextBridge?: OwlLayerContextBridge;
  roomManager?: LiveKitRoomManager;
  agentSessionFactory?: LiveKitAgentSessionFactory;
  responseTargetFactory?: (
    session: OwlLayerBridgeSessionSnapshot
  ) => OwlLayerToolResponseTarget | undefined;
  onEvent?: OwlLayerLiveKitBridgeEventListener;
}

export interface OwlLayerLiveKitAgentBridgeState {
  sessionId: string;
  context: OwlLayerContextSnapshot;
  room: LiveKitRoomHandle;
  agentSession: LiveKitAgentSessionLike;
  toolBridge: OwlLayerToolBridge;
  startedAt: number;
}

export interface BridgeStatsSnapshot {
  enabled: true;
  activeBridges: number;
  sessions: Array<{
    sessionId: string;
    roomName: string;
    agentIdentity: string;
    startedAt: number;
  }>;
}

export class OwlLayerLiveKitAgentBridge {
  private readonly contextBridge: OwlLayerContextBridge;
  private readonly roomManager: LiveKitRoomManager;
  private readonly agentSessionFactory: LiveKitAgentSessionFactory;
  private readonly onEvent: OwlLayerLiveKitBridgeEventListener;
  private readonly states = new Map<string, OwlLayerLiveKitAgentBridgeState>();
  private readonly eventLog: OwlLayerLiveKitBridgeEvent[] = [];

  constructor(private readonly options: OwlLayerLiveKitAgentBridgeOptions) {
    this.contextBridge = options.contextBridge ?? new OwlLayerContextBridge();
    this.roomManager = options.roomManager ?? new LiveKitRoomManager();
    this.agentSessionFactory = options.agentSessionFactory ?? new DefaultLiveKitAgentSessionFactory();
    const originalOnEvent = options.onEvent;
    this.onEvent = (event) => {
      this.eventLog.push(event);
      if (this.eventLog.length > MAX_BRIDGE_EVENT_LOG_SIZE) {
        this.eventLog.splice(0, this.eventLog.length - MAX_BRIDGE_EVENT_LOG_SIZE);
      }
      originalOnEvent?.(event);
    };
  }

  async start(session: OwlLayerBridgeSessionSnapshot): Promise<OwlLayerLiveKitAgentBridgeState> {
    const existing = this.states.get(session.sessionId);
    if (existing) {
      return existing;
    }

    const context = this.contextBridge.buildSnapshot(session);
    const room = await this.roomManager.getOrCreateRoom(session);
    emitBridgeEvent(this.onEvent, {
      type: 'room.ready',
      sessionId: session.sessionId,
      room,
    });

    const toolBridge = new OwlLayerToolBridge({
      sessionId: session.sessionId,
      executor: this.options.toolExecutor,
      responseTarget: this.options.responseTargetFactory?.(session),
      onEvent: this.onEvent,
    });

    let agentSession: LiveKitAgentSessionLike;
    try {
      agentSession = await this.agentSessionFactory.create({
        session,
        context,
        room,
        toolBridge,
      });
    } catch (error) {
      await this.closeRoomAfterFailedStart(session.sessionId, error);
      throw error;
    }
    this.attachAgentSessionEvents(session.sessionId, agentSession);

    const state: OwlLayerLiveKitAgentBridgeState = {
      sessionId: session.sessionId,
      context,
      room,
      agentSession,
      toolBridge,
      startedAt: Date.now(),
    };
    this.states.set(session.sessionId, state);

    emitBridgeEvent(this.onEvent, {
      type: 'agent_session.started',
      sessionId: session.sessionId,
      room,
      context,
    });

    return state;
  }

  async updateContext(session: OwlLayerBridgeSessionSnapshot): Promise<void> {
    const state = this.states.get(session.sessionId);
    if (!state) {
      return;
    }

    const context = this.contextBridge.buildSnapshot(session);
    state.context = context;

    if (this.agentSessionFactory.updateContext) {
      await this.agentSessionFactory.updateContext(state.agentSession, {
        session,
        context,
        room: state.room,
        toolBridge: state.toolBridge,
      });
    } else {
      emitBridgeEvent(this.onEvent, {
        type: 'tools.update_deferred',
        sessionId: session.sessionId,
        toolCount: context.tools.length,
        reason: 'AgentSession factory does not support context/tool updates.',
      });
    }

    emitBridgeEvent(this.onEvent, {
      type: 'context.updated',
      sessionId: session.sessionId,
      context,
      toolCount: context.tools.length,
    });
  }

  getState(sessionId: string): OwlLayerLiveKitAgentBridgeState | undefined {
    return this.states.get(sessionId);
  }

  async close(sessionId: string, reason = 'owllayer_session_closed'): Promise<void> {
    const state = this.states.get(sessionId);
    if (!state) {
      await this.roomManager.closeRoom(sessionId);
      return;
    }

    this.states.delete(sessionId);
    if (state.agentSession.close) {
      await state.agentSession.close();
    } else {
      await state.agentSession.shutdown?.();
    }
    await this.roomManager.closeRoom(sessionId);

    emitBridgeEvent(this.onEvent, {
      type: 'agent_session.closed',
      sessionId,
      reason,
    });
  }

  getStats(): BridgeStatsSnapshot {
    const sessions = Array.from(this.states.entries()).map(([sessionId, state]) => ({
      sessionId,
      roomName: state.room.roomName,
      agentIdentity: state.room.agentIdentity,
      startedAt: state.startedAt,
    }));
    return { enabled: true, activeBridges: this.states.size, sessions };
  }

  getEvents(limit = 50): OwlLayerLiveKitBridgeEvent[] {
    return this.eventLog.slice(-limit);
  }

  async closeAll(): Promise<void> {
    const sessionIds = Array.from(this.states.keys());
    await Promise.all(sessionIds.map((sessionId) => this.close(sessionId)));
  }

  private attachAgentSessionEvents(sessionId: string, agentSession: LiveKitAgentSessionLike): void {
    agentSession.on?.('error', (event) => {
      emitBridgeEvent(this.onEvent, {
        type: 'error',
        sessionId,
        message: normalizeAgentSessionError(event),
      });
    });
    agentSession.on?.('close', () => {
      const state = this.states.get(sessionId);
      if (!state) {
        return;
      }

      this.states.delete(sessionId);
      void this.roomManager.closeRoom(sessionId).catch((error: unknown) => {
        emitBridgeEvent(this.onEvent, {
          type: 'error',
          sessionId,
          message: normalizeAgentSessionError(error),
        });
      });
      emitBridgeEvent(this.onEvent, {
        type: 'agent_session.closed',
        sessionId,
        reason: 'livekit_agent_session_closed',
      });
    });
  }

  private async closeRoomAfterFailedStart(sessionId: string, error: unknown): Promise<void> {
    try {
      await this.roomManager.closeRoom(sessionId);
    } catch (closeError) {
      emitBridgeEvent(this.onEvent, {
        type: 'error',
        sessionId,
        message: normalizeAgentSessionError(closeError),
      });
    }

    emitBridgeEvent(this.onEvent, {
      type: 'error',
      sessionId,
      message: normalizeAgentSessionError(error),
    });
  }
}

function createAgentSessionTools(
  runtime: LiveKitAgentRuntime,
  tools: ToolDeclaration[],
  toolBridge: OwlLayerToolBridge
): unknown[] {
  const createTool = runtime.llm?.tool ?? runtime.tool;
  if (!createTool) {
    throw new Error('LiveKit runtime does not expose llm.tool().');
  }

  return tools.map((tool) =>
    createTool({
      name: tool.name,
      description: buildAgentToolDescription(tool),
      parameters: toLiveKitToolSchema(tool.parameters),
      execute: async (args, options) => {
        const outcome = await toolBridge.handleToolCall({
          callId: options.toolCallId ?? `lk_${tool.name}`,
          name: tool.name,
          args: isRecord(args) ? args : {},
        } satisfies LLMToolCall);

        return outcome.result;
      },
    })
  );
}

function buildAgentToolDescription(tool: ToolDeclaration): string {
  if (!tool.risk || tool.risk === 'none') {
    return tool.description;
  }

  return `${tool.description}\nOwlLayer HITL risk level: ${tool.risk}. OwlLayer decides approval and execution.`;
}

function normalizeAgentSessionError(event: unknown): string {
  if (event instanceof Error) {
    return event.message;
  }

  if (isRecord(event) && event.error instanceof Error) {
    return event.error.message;
  }

  return String(event);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
