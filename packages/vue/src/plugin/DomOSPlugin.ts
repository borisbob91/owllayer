import { type App, type InjectionKey, reactive, ref, type Ref } from 'vue';
import {
  DomOSClient,
  type DomOSClientOptions,
  type ClientState,
  type ToolDeclaration,
  type ApprovalRequest,
  type RegisteredTool,
} from '@domos/core';

// ============================================================
// Injection Key - Utilise par les composables
// ============================================================

export const DOMOS_CLIENT_KEY: InjectionKey<DomOSClient> = Symbol('domos-client');
export const DOMOS_STATE_KEY: InjectionKey<DomOSReactiveState> = Symbol('domos-state');
export const DOMOS_AUDIO_OUTPUT_KEY: InjectionKey<(callback: (audioBase64: string, mimeType: string) => void) => () => void> = Symbol('domos-audio-output');
export const DOMOS_APPROVAL_KEY: InjectionKey<Ref<PendingApproval | null>> = Symbol('domos-approval');
export const DOMOS_APPROVAL_RESOLVE_KEY: InjectionKey<(approved: boolean) => void> = Symbol('domos-approval-resolve');

/**
 * Demande d'approbation en attente.
 */
export interface PendingApproval {
  callId: string;
  toolName: string;
  args: Record<string, unknown>;
  message: string;
}

/**
 * State reactif partage par tous les composables.
 */
export interface DomOSReactiveState {
  agentState: ClientState;
  sessionId: string | null;
  lastResponse: string | null;
  voiceEnabled: boolean;
  isConnected: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
}

/**
 * Options du plugin DomOS pour Vue.
 */
export interface DomOSPluginOptions {
  /** Endpoint WebSocket du serveur DomOS */
  endpoint: string;

  /** Cle API publique */
  apiKey: string;

  /** Mode debug */
  debug?: boolean;

  /** Connexion automatique au mount */
  autoConnect?: boolean;

  /** Activer le mode vocal */
  voice?: boolean;

  /** Tools globaux persistants independants du cycle de vie des vues */
  globalTools?: Omit<RegisteredTool, 'componentId'>[];
}

/**
 * DomOS Plugin pour Vue 3.
 *
 * @example
 * ```ts
 * import { createApp } from 'vue';
 * import { DomOSPlugin } from '@domos/vue';
 *
 * const app = createApp(App);
 * app.use(DomOSPlugin, {
 *   endpoint: 'ws://localhost:3000/domos',
 *   apiKey: 'pk_demo_local',
 * });
 * app.mount('#app');
 * ```
 */
export const DomOSPlugin = {
  install(app: App, options: DomOSPluginOptions) {
    const { autoConnect = true, voice = false, debug = false, globalTools = [] } = options;

    // --- Creer le client ---
    const client = new DomOSClient({
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

    // --- State reactif ---
    const state = reactive<DomOSReactiveState>({
      agentState: 'disconnected',
      sessionId: null,
      lastResponse: null,
      voiceEnabled: voice,
      isConnected: false,
      isThinking: false,
      isSpeaking: false,
    });

    // --- Audio output listeners ---
    const audioOutputListeners = new Set<(audioBase64: string, mimeType: string) => void>();
    const pendingApproval = ref<PendingApproval | null>(null);
    let approvalResolver: ((approved: boolean) => void) | null = null;

    // --- Brancher les events ---
    client.on({
      onStateChange: (newState: ClientState) => {
        state.agentState = newState;
        state.isConnected = newState === 'connected' || newState === 'listening';
        state.isThinking = newState === 'thinking';
        state.isSpeaking = newState === 'speaking';
      },
      onSessionId: (id: string) => {
        state.sessionId = id;
      },
      onAgentResponse: (text: string, done: boolean) => {
        state.lastResponse = text;
        state.agentState = done ? 'connected' : 'speaking';
        state.isSpeaking = !done;
        state.isConnected = done;
      },
      onAudioOutput: (audioBase64: string, mimeType: string) => {
        audioOutputListeners.forEach((listener) => listener(audioBase64, mimeType));
      },
      onToolsSync: (tools: ToolDeclaration[]) => {
        if (debug) {
          console.log(`[DomOS] Tools sync: ${tools.length} tools`);
        }
      },
      onApprovalRequest: (request: ApprovalRequest, resolve: (approved: boolean) => void) => {
        pendingApproval.value = {
          callId: request.callId,
          toolName: request.toolName,
          args: request.args,
          message: request.message,
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
    app.provide(DOMOS_CLIENT_KEY, client);
    app.provide(DOMOS_STATE_KEY, state);
    app.provide(DOMOS_AUDIO_OUTPUT_KEY, subscribeAudioOutput);
    app.provide(DOMOS_APPROVAL_KEY, pendingApproval);
    app.provide(DOMOS_APPROVAL_RESOLVE_KEY, (approved: boolean) => {
      approvalResolver?.(approved);
    });

    // --- Auto-connect ---
    if (autoConnect) {
      client.connect();
    }

    // --- Cleanup a l'unmount ---
    const originalUnmount = app.unmount.bind(app);
    app.unmount = () => {
      client.destroy();
      originalUnmount();
    };
  },
};
