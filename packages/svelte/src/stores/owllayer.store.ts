import { writable, derived, get } from 'svelte/store';
import { mount, unmount } from 'svelte';
import {
  OwlLayerClient,
  installPlugin,
  type OwlLayerClientAnyEventListener,
  type OwlLayerClientEventListener,
  type OwlLayerClientEventType,
  type OwlLayerClientOptions,
  type ClientState,
  type ApprovalRequest,
  type RegisteredTool,
  type WidgetConfig,
  type PluginEntry,
} from '@owllayer/core';
import OwlLayerWidget from '../components/widget/OwlLayerWidget.svelte';

export interface OwlLayerInitOptions extends OwlLayerClientOptions {
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

// Store principal
export const owlLayerClient = writable<OwlLayerClient | null>(null);
export const agentState = writable<ClientState>('disconnected');
export const sessionId = writable<string | null>(null);
export const lastResponse = writable<string | null>(null);
export const pendingApproval = writable<ApprovalRequest | null>(null);
export const lineState = writable<'idle' | 'waiting' | 'busy'>('idle');

let approvalResolver: ((approved: boolean) => void) | null = null;

// Derived
export const isConnected = derived(agentState, ($s) => $s === 'connected' || $s === 'listening');
export const isThinking = derived(agentState, ($s) => $s === 'thinking');
export const isSpeaking = derived(agentState, ($s) => $s === 'speaking');

// Audio output listeners (mode Live)
const audioOutputListeners = new Set<(audioBase64: string, mimeType: string) => void>();

/**
 * Enregistrer un callback pour recevoir l'audio de l'agent (mode Live).
 */
export function onAudioOutput(callback: (audioBase64: string, mimeType: string) => void) {
  audioOutputListeners.add(callback);
  return () => {
    audioOutputListeners.delete(callback);
  };
}

export function subscribeEvent<TType extends OwlLayerClientEventType>(
  type: TType,
  listener: OwlLayerClientEventListener<TType>,
) {
  const client = get(owlLayerClient);
  if (!client) {
    return () => {};
  }

  client.onEvent(type, listener);
  return () => {
    client.offEvent(type, listener);
  };
}

export function subscribeAnyEvent(listener: OwlLayerClientAnyEventListener) {
  const client = get(owlLayerClient);
  if (!client) {
    return () => {};
  }

  client.onAnyEvent(listener);
  return () => {
    client.offAnyEvent(listener);
  };
}

/**
 * Initialiser OwlLayer. A appeler une fois dans le layout racine.
 */
export function initOwlLayer(options: OwlLayerInitOptions) {
  const { globalTools = [], plugins = [], widget, ...clientOptions } = options;
  const client = new OwlLayerClient(clientOptions);

  // Enregistrer les tools globaux avec protection du cycle de vie
  if (globalTools.length > 0) {
    globalTools.forEach(tool => {
      client.registerTool({ ...tool, global: true }); // Protection reelle via flag core
    });
  }

  // Installer les plugins
  if (plugins.length > 0) {
    plugins.forEach(([plugin, pluginConfig]) => {
      installPlugin(client, plugin, pluginConfig);
    });
  }

  client.on({
    onStateChange: (state) => agentState.set(state),
    onSessionId: (id) => sessionId.set(id),
    onAgentResponse: (text, done) => {
      lastResponse.set(text);
      agentState.set(done ? 'connected' : 'speaking');
    },
    onAudioOutput: (audioBase64, mimeType) => {
      audioOutputListeners.forEach((listener) => listener(audioBase64, mimeType));
    },
    onLineAcquired: (_ln, waiting) => {
      lineState.set(waiting ? 'waiting' : 'idle');
    },
    onLineBusy: () => {
      lineState.set('busy');
    },
    onLineReady: (_ln) => {
      lineState.set('idle');
    },
    onApprovalRequest: (request, resolve) => {
      pendingApproval.set(request);
      approvalResolver = (approved: boolean) => {
        resolve(approved);
        pendingApproval.set(null);
        approvalResolver = null;
      };
    },
  });

  owlLayerClient.set(client);
  client.connect();

  let widgetHost: HTMLDivElement | null = null;
  let widgetInstance: Record<string, unknown> | null = null;
  if (widget?.enabled && typeof document !== 'undefined') {
    widgetHost = document.createElement('div');
    widgetHost.setAttribute('data-owllayer-widget-host', 'svelte-store');
    document.body.appendChild(widgetHost);
    widgetInstance = mount(OwlLayerWidget, {
      target: widgetHost,
      props: {
        client,
        config: widget.config ?? {},
      },
    }) as Record<string, unknown>;
  }

  return () => {
    if (widgetInstance) {
      unmount(widgetInstance as any);
      widgetInstance = null;
    }
    if (widgetHost?.parentNode) {
      widgetHost.parentNode.removeChild(widgetHost);
    }
    widgetHost = null;
    client.destroy();
  };
}

/**
 * Envoyer un message texte.
 */
export function sendText(text: string) {
  const client = get(owlLayerClient);
  if (client) {
    lastResponse.set(null);
    client.sendText(text);
  }
}

/**
 * Envoyer de l'audio (mode texte — USER_INPUT).
 */
export function sendAudio(audioBase64: string, mimeType?: string) {
  const client = get(owlLayerClient);
  client?.sendAudio(audioBase64, mimeType);
}

/**
 * Envoyer de l'audio en mode Live (streaming bidirectionnel — AUDIO_STREAM).
 */
export function sendAudioStream(audioBase64: string, mimeType?: string) {
  const client = get(owlLayerClient);
  client?.sendAudioStream(audioBase64, mimeType);
}

/**
 * Signaler la fin du flux audio vocal (mode Live).
 */
export function sendAudioEnd(reason?: 'user_stop' | 'vad' | 'timeout') {
  const client = get(owlLayerClient);
  client?.sendAudioEnd(reason);
}

/**
 * Interrompre l'agent en train de parler (barge-in).
 */
export function sendInterrupt() {
  const client = get(owlLayerClient);
  client?.sendInterrupt();
}

export function approveAction() {
  approvalResolver?.(true);
}

export function denyAction() {
  approvalResolver?.(false);
}
