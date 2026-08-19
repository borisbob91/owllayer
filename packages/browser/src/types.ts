import type { ToolParameters, WidgetConfig, VoiceState } from '@owllayer/core';

export type { VoiceState };

/**
 * Etat unifié de l'agent — couvre les états client ET vocal.
 * Utilisé par WidgetHost, AgentStateIndicator, et l'API publique onAgentStateChange.
 */
export type AgentState =
  | 'connecting'   // Connexion WebSocket en cours
  | 'idle'         // Connecté, en attente
  | 'listening'    // Micro actif, capture audio
  | 'thinking'     // Traitement côté serveur
  | 'speaking'     // Lecture audio TTS
  | 'streaming'    // Streaming texte en cours
  | 'error';       // Erreur de connexion ou micro

export type BrowserToolRisk = 'none' | 'low' | 'high' | 'critical';

export type JsonSchemaObject = {
  type?: string;
  properties?: Record<string, { type: string; description?: string; [k: string]: unknown }>;
  required?: string[];
  [key: string]: unknown;
};

export interface BrowserToolDefinition {
  description: string;
  parameters?: ToolParameters | JsonSchemaObject;
  risk?: BrowserToolRisk;
  handler: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

export interface OwlLayerBrowserConfig {
  apiKey: string;
  endpoint: string;
  debug?: boolean;
  autoConnect?: boolean;
  context?: Record<string, unknown>;
  widget?: {
    enabled?: boolean;
    config?: WidgetConfig;
  };
  hitl?: {
    enabled?: boolean;
  };
  autoDiscovery?: {
    enabled?: boolean;
  };
  sessionPersistence?: {
    enabled?: boolean;
    ttlMs?: number;
  };
  session?: {
    enabled?: boolean;
    storageKey?: string;
    ttlMs?: number;
    maxHistoryMessages?: number;
    autoResume?: boolean;
    onResume?: () => void;
    onNewSession?: () => void;
  };
  voice?: {
    /** Activer le mode vocal. Défaut: false */
    enabled?: boolean;
    /** Si micro refusé, ne pas lever d'erreur et rester en mode texte. Défaut: true */
    fallbackToText?: boolean;
    /** Taux d'échantillonnage PCM (Hz). Défaut: 16000 */
    sampleRate?: number;
    /** Mode live AUDIO_STREAM (Gemini/Realtime). Défaut: true */
    live?: boolean;
    /** Callback sur chaque changement d'état vocal */
    onStateChange?: (state: VoiceState) => void;
  };
  onReady?: () => void;
  onError?: (error: Error) => void;
  /**
   * Mode mémoire standalone (sans serveur dédié).
   * Utilise OwlLayerAgent de @owllayer/core pour suivre la session et les préférences
   * en localStorage. Le contexte enrichi est envoyé via updateContext() —
   * c'est l'agent qui décide quoi mémoriser, pas le browser.
   */
  memory?: {
    /** Activer OwlLayerAgent standalone. Défaut: false */
    enabled?: boolean;
    /** Clé localStorage pour l'identité. Défaut: 'owllayer_agent_id' */
    storageKey?: string;
    /** userId optionnel (pour la couche remote future) */
    userId?: string;
    /** Transport personnalisé (sinon LocalStorageTransport par défaut) */
    transport?: import('@owllayer/core').RemoteMemoryTransport;
  };
}

export interface SessionInfo {
  sessionId: string | null;
  status: 'disconnected' | 'connecting' | 'connected';
  messageCount: number;
}

export interface PersistedBrowserSession {
  version: 1;
  savedAt: number;
  expiresAt: number;
  sessionId: string | null;
  context: Record<string, unknown>;
  recentMessages: Array<{ role: 'user' | 'agent'; content: string; timestamp: number }>;
}

export interface DiscoveredToolConfig {
  name: string;
  description: string;
  risk: BrowserToolRisk;
  action: 'click' | 'focus' | 'scrollIntoView' | 'setValue' | 'show' | 'hide' | 'addClass' | 'removeClass';
  selector?: string;
  target?: string;
  schema?: Record<string, unknown>;
  contextData?: Record<string, unknown>;
}
