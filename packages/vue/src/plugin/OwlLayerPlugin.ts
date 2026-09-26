import { createApp, h, type App, type InjectionKey, reactive, ref, type Ref } from 'vue';
import {
  OwlLayerClient,
  installPlugin,
  type OwlLayerClientOptions,
  type ClientState,
  type ToolDeclaration,
  type ApprovalRequest,
  type RegisteredTool,
  type WidgetConfig,
  type PluginEntry,
  type HitlLabels,
} from '@owllayer/core';
import OwlLayerWidget from '../components/widget/OwlLayerWidget.vue';
import ApprovalModal from '../components/hitl.ApprovalModal.vue';
import ApprovalBanner from '../components/hitl.ApprovalBanner.vue';

// ============================================================
// Injection Key - Utilise par les composables
// ============================================================

export const OWLLAYER_CLIENT_KEY: InjectionKey<OwlLayerClient> = Symbol('owllayer-client');
export const OWLLAYER_STATE_KEY: InjectionKey<OwlLayerReactiveState> = Symbol('owllayer-state');
export const OWLLAYER_AUDIO_OUTPUT_KEY: InjectionKey<(callback: (audioBase64: string, mimeType: string) => void) => () => void> = Symbol('owllayer-audio-output');
export const OWLLAYER_APPROVAL_KEY: InjectionKey<Ref<PendingApproval | null>> = Symbol('owllayer-approval');
export const OWLLAYER_APPROVAL_RESOLVE_KEY: InjectionKey<(approved: boolean) => void> = Symbol('owllayer-approval-resolve');
export const OWLLAYER_HITL_LABELS_KEY: InjectionKey<HitlLabels> = Symbol('owllayer-hitl-labels');

/**
 * Demande d'approbation en attente.
 */
export interface PendingApproval {
  callId: string;
  toolName: string;
  args: Record<string, unknown>;
  message: string;
  risk: 'high' | 'critical';
}

/**
 * State reactif partage par tous les composables.
 */
export interface OwlLayerReactiveState {
  agentState: ClientState;
  sessionId: string | null;
  lastResponse: string | null;
  systemError: string | null;
  voiceEnabled: boolean;
  isConnected: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  lineState: 'idle' | 'waiting' | 'busy';
}

/**
 * Options du plugin OwlLayer pour Vue.
 */
export interface OwlLayerPluginOptions {
  /** Endpoint WebSocket du serveur OwlLayer */
  endpoint: string;

  /** Cle API publique */
  apiKey: string;

  /** Mode debug */
  debug?: boolean;

  /** Connexion automatique au mount */
  autoConnect?: boolean;

  /** Activer le mode vocal */
  voice?: boolean;
  /** UI HITL globale */
  hitl?: {
    ui?: 'modal' | 'banner' | 'none';
    /** Libelles de l'UI d'approbation (tous optionnels) */
    labels?: HitlLabels;
  };

  /** Tools globaux persistants independants du cycle de vie des vues */
  globalTools?: Omit<RegisteredTool, 'componentId'>[];
  /** Plugins a installer au demarrage (voir @owllayer/core OwlLayerClientPlugin) */
  plugins?: PluginEntry[];
  /** Auto-mount du widget par defaut */
  widget?: {
    enabled: boolean;
    config?: WidgetConfig;
  };
}

/**
 * OwlLayer Plugin pour Vue 3.
 *
 * @example
 * ```ts
 * import { createApp } from 'vue';
 * import { OwlLayerPlugin } from '@owllayer/vue';
 *
 * const app = createApp(App);
 * app.use(OwlLayerPlugin, {
 *   endpoint: 'ws://localhost:3000/owllayer',
 *   apiKey: 'pk_demo_local',
 * });
 * app.mount('#app');
 * ```
 */
export const OwlLayerPlugin = {
  install(app: App, options: OwlLayerPluginOptions) {
    const { autoConnect = true, voice = false, debug = false, globalTools = [], plugins = [], widget, hitl } = options;
    const hitlUi = hitl?.ui ?? 'modal';
    const hitlLabels: HitlLabels = hitl?.labels ?? {};
    const isClient = typeof window !== 'undefined' && typeof document !== 'undefined';

    // --- Creer le client ---
    const client = new OwlLayerClient({
      endpoint: options.endpoint,
      apiKey: options.apiKey,
      debug,
      autoReconnect: true,
    });

    // Enregistrer les tools globaux
    if (globalTools.length > 0) {
      globalTools.forEach(tool => {
        client.registerTool({
          ...tool,
          componentId: 'global-provider'
        });
      });
    }

    // Installer les plugins
    if (plugins.length > 0) {
      plugins.forEach(([plugin, pluginConfig]) => {
        installPlugin(client, plugin, pluginConfig);
      });
    }

    // --- State reactif ---
    const state = reactive<OwlLayerReactiveState>({
      agentState: 'disconnected',
      sessionId: null,
      lastResponse: null,
      systemError: null,
      voiceEnabled: voice,
      isConnected: false,
      isThinking: false,
      isSpeaking: false,
      lineState: 'idle',
    });

    // --- Audio output listeners ---
    const audioOutputListeners = new Set<(audioBase64: string, mimeType: string) => void>();
    const pendingApproval = ref<PendingApproval | null>(null);
    let approvalResolver: ((approved: boolean) => void) | null = null;

    // --- Brancher les events ---
    client.on({
      onStateChange: (newState: ClientState) => {
        state.agentState = newState;
        if (newState !== 'error' && newState !== 'disconnected') {
          state.systemError = null;
        }
        state.isConnected = newState === 'connected' || newState === 'listening';
        state.isThinking = newState === 'thinking';
        state.isSpeaking = newState === 'speaking';
      },
      onSessionId: (id: string) => {
        state.sessionId = id;
      },
      onAgentResponse: (text: string, done: boolean) => {
        state.lastResponse = text;
        state.systemError = null;
        state.agentState = done ? 'connected' : 'speaking';
        state.isSpeaking = !done;
        state.isConnected = done;
      },
      onAudioOutput: (audioBase64: string, mimeType: string) => {
        audioOutputListeners.forEach((listener) => listener(audioBase64, mimeType));
      },
      onToolsSync: (tools: ToolDeclaration[]) => {
        if (debug) {
          console.log(`[OwlLayer] Tools sync: ${tools.length} tools`);
        }
      },
      onSystemEvent: (kind: string, message?: string) => {
        if (kind === 'error') {
          console.error(`[OwlLayer] System error: ${message ?? 'Unknown error'}`);
          state.systemError = message ?? 'Unknown error';
        } else if (debug) {
          console.log(`[OwlLayer] System event: ${kind}${message ? ' — ' + message : ''}`);
        }
      },
      onLineAcquired: (_ln: string, waiting: boolean) => {
        state.lineState = waiting ? 'waiting' : 'idle';
      },
      onLineBusy: () => {
        state.lineState = 'busy';
      },
      onLineReady: (_ln: string) => {
        state.lineState = 'idle';
      },
      onApprovalRequest: (request: ApprovalRequest, resolve: (approved: boolean) => void) => {
        const safeRisk: 'high' | 'critical' = request.risk === 'critical' ? 'critical' : 'high';
        pendingApproval.value = {
          callId: request.callId,
          toolName: request.toolName,
          args: request.args,
          message: request.message,
          risk: safeRisk,
        };
        approvalResolver = (approved: boolean) => {
          resolve(approved);
          pendingApproval.value = null;
          approvalResolver = null;
        };
      },
    });

    const subscribeAudioOutput = (callback: (audioBase64: string, mimeType: string) => void) => {
      audioOutputListeners.add(callback);
      return () => {
        audioOutputListeners.delete(callback);
      };
    };

    // --- Fournir le client, le state et la subscription audio ---
    app.provide(OWLLAYER_CLIENT_KEY, client);
    app.provide(OWLLAYER_STATE_KEY, state);
    app.provide(OWLLAYER_AUDIO_OUTPUT_KEY, subscribeAudioOutput);
    app.provide(OWLLAYER_APPROVAL_KEY, pendingApproval);
    app.provide(OWLLAYER_APPROVAL_RESOLVE_KEY, (approved: boolean) => {
      approvalResolver?.(approved);
    });
    app.provide(OWLLAYER_HITL_LABELS_KEY, hitlLabels);

    // --- Auto-connect ---
    if (autoConnect && isClient) {
      client.connect();
    } else if (autoConnect && debug) {
      console.info('[OwlLayer] SSR detecte: autoConnect differe au client.');
    }

    // --- Auto-mount widget (optionnel) ---
    let widgetHost: HTMLDivElement | null = null;
    let widgetApp: App<Element> | null = null;
    if (widget?.enabled && isClient) {
      widgetHost = document.createElement('div');
      widgetHost.setAttribute('data-owllayer-widget-host', 'vue-plugin');
      document.body.appendChild(widgetHost);

      widgetApp = createApp(OwlLayerWidget, {
        client,
        config: widget.config ?? {},
        showApprovalModal: hitlUi === 'none',
      });
      widgetApp.mount(widgetHost);
    }

    // --- Auto-mount HITL UI globale (optionnelle) ---
    let hitlHost: HTMLDivElement | null = null;
    let hitlApp: App<Element> | null = null;
    if (hitlUi !== 'none' && isClient) {
      hitlHost = document.createElement('div');
      hitlHost.setAttribute('data-owllayer-hitl-host', 'vue-plugin');
      document.body.appendChild(hitlHost);

      hitlApp = createApp({
        render() {
          if (!pendingApproval.value) return null;
          if (hitlUi === 'banner') return h(ApprovalBanner);
          return h(ApprovalModal, {
            toolName: pendingApproval.value.toolName,
            message: pendingApproval.value.message,
            risk: pendingApproval.value.risk,
            args: pendingApproval.value.args,
            labels: hitlLabels,
            onApprove: () => approvalResolver?.(true),
            onDeny: () => approvalResolver?.(false),
          });
        },
      });
      hitlApp.provide(OWLLAYER_APPROVAL_KEY, pendingApproval);
      hitlApp.provide(OWLLAYER_APPROVAL_RESOLVE_KEY, (approved: boolean) => {
        approvalResolver?.(approved);
      });
      hitlApp.provide(OWLLAYER_HITL_LABELS_KEY, hitlLabels);
      hitlApp.mount(hitlHost);
    }

    // --- Cleanup a l'unmount ---
    const originalUnmount = app.unmount.bind(app);
    app.unmount = () => {
      widgetApp?.unmount();
      widgetApp = null;
      if (widgetHost?.parentNode) {
        widgetHost.parentNode.removeChild(widgetHost);
      }
      widgetHost = null;
      hitlApp?.unmount();
      hitlApp = null;
      if (hitlHost?.parentNode) {
        hitlHost.parentNode.removeChild(hitlHost);
      }
      hitlHost = null;
      client.destroy();
      originalUnmount();
    };
  },
};
