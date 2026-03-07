// ============================================================
// Google Cloud Text-to-Speech Provider
// TTS using Google Cloud Text-to-Speech API
// ============================================================

import { BaseTTSService } from '../TTSService.js';
import {
  TTSConfig,
  TTSResult,
  Voice,
  SpeechServiceError,
  SpeechServiceOptions,
} from '../types.js';

/**
 * Options pour GoogleTTS.
 */
export interface GoogleTTSOptions extends SpeechServiceOptions {
  /** Clé API Google Cloud */
  apiKey: string;
  /** Voix par défaut (ex: 'fr-FR-Neural2-A') */
  voice?: string;
  /** Type de voix : Standard, WaveNet, Neural2, Studio */
  voiceType?: 'Standard' | 'WaveNet' | 'Neural2' | 'Studio';
  /** Pitch (-20 à +20 demi-tons) */
  pitch?: number;
  /** Volume en dB (-96 à +16) */
  volumeGainDb?: number;
  /** Profil d'effets audio */
  effectsProfileId?: string[];
}

/**
 * Mapping des formats de sortie Google TTS.
 */
const AUDIO_ENCODING_MAP: Record<string, string> = {
  mp3: 'MP3',
  opus: 'OGG_OPUS',
  wav: 'LINEAR16',
  pcm: 'LINEAR16',
  aac: 'MP3', // fallback MP3 (Google ne supporte pas AAC nativement)
  flac: 'MP3', // fallback MP3
};

const MIME_TYPE_MAP: Record<string, string> = {
  MP3: 'audio/mpeg',
  OGG_OPUS: 'audio/ogg',
  LINEAR16: 'audio/wav',
};

/**
 * Provider TTS utilisant Google Cloud Text-to-Speech.
 *
 * Features :
 * - 380+ voix dans 50+ langues
 * - 4 types de voix : Standard, WaveNet, Neural2, Studio
 * - Contrôle pitch, vitesse, volume
 * - SSML supporté
 * - Profils d'effets audio (casque, téléphone, haut-parleur)
 * - Prix : $4/1M chars (Standard), $16/1M (WaveNet/Neural2)
 *
 * @example
 * ```ts
 * const tts = new GoogleTTS({
 *   apiKey: process.env.GOOGLE_API_KEY,
 *   voice: 'fr-FR-Neural2-A',
 *   defaultLanguage: 'fr-FR',
 * });
 *
 * const result = await tts.synthesize({
 *   text: 'Bonjour, comment puis-je vous aider ?',
 * });
 * console.log(result.mimeType); // 'audio/mpeg'
 * ```
 */
export class GoogleTTS extends BaseTTSService {
  readonly name = 'google-tts';

  private apiKey: string;
  private voiceType: string;
  private pitchSemitones: number;
  private volumeGainDb: number;
  private effectsProfileId: string[];

  /** URL de l'API Google Cloud Text-to-Speech v1 */
  private readonly API_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
  private readonly VOICES_URL = 'https://texttospeech.googleapis.com/v1/voices';

  constructor(options: GoogleTTSOptions) {
    super(options);

    if (!options.apiKey) {
      throw new SpeechServiceError(
        'Google Cloud API key is required',
        this.name,
        'MISSING_API_KEY'
      );
    }

    this.apiKey = options.apiKey;
    this.defaultVoice = options.voice;
    this.voiceType = options.voiceType || 'Neural2';
    this.pitchSemitones = options.pitch ?? 0;
    this.volumeGainDb = options.volumeGainDb ?? 0;
    this.effectsProfileId = options.effectsProfileId || [];

    this.log('Google TTS initialized', {
      voice: this.defaultVoice,
      voiceType: this.voiceType,
    });
  }

  /**
   * Synthétiser du texte en audio via Google Cloud TTS.
   */
  async synthesize(config: TTSConfig): Promise<TTSResult> {
    this.validateConfig(config);

    const text = this.normalizeText(config.text);
    const voice = config.voice || this.defaultVoice;
    const languageCode = config.languageCode || this.defaultLanguage;
    const format = config.outputFormat || 'mp3';
    const audioEncoding = AUDIO_ENCODING_MAP[format] || 'MP3';

    const startTime = Date.now();

    try {
      this.log('Synthesizing text', {
        textLength: text.length,
        voice,
        languageCode,
        format,
      });

      // Construire le body de la requête
      const requestBody: Record<string, unknown> = {
        input: this.isSSML(text) ? { ssml: text } : { text },
        voice: {
          languageCode,
          ...(voice ? { name: voice } : {}),
          ssmlGender: this.inferGender(voice),
        },
        audioConfig: {
          audioEncoding,
          speakingRate: config.speed || 1.0,
          pitch: config.pitch ?? this.pitchSemitones,
          volumeGainDb: this.volumeGainDb,
          ...(this.effectsProfileId.length > 0
            ? { effectsProfileId: this.effectsProfileId }
            : {}),
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
          `Google TTS API error (${response.status}): ${errorBody}`,
          this.name,
          'API_ERROR',
          response.status
        );
      }

      const data = await response.json() as GoogleTTSResponse;
      const duration = Date.now() - startTime;

      const mimeType = MIME_TYPE_MAP[audioEncoding] || 'audio/mpeg';

      const result: TTSResult = {
        audioBase64: data.audioContent,
        mimeType,
        duration: this.estimateDuration(text, config.speed || 1.0),
        characterCount: this.countCharacters(text),
        metadata: {
          processingTime: duration,
          voice: voice || 'default',
          languageCode,
          audioEncoding,
        },
      };

      this.log('Synthesis complete', {
        characterCount: result.characterCount,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error) {
      this.handleError(error, 'synthesize');
    }
  }

  /**
   * Lister les voix Google Cloud disponibles.
   */
  async listVoices(languageCode?: string): Promise<Voice[]> {
    try {
      const url = languageCode
        ? `${this.VOICES_URL}?key=${this.apiKey}&languageCode=${languageCode}`
        : `${this.VOICES_URL}?key=${this.apiKey}`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new SpeechServiceError(
          `Google TTS voices API error (${response.status})`,
          this.name,
          'API_ERROR',
          response.status
        );
      }

      const data = await response.json() as { voices?: GoogleVoice[] };

      return (data.voices || []).map((v) => ({
        id: v.name,
        name: v.name,
        gender: this.mapGender(v.ssmlGender),
        languages: v.languageCodes,
        description: `${v.name} (${v.ssmlGender})`,
        style: this.getVoiceType(v.name),
        metadata: {
          naturalSampleRateHertz: v.naturalSampleRateHertz,
        },
      }));
    } catch (error) {
      this.log('Failed to list voices', error);
      return [];
    }
  }

  /**
   * Vérifier la disponibilité du service.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.VOICES_URL}?key=${this.apiKey}`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Détecter si le texte est du SSML.
   */
  private isSSML(text: string): boolean {
    return text.trimStart().startsWith('<speak');
  }

  /**
   * Inférer le genre à partir du nom de la voix.
   * Convention Google : voix terminant en -A, -C, -E = FEMALE, -B, -D, -F = MALE
   */
  private inferGender(voice?: string): string {
    if (!voice) return 'NEUTRAL';
    const lastChar = voice.slice(-1).toUpperCase();
    if (['A', 'C', 'E'].includes(lastChar)) return 'FEMALE';
    if (['B', 'D', 'F'].includes(lastChar)) return 'MALE';
    return 'NEUTRAL';
  }

  /**
   * Mapper le genre Google vers le format Voice.
   */
  private mapGender(ssmlGender?: string): 'male' | 'female' | 'neutral' {
    switch (ssmlGender) {
      case 'MALE': return 'male';
      case 'FEMALE': return 'female';
      default: return 'neutral';
    }
  }

  /**
   * Extraire le type de voix du nom (Standard, WaveNet, Neural2, Studio).
   */
  private getVoiceType(name: string): string {
    if (name.includes('Studio')) return 'studio';
    if (name.includes('Neural2')) return 'neural2';
    if (name.includes('Wavenet') || name.includes('WaveNet')) return 'wavenet';
    return 'standard';
  }
}

// --- Types internes pour les réponses Google ---

interface GoogleTTSResponse {
  audioContent: string; // base64
}

interface GoogleVoice {
  name: string;
  languageCodes: string[];
  ssmlGender?: string;
  naturalSampleRateHertz?: number;
}
