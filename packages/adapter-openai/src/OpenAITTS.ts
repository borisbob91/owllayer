// ============================================================
// OpenAI TTS Provider
// Text-to-Speech using OpenAI TTS API
// ============================================================

import OpenAI from 'openai';
import { BaseTTSService, SpeechServiceError } from '@owllayer/core';
import type {
  TTSConfig,
  TTSResult,
  Voice,
  SpeechCapabilities,
  SpeechServiceOptions,
} from '@owllayer/core';
import {
  OPENAI_TTS_MODELS,
  OPENAI_TTS_VOICES,
  type OpenAITTSModel,
  type OpenAITTSVoice,
} from './models.js';

export interface OpenAITTSOptions extends SpeechServiceOptions {
  apiKey: string;
  model?: OpenAITTSModel;
  voice?: OpenAITTSVoice;
  /** Consignes de ton/style (gpt-4o-mini-tts uniquement, ignore par tts-1/tts-1-hd) */
  instructions?: string;
  format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
}

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
    description: 'Voix energique et dynamique',
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
    description: 'Voix feminine jeune et moderne',
    style: 'modern',
  },
  {
    id: 'shimmer',
    name: 'Shimmer',
    gender: 'female',
    languages: ['en-US', 'fr-FR', 'es-ES', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'ko-KR', 'zh-CN'],
    description: 'Voix feminine douce et apaisante',
    style: 'gentle',
  },
  // Voix plus recentes : description et genre non documentes
  ...(['ash', 'ballad', 'coral', 'sage', 'verse', 'marin', 'cedar'] as const).map((id) => ({
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    languages: ['en-US', 'fr-FR', 'es-ES', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'ko-KR', 'zh-CN'],
  })),
];

export class OpenAITTS extends BaseTTSService {
  readonly name = 'openai-tts';

  private client: OpenAI;
  private model: string;
  private instructions?: string;
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
    this.instructions = options.instructions;
    this.defaultVoice = options.voice || 'nova';
    this.defaultFormat = options.format || 'mp3';

    this.log('OpenAI TTS initialized', {
      model: this.model,
      voice: this.defaultVoice,
      format: this.defaultFormat,
    });
  }

  async synthesize(config: TTSConfig): Promise<TTSResult> {
    this.validateConfig(config);

    const text = this.normalizeText(config.text);
    const voice = (config.voice || this.defaultVoice) as never;
    const format = config.outputFormat || this.defaultFormat;
    const startTime = Date.now();

    try {
      this.log('Synthesizing text', {
        textLength: text.length,
        voice,
        model: this.model,
        format,
      });

      const speechResponse = await this.client.audio.speech.create({
        model: this.model,
        voice,
        input: text,
        response_format: format as never,
        speed: config.speed || 1.0,
        ...(this.instructions && !this.model.startsWith('tts-1')
          ? { instructions: this.instructions }
          : {}),
      });

      const duration = Date.now() - startTime;
      const arrayBuffer = await speechResponse.arrayBuffer();
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

  async listVoices(languageCode?: string): Promise<Voice[]> {
    if (languageCode) {
      return OPENAI_VOICES.filter((voice) => voice.languages.includes(languageCode));
    }
    return OPENAI_VOICES;
  }

  async isAvailable(): Promise<boolean> {
    try {
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
      models: OPENAI_TTS_MODELS.map((id) => ({ id, name: id })),
      voices: OPENAI_TTS_VOICES.map((id) => {
        const voice = OPENAI_VOICES.find((v) => v.id === id);
        return { id, name: voice?.name ?? id, gender: voice?.gender };
      }),
    };
  }
}