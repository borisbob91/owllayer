// ============================================================
// DeepgramVoiceAgentAdapter — mode realtime (LiveAdapter)
// Fabrique une `DeepgramVoiceAgentSession` par session OwlLayer. Les
// settings et la politique de credential des fournisseurs think/speak sont
// valides a la construction ; les credentials tiers ne partent que dans le
// message `Settings` (en-tetes d'endpoint ou credentials AWS), jamais dans
// les settings, capacites, evenements, erreurs ou logs (recherche R6).
// ============================================================

import {
  SpeechServiceError,
  resolveSystemPrompt,
  type ChatMessage,
  type LiveAdapter,
  type LiveSession,
  type LiveSessionConfig,
  type ToolDeclaration,
} from '@owllayer/core';
import { getDeepgramVoiceAgentCapabilities, type DeepgramLLMAdapterCapabilities } from './capabilities.js';
import { DeepgramVoiceAgentSession } from './DeepgramVoiceAgentSession.js';
import { assertModelSupportsLanguage, normalizeLanguageCode, resolveLanguageDefaults } from './language.js';
import { DEEPGRAM_AURA_VOICES_BY_LANGUAGE, DEEPGRAM_FLUX_MODELS } from './models.js';
import type {
  AgentAwsCredentials,
  AgentContextMessage,
  AgentEndpoint,
  AgentSettingsMessage,
  AgentSpeakConfig,
  AgentThinkConfig,
} from './protocol/agent.messages.js';
import {
  validateDeepgramVoiceAgentOptions,
  type DeepgramProviderCredential,
  type DeepgramVoiceAgentOptions,
  type DeepgramVoiceAgentSettings,
} from './settings.js';
import { toDeepgramAgentFunctions } from './toolConverter.js';

/** En-tetes d'authentification documentes par fournisseur think (endpoint personnalise). */
function thinkAuthHeaders(provider: string, apiKey: string): Record<string, string> {
  switch (provider) {
    case 'anthropic':
      return { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
    case 'google':
      return { 'x-goog-api-key': apiKey };
    default:
      // open_ai, groq et nvidia : jeton porteur.
      return { authorization: `Bearer ${apiKey}` };
  }
}

/** En-tetes d'authentification par fournisseur speak tiers. */
function speakAuthHeaders(provider: string, apiKey: string): Record<string, string> {
  switch (provider) {
    case 'eleven_labs':
      return { 'xi-api-key': apiKey };
    case 'cartesia':
      return { 'x-api-key': apiKey };
    default:
      return { authorization: `Bearer ${apiKey}` };
  }
}

function toAwsCredentials(credential: DeepgramProviderCredential | undefined): AgentAwsCredentials | undefined {
  if (credential?.kind !== 'aws') return undefined;
  return {
    type: credential.sessionToken ? 'sts' : 'iam',
    region: credential.region,
    access_key_id: credential.accessKeyId,
    secret_access_key: credential.secretAccessKey,
    ...(credential.sessionToken ? { session_token: credential.sessionToken } : {}),
  };
}

const AURA_VOICE_IDS: ReadonlySet<string> = new Set(
  Object.values(DEEPGRAM_AURA_VOICES_BY_LANGUAGE).flatMap((voices) => voices.map((voice) => voice.id)),
);

function invalid(message: string): SpeechServiceError {
  return new SpeechServiceError(message, 'deepgram', 'INVALID_SETTINGS');
}

export class DeepgramVoiceAgentAdapter implements LiveAdapter {
  readonly name = 'deepgram-voice-agent';

  private readonly apiKey: string;
  private readonly settings: DeepgramVoiceAgentSettings;
  private readonly thinkCredential: DeepgramProviderCredential | undefined;
  private readonly speakCredential: DeepgramProviderCredential | undefined;

  constructor(options: DeepgramVoiceAgentOptions) {
    if (!options.apiKey) {
      throw new SpeechServiceError('Deepgram API key is required.', 'deepgram', 'AUTH_FAILED');
    }
    this.settings = validateDeepgramVoiceAgentOptions(options);
    this.apiKey = options.apiKey;
    this.thinkCredential = options.thinkProviderCredential;
    this.speakCredential = options.speakProviderCredential;

    const { think, speak } = this.settings;
    // Une cle fournisseur ne sert qu'avec un endpoint : sans URL, Deepgram n'aurait nulle part ou l'envoyer.
    if (this.thinkCredential?.kind === 'api-key' && !think.endpointUrl) {
      throw invalid('Deepgram Voice Agent think.endpointUrl is required when a think provider credential is given.');
    }
    if (speak.provider !== 'deepgram') {
      if (speak.provider !== 'aws_polly' && speak.provider !== 'eleven_labs' && !speak.voice) {
        throw invalid(`Deepgram Voice Agent speak.voice is required for provider "${speak.provider}".`);
      }
      if (speak.provider !== 'aws_polly' && !speak.model) {
        throw invalid(`Deepgram Voice Agent speak.model is required for provider "${speak.provider}".`);
      }
      if (speak.provider === 'aws_polly' && !speak.voice) {
        throw invalid('Deepgram Voice Agent speak.voice is required for provider "aws_polly".');
      }
    }
    // Verification des langue/modele/voix par defaut avant toute connexion.
    this.resolveVoiceSettings(undefined, undefined);
  }

  async createSession(config: LiveSessionConfig): Promise<LiveSession> {
    const { language, listenModel, voice } = this.resolveVoiceSettings(config.language, config.voice);
    const settings: AgentSettingsMessage = {
      type: 'Settings',
      audio: {
        input: { encoding: 'linear16', sample_rate: 16000 },
        output: { encoding: 'linear16', sample_rate: 24000, container: 'none' },
      },
      agent: {
        language,
        ...this.buildContext(config.conversationHistory),
        listen: {
          provider: {
            type: 'deepgram',
            version: (DEEPGRAM_FLUX_MODELS as readonly string[]).includes(listenModel) ? 'v2' : 'v1',
            model: listenModel,
            ...(this.settings.listen.keyterms.length > 0 ? { keyterms: [...this.settings.listen.keyterms] } : {}),
          },
        },
        think: this.buildThink(config, config.tools),
        speak: this.buildSpeak(voice, language),
        ...(this.settings.greeting ? { greeting: this.settings.greeting } : {}),
      },
    };

    const session = new DeepgramVoiceAgentSession({
      apiKey: this.apiKey,
      limits: this.settings.limits,
      config,
      settings,
      buildThink: (tools) => this.buildThink(config, tools),
    });
    await session.waitUntilActive();
    return session;
  }

  getCapabilities(): DeepgramLLMAdapterCapabilities {
    return getDeepgramVoiceAgentCapabilities({
      model: this.settings.think.model,
      voice: this.settings.speak.provider === 'deepgram' ? this.resolveVoiceSettings(undefined, undefined).voice : this.settings.speak.voice,
    });
  }

  /**
   * Langue de session (config puis settings, defaut 'fr'), modele d'ecoute et voix Aura.
   * Une voix de session inconnue du catalogue Aura (ex. voix d'un autre fournisseur) est ignoree.
   */
  private resolveVoiceSettings(
    sessionLanguage: string | undefined,
    sessionVoice: string | undefined,
  ): { language: string; listenModel: string; voice: string | undefined } {
    const language = normalizeLanguageCode(sessionLanguage ?? this.settings.language ?? 'fr');
    const defaults = resolveLanguageDefaults(language);
    const listenModel = this.settings.listen.model ?? (language === 'en' ? defaults.fluxModel : defaults.novaModel);
    assertModelSupportsLanguage(listenModel, language);

    if (this.settings.speak.provider !== 'deepgram') {
      return { language, listenModel, voice: this.settings.speak.voice };
    }
    const candidates = [sessionVoice, this.settings.speak.voice];
    for (const candidate of candidates) {
      if (!candidate || !AURA_VOICE_IDS.has(candidate)) continue;
      try {
        assertModelSupportsLanguage(candidate, language);
        return { language, listenModel, voice: candidate };
      } catch {
        // Voix d'une autre langue : la suivante (puis la voix par defaut) est essayee.
      }
    }
    return { language, listenModel, voice: defaults.auraVoice };
  }

  private buildContext(history: ChatMessage[] | undefined): { context?: { messages: AgentContextMessage[] } } {
    const messages = (history ?? [])
      .filter((message): message is ChatMessage & { role: 'user' | 'assistant' } => message.role !== 'system')
      .slice(-this.settings.limits.maxHistoryMessages)
      .map((message) => ({ type: 'History' as const, role: message.role, content: message.content }));
    return messages.length > 0 ? { context: { messages } } : {};
  }

  private buildThink(config: LiveSessionConfig, tools: readonly ToolDeclaration[]): AgentThinkConfig {
    const { think } = this.settings;
    const credentials = think.provider === 'aws_bedrock' ? toAwsCredentials(this.thinkCredential) : undefined;
    let endpoint: AgentEndpoint | undefined;
    if (think.endpointUrl) {
      endpoint = { url: think.endpointUrl };
      if (this.thinkCredential?.kind === 'api-key') {
        endpoint.headers = thinkAuthHeaders(think.provider, this.thinkCredential.apiKey);
      }
    }
    return {
      provider: {
        type: think.provider,
        model: think.model,
        ...(think.temperature !== undefined ? { temperature: think.temperature } : {}),
        ...(credentials ? { credentials } : {}),
      },
      ...(endpoint ? { endpoint } : {}),
      prompt: resolveSystemPrompt(config.systemPrompt),
      functions: toDeepgramAgentFunctions(tools),
    };
  }

  private buildSpeak(voice: string | undefined, language: string): AgentSpeakConfig {
    const { speak } = this.settings;
    const provider = speak.provider;
    let endpoint: AgentEndpoint | undefined;
    if (speak.endpointUrl) {
      endpoint = { url: speak.endpointUrl };
      if (this.speakCredential?.kind === 'api-key') {
        endpoint.headers = speakAuthHeaders(provider, this.speakCredential.apiKey);
      }
    }
    const withEndpoint = (config: AgentSpeakConfig['provider']): AgentSpeakConfig => ({
      provider: config,
      ...(endpoint ? { endpoint } : {}),
    });
    switch (provider) {
      case 'open_ai':
        return withEndpoint({ type: 'open_ai', model: speak.model, voice });
      case 'eleven_labs':
        return withEndpoint({ type: 'eleven_labs', model_id: speak.model, language_code: language });
      case 'cartesia':
        return withEndpoint({ type: 'cartesia', model_id: speak.model, voice: { mode: 'id', id: voice }, language });
      case 'aws_polly':
        return withEndpoint({
          type: 'aws_polly',
          voice,
          language_code: language,
          engine: speak.model ?? 'standard',
          credentials: toAwsCredentials(this.speakCredential),
        });
      default:
        return withEndpoint({ type: 'deepgram', model: voice });
    }
  }
}
