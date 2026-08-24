import {
  resolveSystemPrompt,
  type LLMAdapterCapabilities,
  type LiveAdapter,
  type SystemPrompt,
} from '@owllayer/core';
import { LiveKitConfigurationError } from '../errors.js';
import {
  DEFAULT_GEMINI_LIVE_MODEL,
  DEFAULT_GEMINI_LIVE_VOICE,
  buildGeminiLiveCapabilities,
} from './capabilities.js';
import { LiveKitLiveSession, type LiveKitLiveSessionConfig } from './LiveKitLiveSession.js';
import { createDefaultLiveKitRuntimeHelpers } from './LiveKitRealtimeAdapter.js';
import { createLiveKitToolContext } from './toolMapping.js';
import type {
  LiveKitRealtimeModelClient,
  LiveKitRuntimeHelpersFactory,
} from './types.js';

export interface GeminiLiveEnv {
  GOOGLE_API_KEY?: string;
  GOOGLE_GENAI_USE_VERTEXAI?: string;
  GOOGLE_CLOUD_PROJECT?: string;
  GOOGLE_CLOUD_LOCATION?: string;
  [key: string]: string | undefined;
}

export interface GeminiLiveModelOptions {
  instructions?: string;
  model: string;
  apiKey?: string;
  voice: string;
  language?: string;
  vertexai?: boolean;
  project?: string;
  location?: string;
  inputAudioTranscription?: Record<string, never> | null;
  outputAudioTranscription?: Record<string, never> | null;
}

export type GeminiRealtimeModelFactory =
  (options: GeminiLiveModelOptions) =>
    LiveKitRealtimeModelClient | Promise<LiveKitRealtimeModelClient>;

export interface GeminiLiveAdapterOptions {
  apiKey?: string;
  model?: string;
  voice?: string;
  language?: string;
  systemPrompt?: SystemPrompt;
  vertexai?: boolean;
  project?: string;
  location?: string;
  inputAudioTranscription?: boolean;
  outputAudioTranscription?: boolean;
  env?: GeminiLiveEnv;
  modelFactory?: GeminiRealtimeModelFactory;
  runtimeHelpersFactory?: LiveKitRuntimeHelpersFactory;
}

export class GeminiLiveAdapter implements LiveAdapter {
  readonly name = 'livekit-gemini-live';
  systemPrompt?: SystemPrompt;

  private readonly apiKey?: string;
  private readonly model: string;
  private readonly defaultVoice: string;
  private readonly defaultLanguage?: string;
  private readonly vertexai: boolean;
  private readonly project?: string;
  private readonly location?: string;
  private readonly inputAudioTranscription: boolean;
  private readonly outputAudioTranscription: boolean;
  private readonly modelFactory: GeminiRealtimeModelFactory;
  private readonly runtimeHelpersFactory: LiveKitRuntimeHelpersFactory;

  constructor(options: GeminiLiveAdapterOptions = {}) {
    const env = options.env ?? process.env;
    this.apiKey = readString(options.apiKey ?? env.GOOGLE_API_KEY);
    this.model = readString(options.model) ?? DEFAULT_GEMINI_LIVE_MODEL;
    this.defaultVoice = readString(options.voice) ?? DEFAULT_GEMINI_LIVE_VOICE;
    this.defaultLanguage = readString(options.language);
    this.systemPrompt = options.systemPrompt;
    this.vertexai = options.vertexai ?? env.GOOGLE_GENAI_USE_VERTEXAI === 'true';
    this.project = readString(options.project ?? env.GOOGLE_CLOUD_PROJECT);
    this.location = readString(options.location ?? env.GOOGLE_CLOUD_LOCATION);
    this.inputAudioTranscription = options.inputAudioTranscription ?? true;
    this.outputAudioTranscription = options.outputAudioTranscription ?? true;
    this.modelFactory = options.modelFactory ?? createLiveKitGeminiRealtimeModel;
    this.runtimeHelpersFactory =
      options.runtimeHelpersFactory ?? createDefaultLiveKitRuntimeHelpers;

    if (this.vertexai) {
      if (!this.project) {
        throw new LiveKitConfigurationError(
          'Google Cloud project is required when Gemini Live uses Vertex AI',
          'LIVEKIT_CONFIGURATION_ERROR',
          { provider: this.name }
        );
      }
    } else if (!this.apiKey) {
      throw new LiveKitConfigurationError(
        'Google API key is required for Gemini Live',
        'LIVEKIT_CONFIGURATION_ERROR',
        { provider: this.name }
      );
    }
  }

  async createSession(config: LiveKitLiveSessionConfig): Promise<LiveKitLiveSession> {
    const helpers = await this.runtimeHelpersFactory();
    const voice = readString(config.voice) ?? this.defaultVoice;
    const language = readString(config.language) ?? this.defaultLanguage;
    const rawPrompt = config.systemPrompt ?? this.systemPrompt ?? '';
    const instructions = typeof rawPrompt === 'string'
      ? rawPrompt
      : resolveSystemPrompt(rawPrompt);

    const model = await this.modelFactory({
      instructions,
      model: this.model,
      apiKey: this.vertexai ? undefined : this.apiKey,
      voice,
      language,
      vertexai: this.vertexai,
      project: this.vertexai ? this.project : undefined,
      location: this.vertexai ? this.location : undefined,
      inputAudioTranscription: this.inputAudioTranscription ? {} : null,
      outputAudioTranscription: this.outputAudioTranscription ? {} : null,
    });

    const providerSession = model.session();
    await providerSession.updateTools(createLiveKitToolContext(helpers, config.tools));

    return new LiveKitLiveSession({
      provider: this.name,
      providerModel: model,
      providerSession,
      helpers,
      config,
      secrets: [this.apiKey, process.env.GOOGLE_API_KEY],
    });
  }

  getCapabilities(): LLMAdapterCapabilities {
    return buildGeminiLiveCapabilities(this.model, this.defaultVoice);
  }
}

export async function createLiveKitGeminiRealtimeModel(
  options: GeminiLiveModelOptions
): Promise<LiveKitRealtimeModelClient> {
  const google = await import('@livekit/agents-plugin-google') as unknown as {
    realtime: {
      RealtimeModel: new (options: GeminiLiveModelOptions) => LiveKitRealtimeModelClient;
    };
  };

  return new google.realtime.RealtimeModel(stripUndefined(options));
}

function readString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function stripUndefined<T extends object>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as T;
}
