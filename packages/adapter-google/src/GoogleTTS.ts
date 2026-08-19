// ============================================================
// Google Cloud Text-to-Speech Provider
// TTS using Google Cloud Text-to-Speech API
// ============================================================

import { BaseTTSService, SpeechServiceError } from '@owllayer/core';
import type {
  TTSConfig,
  TTSResult,
  Voice,
  SpeechCapabilities,
  SpeechServiceOptions,
} from '@owllayer/core';

export interface GoogleTTSOptions extends SpeechServiceOptions {
  apiKey: string;
  voice?: string;
  voiceType?: 'Standard' | 'WaveNet' | 'Neural2' | 'Studio';
  pitch?: number;
  volumeGainDb?: number;
  effectsProfileId?: string[];
}

const AUDIO_ENCODING_MAP: Record<string, string> = {
  mp3: 'MP3',
  opus: 'OGG_OPUS',
  wav: 'LINEAR16',
  pcm: 'LINEAR16',
  aac: 'MP3',
  flac: 'MP3',
};

const MIME_TYPE_MAP: Record<string, string> = {
  MP3: 'audio/mpeg',
  OGG_OPUS: 'audio/ogg',
  LINEAR16: 'audio/wav',
};

export class GoogleTTS extends BaseTTSService {
  readonly name = 'google-tts';

  private apiKey: string;
  private voiceType: string;
  private pitchSemitones: number;
  private volumeGainDb: number;
  private effectsProfileId: string[];

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
          ...(this.effectsProfileId.length > 0 ? { effectsProfileId: this.effectsProfileId } : {}),
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

      return (data.voices || []).map((voice) => ({
        id: voice.name,
        name: voice.name,
        gender: this.mapGender(voice.ssmlGender),
        languages: voice.languageCodes,
        description: `${voice.name} (${voice.ssmlGender})`,
        style: this.getVoiceType(voice.name),
        metadata: {
          naturalSampleRateHertz: voice.naturalSampleRateHertz,
        },
      }));
    } catch (error) {
      this.log('Failed to list voices', error);
      return [];
    }
  }

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

  private isSSML(text: string): boolean {
    return text.trimStart().startsWith('<speak');
  }

  private inferGender(voice?: string): string {
    if (!voice) return 'NEUTRAL';
    const lastChar = voice.slice(-1).toUpperCase();
    if (['A', 'C', 'E'].includes(lastChar)) return 'FEMALE';
    if (['B', 'D', 'F'].includes(lastChar)) return 'MALE';
    return 'NEUTRAL';
  }

  private mapGender(ssmlGender?: string): 'male' | 'female' | 'neutral' {
    switch (ssmlGender) {
      case 'MALE': return 'male';
      case 'FEMALE': return 'female';
      default: return 'neutral';
    }
  }

  private getVoiceType(name: string): string {
    if (name.includes('Studio')) return 'studio';
    if (name.includes('Neural2')) return 'neural2';
    if (name.includes('Wavenet') || name.includes('WaveNet')) return 'wavenet';
    return 'standard';
  }

  getCapabilities(): SpeechCapabilities {
    return {
      provider: 'google-tts',
      providerName: 'Google Cloud Text-to-Speech',
      currentVoice: this.defaultVoice,
      currentLanguage: this.defaultLanguage,
      voices: [
        { id: 'fr-FR-Neural2-A', name: 'Neural2-A (fr-FR)', language: 'fr-FR', gender: 'female' },
        { id: 'fr-FR-Neural2-B', name: 'Neural2-B (fr-FR)', language: 'fr-FR', gender: 'male' },
        { id: 'fr-FR-Neural2-C', name: 'Neural2-C (fr-FR)', language: 'fr-FR', gender: 'female' },
        { id: 'fr-FR-Neural2-D', name: 'Neural2-D (fr-FR)', language: 'fr-FR', gender: 'male' },
        { id: 'en-US-Neural2-F', name: 'Neural2-F (en-US)', language: 'en-US', gender: 'female' },
        { id: 'en-US-Neural2-D', name: 'Neural2-D (en-US)', language: 'en-US', gender: 'male' },
      ],
      languages: ['fr-FR', 'en-US', 'en-GB', 'es-ES', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN'],
    };
  }
}

interface GoogleTTSResponse {
  audioContent: string;
}

interface GoogleVoice {
  name: string;
  languageCodes: string[];
  ssmlGender?: string;
  naturalSampleRateHertz?: number;
}