import { get } from 'svelte/store';
import { domosClient, agentState, lastResponse, isThinking, isSpeaking, onAudioOutput } from '../stores/domos.store.js';

/**
 * Equivalent de useAgent pour Svelte.
 * Retourne les stores et actions pour interagir avec l'agent.
 */
export function createAgent() {
  function sendText(text: string) {
    const client = get(domosClient);
    if (client) {
      lastResponse.set(null);
      client.sendText(text);
    }
  }

  function sendAudio(audioBase64: string, mimeType?: string) {
    const client = get(domosClient);
    client?.sendAudio(audioBase64, mimeType);
  }

  function sendAudioStream(audioBase64: string, mimeType?: string) {
    const client = get(domosClient);
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
