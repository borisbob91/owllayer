import {
  BaseTTSService,
  SpeechServiceError,
  type SpeechCapabilities,
  type SpeechServiceOptions,
  type TTSConfig,
  type TTSResult,
  type Voice,
} from '@owllayer/core';
import {
  DEFAULT_GEMINI_TTS_MODEL,
  DEFAULT_GEMINI_TTS_VOICE,
  GEMINI_TTS_VOICES,
  buildGeminiTTSCapabilities,
} from './geminiVoices.js';

export interface GeminiTTSCustomPronunciation {
  phrase: string;
  pronunciation: string;
  phoneticEncoding?: string;
}

export interface GeminiTTSEnv {
  GOOGLE_API_KEY?: string;
  GOOGLE_GENAI_USE_VERTEXAI?: string;
  GOOGLE_CLOUD_PROJECT?: string;
  GOOGLE_CLOUD_LOCATION?: string;
  [key: string]: string | undefined;
}

export interface GeminiTTSServiceOptions extends SpeechServiceOptions {
  apiKey?: string;
  model?: string;
  defaultVoice?: string;
  instructions?: string;
  customPronunciations?: GeminiTTSCustomPronunciation[];
  vertexai?: boolean;
  project?: string;
  location?: string;
  env?: GeminiTTSEnv;
  clientFactory?: GeminiTTSClientFactory;
}

export interface GeminiTTSClientOptions {
  model: string;
  voiceName: string;
  apiKey?: string;
  vertexai?: boolean;
  project?: string;
  location?: string;
  instructions?: string;
  customPronunciations?: {
    pronunciations: GeminiTTSCustomPronunciation[];
  };
}

export interface GeminiTTSAudioFrame {
  data: Int16Array;
  sampleRate: number;
  channels: number;
  samplesPerChannel: number;
}

export interface GeminiTTSSynthesizedAudio {
  frame: GeminiTTSAudioFrame;
  final: boolean;
}

export interface GeminiTTSClient {
  synthesize(
    text: string,
    connOptions?: unknown,
    abortSignal?: AbortSignal
  ): AsyncIterable<GeminiTTSSynthesizedAudio>;
}

export type GeminiTTSClientFactory =
  (options: GeminiTTSClientOptions) => GeminiTTSClient | Promise<GeminiTTSClient>;

export class GeminiTTSService extends BaseTTSService {
  readonly name = 'gemini-tts';

  private readonly apiKey?: string;
  private readonly model: string;
  private readonly instructions?: string;
  private readonly customPronunciations?: GeminiTTSCustomPronunciation[];
  private readonly vertexai: boolean;
  private readonly project?: string;
  private readonly location?: string;
  private readonly clientFactory: GeminiTTSClientFactory;

  constructor(options: GeminiTTSServiceOptions = {}) {
    super(options);

    const env = options.env ?? process.env;
    this.apiKey = readString(options.apiKey ?? env.GOOGLE_API_KEY);
    this.model = readString(options.model) ?? DEFAULT_GEMINI_TTS_MODEL;
    this.defaultVoice = readString(options.defaultVoice) ?? DEFAULT_GEMINI_TTS_VOICE;
    this.instructions = readString(options.instructions);
    this.customPronunciations = options.customPronunciations;
    this.vertexai = options.vertexai ?? env.GOOGLE_GENAI_USE_VERTEXAI === 'true';
    this.project = readString(options.project ?? env.GOOGLE_CLOUD_PROJECT);
    this.location = readString(options.location ?? env.GOOGLE_CLOUD_LOCATION);
    this.clientFactory = options.clientFactory ?? createLiveKitGoogleTTSClient;

    if (this.vertexai) {
      if (!this.project) {
        throw new SpeechServiceError(
          'Google Cloud project is required when Gemini TTS uses Vertex AI',
          this.name,
          'MISSING_PROJECT'
        );
      }
    } else if (!this.apiKey) {
      throw new SpeechServiceError(
        'Google API key is required for Gemini TTS',
        this.name,
        'MISSING_API_KEY'
      );
    }
  }

  async synthesize(config: TTSConfig): Promise<TTSResult> {
    this.validateConfig(config);

    const text = this.normalizeText(config.text);
    const voiceName = readString(config.voice) ?? this.defaultVoice ?? DEFAULT_GEMINI_TTS_VOICE;
    const startTime = Date.now();

    try {
      const client = await this.clientFactory(this.buildClientOptions(voiceName));
      const stream = client.synthesize(text, undefined, createAbortSignal(this.timeout));
      const audio = await this.collectPCM(stream);

      if (audio.buffer.length === 0) {
        throw new SpeechServiceError(
          'Gemini TTS returned no audio',
          this.name,
          'EMPTY_AUDIO'
        );
      }

      const duration = audio.samplesPerChannel > 0 && audio.sampleRate > 0
        ? Math.ceil((audio.samplesPerChannel / audio.sampleRate) * 1000)
        : this.estimateDuration(text, config.speed || 1.0);

      return {
        audioBase64: this.bufferToBase64(audio.buffer),
        mimeType: `audio/pcm;rate=${audio.sampleRate}`,
        duration,
        characterCount: this.countCharacters(text),
        metadata: {
          processingTime: Date.now() - startTime,
          provider: 'livekit-google-gemini',
          model: this.model,
          voice: voiceName,
          sampleRate: audio.sampleRate,
          channels: audio.channels,
          audioSize: audio.buffer.length,
          outputFormat: 'pcm_s16le',
          requestedFormat: config.outputFormat,
          requestedSpeed: config.speed,
          requestedPitch: config.pitch,
          requestedVolume: config.volume,
        },
      };
    } catch (error) {
      this.throwSanitizedError(error, 'synthesize');
    }
  }

  async listVoices(languageCode?: string): Promise<Voice[]> {
    if (!languageCode) {
      return cloneVoices(GEMINI_TTS_VOICES);
    }

    return cloneVoices(GEMINI_TTS_VOICES).filter((voice) =>
      voice.languages.includes('multilingual') ||
      voice.languages.some((language) => language.startsWith(languageCode.split('-')[0] ?? ''))
    );
  }

  async isAvailable(): Promise<boolean> {
    return this.vertexai ? Boolean(this.project) : Boolean(this.apiKey);
  }

  getCapabilities(): SpeechCapabilities {
    return buildGeminiTTSCapabilities(
      this.defaultVoice ?? DEFAULT_GEMINI_TTS_VOICE,
      this.model,
      this.defaultLanguage
    );
  }

  private buildClientOptions(voiceName: string): GeminiTTSClientOptions {
    return stripUndefined({
      model: this.model,
      voiceName,
      apiKey: this.vertexai ? undefined : this.apiKey,
      vertexai: this.vertexai,
      project: this.vertexai ? this.project : undefined,
      location: this.vertexai ? this.location : undefined,
      instructions: this.instructions,
      customPronunciations: this.customPronunciations?.length
        ? { pronunciations: this.customPronunciations.map((entry) => ({ ...entry })) }
        : undefined,
    });
  }

  private async collectPCM(stream: AsyncIterable<GeminiTTSSynthesizedAudio>): Promise<{
    buffer: Buffer;
    sampleRate: number;
    channels: number;
    samplesPerChannel: number;
  }> {
    const chunks: Buffer[] = [];
    let sampleRate = 24000;
    let channels = 1;
    let samplesPerChannel = 0;
    let initialized = false;

    for await (const event of stream) {
      const frame = event.frame;
      if (!frame?.data) {
        continue;
      }

      if (!initialized) {
        sampleRate = frame.sampleRate;
        channels = frame.channels;
        initialized = true;
      } else if (frame.sampleRate !== sampleRate || frame.channels !== channels) {
        throw new SpeechServiceError(
          'Gemini TTS returned mixed audio frame formats',
          this.name,
          'INVALID_AUDIO_FORMAT'
        );
      }

      const frameBytes = new Uint8Array(
        frame.data.buffer,
        frame.data.byteOffset,
        frame.data.byteLength
      );
      chunks.push(Buffer.from(frameBytes));
      samplesPerChannel += frame.samplesPerChannel || Math.floor(frame.data.length / channels);
    }

    return {
      buffer: Buffer.concat(chunks),
      sampleRate,
      channels,
      samplesPerChannel,
    };
  }

  private throwSanitizedError(error: unknown, context: string): never {
    if (error instanceof SpeechServiceError) {
      throw error;
    }

    throw new SpeechServiceError(
      `${context}: ${this.sanitizeErrorMessage(error)}`,
      this.name,
      'SYNTHESIS_ERROR',
      extractStatusCode(error)
    );
  }

  private sanitizeErrorMessage(error: unknown): string {
    const rawMessage = error instanceof Error ? error.message : String(error);
    const secrets = [
      this.apiKey,
      process.env.GOOGLE_API_KEY,
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
    ].filter((value): value is string => Boolean(value));

    let message = rawMessage || 'Unknown provider error';
    for (const secret of secrets) {
      message = message.split(secret).join('[redacted]');
    }

    message = message
      .replace(/Bearer\s+[^\s,;]+/gi, 'Bearer [redacted]')
      .replace(/(api[_-]?key\s*[:=]\s*)[^\s,;]+/gi, '$1[redacted]')
      .replace(/(key=)[^&\s]+/gi, '$1[redacted]');

    return message.length > 500 ? `${message.slice(0, 500)}...` : message;
  }
}

async function createLiveKitGoogleTTSClient(
  options: GeminiTTSClientOptions
): Promise<GeminiTTSClient> {
  const google = await import('@livekit/agents-plugin-google') as unknown as {
    beta: {
      TTS: new (options: GeminiTTSClientOptions) => GeminiTTSClient;
    };
  };

  return new google.beta.TTS(options);
}

function cloneVoices(voices: Voice[]): Voice[] {
  return voices.map((voice) => ({
    ...voice,
    languages: [...voice.languages],
    metadata: voice.metadata ? { ...voice.metadata } : undefined,
  }));
}

function stripUndefined<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as T;
}

function readString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function createAbortSignal(timeout: number): AbortSignal | undefined {
  if (typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeout);
  }

  return undefined;
}

function extractStatusCode(error: unknown): number | undefined {
  const candidate = error as { statusCode?: unknown; status?: unknown; code?: unknown };
  for (const value of [candidate.statusCode, candidate.status, candidate.code]) {
    if (typeof value === 'number') {
      return value;
    }
  }

  return undefined;
}
