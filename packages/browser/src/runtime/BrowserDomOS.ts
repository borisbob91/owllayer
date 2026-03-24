import {
  DomOSClient,
  DomosAgent,
  type ApprovalRequest,
  type ClientState,
  type ToolDeclaration,
  type ToolParameters,
} from '@domos/core';
import type { AgentState, BrowserToolDefinition, DomOSBrowserConfig, JsonSchemaObject, SessionInfo, VoiceState } from '../types.js';
import { AutoDiscoveryManager } from './autoDiscovery.js';
import { clearSessionSnapshot, loadSessionSnapshot, saveSessionSnapshot } from './sessionPersistence.js';
import { HitlOverlay } from '../ui/HitlOverlay.js';
import { DomosChatWidget } from '../ui/DomosChatWidget.js';
import { VoiceManager } from './VoiceManager.js';
import { normalizeParameters } from './utils.js';

const SESSION_KEY = 'domos_browser_session_v1';

export class BrowserDomOS {
  private client: DomOSClient | null = null;
  private initialized = false;
  private config: Required<DomOSBrowserConfig> | null = null;

  private readonly tools = new Map<string, BrowserToolDefinition>();
  private currentContext: Record<string, unknown> = {};
  private recentMessages: Array<{ role: 'user' | 'agent'; content: string; timestamp: number }> = [];

  private autoDiscovery: AutoDiscoveryManager | null = null;
  private hitlOverlay: HitlOverlay | null = null;
  private widgetHost: DomosChatWidget | null = null;
  private voiceManager: VoiceManager | null = null;
  /** DomosAgent — mode standalone (sans serveur dédié). null si memory.enabled !== true */
  private domosAgent: DomosAgent | null = null;

  private sessionKey = SESSION_KEY;
  private agentState: AgentState = 'connecting';
  private readonly agentStateCallbacks: Array<(state: AgentState) => void> = [];
  private readonly responseCallbacks: Array<(text: string, done: boolean) => void> = [];
  private readonly errorCallbacks: Array<(error: Error) => void> = [];
  private readonly readyCallbacks: Array<() => void> = [];
  private readonly toolCallCallbacks: Array<(name: string, args: Record<string, unknown>) => void> = [];
  private readonly boundBeforeUnload = (): void => { this.persistSnapshot(); };

  async init(config: DomOSBrowserConfig): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('@domos/browser est client-only.');
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
    } as Required<DomOSBrowserConfig>;

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

    this.client = new DomOSClient({
      endpoint: merged.endpoint,
      apiKey: merged.apiKey,
      debug: merged.debug,
      autoReconnect: true,
    });

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
      onError: (err) => {
        this.errorCallbacks.forEach(cb => cb(err instanceof Error ? err : new Error(String(err))));
      },
      onToolsSync: (tools) => {
        if (merged.debug) {
          // eslint-disable-next-line no-console
          console.debug(`[DomOS/browser] tools sync: ${tools.length}`);
        }
      },
      onApprovalRequest: (request: ApprovalRequest, resolve) => {
        this.hitlOverlay?.show(request, resolve);
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
      this.widgetHost = new DomosChatWidget({
        config: merged.widget.config,
        onSendText: (text) => this.sendText(text),
        voiceEnabled: !!(merged.voice as { enabled?: boolean })?.enabled,
        onVoiceToggle: async () => {
          if (this.isVoiceActive()) {
            this.stopVoice();
            this.widgetHost?.setMode('text');
          } else {
            await this.startVoice();
            this.widgetHost?.setMode('voice');
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

    // DomosAgent standalone — suit la session locale, enrichit le contexte
    if ((config.memory as { enabled?: boolean })?.enabled) {
      const memKey = (config.memory as { storageKey?: string })?.storageKey ?? 'domos_agent_id';
      const userId = (config.memory as { userId?: string })?.userId;
      const sessionId = localStorage.getItem(memKey) ?? (() => {
        const id = `browser_${Math.random().toString(36).slice(2, 11)}`;
        localStorage.setItem(memKey, id);
        return id;
      })();
      this.domosAgent = new DomosAgent({ saveDebounceMs: 500 });
      await this.domosAgent.init({ sessionId, userId });
      // Injecte le snapshot mémoire dans le contexte initial
      const snap = this.domosAgent.getMemorySnapshot();
      if (Object.keys(snap.persistent.preferences).length > 0) {
        this.client.updateContext({ __memory: snap.persistent.preferences });
      }
    }

    this.initialized = true;
  }

  registerTool(name: string, definition: BrowserToolDefinition): void {
    if (!this.client) {
      throw new Error('DomOS.init(config) doit etre appele avant registerTool().');
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

  updateContext(data: Record<string, unknown>): void {
    this.currentContext = { ...this.currentContext, ...data };
    this.client?.updateContext(data);
    this.persistSnapshot();
  }

  sendText(text: string): void {
    const value = text.trim();
    if (!value) return;
    this.pushMessage('user', value);
    // Alimente DomosAgent si activé
    this.domosAgent?.onUserRequest(value);
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
    void this.domosAgent?.flush();
    this.domosAgent = null;

    this.autoDiscovery?.stop();
    this.autoDiscovery = null;

    this.widgetHost?.unmount();
    this.widgetHost = null;

    this.hitlOverlay?.unmount();
    this.hitlOverlay = null;

    this.client?.destroy();
    this.client = null;

    this.tools.clear();
    this.currentContext = {};
    this.recentMessages = [];
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
      throw new Error('DomOS.init(config) doit être appelé avant startVoice().');
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
          else if (state === 'idle') this.widgetHost?.setMode('text');
        },
        onMicDenied: () => {
          if (this.config?.debug) {
            console.warn('[DomOS/browser] Accès micro refusé — mode texte maintenu.');
          }
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
   * Retourne le snapshot mémoire courant (DomosAgent standalone).
   * Null si memory.enabled n'est pas activé.
   */
  getMemorySnapshot() {
    return this.domosAgent?.getMemorySnapshot() ?? null;
  }

  /**
   * Ajoute un feedback utilisateur dans DomosAgent (standalone).
   * Utilisé par l'agent via un outil navigateur ou par le développeur.
   */
  addFeedback(feedback: { type: 'positive' | 'negative' | 'correction' | 'suggestion'; message: string; score?: number }): void {
    this.domosAgent?.addFeedback(feedback);
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

    // Alimente DomosAgent si activé
    this.domosAgent?.onAgentResponse(content);
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
