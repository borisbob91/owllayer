import {
  NgZone,
  Injector,
  inject,
  createEnvironmentInjector,
  runInInjectionContext,
  type Provider,
} from '@angular/core';
import { OwlLayerClient, type ClientState, type ToolDeclaration } from '@owllayer/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  OwlLayerAngularService,
  OwlLayerWidgetComponent,
  OwlLayerApprovalModalComponent,
  OwlLayerVoiceService,
  type OwlLayerResolverToolDefinition,
  injectOwlLayer,
  provideOwlLayer,
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

class FakeOwlLayerClient {
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
  readonly sendAudioCalls: Array<{ audioBase64: string; mimeType?: string }> = [];
  readonly sendAudioStreamCalls: Array<{ audioBase64: string; mimeType?: string }> = [];
  readonly sendAudioEndCalls: Array<'user_stop' | 'vad' | 'timeout' | undefined> = [];
  sendInterruptCalls = 0;
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

  sendAudio(audioBase64: string, mimeType?: string): void {
    this.sendAudioCalls.push({ audioBase64, mimeType });
  }

  sendAudioStream(audioBase64: string, mimeType?: string): void {
    this.sendAudioStreamCalls.push({ audioBase64, mimeType });
  }

  sendAudioEnd(reason?: 'user_stop' | 'vad' | 'timeout'): void {
    this.sendAudioEndCalls.push(reason);
  }

  sendInterrupt(): void {
    this.sendInterruptCalls += 1;
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

function createAngularInjector(extraProviders: Provider[] = []) {
  return createEnvironmentInjector(
    [
      provideOwlLayer({
        endpoint: 'ws://localhost:3000/owllayer',
        apiKey: 'pk_demo_local',
      }),
      ...extraProviders,
    ],
    Injector.NULL as never
  );
}

function getInjectedClient(service: OwlLayerAngularService): OwlLayerClient {
  return (service as unknown as { owlLayerClient: OwlLayerClient }).owlLayerClient;
}

describe('@owllayer/angular', () => {
  it('publishes Angular environment providers', () => {
    const providers = provideOwlLayer({
      endpoint: 'ws://localhost:3000/owllayer',
      apiKey: 'pk_demo_local',
    });

    expect(providers).toBeTruthy();
  });

  it('exposes reactive state and delegates client capabilities through the service facade', async () => {
    const client = new FakeOwlLayerClient();
    const service = new OwlLayerAngularService(
      client as unknown as OwlLayerClient,
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
    service.sendAudio('pcm-chunk', 'audio/pcm;rate=16000');
    service.sendAudioStream('pcm-stream');
    service.sendAudioEnd('user_stop');
    service.sendInterrupt();
    service.updateContext({ page: 'home' });

    expect(client.sendTextCalls).toEqual(['Bonjour agent']);
    expect(client.sendAudioCalls).toEqual([
      { audioBase64: 'pcm-chunk', mimeType: 'audio/pcm;rate=16000' },
    ]);
    expect(client.sendAudioStreamCalls).toEqual([
      { audioBase64: 'pcm-stream', mimeType: undefined },
    ]);
    expect(client.sendAudioEndCalls).toEqual(['user_stop']);
    expect(client.sendInterruptCalls).toBe(1);
    expect(client.updateContextCalls).toEqual([{ page: 'home' }]);

    const audioOutputs: Array<{ audioBase64: string; mimeType: string }> = [];
    const unsubscribeAudio = service.onAudioOutput((audioBase64, mimeType) => {
      audioOutputs.push({ audioBase64, mimeType });
    });

    client.emitEvent('audio.output.chunk', {
      audioBase64: 'agent-audio',
      mimeType: 'audio/pcm;rate=24000',
    });

    expect(audioOutputs).toEqual([
      { audioBase64: 'agent-audio', mimeType: 'audio/pcm;rate=24000' },
    ]);

    unsubscribeAudio();

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
        const injectedService = injectOwlLayer();
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
          service: injectOwlLayer(),
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
                  } satisfies OwlLayerResolverToolDefinition<SearchArgs>,
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

      await expect(client.callTool('app_search', { query: 'owllayer' })).resolves.toEqual({
        query: 'owllayer',
      });
      await expect(client.callTool('app_search', { query: 'x' })).rejects.toThrow(
        'Validation failed for "app_search"'
      );

      expect(beforeCalls).toEqual(['owllayer']);
      expect(afterCalls).toEqual(['owllayer']);
      expect(errorCalls).toHaveLength(1);

      handle.destroy();

      expect(client.registeredTools).toHaveLength(0);
    } finally {
      injector.destroy();
    }
  });

  it('uses provided NgZone when available', async () => {
    const runOutsideAngularCalls: string[] = [];
    const fakeNgZone = {
      run: <T>(fn: (...args: any[]) => T): T => fn(),
      runOutsideAngular: <T>(fn: (...args: any[]) => T): T => {
        runOutsideAngularCalls.push('called');
        return fn();
      },
    } as NgZone;

    const injector = createAngularInjector([{ provide: NgZone, useValue: fakeNgZone }]);

    try {
      const service = runInInjectionContext(injector, () => injectOwlLayer());
      const client = getInjectedClient(service);

      service.registerTool(
        {
          name: 'zone_tool',
          description: 'Tool exécuté hors zone.',
        },
        async () => ({ ok: true })
      );

      await expect(client.callTool('zone_tool', {})).resolves.toEqual({ ok: true });
      expect(runOutsideAngularCalls).toEqual(['called']);
    } finally {
      injector.destroy();
    }
  });

  it('keeps playback context open during operational stops and sends audio end once', () => {
    const closeCalls: string[] = [];
    const stopCalls: string[] = [];
    const disconnectCalls: string[] = [];
    const sendAudioEndCalls: Array<'user_stop' | 'vad' | 'timeout' | undefined> = [];
    const fakeSource = {
      stop: () => { stopCalls.push('stop'); },
      disconnect: () => { disconnectCalls.push('disconnect'); },
    };
    const fakePlaybackContext = {
      state: 'running',
      close: () => {
        closeCalls.push('close');
        return Promise.resolve();
      },
    };

    const injector = createAngularInjector([OwlLayerVoiceService]);

    try {
      const voice = runInInjectionContext(injector, () => inject(OwlLayerVoiceService));
      (voice as any).owllayer = {
        sendAudioEnd: (reason?: 'user_stop' | 'vad' | 'timeout') => {
          sendAudioEndCalls.push(reason);
        },
      };

      (voice as any).playbackContext = fakePlaybackContext;
      (voice as any).playbackSources = new Set([fakeSource]);
      (voice as any).isRecording.set(true);

      (voice as any).stopPlaybackInternal();
      expect(stopCalls).toEqual(['stop']);
      expect(disconnectCalls).toEqual(['disconnect']);
      expect(closeCalls).toEqual([]);

      voice.stopCapture('user_stop');
      expect(sendAudioEndCalls).toEqual(['user_stop']);
      voice.stopCapture('user_stop');
      expect(sendAudioEndCalls).toEqual(['user_stop']);
    } finally {
      injector.destroy();
    }
  });

  it('exposes widget surface components', () => {
    expect(OwlLayerWidgetComponent).toBeTruthy();
    expect(OwlLayerApprovalModalComponent).toBeTruthy();
  });
});
