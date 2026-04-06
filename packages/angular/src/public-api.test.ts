import {
  Injector,
  createEnvironmentInjector,
  runInInjectionContext,
} from '@angular/core';
import { DomOSClient, type ClientState, type ToolDeclaration } from '@domos/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  DomOSAngularService,
  DomOSWidgetComponent,
  DomOSApprovalModalComponent,
  type DomOSResolverToolDefinition,
  injectDomOS,
  provideDomOS,
  registerContext,
  registerNavigationTool,
  registerToolResolver,
  registerViewStateTool,
} from './public-api.js';

type RegisteredToolRecord = {
  declaration: ToolDeclaration;
  handler: (args: Record<string, unknown>) => Promise<unknown> | unknown;
  componentId: string;
  global?: boolean;
};

class FakeDomOSClient {
  state: ClientState = 'disconnected';
  sessionId: string | null = null;
  isConnected = false;
  registeredTools: ToolDeclaration[] = [];
  readonly connect = async (): Promise<void> => {
    this.setState('connecting');
  };
  readonly disconnect = (): void => {
    this.sessionId = null;
    this.setState('disconnected');
  };
  readonly sendTextCalls: string[] = [];
  readonly updateContextCalls: Array<Record<string, unknown>> = [];

  private handlers: {
    onStateChange?: (state: ClientState) => void;
    onSessionId?: (sessionId: string) => void;
  } = {};

  private readonly eventListeners = new Map<string, Set<(payload: unknown, event: unknown) => void>>();
  private readonly anyEventListeners = new Set<(event: unknown) => void>();
  private readonly tools = new Map<string, RegisteredToolRecord>();

  on(handlers: { onStateChange?: (state: ClientState) => void; onSessionId?: (sessionId: string) => void }): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  registerTool(tool: RegisteredToolRecord): void {
    this.tools.set(tool.declaration.name, tool);
    this.syncRegisteredTools();
  }

  unregisterTool(name: string): void {
    this.tools.delete(name);
    this.syncRegisteredTools();
  }

  updateContext(data: Record<string, unknown>): void {
    this.updateContextCalls.push(data);
  }

  sendText(text: string): void {
    this.sendTextCalls.push(text);
  }

  onEvent<TType extends string>(
    type: TType,
    listener: (payload: unknown, event: { type: TType; payload: unknown }) => void
  ): VoidFunction {
    const listeners = this.eventListeners.get(type) ?? new Set();
    listeners.add(listener as (payload: unknown, event: unknown) => void);
    this.eventListeners.set(type, listeners);

    return () => {
      listeners.delete(listener as (payload: unknown, event: unknown) => void);
    };
  }

  onAnyEvent(listener: (event: unknown) => void): VoidFunction {
    this.anyEventListeners.add(listener);

    return () => {
      this.anyEventListeners.delete(listener);
    };
  }

  setSessionId(sessionId: string | null): void {
    this.sessionId = sessionId;
    if (sessionId) {
      this.handlers.onSessionId?.(sessionId);
    }
  }

  setState(state: ClientState): void {
    this.state = state;
    this.isConnected = state === 'connected' || state === 'listening';
    this.handlers.onStateChange?.(state);
  }

  emitEvent<TType extends string>(type: TType, payload: unknown): void {
    const event = { type, payload };
    const listeners = this.eventListeners.get(type);

    listeners?.forEach((listener) => {
      listener(payload, event);
    });

    this.anyEventListeners.forEach((listener) => {
      listener(event);
    });
  }

  private syncRegisteredTools(): void {
    this.registeredTools = Array.from(this.tools.values()).map((tool) => tool.declaration);
  }
}

function createAngularInjector() {
  return createEnvironmentInjector(
    [
      provideDomOS({
        endpoint: 'ws://localhost:3000/domos',
        apiKey: 'pk_demo_local',
      }),
    ],
    Injector.NULL as never
  );
}

function getInjectedClient(service: DomOSAngularService): DomOSClient {
  return (service as unknown as { domosClient: DomOSClient }).domosClient;
}

describe('@domos/angular', () => {
  it('publishes Angular environment providers', () => {
    const providers = provideDomOS({
      endpoint: 'ws://localhost:3000/domos',
      apiKey: 'pk_demo_local',
    });

    expect(providers).toBeTruthy();
  });

  it('exposes reactive state and delegates client capabilities through the service facade', async () => {
    const client = new FakeDomOSClient();
    const service = new DomOSAngularService(
      client as unknown as DomOSClient,
      'angular-test'
    );

    expect(service.state()).toBe('disconnected');
    expect(service.sessionId()).toBeNull();
    expect(service.isConnected()).toBe(false);

    await service.connect();
    expect(service.state()).toBe('connecting');

    client.setState('connected');
    client.setSessionId('session-angular');

    expect(service.state()).toBe('connected');
    expect(service.sessionId()).toBe('session-angular');
    expect(service.isConnected()).toBe(true);

    service.sendText('Bonjour agent');
    service.updateContext({ page: 'home' });

    expect(client.sendTextCalls).toEqual(['Bonjour agent']);
    expect(client.updateContextCalls).toEqual([{ page: 'home' }]);

    const typedEvents: Array<{ sessionId: string }> = [];
    const allEvents: Array<{ type: string; payload: unknown }> = [];
    const unsubscribeTyped = service.subscribeEvent('session.started', (payload) => {
      typedEvents.push(payload);
    });
    const unsubscribeAny = service.subscribeAnyEvent((event) => {
      allEvents.push(event as { type: string; payload: unknown });
    });

    client.emitEvent('session.started', { sessionId: 'session-angular' });

    expect(typedEvents).toEqual([{ sessionId: 'session-angular' }]);
    expect(allEvents).toEqual([
      { type: 'session.started', payload: { sessionId: 'session-angular' } },
    ]);

    unsubscribeTyped();
    unsubscribeAny();

    const dispose = service.registerTool(
      {
        name: 'demo_echo',
        description: 'Retourne la charge utile recue.',
        schema: z.object({ text: z.string().min(1) }),
      },
      async (args) => args
    );

    expect(client.registeredTools.map((tool) => tool.name)).toEqual(['demo_echo']);
    expect(client.registeredTools[0]?.parameters).toBeTruthy();

    dispose();

    expect(client.registeredTools).toHaveLength(0);

    await service.disconnect();

    expect(service.state()).toBe('disconnected');
    expect(service.sessionId()).toBeNull();
    expect(service.isConnected()).toBe(false);
  });

  it('registers reactive context and standard tools through Angular helpers', async () => {
    const injector = createAngularInjector();

    try {
      const { service, disposeContext } = runInInjectionContext(injector, () => {
        const injectedService = injectDomOS();
        const contextCleanup = registerContext({ pageId: 'home', locale: 'fr' });

        registerNavigationTool(async (args) => ({ navigatedTo: args.url }), {
          description: 'Routes: /, /catalog',
        });
        registerViewStateTool(async (args) => ({ next: args.action, viewId: args.viewId }));

        return {
          service: injectedService,
          disposeContext: contextCleanup,
        };
      });

      const client = getInjectedClient(service);

      expect(client.getContext()).toEqual({ pageId: 'home', locale: 'fr' });
      expect(client.registeredTools.map((tool) => tool.name)).toEqual(['navigate', 'ui_state']);

      await expect(
        client.callTool('navigate', { url: '/catalog', replace: true, state: { from: 'home' } })
      ).resolves.toEqual({ navigatedTo: '/catalog' });

      await expect(
        client.callTool('ui_state', { viewId: 'drawer', action: 'open', params: { tab: 'specs' } })
      ).resolves.toEqual({ next: 'open', viewId: 'drawer' });

      disposeContext();
    } finally {
      injector.destroy();
    }
  });

  it('registers resolver tools with zod validation and cleanup', async () => {
    const injector = createAngularInjector();
    const searchSchema = z.object({ query: z.string().min(2) });

    type SearchArgs = z.infer<typeof searchSchema>;

    try {
      const beforeCalls: string[] = [];
      const afterCalls: string[] = [];
      const errorCalls: string[] = [];

      const { handle, service } = runInInjectionContext(injector, () => {
        return {
          service: injectDomOS(),
          handle: registerToolResolver(
            {
              catalog: {
                prefix: 'catalog_',
                tools: {
                  search: {
                    description: 'Rechercher un produit.',
                    schema: searchSchema,
                    handler: async ({ query }: SearchArgs) => ({ query }),
                    onBeforeCall: ({ query }: SearchArgs) => {
                      beforeCalls.push(query);
                    },
                    onAfterCall: ({ query }: SearchArgs) => {
                      afterCalls.push(query);
                    },
                    onError: (_, error) => {
                      errorCalls.push(error.message);
                    },
                  } satisfies DomOSResolverToolDefinition<SearchArgs>,
                },
              },
            },
            {
              prefix: 'app_',
            }
          ),
        };
      });

      const client = getInjectedClient(service);

      expect(handle.toolNames).toEqual(['app_search']);
      expect(handle.toolCount).toBe(1);
      expect(client.registeredTools.map((tool) => tool.name)).toEqual(['app_search']);

      await expect(client.callTool('app_search', { query: 'domos' })).resolves.toEqual({
        query: 'domos',
      });
      await expect(client.callTool('app_search', { query: 'x' })).rejects.toThrow(
        'Validation failed for "app_search"'
      );

      expect(beforeCalls).toEqual(['domos']);
      expect(afterCalls).toEqual(['domos']);
      expect(errorCalls).toHaveLength(1);

      handle.destroy();

      expect(client.registeredTools).toHaveLength(0);
    } finally {
      injector.destroy();
    }
  });

  it('exposes widget surface components', () => {
    expect(DomOSWidgetComponent).toBeTruthy();
    expect(DomOSApprovalModalComponent).toBeTruthy();
  });
});