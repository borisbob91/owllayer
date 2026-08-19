import { inject } from 'vue';
import { OWLLAYER_CLIENT_KEY, OWLLAYER_STATE_KEY, OWLLAYER_AUDIO_OUTPUT_KEY, type OwlLayerReactiveState } from '../plugin/OwlLayerPlugin.js';
import type { OwlLayerClient } from '@owllayer/core';

/**
 * useAgent - Acceder a l'etat de l'agent et envoyer des messages.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useAgent } from '@owllayer/vue';
 *
 * const { state, sendText, sendAudioStream } = useAgent();
 * </script>
 *
 * <template>
 *   <p>Statut: {{ state.agentState }}</p>
 *   <p>Reponse: {{ state.lastResponse }}</p>
 *   <button @click="sendText('Bonjour')">Envoyer</button>
 * </template>
 * ```
 */
export function useAgent() {
  const client = inject(OWLLAYER_CLIENT_KEY);
  const state = inject(OWLLAYER_STATE_KEY);
  const audioOutputCallback = inject(OWLLAYER_AUDIO_OUTPUT_KEY);

  if (!client || !state) {
    throw new Error('useAgent: OwlLayerPlugin non installe. Ajoutez app.use(OwlLayerPlugin, { ... })');
  }

  let lastAudioUnsubscribe: (() => void) | null = null;

  return {
    /** State reactif de l'agent */
    state: state as OwlLayerReactiveState,

    /** Envoyer un message texte */
    sendText: (text: string) => {
      (state as OwlLayerReactiveState).lastResponse = null;
      client.sendText(text);
    },

    /** Envoyer de l'audio en base64 (mode texte — USER_INPUT) */
    sendAudio: (audioBase64: string, mimeType?: string) => {
      client.sendAudio(audioBase64, mimeType);
    },

    /** Envoyer de l'audio en mode Live (streaming bidirectionnel — AUDIO_STREAM) */
    sendAudioStream: (audioBase64: string, mimeType?: string) => {
      client.sendAudioStream(audioBase64, mimeType);
    },

    /** Signaler la fin du flux audio (mode Live) */
    sendAudioEnd: (reason?: 'user_stop' | 'vad' | 'timeout') => {
      client.sendAudioEnd(reason);
    },

    /** Interrompre l'agent en train de parler (barge-in) */
    sendInterrupt: () => {
      client.sendInterrupt();
    },

    /** Enregistrer un callback pour recevoir l'audio de l'agent (mode Live) */
    onAudioOutput: audioOutputCallback
      ? (callback: (audioBase64: string, mimeType: string) => void) => {
          // Conserve la semantique historique "un callback actif par composant"
          // tout en reposant sur le systeme de listeners multiple du plugin.
          lastAudioUnsubscribe?.();
          lastAudioUnsubscribe = audioOutputCallback(callback);
          return () => {
            lastAudioUnsubscribe?.();
            lastAudioUnsubscribe = null;
          };
        }
      : undefined,

    /** Acces au client brut (usage avance) */
    client: client as OwlLayerClient,
  };
}
