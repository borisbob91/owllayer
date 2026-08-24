import {
  OwlLayerClient,
  type ClientState,
  type ToolDeclaration,
  type ToolParameters,
} from '@owllayer/core';
import type { BrowserToolDefinition, OwlLayerBrowserConfig, JsonSchemaObject, SessionInfo } from '../types.js';
import { AutoDiscoveryManager } from './autoDiscovery.js';
import { clearSessionSnapshot, loadSessionSnapshot, saveSessionSnapshot } from './sessionPersistence.js';
import { normalizeParameters } from './utils.js';

/**
 * Core-only runtime — identique à BrowserOwlLayer mais sans WidgetHost, HitlOverlay ni Preact.
 * Utilisé par le bundle dist/owllayer.core.esm.js (~8 KB gzippé).
 * Les devs qui apportent leur propre UI importent via : import { OwlLayer } from '@owllayer/browser/core'
 */

const SESSION_KEY = 'owllayer_browser_session_v1';

export class BrowserOwlLayerCore {
  private client: OwlLayerClient | null = null;
  private initialized = false;
  private config: Required<OwlLayerBrowserConfig> | null = null;

  private readonly tools = new Map<string, BrowserToolDefinition>();
  private currentContext: Record<string, unknown> = {};
  private recentMessages: Array<{ role: 'user' | 'agent'; content: string; timestamp: number }> = [];

  private autoDiscovery: AutoDiscoveryManager | null = null;
  private sessionKey = SESSION_KEY;
  private readonly responseCallbacks: Array<(text: string, done: boolean) => void> = [];
  private readonly errorCallbacks: Array<(error: Error) => void> = [];
  private readonly readyCallbacks: Array<() => void> = [];
  private readonly toolCallCallbacks: Array<(name: string, args: Record<string, unknown>) => void> = [];
  private readonly boundBeforeUnload = (): void => { this.persistSnapshot(); };

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
      widget: { enabled: false, config: config.widget?.config ?? {} },
      hitl: { enabled: false },
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
      onAgentResponse: (text) => { this.upsertAgentMessage(text); },
      onError: (err) => {
        this.errorCallbacks.forEach(cb => cb(err instanceof Error ? err : new Error(String(err))));
      },
      onToolsSync: (tools) => {
        if (merged.debug) {
          // eslint-disable-next-line no-console
          console.debug(`[OwlLayer/browser/core] tools sync: ${tools.length}`);
        }
      },
      // HITL non disponible dans le bundle core — utiliser @owllayer/browser (bundle complet) pour le HITL
      onApprovalRequest: () => {},
    });

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
        onToolRemoved: (toolName) => { this.unregisterTool(toolName); },
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

  updateContext(data: Record<string, unknown>): void {
    this.currentContext = { ...this.currentContext, ...data };
    this.client?.updateContext(data);
    this.persistSnapshot();
  }

  sendText(text: string): void {
    const value = text.trim();
    if (!value) return;
    this.pushMessage('user', value);
    this.client?.sendText(value);
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.boundBeforeUnload);
    }

    this.autoDiscovery?.stop();
    this.autoDiscovery = null;

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

  getSession(): SessionInfo {
    return {
      sessionId: this.client?.sessionId ?? null,
      status: this.initialized ? 'connected' : 'disconnected',
      messageCount: this.recentMessages.length,
    };
  }

  private onStateChange(state: ClientState): void {
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
