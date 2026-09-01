import {
  OwlLayerClient,
  EventEmitter,
  OwlLayerAgent,
  RemoteMemoryAdapter,
  generateId,
  getBrowserId,
  registerMemoryTools,
  installPlugin,
  type OwlLayerClientAnyEventListener,
  type OwlLayerClientEvent,
  type OwlLayerClientEventListener,
  type OwlLayerClientEventMap,
  type OwlLayerClientEventType,
  type ApprovalRequest,
  type ClientState,
  type RemoteMemoryTransport,
  type ToolDeclaration,
  type ToolParameters,
  type OwlLayerClientPlugin,
} from '@owllayer/core';
import { LocalStorageTransport } from './LocalStorageTransport.js';
import type { AgentState, BrowserToolDefinition, OwlLayerBrowserConfig, JsonSchemaObject, SessionInfo, VoiceState } from '../types.js';
import { AutoDiscoveryManager } from './autoDiscovery.js';
import { clearSessionSnapshot, loadSessionSnapshot, saveSessionSnapshot } from './sessionPersistence.js';
import { HitlOverlay } from '../ui/HitlOverlay.js';
import { OwlLayerChatWidget } from '../ui/OwlLayerChatWidget.js';
import { VoiceManager } from './VoiceManager.js';
import { normalizeParameters } from './utils.js';

const SESSION_KEY = 'owllayer_browser_session_v1';

export class BrowserOwlLayer {
  private client: OwlLayerClient | null = null;
  private initialized = false;
  private config: Required<OwlLayerBrowserConfig> | null = null;

  private readonly tools = new Map<string, BrowserToolDefinition>();
  private currentContext: Record<string, unknown> = {};
  private recentMessages: Array<{ role: 'user' | 'agent'; content: string; timestamp: number }> = [];

  private autoDiscovery: AutoDiscoveryManager | null = null;
  private hitlOverlay: HitlOverlay | null = null;
  private widgetHost: OwlLayerChatWidget | null = null;
  private voiceManager: VoiceManager | null = null;
  /** OwlLayerAgent — mode standalone (sans serveur dédié). null si memory.enabled !== true */
  private owllayerAgent: OwlLayerAgent | null = null;

  private sessionKey = SESSION_KEY;
  private agentState: AgentState = 'connecting';
  private readonly agentStateCallbacks: Array<(state: AgentState) => void> = [];
  private readonly responseCallbacks: Array<(text: string, done: boolean) => void> = [];
  private readonly errorCallbacks: Array<(error: Error) => void> = [];
  private readonly readyCallbacks: Array<() => void> = [];
  private readonly toolCallCallbacks: Array<(name: string, args: Record<string, unknown>) => void> = [];
  private readonly eventEmitter = new EventEmitter<OwlLayerClientEventMap>();
  private readonly boundBeforeUnload = (): void => { this.persistSnapshot(); };
  private readonly relayClientEvent = (event: OwlLayerClientEvent): void => {
    this.eventEmitter.emit(event.type, event.payload as OwlLayerClientEventMap[typeof event.type]);
  };

  async init(config: OwlLayerBrowserConfig): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('@owllayer/browser est client-only.');
    }

    if (this.initialized) return;

    const sessionCfg = config.session ?? config.sessionPersistence;
    const merged = {
      ...config,
      debug: config.debug ?? false,
      autoConnect: config.autoConnect ?? true,
      context: config.context ?? {},
      widget: {
        enabled: config.widget?.enabled ?? true,
        config: config.widget?.config ?? {},
      },
      hitl: { enabled: config.hitl?.enabled ?? true },
      autoDiscovery: { enabled: config.autoDiscovery?.enabled ?? true },
      sessionPersistence: {
        enabled: sessionCfg?.enabled ?? true,
        ttlMs: sessionCfg?.ttlMs ?? 30 * 60 * 1000,
      },
      session: config.session ?? {},
      onReady: config.onReady,
      onError: config.onError,
    } as Required<OwlLayerBrowserConfig>;

    this.config = merged;
    this.currentContext = { ...merged.context };

    this.sessionKey = config.session?.storageKey ?? SESSION_KEY;
    if (config.onReady) this.readyCallbacks.push(config.onReady);
    if (config.onError) this.errorCallbacks.push(config.onError);

    const autoResume = config.session?.autoResume ?? true;
    if (autoResume && merged.sessionPersistence.enabled) {
      const restored = loadSessionSnapshot(this.sessionKey);
      if (restored) {
        this.currentContext = { ...restored.context, ...this.currentContext };
        this.recentMessages = restored.recentMessages;
      }
    }

    this.client = new OwlLayerClient({
      endpoint: merged.endpoint,
      apiKey: merged.apiKey,
      debug: merged.debug,
      autoReconnect: true,
    });
    this.client.onAnyEvent(this.relayClientEvent);

    this.client.on({
      onSessionId: () => {
        const isResume = !!loadSessionSnapshot(this.sessionKey);
        this.persistSnapshot();
        if (isResume) {
          this.config?.session?.onResume?.();
        } else {
          this.config?.session?.onNewSession?.();
        }
      },
      onStateChange: (state) => this.onStateChange(state),
      onAgentResponse: (text) => {
        this.upsertAgentMessage(text);
      },
      onSystemEvent: (kind, message) => {
        if (kind === 'error') {
          const errorMsg = message ?? 'Erreur du service IA';
          this.upsertAgentMessage(`⚠️ ${errorMsg}`);
        }
      },
      onError: (err) => {
        this.errorCallbacks.forEach(cb => cb(err instanceof Error ? err : new Error(String(err))));
      },
      onToolsSync: (tools) => {
        if (merged.debug) {
          // eslint-disable-next-line no-console
          console.debug(`[OwlLayer/browser] tools sync: ${tools.length}`);
        }
      },
      onApprovalRequest: (request: ApprovalRequest, resolve) => {
        this.hitlOverlay?.show(request, resolve);
      },
      onLineAcquired: (_ln: string, waiting: boolean) => {
        this.widgetHost?.setLineState(waiting ? 'waiting' : 'idle');
      },
      onLineBusy: () => {
        this.widgetHost?.setLineState('busy');
      },
      onLineReady: (_ln: string) => {
        this.widgetHost?.setLineState('idle');
      },
      onAudioOutput: (audioBase64: string, mimeType: string) => {
        this.voiceManager?.playChunk(audioBase64, mimeType);
      },
    });

    if (merged.hitl.enabled) {
      this.hitlOverlay = new HitlOverlay();
      this.hitlOverlay.mount();
    }

    if (merged.widget.enabled) {
      this.widgetHost = new OwlLayerChatWidget({
        config: merged.widget.config,
        onSendText: (text) => this.sendText(text),
        voiceEnabled: !!(merged.voice as { enabled?: boolean })?.enabled,
        onVoiceToggle: async () => {
          if (this.isVoiceActive()) {
            this.stopVoice();
          } else {
            await this.startVoice();
          }
        },
        onModeToggle: async (newMode) => {
          if (newMode === 'voice' && !this.isVoiceActive()) {
            await this.startVoice().catch(() => {
              // Micro refusé ou erreur → rester en mode texte
              this.widgetHost?.setMode('text');
            });
          } else if (newMode === 'text' && this.isVoiceActive()) {
            this.stopVoice();
          }
        },
      });
      this.widgetHost.mount();
      if (this.recentMessages.length > 0) {
        this.widgetHost.restoreMessages(
          this.recentMessages.map((m, index) => ({
            id: `${m.role}_${index}_${m.timestamp}`,
            role: m.role,
            content: m.content,
          })),
        );
        // Session précédente détectée + autoResume → ouvrir le widget sans action de l'utilisateur
        if (autoResume) {
          this.widgetHost.open();
        }
      }
    }

    if (merged.autoDiscovery.enabled) {
      this.autoDiscovery = new AutoDiscoveryManager({
        debug: merged.debug,
        onContextData: (data) => { this.updateContext(data); },
        onToolDiscovered: (tool, handler) => {
          this.registerTool(tool.name, {
            description: tool.description,
            risk: tool.risk,
            handler,
            parameters: tool.schema ?? {
              type: 'OBJECT',
              properties: {
                selector: { type: 'STRING', description: 'Selecteur CSS cible (optionnel).' },
                value: { type: 'STRING', description: 'Valeur pour l\'action setValue (optionnel).' },
              },
            },
          });
        },
        onToolRemoved: (toolName) => {
          this.unregisterTool(toolName);
        },
      });
      this.autoDiscovery.start();
    }

    if (Object.keys(this.currentContext).length > 0) {
      this.client.updateContext(this.currentContext);
    }

    window.addEventListener('beforeunload', this.boundBeforeUnload);

    if (merged.autoConnect) {
      await this.client.connect();
    }

    // OwlLayerAgent standalone — suit la session locale, enrichit le contexte
    if ((config.memory as { enabled?: boolean })?.enabled) {
      const memKey = (config.memory as { storageKey?: string })?.storageKey ?? 'owllayer_agent_id';
      const userId = (config.memory as { userId?: string })?.userId ?? getBrowserId(memKey);
      const sessionId = generateId();
      const transport = (config.memory as { transport?: RemoteMemoryTransport })?.transport
        ?? new LocalStorageTransport(memKey);
      const adapter = new RemoteMemoryAdapter({ transport, cacheKeyPrefix: memKey });
      this.owllayerAgent = new OwlLayerAgent({ adapter, saveDebounceMs: 500 });
      await this.owllayerAgent.init({ sessionId, userId });
      registerMemoryTools(this.client, this.owllayerAgent);
      // Injecte le snapshot mémoire dans le contexte initial
      const snap = this.owllayerAgent.getMemorySnapshot();
      const memCtx: Record<string, unknown> = {};
      if (Object.keys(snap.persistent.preferences).length > 0) {
        memCtx.preferences = snap.persistent.preferences;
      }
      const lastSummary = snap.persistent.summaries?.at(-1);
      if (lastSummary) {
        memCtx.last_summary = lastSummary.text;
      }
      if (Object.keys(memCtx).length > 0) {
        this.client.updateContext({ __memory: memCtx });
      }
    }

    this.initialized = true;
  }

  registerTool(name: string, definition: BrowserToolDefinition): void {
    if (!this.client) {
      throw new Error('OwlLayer.init(config) doit etre appele avant registerTool().');
    }

    this.tools.set(name, definition);

    const declaration: ToolDeclaration = {
      name,
      description: definition.description,
      parameters: normalizeParameters(definition.parameters),
      risk: definition.risk ?? 'none',
    };

    this.client.registerTool({
      declaration,
      handler: async (args) => {
        this.toolCallCallbacks.forEach(cb => cb(name, args ?? {}));
        return definition.handler(args ?? {});
      },
      componentId: 'browser-sdk',
      global: true,
    });
  }

  unregisterTool(name: string): void {
    this.tools.delete(name);
    this.client?.unregisterTool(name);
  }

  /**
   * Retourne les declarations des tools enregistres (pour DevTools).
   */
  getRegisteredTools(): ToolDeclaration[] {
    return this.client?.registeredTools ?? [];
  }

  /**
   * Appeler directement le handler d'un tool enregistre (simulation dev / DevTools).
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`callTool: outil '${name}' non enregistre`);
    }
    return tool.handler(args);
  }

  /**
   * Monte le panneau DevTools (@owllayer/ui) dans un element DOM.
   * Appel uniquement en developpement — charge @owllayer/ui de facon dynamique.
   */
  async mountDevTools(container?: HTMLElement): Promise<void> {
    const el = container ?? (() => {
      const d = document.createElement('div');
      d.id = '__owllayer_devtools__';
      document.body.appendChild(d);
      return d;
    })();
    const uiDevToolsPath = '@owllayer/ui/devtools';
    const legacyPath = '@owllayer/ui/devtools';
    const loadDevTools = () =>
      (import(/* @vite-ignore */ uiDevToolsPath) as Promise<any>).catch(
        () => import(/* @vite-ignore */ legacyPath) as Promise<any>,
      );
    const { mountDevTools } = await loadDevTools();
    mountDevTools(el, {
      plugins: this.client?.registeredPlugins ?? [],
      getRegisteredTools: () => this.client?.toolsInfo ?? this.getRegisteredTools(),
      getToolSurface: () => this.client?.toolSurface ?? {
        effectiveTools: [],
        serverTools: [],
        clientTools: [],
        ignoredClientTools: [],
      },
      getEffectiveTools: () => this.client?.effectiveTools ?? [],
      getIgnoredClientTools: () => this.client?.ignoredClientTools ?? [],
      callTool: (name: string, args: Record<string, unknown>) => this.callTool(name, args),
      getAgentState: () => this.getAgentState(),
      getSessionId: () => this.getSession().sessionId,
      subscribeEvent: <TType extends OwlLayerClientEventType>(type: TType, listener: OwlLayerClientEventListener<TType>) => this.subscribeEvent(type, listener),
      subscribeAnyEvent: (listener: OwlLayerClientAnyEventListener) => this.subscribeAnyEvent(listener),
    });
  }

  subscribeEvent<TType extends OwlLayerClientEventType>(
    type: TType,
    listener: OwlLayerClientEventListener<TType>,
  ): () => void {
    this.eventEmitter.on(type, listener);
    return () => {
      this.eventEmitter.off(type, listener);
    };
  }

  subscribeAnyEvent(listener: OwlLayerClientAnyEventListener): () => void {
    this.eventEmitter.onAny(listener);
    return () => {
      this.eventEmitter.offAny(listener);
    };
  }

  installPlugin<C>(plugin: OwlLayerClientPlugin<C>, config: C): void {
    if (!this.client) throw new Error('OwlLayer.init() must be called before installPlugin().');
    installPlugin(this.client, plugin, config);
  }

  updateContext(data: Record<string, unknown>): void {
    this.currentContext = { ...this.currentContext, ...data };
    this.client?.updateContext(data);
    this.persistSnapshot();
  }

  sendText(text: string): void {
    const value = text.trim();
    if (!value) return;
    this.pushMessage('user', value);
    // Alimente OwlLayerAgent si activé
    this.owllayerAgent?.onUserRequest(value);
    this.widgetHost?.addUserMessage(value);
    this.client?.sendText(value);
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.boundBeforeUnload);
    }

    this.voiceManager?.destroy();
    this.voiceManager = null;

    // flush() est async — fire-and-forget pour garder destroy() synchrone
    void this.owllayerAgent?.flush();
    this.owllayerAgent = null;

    this.autoDiscovery?.stop();
    this.autoDiscovery = null;

    this.widgetHost?.unmount();
    this.widgetHost = null;

    this.hitlOverlay?.unmount();
    this.hitlOverlay = null;

    if (this.client) {
      this.client.offAnyEvent(this.relayClientEvent);
      this.client.destroy();
    }
    this.client = null;

    this.eventEmitter.clear();
    this.agentStateCallbacks.length = 0;
    this.responseCallbacks.length = 0;
    this.errorCallbacks.length = 0;
    this.readyCallbacks.length = 0;
    this.toolCallCallbacks.length = 0;

    this.tools.clear();
    this.currentContext = {};
    this.recentMessages = [];
    this.agentState = 'connecting';
    this.initialized = false;
    this.config = null;
    clearSessionSnapshot(this.sessionKey);
    this.sessionKey = SESSION_KEY;
  }

  onResponse(cb: (text: string, done: boolean) => void): void {
    this.responseCallbacks.push(cb);
  }

  onError(cb: (error: Error) => void): void {
    this.errorCallbacks.push(cb);
  }

  onReady(cb: () => void): void {
    this.readyCallbacks.push(cb);
  }

  onToolCall(cb: (name: string, args: Record<string, unknown>) => void): void {
    this.toolCallCallbacks.push(cb);
  }

  setContext(data: Record<string, unknown>): void {
    this.currentContext = { ...data };
    this.client?.updateContext(this.currentContext);
    this.persistSnapshot();
  }

  disconnect(): void {
    this.client?.disconnect();
  }

  openWidget(): void {
    this.widgetHost?.open();
  }

  // ---------------------------------------------------------------------------
  // API Voix
  // ---------------------------------------------------------------------------

  async startVoice(): Promise<void> {
    if (!this.client) {
      throw new Error('OwlLayer.init(config) doit être appelé avant startVoice().');
    }
    if (!this.voiceManager) {
      const voiceCfg = this.config?.voice ?? {};
      this.voiceManager = new VoiceManager(this.client, {
        sampleRate: voiceCfg.sampleRate,
        live: voiceCfg.live,
        fallbackToText: voiceCfg.fallbackToText ?? true,
        debug: this.config?.debug ?? false,
        onStateChange: (state: VoiceState) => {
          voiceCfg.onStateChange?.(state);
          const voiceToAgent: Record<VoiceState, AgentState> = {
            idle: 'idle',
            capturing: 'listening',
            awaiting_model: 'thinking',
            playing: 'speaking',
            interrupted: 'idle',
            error: 'error',
          };
          this.setAgentState(voiceToAgent[state] ?? 'idle');
          if (state === 'capturing') this.widgetHost?.setMode('voice');
          // mode reste 'voice' entre les tours — l'utilisateur bascule manuellement vers 'text'
        },
        onMicDenied: () => {
          if (this.config?.debug) {
            console.warn('[OwlLayer/browser] Accès micro refusé — mode texte maintenu.');
          }
        },
        onPlaybackComplete: () => {
          this.eventEmitter.emit('playback.completed', {
            source: 'browser',
            sessionId: this.client?.sessionId ?? undefined,
          });
        },
      });
    }
    await this.voiceManager.start();
  }

  stopVoice(): void {
    this.voiceManager?.stop();
  }

  /**
   * Coupe le micro côté client uniquement, sans notifier le serveur.
   * La session WebSocket reste ouverte. Appeler startVoice() pour reprendre.
   */
  muteMic(): void {
    this.voiceManager?.muteMic();
  }

  isVoiceActive(): boolean {
    return this.voiceManager?.isActive() ?? false;
  }

  getVoiceState(): VoiceState {
    return this.voiceManager?.state ?? 'idle';
  }

  onAgentStateChange(cb: (state: AgentState) => void): void {
    this.agentStateCallbacks.push(cb);
  }

  getAgentState(): AgentState {
    return this.agentState;
  }

  /**
   * Retourne le snapshot mémoire courant (OwlLayerAgent standalone).
   * Null si memory.enabled n'est pas activé.
   */
  getMemorySnapshot() {
    return this.owllayerAgent?.getMemorySnapshot() ?? null;
  }

  /**
   * Ajoute un feedback utilisateur dans OwlLayerAgent (standalone).
   * Utilisé par l'agent via un outil navigateur ou par le développeur.
   */
  addFeedback(feedback: { type: 'positive' | 'negative' | 'correction' | 'suggestion'; message: string; score?: number }): void {
    this.owllayerAgent?.addFeedback(feedback);
  }

  getSession(): SessionInfo {
    return {
      sessionId: this.client?.sessionId ?? null,
      status: this.initialized ? 'connected' : 'disconnected',
      messageCount: this.recentMessages.length,
    };
  }

  private setAgentState(state: AgentState): void {
    this.agentState = state;
    this.widgetHost?.setAgentState(state);
    this.agentStateCallbacks.forEach(cb => cb(state));
  }

  private onStateChange(state: ClientState): void {
    const mapped: AgentState =
      state === 'thinking' ? 'thinking'
      : state === 'speaking' ? 'speaking'
      : state === 'listening' ? 'listening'
      : state === 'error' ? 'error'
      : state === 'connected' ? 'idle'
      : 'connecting';

    // Ne pas écraser un état vocal en cours
    if (this.voiceManager?.isActive() && state === 'connected') return;
    this.setAgentState(mapped);

    if (state === 'connected' && this.readyCallbacks.length > 0) {
      this.readyCallbacks.forEach(cb => cb());
      this.readyCallbacks.length = 0;
    }
  }

  private upsertAgentMessage(content: string): void {
    if (!content) return;

    const last = this.recentMessages[this.recentMessages.length - 1];
    if (last?.role === 'agent') {
      last.content = content;
      last.timestamp = Date.now();
    } else {
      this.pushMessage('agent', content);
    }

    // Alimente OwlLayerAgent si activé
    this.owllayerAgent?.onAgentResponse(content);
    this.widgetHost?.upsertAgentMessage(content);
    this.responseCallbacks.forEach(cb => cb(content, true));
    this.persistSnapshot();
  }

  private pushMessage(role: 'user' | 'agent', content: string): void {
    this.recentMessages.push({ role, content, timestamp: Date.now() });
    const max = this.config?.session?.maxHistoryMessages ?? 10;
    if (this.recentMessages.length > max) {
      this.recentMessages.splice(0, this.recentMessages.length - max);
    }
    this.persistSnapshot();
  }

  private persistSnapshot(): void {
    if (!this.config?.sessionPersistence.enabled) return;

    saveSessionSnapshot(
      this.sessionKey,
      {
        sessionId: this.client?.sessionId ?? null,
        context: this.currentContext,
        recentMessages: this.recentMessages,
      },
      this.config.sessionPersistence.ttlMs,
    );
  }
}
