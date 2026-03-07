// ============================================================
// Base STT Service
// Classe abstraite pour tous les providers STT
// ============================================================

import {
  STTService,
  STTAudioConfig,
  STTResult,
  SpeechServiceError,
  SpeechServiceOptions,
} from './types.js';

/**
 * Classe de base pour les services STT.
 * Fournit des méthodes communes et la gestion d'erreurs.
 */
export abstract class BaseSTTService implements STTService {
  abstract readonly name: string;

  protected debug: boolean;
  protected timeout: number;
  protected defaultLanguage: string;

  constructor(options: SpeechServiceOptions = {}) {
    this.debug = options.debug ?? false;
    this.timeout = options.timeout ?? 30000; // 30 secondes par défaut
    this.defaultLanguage = options.defaultLanguage ?? 'fr-FR';
  }

  /**
   * Méthode abstraite à implémenter par chaque provider.
   */
  abstract transcribe(config: STTAudioConfig): Promise<STTResult>;

  /**
   * Vérifier la disponibilité du service (optionnel).
   */
  async isAvailable(): Promise<boolean> {
    return true; // Par défaut, on considère le service disponible
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
      'TRANSCRIPTION_ERROR'
    );
  }

  /**
   * Convertir base64 → Buffer.
   */
  protected base64ToBuffer(base64: string): Buffer {
    return Buffer.from(base64, 'base64');
  }

  /**
   * Extraire le sample rate du mimeType.
   * Ex: "audio/pcm;rate=16000" → 16000
   */
  protected extractSampleRate(mimeType: string): number {
    const match = mimeType.match(/rate=(\d+)/);
    return match ? parseInt(match[1], 10) : 16000;
  }

  /**
   * Détecter le format audio à partir du mimeType.
   */
  protected getAudioFormat(mimeType: string): string {
    if (mimeType.includes('pcm')) return 'pcm';
    if (mimeType.includes('wav')) return 'wav';
    if (mimeType.includes('mp3') || mimeType.includes('mpeg')) return 'mp3';
    if (mimeType.includes('ogg') || mimeType.includes('opus')) return 'opus';
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('flac')) return 'flac';
    return 'unknown';
  }

  /**
   * Valider la configuration audio.
   */
  protected validateConfig(config: STTAudioConfig): void {
    if (!config.audioBase64) {
      throw new SpeechServiceError(
        'audioBase64 is required',
        this.name,
        'INVALID_CONFIG'
      );
    }

    if (!config.mimeType) {
      throw new SpeechServiceError(
        'mimeType is required',
        this.name,
        'INVALID_CONFIG'
      );
    }
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
}
