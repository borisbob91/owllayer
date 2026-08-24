import { get } from 'svelte/store';
import { owlLayerClient, agentState, lastResponse, isThinking, isSpeaking, onAudioOutput } from '../stores/owllayer.store.js';

/**
 * Equivalent de useAgent pour Svelte.
 * Retourne les stores et actions pour interagir avec l'agent.
 */
export function createAgent() {
  function sendText(text: string) {
    const client = get(owlLayerClient);
    if (client) {
      lastResponse.set(null);
      client.sendText(text);
    }
  }

  function sendAudio(audioBase64: string, mimeType?: string) {
    const client = get(owlLayerClient);
    client?.sendAudio(audioBase64, mimeType);
  }

  function sendAudioStream(audioBase64: string, mimeType?: string) {
    const client = get(owlLayerClient);
    client?.sendAudioStream(audioBase64, mimeType);
  }

  return {
    agentState,
    lastResponse,
    isThinking,
    isSpeaking,
    sendText,
    sendAudio,
    sendAudioStream,
    onAudioOutput,
  };
}
