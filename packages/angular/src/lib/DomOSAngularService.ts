import { signal, type Signal, type WritableSignal } from '@angular/core';
import {
  DomOSClient,
  zodToToolParameters,
  type ClientState,
  type DomOSClientAnyEventListener,
  type DomOSClientEventListener,
  type DomOSClientEventType,
  type ToolDeclaration,
} from '@domos/core';
import type { DomOSToolArgs, DomOSToolDefinition, DomOSToolHandler } from './types.js';

export class DomOSAngularService {
  readonly state: Signal<ClientState>;
  readonly sessionId: Signal<string | null>;
  readonly isConnected: Signal<boolean>;

  private readonly stateSignal: WritableSignal<ClientState>;
  private readonly sessionIdSignal: WritableSignal<string | null>;
  private readonly isConnectedSignal: WritableSignal<boolean>;

  constructor(
    private readonly domosClient: DomOSClient,
    private readonly componentId = 'angular-sdk'
  ) {
    this.stateSignal = signal<ClientState>(this.domosClient.state);
    this.sessionIdSignal = signal<string | null>(this.domosClient.sessionId);
    this.isConnectedSignal = signal<boolean>(this.domosClient.isConnected);

    this.state = this.stateSignal.asReadonly();
    this.sessionId = this.sessionIdSignal.asReadonly();
    this.isConnected = this.isConnectedSignal.asReadonly();

    this.domosClient.on({
      onStateChange: (state) => {
        this.stateSignal.set(state);
        this.isConnectedSignal.set(this.domosClient.isConnected);
      },
      onSessionId: (sessionId) => {
        this.sessionIdSignal.set(sessionId);
      },
    });
  }

  private syncSignals(): void {
    this.stateSignal.set(this.domosClient.state);
    this.sessionIdSignal.set(this.domosClient.sessionId);
    this.isConnectedSignal.set(this.domosClient.isConnected);
  }

  async connect(): Promise<void> {
    await this.domosClient.connect();
    this.syncSignals();
  }

  async disconnect(): Promise<void> {
    this.domosClient.disconnect();
    this.syncSignals();
  }

  sendText(text: string): void {
    this.domosClient.sendText(text);
  }

  updateContext(data: Record<string, unknown>): void {
    this.domosClient.updateContext(data);
  }

  subscribeEvent<TType extends DomOSClientEventType>(
    type: TType,
    listener: DomOSClientEventListener<TType>
  ): VoidFunction {
    return this.domosClient.onEvent(type, listener);
  }

  subscribeAnyEvent(listener: DomOSClientAnyEventListener): VoidFunction {
    return this.domosClient.onAnyEvent(listener);
  }

  registerTool<TArgs extends DomOSToolArgs = DomOSToolArgs>(
    definition: DomOSToolDefinition<TArgs>,
    handler: DomOSToolHandler<TArgs>
  ): VoidFunction {
    const { componentId, global, schema, parameters, ...declaration } = definition;
    const toolDeclaration: ToolDeclaration = {
      ...declaration,
      parameters: schema
        ? zodToToolParameters(schema as unknown as Parameters<typeof zodToToolParameters>[0])
        : parameters,
    };

    this.domosClient.registerTool({
      declaration: toolDeclaration,
      handler: async (args) => handler((args ?? {}) as TArgs),
      componentId: componentId ?? this.componentId,
      global,
    });

    return () => {
      this.domosClient.unregisterTool(toolDeclaration.name);
    };
  }
}