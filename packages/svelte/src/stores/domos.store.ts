import { writable, derived, get } from 'svelte/store';
import {
  DomOSClient,
  type DomOSClientOptions,
  type ClientState,
  type ApprovalRequest,
  type RegisteredTool,
} from '@domos/core';

export interface DomOSInitOptions extends DomOSClientOptions {
  /** Tools globaux persistants independants du cycle de vie des vues */
  globalTools?: Omit<RegisteredTool, 'componentId'>[];
}

// Store principal
export const domosClient = writable<DomOSClient | null>(null);
export const agentState = writable<ClientState>('disconnected');
export const sessionId = writable<string | null>(null);
export const lastResponse = writable<string | null>(null);
export const pendingApproval = writable<ApprovalRequest | null>(null);

let approvalResolver: ((approved: boolean) => void) | null = null;

// Derived
export const isConnected = derived(agentState, ($s) => $s === 'connected' || $s === 'listening');
export const isThinking = derived(agentState, ($s) => $s === 'thinking');
export const isSpeaking = derived(agentState, ($s) => $s === 'speaking');

// Audio output callback (mode Live)
let audioOutputCallback: ((audioBase64: string, mimeType: string) => void) | null = null;

/**
 * Enregistrer un callback pour recevoir l'audio de l'agent (mode Live).
 */
export function onAudioOutput(callback: (audioBase64: string, mimeType: string) => void) {
  audioOutputCallback = callback;
}

/**
 * Initialiser DomOS. A appeler une fois dans le layout racine.
 */
export function initDomOS(options: DomOSInitOptions) {
  const { globalTools = [], ...clientOptions } = options;
  const client = new DomOSClient(clientOptions);

  // Enregistrer les tools globaux avec protection du cycle de vie
  if (globalTools.length > 0) {
    globalTools.forEach(tool => {
      client.registerTool({ ...tool, global: true }); // Protection reelle via flag core
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
      audioOutputCallback?.(audioBase64, mimeType);
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

  domosClient.set(client);
  client.connect();

  return () => client.destroy();
}

/**
 * Envoyer un message texte.
 */
export function sendText(text: string) {
  const client = get(domosClient);
  if (client) {
    lastResponse.set(null);
    client.sendText(text);
  }
}

/**
 * Envoyer de l'audio (mode texte — USER_INPUT).
 */
export function sendAudio(audioBase64: string, mimeType?: string) {
  const client = get(domosClient);
  client?.sendAudio(audioBase64, mimeType);
}

/**
 * Envoyer de l'audio en mode Live (streaming bidirectionnel — AUDIO_STREAM).
 */
export function sendAudioStream(audioBase64: string, mimeType?: string) {
  const client = get(domosClient);
  client?.sendAudioStream(audioBase64, mimeType);
}

export function approveAction() {
  approvalResolver?.(true);
}

export function denyAction() {
  approvalResolver?.(false);
}
