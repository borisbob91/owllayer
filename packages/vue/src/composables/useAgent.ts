import { inject } from 'vue';
import { DOMOS_CLIENT_KEY, DOMOS_STATE_KEY, DOMOS_AUDIO_OUTPUT_KEY, type DomOSReactiveState } from '../plugin/DomOSPlugin.js';
import type { DomOSClient } from '@domos/core';

/**
 * useAgent - Acceder a l'etat de l'agent et envoyer des messages.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useAgent } from '@domos/vue';
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
  const client = inject(DOMOS_CLIENT_KEY);
  const state = inject(DOMOS_STATE_KEY);
  const audioOutputCallback = inject(DOMOS_AUDIO_OUTPUT_KEY);

  if (!client || !state) {
    throw new Error('useAgent: DomOSPlugin non installe. Ajoutez app.use(DomOSPlugin, { ... })');
  }

  return {
    /** State reactif de l'agent */
    state: state as DomOSReactiveState,

    /** Envoyer un message texte */
    sendText: (text: string) => {
      (state as DomOSReactiveState).lastResponse = null;
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

    /** Enregistrer un callback pour recevoir l'audio de l'agent (mode Live) */
    onAudioOutput: audioOutputCallback
      ? (callback: (audioBase64: string, mimeType: string) => void) => {
          audioOutputCallback.value = callback;
        }
      : undefined,

    /** Acces au client brut (usage avance) */
    client: client as DomOSClient,
  };
}
