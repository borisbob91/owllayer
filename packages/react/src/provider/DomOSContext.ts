import { createContext } from 'react';
import type {
  ADTPMessage,
  ToolDeclaration,
  ShadowContext,
} from '@domos/core';

/**
 * Etat de l'agent.
 */
export type AgentState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error';

/**
 * Demande d'approbation en attente.
 */
export interface PendingApproval {
  callId: string;
  toolName: string;
  args: Record<string, unknown>;
  message: string;
  resolve: (approved: boolean) => void;
}

/**
 * Valeur du contexte DomOS.
 */
export interface DomOSContextValue {
  /** Etat de la connexion / agent */
  agentState: AgentState;

  /** Session ID (apres handshake) */
  sessionId: string | null;

  /** Contexte UI courant */
  shadowContext: ShadowContext;

  /** Enregistrer un tool (appele par useAgentTool) */
  registerTool: (id: string, declaration: ToolDeclaration, handler: (args: any) => Promise<unknown>, global?: boolean) => void;

  /** Desenregistrer un tool (unmount) */
  unregisterTool: (id: string) => void;

  /** Desenregistrer tous les tools d'un composant */
  unregisterToolsByComponent: (componentId: string) => void;

  /** Mettre a jour le contexte passif (appele par useAgentContext) */
  updateContext: (data: Record<string, unknown>) => void;

  /** Envoyer un message texte a l'agent */
  sendText: (text: string) => void;

  /** Envoyer de l'audio a l'agent (mode texte — USER_INPUT) */
  sendAudio: (audioBase64: string, mimeType?: string) => void;

  /** Envoyer de l'audio en mode Live (streaming bidirectionnel — AUDIO_STREAM) */
  sendAudioStream: (audioBase64: string, mimeType?: string) => void;

  /** Signaler la fin du flux audio (mode Live) */
  sendAudioEnd: (reason?: 'user_stop' | 'vad' | 'timeout') => void;

  /** Interrompre l'agent en train de parler (barge-in) */
  sendInterrupt: () => void;

  /** S'abonner a l'audio recu de l'agent (mode Live) */
  onAudioOutput?: (callback: (audioBase64: string, mimeType: string) => void) => () => void;

  /** Approbation en attente (HITL) */
  pendingApproval: PendingApproval | null;

  /** Derniere reponse de l'agent */
  lastResponse: string | null;

  /** Indique si le mode vocal est actif */
  voiceEnabled: boolean;

  /** Activer/desactiver le mode vocal */
  setVoiceEnabled: (enabled: boolean) => void;

  /** Debug mode */
  debug: boolean;

  /** Numero de ligne virtuelle acquise (null si pas de virtual lines) */
  lineNumber: string | null;

  /** true si l'utilisateur est en file d'attente */
  isWaiting: boolean;

  /** Derniere erreur serveur recue (null si aucune) */
  agentError: string | null;

  /** Effacer l'erreur apres affichage */
  clearAgentError: () => void;
}

/**
 * React Context pour DomOS.
 */
export const DomOSContext = createContext<DomOSContextValue | null>(null);
