import type { ToolDeclaration, ShadowContext, SystemPrompt } from '@domos/core';

/**
 * Message dans l'historique conversationnel.
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Requete au LLM.
 */
export interface LLMRequest {
  /** Historique des messages */
  messages: ChatMessage[];

  /** Tools disponibles */
  tools: ToolDeclaration[];

  /** Contexte UI */
  context: ShadowContext;

  /** Prompt systeme */
  systemPrompt?: SystemPrompt;
}

/**
 * Tool call demande par le LLM.
 */
export interface LLMToolCall {
  callId: string;
  name: string;
  args: Record<string, unknown>;
}

/**
 * Reponse du LLM.
 */
export interface LLMResponse {
  /** Reponse textuelle */
  text?: string;

  /** Appels de tools demandes */
  toolCalls?: LLMToolCall[];

  /** Tokens utilises */
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Interface que chaque adaptateur LLM doit implementer.
 * Mode texte : requete/reponse synchrone.
 */
export interface LLMAdapter {
  /** Nom de l'adaptateur */
  readonly name: string;

  /** Prompt systeme */
  systemPrompt?: SystemPrompt;

  /**
   * Envoyer un message au LLM et obtenir une reponse.
   */
  chat(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Envoyer le resultat d'un tool au LLM pour la reponse finale.
   */
  handleToolResult(callId: string, result: unknown): Promise<LLMResponse>;

  /** Optionnel — retourne les modèles/voix disponibles pour ce provider */
  getCapabilities?(): LLMAdapterCapabilities;
}

// ============================================================
// Live Adapter - Mode audio streaming bidirectionnel
// ============================================================

/**
 * Configuration pour creer une session live.
 */
export interface LiveSessionConfig {
  /** Prompt systeme */
  systemPrompt: SystemPrompt;

  /** Tools disponibles (client + serveur) */
  tools: ToolDeclaration[];

  /** Voix a utiliser (ex: 'Fenrir', 'Puck', 'Kore') */
  voice?: string;

  /** Langue (ex: 'fr', 'en') */
  language?: string;

  // --- Callbacks event-driven ---

  /** Audio PCM recu de l'agent (a jouer dans le haut-parleur) */
  onAudioOutput?: (audioBase64: string, mimeType: string) => void;

  /** Texte recu de l'agent (transcription ou reponse texte) */
  onTextOutput?: (text: string, done: boolean) => void;

  /** L'agent veut appeler un tool */
  onToolCall?: (toolCall: LLMToolCall) => void;

  /** Transcription (input utilisateur ou output agent) */
  onTranscript?: (role: 'user' | 'agent', text: string) => void;

  /** Erreur dans la session live */
  onError?: (error: Error) => void;

  /** Session fermee */
  onClose?: () => void;

  /** Le modele a ete interrompu (barge-in) */
  onInterrupted?: () => void;

  /** Le modele attend l'input de l'utilisateur */
  onWaitingForInput?: () => void;
}

/**
 * Session live active — connexion persistante avec le LLM.
 *
 * Contrairement a LLMAdapter.chat() qui est requete/reponse,
 * LiveSession est un flux continu bidirectionnel.
 */
export interface LiveSession {
  /** Envoyer de l'audio PCM (base64) au LLM */
  sendAudio(audioBase64: string, mimeType?: string): Promise<void>;

  /** Envoyer du texte au LLM */
  sendText(text: string): Promise<void>;

  /** Envoyer le resultat d'un tool au LLM */
  sendToolResponse(callId: string, name: string, result: unknown): Promise<void>;

  /** Signaler la fin du flux audio d'entree (l'utilisateur a fini de parler) */
  endAudioTurn?(): Promise<void>;

  /** Interrompre le modele (barge-in) */
  interrupt?(): Promise<void>;

  /** Mettre a jour les tools disponibles (apres CONTEXT_UPDATE) */
  updateTools?(tools: ToolDeclaration[]): void;

  /** Fermer la session */
  close(): void;

  /** La session est-elle active ? */
  readonly isActive: boolean;
}

// ── Capabilities ─────────────────────────────────────

export interface LLMModel {
  id: string;
  name: string;
  supportsAudio: boolean;
  supportsTools: boolean;
  supportsStreaming?: boolean;
  description?: string;
  maxTokens?: number;
}

export interface VoiceInfo {
  id: string;
  name: string;
  language?: string;
  gender?: 'male' | 'female' | 'neutral';
  preview?: string;
}

export interface LLMAdapterCapabilities {
  provider: string;
  providerName: string;
  models: LLMModel[];
  voices?: VoiceInfo[];
  currentModel?: string;
  currentVoice?: string;
}

/**
 * Interface pour les adaptateurs LLM en mode streaming/live.
 *
 * Contrairement a LLMAdapter (requete/reponse synchrone),
 * LiveAdapter est event-driven via des callbacks.
 *
 * Utilise pour les modeles qui supportent l'audio natif :
 * - Google Gemini Live (gemini-2.5-flash-native-audio-preview)
 * - OpenAI Realtime API (gpt-4o-realtime)
 *
 * @example
 * ```ts
 * const live = new GoogleLiveAdapter({ apiKey: '...', voice: 'Fenrir' });
 *
 * const session = await live.createSession({
 *   systemPrompt: 'Tu es un assistant vocal.',
 *   tools: [...],
 *   onAudioOutput: (audio) => sendToClient(audio),
 *   onToolCall: (tc) => executeAndReturn(tc),
 * });
 *
 * session.sendAudio(pcmBase64); // micro → agent
 * ```
 */
export interface LiveAdapter {
  /** Nom de l'adaptateur live */
  readonly name: string;

  /** Prompt systeme par defaut */
  systemPrompt?: SystemPrompt;

  /** Creer une session live avec le LLM */
  createSession(config: LiveSessionConfig): Promise<LiveSession>;

  /** Optionnel — retourne les modèles/voix disponibles pour le mode live */
  getCapabilities?(): LLMAdapterCapabilities;
}
