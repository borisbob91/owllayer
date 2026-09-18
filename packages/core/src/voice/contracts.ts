import type { ShadowContext } from '../context/shadow-context.types.js';
import type { SystemPrompt } from '../prompt/SystemPromptConfig.js';
import type { ToolDeclaration } from '../protocol/aitp.types.js';
export type { ToolDeclaration };

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
  handleToolResult(callId: string, result: unknown, tools?: ToolDeclaration[]): Promise<LLMResponse>;

  /** Optionnel — retourne les modèles/voix disponibles pour ce provider */
  getCapabilities?(): LLMAdapterCapabilities;
}

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

export interface SpeechCapabilities {
  provider: string;
  providerName: string;
  voices?: VoiceInfo[];
  languages?: string[];
  models?: Array<{ id: string; name: string; description?: string }>;
  currentVoice?: string;
  currentLanguage?: string;
}

/**
 * Configuration audio pour STT.
 */
export interface STTAudioConfig {
  /** Format MIME de l'audio (ex: 'audio/pcm;rate=16000', 'audio/wav', 'audio/mp3') */
  mimeType: string;
  /** Audio encodé en base64 */
  audioBase64: string;
  /** Langue de l'audio (ex: 'fr-FR', 'en-US') - optionnel, détection auto possible */
  languageCode?: string;
}

/**
 * Résultat de transcription STT.
 */
export interface STTResult {
  /** Texte transcrit */
  text: string;
  /** Confiance de la transcription (0-1) */
  confidence?: number;
  /** Langue détectée */
  detectedLanguage?: string;
  /** Durée de l'audio (ms) */
  audioDuration?: number;
  /** Métadonnées supplémentaires du provider */
  metadata?: Record<string, unknown>;
}

/**
 * Service de Speech-to-Text (audio → texte).
 */
export interface STTService {
  /** Nom du provider (ex: 'openai-whisper', 'google-stt', 'azure-stt') */
  readonly name: string;

  /**
   * Transcrire de l'audio en texte.
   * @param config Configuration audio
   * @returns Texte transcrit
   */
  transcribe(config: STTAudioConfig): Promise<STTResult>;

  /**
   * Vérifier si le service est disponible.
   * @returns true si le service peut être utilisé
   */
  isAvailable?(): Promise<boolean>;

  /** Optionnel — retourne les capacités du provider STT */
  getCapabilities?(): SpeechCapabilities;
}

/**
 * Configuration audio pour TTS.
 */
export interface TTSConfig {
  /** Texte à synthétiser */
  text: string;
  /** Voix à utiliser (dépend du provider) */
  voice?: string;
  /** Langue (ex: 'fr-FR', 'en-US') */
  languageCode?: string;
  /** Vitesse de parole (0.5 - 2.0, défaut: 1.0) */
  speed?: number;
  /** Pitch/tonalité (-20 à +20, défaut: 0) */
  pitch?: number;
  /** Volume (0.0 - 1.0, défaut: 1.0) */
  volume?: number;
  /** Format audio de sortie (dépend du provider) */
  outputFormat?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
}

/**
 * Résultat de synthèse TTS.
 */
export interface TTSResult {
  /** Audio encodé en base64 */
  audioBase64: string;
  /** Format MIME de l'audio (ex: 'audio/mpeg', 'audio/pcm;rate=24000') */
  mimeType: string;
  /** Durée de l'audio généré (ms) */
  duration?: number;
  /** Nombre de caractères du texte */
  characterCount?: number;
  /** Métadonnées supplémentaires du provider */
  metadata?: Record<string, unknown>;
}

/**
 * Service de Text-to-Speech (texte → audio).
 */
export interface TTSService {
  /** Nom du provider (ex: 'openai-tts', 'google-tts', 'elevenlabs') */
  readonly name: string;

  /**
   * Synthétiser du texte en audio.
   * @param config Configuration de synthèse
   * @returns Audio généré
   */
  synthesize(config: TTSConfig): Promise<TTSResult>;

  /**
   * Lister les voix disponibles pour une langue.
   * @param languageCode Code de langue (ex: 'fr-FR')
   * @returns Liste des voix disponibles
   */
  listVoices?(languageCode?: string): Promise<Voice[]>;

  /**
   * Vérifier si le service est disponible.
   * @returns true si le service peut être utilisé
   */
  isAvailable?(): Promise<boolean>;

  /** Optionnel — retourne les capacités du provider TTS */
  getCapabilities?(): SpeechCapabilities;
}

/**
 * Informations sur une voix TTS.
 */
export interface Voice {
  /** Identifiant unique de la voix */
  id: string;
  /** Nom de la voix */
  name: string;
  /** Genre (masculin, féminin, neutre) */
  gender?: 'male' | 'female' | 'neutral';
  /** Langues supportées */
  languages: string[];
  /** Description de la voix */
  description?: string;
  /** Style de la voix (ex: 'professional', 'casual', 'warm') */
  style?: string;
  /** Métadonnées supplémentaires */
  metadata?: Record<string, unknown>;
}

/**
 * Options communes pour les services Speech.
 */
export interface SpeechServiceOptions {
  /** Clé API du provider */
  apiKey?: string;
  /** Langue par défaut */
  defaultLanguage?: string;
  /** Configuration custom du provider */
  providerConfig?: Record<string, unknown>;
  /** Timeout des requêtes (ms) */
  timeout?: number;
  /** Activer les logs de debug */
  debug?: boolean;
}

/**
 * Erreur spécifique aux services Speech.
 */
export class SpeechServiceError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code?: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'SpeechServiceError';
  }
}

/**
 * Type pour le streaming audio (pour les implémentations futures).
 */
export interface AudioStreamHandler {
  onAudioChunk: (chunk: Buffer) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}