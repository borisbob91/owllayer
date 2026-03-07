// ============================================================
// Speech Services Types
// Interfaces communes pour STT et TTS
// ============================================================

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
