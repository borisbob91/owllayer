// ============================================================
// Google Cloud Speech-to-Text Provider
// STT using Google Cloud Speech-to-Text API
// ============================================================

import { BaseSTTService } from '../STTService.js';
import {
  STTAudioConfig,
  STTResult,
  SpeechServiceError,
  SpeechServiceOptions,
} from '../types.js';

/**
 * Options pour GoogleSTT.
 */
export interface GoogleSTTOptions extends SpeechServiceOptions {
  /** Clé API Google Cloud */
  apiKey: string;
  /** Modèle de reconnaissance (défaut: 'latest_long') */
  model?: 'latest_long' | 'latest_short' | 'telephony' | 'medical_dictation' | 'medical_conversation';
  /** Activer la ponctuation automatique */
  enableAutomaticPunctuation?: boolean;
  /** Activer la détection automatique de la langue */
  enableLanguageDetection?: boolean;
  /** Langues alternatives pour la détection (max 3) */
  alternativeLanguages?: string[];
  /** Nombre max de résultats alternatifs */
  maxAlternatives?: number;
  /** Activer le filtre de grossièretés */
  profanityFilter?: boolean;
}

/**
 * Mapping des formats audio vers l'encodage Google Cloud.
 */
const AUDIO_ENCODING_MAP: Record<string, string> = {
  pcm: 'LINEAR16',
  wav: 'LINEAR16',
  mp3: 'MP3',
  flac: 'FLAC',
  ogg: 'OGG_OPUS',
  opus: 'OGG_OPUS',
  webm: 'WEBM_OPUS',
  amr: 'AMR',
  mulaw: 'MULAW',
};

/**
 * Provider STT utilisant Google Cloud Speech-to-Text.
 *
 * Features :
 * - 125+ langues supportées
 * - Détection automatique de la langue
 * - Ponctuation automatique
 * - Adaptation au domaine (médical, téléphonie)
 * - Filtrage des grossièretés
 * - Prix : $0.006 / 15 secondes (standard), $0.009 (enhanced)
 *
 * @example
 * ```ts
 * const stt = new GoogleSTT({
 *   apiKey: process.env.GOOGLE_API_KEY,
 *   defaultLanguage: 'fr-FR',
 *   enableAutomaticPunctuation: true,
 * });
 *
 * const result = await stt.transcribe({
 *   audioBase64: base64Audio,
 *   mimeType: 'audio/pcm;rate=16000',
 * });
 * console.log(result.text);
 * ```
 */
export class GoogleSTT extends BaseSTTService {
  readonly name = 'google-stt';

  private apiKey: string;
  private model: string;
  private enableAutomaticPunctuation: boolean;
  private enableLanguageDetection: boolean;
  private alternativeLanguages: string[];
  private maxAlternatives: number;
  private profanityFilter: boolean;

  /** URL de l'API Google Cloud Speech-to-Text v1 */
  private readonly API_URL = 'https://speech.googleapis.com/v1/speech:recognize';

  constructor(options: GoogleSTTOptions) {
    super(options);

    if (!options.apiKey) {
      throw new SpeechServiceError(
        'Google Cloud API key is required',
        this.name,
        'MISSING_API_KEY'
      );
    }

    this.apiKey = options.apiKey;
    this.model = options.model || 'latest_long';
    this.enableAutomaticPunctuation = options.enableAutomaticPunctuation ?? true;
    this.enableLanguageDetection = options.enableLanguageDetection ?? false;
    this.alternativeLanguages = options.alternativeLanguages || [];
    this.maxAlternatives = options.maxAlternatives ?? 1;
    this.profanityFilter = options.profanityFilter ?? false;

    this.log('Google STT initialized', { model: this.model });
  }

  /**
   * Transcrire de l'audio en texte via Google Cloud Speech-to-Text.
   */
  async transcribe(config: STTAudioConfig): Promise<STTResult> {
    this.validateConfig(config);

    const startTime = Date.now();

    try {
      const format = this.getAudioFormat(config.mimeType);
      const sampleRate = this.extractSampleRate(config.mimeType);
      const encoding = AUDIO_ENCODING_MAP[format] || 'LINEAR16';
      const languageCode = config.languageCode || this.defaultLanguage;

      this.log('Transcribing audio', {
        encoding,
        sampleRate,
        language: languageCode,
        size: config.audioBase64.length,
      });

      // Construire le body de la requête
      const requestBody: Record<string, unknown> = {
        config: {
          encoding,
          sampleRateHertz: sampleRate,
          languageCode,
          model: this.model,
          enableAutomaticPunctuation: this.enableAutomaticPunctuation,
          maxAlternatives: this.maxAlternatives,
          profanityFilter: this.profanityFilter,
          ...(this.enableLanguageDetection && this.alternativeLanguages.length > 0
            ? { alternativeLanguageCodes: this.alternativeLanguages }
            : {}),
        },
        audio: {
          content: config.audioBase64,
        },
      };

      // Appel API REST
      const response = await fetch(`${this.API_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new SpeechServiceError(
          `Google STT API error (${response.status}): ${errorBody}`,
          this.name,
          'API_ERROR',
          response.status
        );
      }

      const data = await response.json() as GoogleSTTResponse;
      const duration = Date.now() - startTime;

      const result = this.parseResponse(data, duration);

      this.log('Transcription complete', {
        text: result.text.substring(0, 100) + '...',
        duration: `${duration}ms`,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      this.handleError(error, 'transcribe');
    }
  }

  /**
   * Vérifier la disponibilité du service.
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Test simple avec un audio vide pour vérifier la clé API
      const response = await fetch(`${this.API_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: { encoding: 'LINEAR16', sampleRateHertz: 16000, languageCode: 'en-US' },
          audio: { content: '' },
        }),
      });
      // 400 = requête invalide (audio vide) mais clé OK
      // 403 = clé invalide
      return response.status !== 403;
    } catch {
      return false;
    }
  }

  /**
   * Parser la réponse Google Cloud.
   */
  private parseResponse(data: GoogleSTTResponse, processingTime: number): STTResult {
    if (!data.results || data.results.length === 0) {
      return {
        text: '',
        confidence: 0,
        metadata: { processingTime, noSpeech: true },
      };
    }

    // Concaténer tous les résultats
    const texts: string[] = [];
    let totalConfidence = 0;
    let confidenceCount = 0;
    let detectedLanguage: string | undefined;

    for (const result of data.results) {
      if (result.alternatives && result.alternatives.length > 0) {
        const best = result.alternatives[0];
        texts.push(best.transcript);

        if (best.confidence !== undefined) {
          totalConfidence += best.confidence;
          confidenceCount++;
        }
      }

      // Langue détectée
      if (result.languageCode) {
        detectedLanguage = result.languageCode;
      }
    }

    const avgConfidence = confidenceCount > 0
      ? Math.round((totalConfidence / confidenceCount) * 100) / 100
      : undefined;

    return {
      text: texts.join(' '),
      confidence: avgConfidence,
      detectedLanguage,
      metadata: {
        processingTime,
        resultCount: data.results.length,
        totalBilledTime: data.totalBilledTime,
      },
    };
  }
}

// --- Types internes pour la réponse Google ---

interface GoogleSTTResponse {
  results?: GoogleSTTResult[];
  totalBilledTime?: string;
}

interface GoogleSTTResult {
  alternatives?: GoogleSTTAlternative[];
  languageCode?: string;
  resultEndTime?: string;
}

interface GoogleSTTAlternative {
  transcript: string;
  confidence?: number;
  words?: GoogleSTTWord[];
}

interface GoogleSTTWord {
  startTime?: string;
  endTime?: string;
  word: string;
  confidence?: number;
}
