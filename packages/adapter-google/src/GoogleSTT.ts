// ============================================================
// Google Cloud Speech-to-Text Provider
// STT using Google Cloud Speech-to-Text API
// ============================================================

import { BaseSTTService, SpeechServiceError } from '@domos/core';
import type {
  STTAudioConfig,
  STTResult,
  SpeechCapabilities,
  SpeechServiceOptions,
} from '@domos/core';

/**
 * Options pour GoogleSTT.
 */
export interface GoogleSTTOptions extends SpeechServiceOptions {
  /** Cle API Google Cloud */
  apiKey: string;
  /** Modele de reconnaissance (defaut: 'latest_long') */
  model?: 'latest_long' | 'latest_short' | 'telephony' | 'medical_dictation' | 'medical_conversation';
  /** Activer la ponctuation automatique */
  enableAutomaticPunctuation?: boolean;
  /** Activer la detection automatique de la langue */
  enableLanguageDetection?: boolean;
  /** Langues alternatives pour la detection (max 3) */
  alternativeLanguages?: string[];
  /** Nombre max de resultats alternatifs */
  maxAlternatives?: number;
  /** Activer le filtre de grossieretes */
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
   * Verifier la disponibilite du service.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: { encoding: 'LINEAR16', sampleRateHertz: 16000, languageCode: 'en-US' },
          audio: { content: '' },
        }),
      });
      return response.status !== 403;
    } catch {
      return false;
    }
  }

  /**
   * Parser la reponse Google Cloud.
   */
  private parseResponse(data: GoogleSTTResponse, processingTime: number): STTResult {
    if (!data.results || data.results.length === 0) {
      return {
        text: '',
        confidence: 0,
        metadata: { processingTime, noSpeech: true },
      };
    }

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

  getCapabilities(): SpeechCapabilities {
    return {
      provider: 'google-stt',
      providerName: 'Google Cloud Speech-to-Text',
      currentLanguage: this.defaultLanguage,
      models: [
        { id: 'latest_long', name: 'Latest Long', description: 'Meilleur pour audio long (>1 min)' },
        { id: 'latest_short', name: 'Latest Short', description: 'Meilleur pour audio court (<1 min)' },
        { id: 'telephony', name: 'Telephony', description: 'Optimise pour appels telephoniques' },
        { id: 'medical_dictation', name: 'Medical Dictation', description: 'Terminologie medicale - dictee' },
        { id: 'medical_conversation', name: 'Medical Conversation', description: 'Terminologie medicale - dialogue' },
      ],
      languages: ['fr-FR', 'en-US', 'en-GB', 'es-ES', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN', 'ar-SA'],
    };
  }
}

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