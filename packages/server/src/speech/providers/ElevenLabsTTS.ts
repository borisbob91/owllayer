// ============================================================
// ElevenLabs TTS Provider
// Text-to-Speech using ElevenLabs API
// ============================================================

import { BaseTTSService } from '../TTSService.js';
import {
  TTSConfig,
  TTSResult,
  Voice,
  SpeechCapabilities,
  SpeechServiceError,
  SpeechServiceOptions,
} from '../types.js';

/**
 * Options pour ElevenLabsTTS.
 */
export interface ElevenLabsTTSOptions extends SpeechServiceOptions {
  /** Clé API ElevenLabs */
  apiKey: string;
  /** ID de la voix par défaut (ex: '21m00Tcm4TlvDq8ikWAM' = Rachel) */
  voiceId?: string;
  /** Modèle TTS (défaut: 'eleven_multilingual_v2') */
  model?: 'eleven_multilingual_v2' | 'eleven_monolingual_v1' | 'eleven_turbo_v2' | 'eleven_turbo_v2_5';
  /** Stabilité de la voix (0-1, plus haut = plus stable) */
  stability?: number;
  /** Clarté/similarité (0-1, plus haut = plus fidèle à la voix) */
  similarityBoost?: number;
  /** Exagération du style (0-1, seulement v2) */
  styleExaggeration?: number;
  /** Boost du haut-parleur */
  speakerBoost?: boolean;
  /** Format de sortie */
  outputFormat?: 'mp3_44100_128' | 'mp3_22050_32' | 'pcm_16000' | 'pcm_22050' | 'pcm_24000' | 'pcm_44100' | 'ulaw_8000';
}

/**
 * Voix ElevenLabs populaires pré-configurées.
 */
const ELEVENLABS_PRESET_VOICES: Voice[] = [
  {
    id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    gender: 'female',
    languages: ['en-US', 'fr-FR', 'es-ES', 'de-DE'],
    description: 'Voix féminine calme et professionnelle',
    style: 'calm',
  },
  {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    gender: 'female',
    languages: ['en-US', 'fr-FR', 'es-ES', 'de-DE'],
    description: 'Voix féminine douce et chaleureuse',
    style: 'soft',
  },
  {
    id: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    gender: 'male',
    languages: ['en-US', 'fr-FR', 'es-ES', 'de-DE'],
    description: 'Voix masculine bien modulée',
    style: 'well-rounded',
  },
  {
    id: 'VR6AewLTigWG4xSOukaG',
    name: 'Arnold',
    gender: 'male',
    languages: ['en-US', 'fr-FR', 'es-ES', 'de-DE'],
    description: 'Voix masculine grave et confiante',
    style: 'crisp',
  },
  {
    id: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    gender: 'male',
    languages: ['en-US', 'fr-FR', 'es-ES', 'de-DE'],
    description: 'Voix masculine profonde et narrative',
    style: 'deep',
  },
  {
    id: 'jBpfuIE2acCO8z3wKNLl',
    name: 'Gigi',
    gender: 'female',
    languages: ['en-US', 'fr-FR', 'es-ES', 'de-DE'],
    description: 'Voix féminine jeune et animée',
    style: 'childish',
  },
];

/**
 * Mapping format de sortie → MIME type.
 */
const OUTPUT_MIME_MAP: Record<string, string> = {
  mp3_44100_128: 'audio/mpeg',
  mp3_22050_32: 'audio/mpeg',
  pcm_16000: 'audio/pcm;rate=16000',
  pcm_22050: 'audio/pcm;rate=22050',
  pcm_24000: 'audio/pcm;rate=24000',
  pcm_44100: 'audio/pcm;rate=44100',
  ulaw_8000: 'audio/basic',
};

/**
 * Provider TTS utilisant ElevenLabs.
 *
 * Features :
 * - Voix ultra-réalistes (meilleure qualité du marché)
 * - 29 langues supportées (v2 multilingue)
 * - Clonage de voix (custom voices)
 * - Contrôle fin (stabilité, clarté, style)
 * - Modèle turbo pour faible latence
 * - Prix : à partir de $5/mois (creators), pay-as-you-go disponible
 *
 * @example
 * ```ts
 * const tts = new ElevenLabsTTS({
 *   apiKey: process.env.ELEVENLABS_API_KEY,
 *   voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
 *   model: 'eleven_multilingual_v2',
 * });
 *
 * const result = await tts.synthesize({
 *   text: 'Bonjour, comment puis-je vous aider ?',
 * });
 * console.log(result.mimeType); // 'audio/mpeg'
 * ```
 */
export class ElevenLabsTTS extends BaseTTSService {
  readonly name = 'elevenlabs-tts';

  private apiKey: string;
  private voiceId: string;
  private model: string;
  private stability: number;
  private similarityBoost: number;
  private styleExaggeration: number;
  private speakerBoost: boolean;
  private outputFormat: string;

  /** URL de base de l'API ElevenLabs */
  private readonly API_BASE = 'https://api.elevenlabs.io/v1';

  constructor(options: ElevenLabsTTSOptions) {
    super(options);

    if (!options.apiKey) {
      throw new SpeechServiceError(
        'ElevenLabs API key is required',
        this.name,
        'MISSING_API_KEY'
      );
    }

    this.apiKey = options.apiKey;
    this.voiceId = options.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Rachel par défaut
    this.defaultVoice = this.voiceId;
    this.model = options.model || 'eleven_multilingual_v2';
    this.stability = options.stability ?? 0.5;
    this.similarityBoost = options.similarityBoost ?? 0.75;
    this.styleExaggeration = options.styleExaggeration ?? 0;
    this.speakerBoost = options.speakerBoost ?? true;
    this.outputFormat = options.outputFormat || 'mp3_44100_128';

    this.log('ElevenLabs TTS initialized', {
      model: this.model,
      voiceId: this.voiceId,
    });
  }

  /**
   * Synthétiser du texte en audio via ElevenLabs.
   */
  async synthesize(config: TTSConfig): Promise<TTSResult> {
    this.validateConfig(config);

    const text = this.normalizeText(config.text);
    const voiceId = config.voice || this.voiceId;

    const startTime = Date.now();

    try {
      this.log('Synthesizing text', {
        textLength: text.length,
        voiceId,
        model: this.model,
      });

      const url = `${this.API_BASE}/text-to-speech/${voiceId}?output_format=${this.outputFormat}`;

      const requestBody = {
        text,
        model_id: this.model,
        voice_settings: {
          stability: this.stability,
          similarity_boost: this.similarityBoost,
          style: this.styleExaggeration,
          use_speaker_boost: this.speakerBoost,
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new SpeechServiceError(
          `ElevenLabs API error (${response.status}): ${errorBody}`,
          this.name,
          'API_ERROR',
          response.status
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const audioBase64 = this.bufferToBase64(buffer);

      const duration = Date.now() - startTime;
      const mimeType = OUTPUT_MIME_MAP[this.outputFormat] || 'audio/mpeg';

      const result: TTSResult = {
        audioBase64,
        mimeType,
        duration: this.estimateDuration(text, config.speed || 1.0),
        characterCount: this.countCharacters(text),
        metadata: {
          processingTime: duration,
          voiceId,
          model: this.model,
          audioSize: buffer.length,
          outputFormat: this.outputFormat,
        },
      };

      this.log('Synthesis complete', {
        characterCount: result.characterCount,
        audioSize: buffer.length,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error) {
      this.handleError(error, 'synthesize');
    }
  }

  /**
   * Lister les voix disponibles depuis l'API ElevenLabs.
   */
  async listVoices(languageCode?: string): Promise<Voice[]> {
    try {
      const response = await fetch(`${this.API_BASE}/voices`, {
        headers: { 'xi-api-key': this.apiKey },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        this.log('Failed to fetch voices, returning presets');
        return this.filterByLanguage(ELEVENLABS_PRESET_VOICES, languageCode);
      }

      const data = await response.json() as { voices?: ElevenLabsVoice[] };

      const voices: Voice[] = (data.voices || []).map((v) => ({
        id: v.voice_id,
        name: v.name,
        gender: this.mapGender(v.labels?.gender),
        languages: v.fine_tuning?.language ? [v.fine_tuning.language] : ['en-US'],
        description: v.labels?.description || v.description || '',
        style: v.labels?.use_case || 'general',
        metadata: {
          category: v.category,
          previewUrl: v.preview_url,
        },
      }));

      return this.filterByLanguage(voices, languageCode);
    } catch (error) {
      this.log('Failed to list voices', error);
      return this.filterByLanguage(ELEVENLABS_PRESET_VOICES, languageCode);
    }
  }

  /**
   * Vérifier la disponibilité du service.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}/user`, {
        headers: { 'xi-api-key': this.apiKey },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Mapper le genre ElevenLabs vers le format Voice.
   */
  private mapGender(gender?: string): 'male' | 'female' | 'neutral' {
    if (gender === 'male') return 'male';
    if (gender === 'female') return 'female';
    return 'neutral';
  }

  /**
   * Filtrer les voix par langue.
   */
  private filterByLanguage(voices: Voice[], languageCode?: string): Voice[] {
    if (!languageCode) return voices;
    // ElevenLabs multilingue v2 supporte toutes les langues,
    // on filtre si l'info est disponible
    return voices.filter((v) =>
      v.languages.length === 0 || v.languages.some((l) => l.startsWith(languageCode.split('-')[0]))
    );
  }

  getCapabilities(): SpeechCapabilities {
    return {
      provider: 'elevenlabs-tts',
      providerName: 'ElevenLabs Text-to-Speech',
      currentVoice: this.voiceId,
      models: [
        { id: 'eleven_multilingual_v2', name: 'Multilingual v2', description: 'Meilleure qualité, multilingue' },
        { id: 'eleven_turbo_v2_5',     name: 'Turbo v2.5',      description: 'Ultra-rapide, économique' },
        { id: 'eleven_turbo_v2',       name: 'Turbo v2',        description: 'Rapide, qualité correcte' },
        { id: 'eleven_monolingual_v1', name: 'Monolingual v1',  description: 'Anglais uniquement' },
      ],
      voices: [
        { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel',  gender: 'female' },
        { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella',   gender: 'female' },
        { id: 'ErXwobaYiN019PkySvjV',  name: 'Antoni',  gender: 'male' },
        { id: 'VR6AewLTigWG4xSOukaG',  name: 'Arnold',  gender: 'male' },
        { id: 'pNInz6obpgDQGcFmaJgB',  name: 'Adam',    gender: 'male' },
      ],
    };
  }
}

// --- Types internes pour les réponses ElevenLabs ---

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  preview_url?: string;
  labels?: {
    gender?: string;
    age?: string;
    accent?: string;
    description?: string;
    use_case?: string;
  };
  fine_tuning?: {
    language?: string;
  };
}
