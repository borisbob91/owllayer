import {
  DomOSClient,
  type ApprovalRequest,
  type ClientState,
  type ToolDeclaration,
} from '@domos/core';
import type { BrowserToolDefinition, DomOSBrowserConfig } from '../types.js';
import { AutoDiscoveryManager } from './autoDiscovery.js';
import { clearSessionSnapshot, loadSessionSnapshot, saveSessionSnapshot } from './sessionPersistence.js';
import { HitlOverlay } from '../ui/HitlOverlay.js';
import { WidgetHost } from '../ui/WidgetHost.js';

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
  private widgetHost: WidgetHost | null = null;

  async init(config: DomOSBrowserConfig): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('@domos/browser est client-only.');
    }

    if (this.initialized) return;

    const merged: Required<DomOSBrowserConfig> = {
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
        enabled: config.sessionPersistence?.enabled ?? true,
        ttlMs: config.sessionPersistence?.ttlMs ?? 30 * 60 * 1000,
      },
    };

    this.config = merged;
    this.currentContext = { ...merged.context };

    if (merged.sessionPersistence.enabled) {
      const restored = loadSessionSnapshot(SESSION_KEY);
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
      onSessionId: () => this.persistSnapshot(),
      onStateChange: (state) => this.onStateChange(state),
      onAgentResponse: (text) => {
        this.upsertAgentMessage(text);
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
    });

    if (merged.hitl.enabled) {
      this.hitlOverlay = new HitlOverlay();
      this.hitlOverlay.mount();
    }

    if (merged.widget.enabled) {
      this.widgetHost = new WidgetHost({
        config: merged.widget.config,
        onSendText: (text) => this.sendText(text),
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
      }
    }

    if (merged.autoDiscovery.enabled) {
      this.autoDiscovery = new AutoDiscoveryManager({
        debug: merged.debug,
        onToolDiscovered: (tool, handler) => {
          this.registerTool(tool.name, {
            description: tool.description,
            risk: tool.risk,
            handler,
            parameters: {
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

    if (merged.autoConnect) {
      await this.client.connect();
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
      parameters: definition.parameters,
      risk: definition.risk ?? 'none',
    };

    this.client.registerTool({
      declaration,
      handler: async (args) => definition.handler(args ?? {}),
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
    this.widgetHost?.addUserMessage(value);
    this.client?.sendText(value);
  }

  destroy(): void {
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
    clearSessionSnapshot(SESSION_KEY);
  }

  private onStateChange(state: ClientState): void {
    const mapped =
      state === 'thinking' ? 'thinking'
      : state === 'error' ? 'error'
      : 'connected';

    this.widgetHost?.setStatus(mapped);
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

    this.widgetHost?.upsertAgentMessage(content);
    this.persistSnapshot();
  }

  private pushMessage(role: 'user' | 'agent', content: string): void {
    this.recentMessages.push({ role, content, timestamp: Date.now() });
    if (this.recentMessages.length > 10) {
      this.recentMessages.splice(0, this.recentMessages.length - 10);
    }
    this.persistSnapshot();
  }

  private persistSnapshot(): void {
    if (!this.config?.sessionPersistence.enabled) return;

    saveSessionSnapshot(
      SESSION_KEY,
      {
        sessionId: this.client?.sessionId ?? null,
        context: this.currentContext,
        recentMessages: this.recentMessages,
      },
      this.config.sessionPersistence.ttlMs,
    );
  }
}
