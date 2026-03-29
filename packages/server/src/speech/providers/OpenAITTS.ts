// ============================================================
// OpenAI TTS Provider
// Text-to-Speech using OpenAI TTS API
// ============================================================

import OpenAI from 'openai';
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
 * Options pour OpenAITTS.
 */
export interface OpenAITTSOptions extends SpeechServiceOptions {
  /** Clé API OpenAI */
  apiKey: string;
  /** Modèle TTS (défaut: 'tts-1') */
  model?: 'tts-1' | 'tts-1-hd';
  /** Voix par défaut */
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  /** Format audio par défaut */
  format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
}

/**
 * Voix OpenAI disponibles avec descriptions.
 */
const OPENAI_VOICES: Voice[] = [
  {
    id: 'alloy',
    name: 'Alloy',
    gender: 'neutral',
    languages: ['en-US', 'fr-FR', 'es-ES', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'ko-KR', 'zh-CN'],
    description: 'Voix neutre professionnelle et claire',
    style: 'professional',
  },
  {
    id: 'echo',
    name: 'Echo',
    gender: 'male',
    languages: ['en-US', 'fr-FR', 'es-ES', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'ko-KR', 'zh-CN'],
    description: 'Voix masculine chaleureuse et mature',
    style: 'warm',
  },
  {
    id: 'fable',
    name: 'Fable',
    gender: 'neutral',
    languages: ['en-US', 'fr-FR', 'es-ES', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'ko-KR', 'zh-CN'],
    description: 'Voix énergique et dynamique',
    style: 'energetic',
  },
  {
    id: 'onyx',
    name: 'Onyx',
    gender: 'male',
    languages: ['en-US', 'fr-FR', 'es-ES', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'ko-KR', 'zh-CN'],
    description: 'Voix masculine profonde et autoritaire',
    style: 'authoritative',
  },
  {
    id: 'nova',
    name: 'Nova',
    gender: 'female',
    languages: ['en-US', 'fr-FR', 'es-ES', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'ko-KR', 'zh-CN'],
    description: 'Voix féminine jeune et moderne',
    style: 'modern',
  },
  {
    id: 'shimmer',
    name: 'Shimmer',
    gender: 'female',
    languages: ['en-US', 'fr-FR', 'es-ES', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'ko-KR', 'zh-CN'],
    description: 'Voix féminine douce et apaisante',
    style: 'gentle',
  },
];

/**
 * Provider TTS utilisant OpenAI Text-to-Speech.
 * 
 * Features :
 * - 6 voix naturelles (alloy, echo, fable, onyx, nova, shimmer)
 * - Support multilingue (détection automatique)
 * - 2 modèles : tts-1 (rapide) et tts-1-hd (haute qualité)
 * - Latence faible (~300ms pour tts-1)
 * - Prix : $15/1M caractères (tts-1), $30/1M (tts-1-hd)
 * 
 * @example
 * ```ts
 * const tts = new OpenAITTS({
 *   apiKey: process.env.OPENAI_API_KEY,
 *   model: 'tts-1',
 *   voice: 'nova',
 * });
 * 
 * const result = await tts.synthesize({
 *   text: 'Bonjour, comment puis-je vous aider ?',
 * });
 * console.log(result.mimeType); // 'audio/mpeg'
 * ```
 */
export class OpenAITTS extends BaseTTSService {
  readonly name = 'openai-tts';

  private client: OpenAI;
  private model: 'tts-1' | 'tts-1-hd';
  private defaultFormat: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';

  constructor(options: OpenAITTSOptions) {
    super(options);

    if (!options.apiKey) {
      throw new SpeechServiceError(
        'OpenAI API key is required',
        this.name,
        'MISSING_API_KEY'
      );
    }

    this.client = new OpenAI({
      apiKey: options.apiKey,
      timeout: this.timeout,
    });

    this.model = options.model || 'tts-1';
    this.defaultVoice = options.voice || 'nova';
    this.defaultFormat = options.format || 'mp3';

    this.log('OpenAI TTS initialized', {
      model: this.model,
      voice: this.defaultVoice,
      format: this.defaultFormat,
    });
  }

  /**
   * Synthétiser du texte en audio.
   */
  async synthesize(config: TTSConfig): Promise<TTSResult> {
    this.validateConfig(config);

    const text = this.normalizeText(config.text);
    const voice = (config.voice || this.defaultVoice) as any;
    const format = config.outputFormat || this.defaultFormat;

    const startTime = Date.now();

    try {
      this.log('Synthesizing text', {
        textLength: text.length,
        voice,
        model: this.model,
        format,
      });

      // Appeler l'API TTS
      const mp3Response = await this.client.audio.speech.create({
        model: this.model,
        voice,
        input: text,
        response_format: format as any,
        speed: config.speed || 1.0,
      });

      const duration = Date.now() - startTime;

      // Convertir la réponse en bytes exacts puis base64
      const arrayBuffer = await mp3Response.arrayBuffer();
      const audioBytes = new Uint8Array(arrayBuffer);
      const audioBase64 = this.bufferToBase64(audioBytes);

      const result: TTSResult = {
        audioBase64,
        mimeType: this.getMimeType(format),
        duration: this.estimateDuration(text, config.speed || 1.0),
        characterCount: text.length,
        metadata: {
          processingTime: duration,
          model: this.model,
          voice,
          format,
        },
      };

      this.log('Synthesis complete', {
        characterCount: result.characterCount,
        audioSize: audioBytes.byteLength,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error) {
      this.handleError(error, 'synthesize');
    }
  }

  /**
   * Lister les voix disponibles.
   */
  async listVoices(languageCode?: string): Promise<Voice[]> {
    if (languageCode) {
      return OPENAI_VOICES.filter((v) => v.languages.includes(languageCode));
    }
    return OPENAI_VOICES;
  }

  /**
   * Vérifier la disponibilité du service.
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Test avec un texte minimal
      await this.client.models.retrieve('tts-1');
      return true;
    } catch (error) {
      this.log('Service unavailable', error);
      return false;
    }
  }

  getCapabilities(): SpeechCapabilities {
    return {
      provider: 'openai-tts',
      providerName: 'OpenAI Text-to-Speech',
      currentVoice: this.defaultVoice,
      models: [
        { id: 'tts-1',    name: 'TTS-1',    description: 'Latence faible, économique' },
        { id: 'tts-1-hd', name: 'TTS-1 HD', description: 'Haute qualité audio' },
      ],
      voices: [
        { id: 'alloy',   name: 'Alloy',   gender: 'neutral' },
        { id: 'echo',    name: 'Echo',    gender: 'male' },
        { id: 'fable',   name: 'Fable',   gender: 'neutral' },
        { id: 'onyx',    name: 'Onyx',    gender: 'male' },
        { id: 'nova',    name: 'Nova',    gender: 'female' },
        { id: 'shimmer', name: 'Shimmer', gender: 'female' },
      ],
    };
  }
}
