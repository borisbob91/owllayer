import { useContext } from 'react';
import { DomOSContext, type DomOSContextValue, type AgentState } from '../provider/DomOSContext.js';

/**
 * useAgent - Acceder a l'etat de l'agent et envoyer des messages.
 *
 * @example
 * ```tsx
 * function ChatInput() {
 *   const { agentState, sendText, lastResponse } = useAgent();
 *
 *   return (
 *     <div>
 *       <p>Statut: {agentState}</p>
 *       <p>Reponse: {lastResponse}</p>
 *       <button onClick={() => sendText('Bonjour')}>Envoyer</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAgent(): {
  agentState: AgentState;
  sessionId: string | null;
  sendText: (text: string) => void;
  sendAudio: (audioBase64: string, mimeType?: string) => void;
  sendAudioStream: (audioBase64: string, mimeType?: string) => void;
  sendAudioEnd: (reason?: 'user_stop' | 'vad' | 'timeout') => void;
  onAudioOutput?: (callback: (audioBase64: string, mimeType: string) => void) => void;
  lastResponse: string | null;
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  isConnected: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  agentError: string | null;
  clearAgentError: () => void;
} {
  const ctx = useContext(DomOSContext);
  if (!ctx) {
    throw new Error('useAgent doit etre utilise dans un <DomOSProvider>');
  }

  return {
    agentState: ctx.agentState,
    sessionId: ctx.sessionId,
    sendText: ctx.sendText,
    sendAudio: ctx.sendAudio,
    sendAudioStream: ctx.sendAudioStream,
    sendAudioEnd: ctx.sendAudioEnd,
    onAudioOutput: ctx.onAudioOutput,
    lastResponse: ctx.lastResponse,
    voiceEnabled: ctx.voiceEnabled,
    setVoiceEnabled: ctx.setVoiceEnabled,
    isConnected: ctx.agentState === 'connected' || ctx.agentState === 'listening',
    isThinking: ctx.agentState === 'thinking',
    isSpeaking: ctx.agentState === 'speaking',
    agentError: ctx.agentError,
    clearAgentError: ctx.clearAgentError,
  };
}
