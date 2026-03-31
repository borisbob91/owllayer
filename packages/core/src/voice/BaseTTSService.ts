import {
  type TTSService,
  type TTSConfig,
  type TTSResult,
  type Voice,
  SpeechServiceError,
  type SpeechServiceOptions,
} from './contracts.js';

/**
 * Classe de base pour les services TTS.
 * Fournit des méthodes communes et la gestion d'erreurs.
 */
export abstract class BaseTTSService implements TTSService {
  abstract readonly name: string;

  protected debug: boolean;
  protected timeout: number;
  protected defaultLanguage: string;
  protected defaultVoice?: string;

  constructor(options: SpeechServiceOptions = {}) {
    this.debug = options.debug ?? false;
    this.timeout = options.timeout ?? 30000;
    this.defaultLanguage = options.defaultLanguage ?? 'fr-FR';
  }

  /**
   * Méthode abstraite à implémenter par chaque provider.
   */
  abstract synthesize(config: TTSConfig): Promise<TTSResult>;

  /**
   * Lister les voix disponibles (optionnel).
   */
  async listVoices?(languageCode?: string): Promise<Voice[]>;

  /**
   * Vérifier la disponibilité du service (optionnel).
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * Logger les messages de debug.
   */
  protected log(message: string, data?: unknown): void {
    if (this.debug) {
      console.log(`[${this.name}]`, message, data ?? '');
    }
  }

  /**
   * Wrapper pour gérer les erreurs de manière uniforme.
   */
  protected handleError(error: unknown, context: string): never {
    this.log(`Error in ${context}:`, error);

    if (error instanceof SpeechServiceError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new SpeechServiceError(
      `${context}: ${message}`,
      this.name,
      'SYNTHESIS_ERROR'
    );
  }

  /**
   * Convertir Buffer → base64.
   */
  protected bufferToBase64(buffer: Buffer | Uint8Array): string {
    return Buffer.from(buffer).toString('base64');
  }

  /**
   * Valider la configuration TTS.
   */
  protected validateConfig(config: TTSConfig): void {
    if (!config.text || config.text.trim().length === 0) {
      throw new SpeechServiceError(
        'text is required and cannot be empty',
        this.name,
        'INVALID_CONFIG'
      );
    }

    if (config.text.length > 5000) {
      throw new SpeechServiceError(
        'text exceeds maximum length of 5000 characters',
        this.name,
        'TEXT_TOO_LONG'
      );
    }

    if (config.speed && (config.speed < 0.25 || config.speed > 4.0)) {
      throw new SpeechServiceError(
        'speed must be between 0.25 and 4.0',
        this.name,
        'INVALID_SPEED'
      );
    }

    if (config.pitch && (config.pitch < -20 || config.pitch > 20)) {
      throw new SpeechServiceError(
        'pitch must be between -20 and 20',
        this.name,
        'INVALID_PITCH'
      );
    }

    if (config.volume && (config.volume < 0 || config.volume > 1)) {
      throw new SpeechServiceError(
        'volume must be between 0 and 1',
        this.name,
        'INVALID_VOLUME'
      );
    }
  }

  /**
   * Normaliser le texte avant synthèse.
   */
  protected normalizeText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/[ \t]*\n[ \t]*/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Compter le nombre de caractères (pour la facturation).
   */
  protected countCharacters(text: string): number {
    return text.length;
  }

  /**
   * Mesurer le temps d'exécution d'une fonction.
   */
  protected async measureTime<T>(
    fn: () => Promise<T>,
    label: string
  ): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    this.log(`${label} took ${duration}ms`);
    return { result, duration };
  }

  /**
   * Estimer la durée de l'audio généré (approximation).
   * Basé sur une vitesse moyenne de 150 mots/min.
   */
  protected estimateDuration(text: string, speed: number = 1.0): number {
    const wordCount = text.split(/\s+/).length;
    const wordsPerMinute = 150 * speed;
    const minutes = wordCount / wordsPerMinute;
    return Math.ceil(minutes * 60 * 1000);
  }

  /**
   * Obtenir le MIME type pour un format audio.
   */
  protected getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      opus: 'audio/opus',
      aac: 'audio/aac',
      flac: 'audio/flac',
      wav: 'audio/wav',
      pcm: 'audio/pcm;rate=24000',
    };
    return mimeTypes[format] || 'audio/mpeg';
  }
}