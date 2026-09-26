import { createContext } from 'react';
import type {
  AITPMessage,
  OwlLayerClientAnyEventListener,
  OwlLayerClientEventListener,
  OwlLayerClientEventType,
  EffectiveToolsPayload,
  ToolDeclaration,
  ShadowContext,
  PluginMeta,
  HitlLabels,
} from '@owllayer/core';

/**
 * Libelles de l'UI d'approbation HITL (tous optionnels, textes actuels par defaut).
 * Re-exporte depuis @owllayer/core pour ne pas casser l'API publique existante.
 */
export type { HitlLabels };

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
  risk: 'high' | 'critical';
  resolve: (approved: boolean) => void;
}

/**
 * Valeur du contexte OwlLayer.
 */
export interface OwlLayerContextValue {
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

  /** Lire la liste des tools actuellement enregistres (pour DevPanel / debug) */
  getRegisteredTools: () => Array<ToolDeclaration & { source?: string }>;

  /** Derniere surface de tools appliquee par le serveur apres collisions. */
  toolSurface: EffectiveToolsPayload;

  /** Lire les tools réellement visibles par le serveur/LLM. */
  getEffectiveTools: () => ToolDeclaration[];

  /** Lire les tools client ignores par collision avec un tool serveur. */
  getIgnoredClientTools: () => ToolDeclaration[];

  /** Appeler un tool enregistre directement (simulation dev / DevTools) */
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;

  /** Lire les plugins installes (pour DevTools) */
  getInstalledPlugins: () => PluginMeta[];

  /** S'abonner a un evenement canonique OwlLayer. */
  subscribeEvent: <TType extends OwlLayerClientEventType>(type: TType, listener: OwlLayerClientEventListener<TType>) => () => void;

  /** S'abonner a tous les evenements canoniques OwlLayer. */
  subscribeAnyEvent: (listener: OwlLayerClientAnyEventListener) => () => void;

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

  /** Libelles HITL configures via config.hitl.labels */
  hitlLabels?: HitlLabels;

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

  /** Etat de file d'attente des lignes virtuelles */
  lineState: 'idle' | 'waiting' | 'busy';

  /** Derniere erreur serveur recue (null si aucune) */
  agentError: string | null;

  /** Effacer l'erreur apres affichage */
  clearAgentError: () => void;
}

/**
 * React Context pour OwlLayer.
 */
export const OwlLayerContext = createContext<OwlLayerContextValue | null>(null);
