// ============================================================
// DeepgramAuraTTS — Speech synthesis batch (POST /v1/speak)
// Implemente `TTSService` (core) via `BaseTTSService`. Instance sans etat
// partage, partageable entre sessions (contrat public, DG-2).
// `openSpeechStream()` (StreamingTTSService) arrive en DG-5 sur cette
// meme classe : le batch et le streaming partagent voix/langue/formats.
// ============================================================

import { BaseTTSService, SpeechServiceError } from '@owllayer/core';
import type { TTSConfig, TTSResult } from '@owllayer/core';
import { getDeepgramAuraTTSCapabilities, type DeepgramSpeechCapabilities } from './capabilities.js';
import { toSpeechServiceError } from './errors.js';
import { assertModelSupportsLanguage, resolveLanguageDefaults } from './language.js';
import {
  DEEPGRAM_AURA_MAX_TEXT_LENGTH,
  parseDeepgramAuraTTSSettings,
  type DeepgramAuraTTSOptions,
  type DeepgramAuraTTSSettings,
} from './settings.js';

const SPEAK_URL = 'https://api.deepgram.com/v1/speak';

type AuraOutputFormat = DeepgramAuraTTSSettings['batchOutputFormat'];

/** Encodage/conteneur/MIME REST par format (verifie contre developers.deepgram.com/docs/tts-media-output-settings.md). */
interface AuraFormatSpec {
  encoding: string;
  /** Absent = pas de parametre `container` pour ce format (non applicable cote Deepgram). */
  container?: string;
  /** `sample_rate` n'est envoye que pour les encodages a taux configurable (linear16, flac). */
  supportsSampleRate: boolean;
  mimeType: (sampleRate: number) => string;
}

const AURA_FORMATS: Record<AuraOutputFormat, AuraFormatSpec> = {
  // Aligne sur la convention interne OwlLayer (audio/pcm;rate=X), cf. data-model R13 — le
  // wire Deepgram renvoie `audio/l16;rate=X` mais le contrat core utilise `audio/pcm`.
  pcm: { encoding: 'linear16', container: 'none', supportsSampleRate: true, mimeType: (rate) => `audio/pcm;rate=${rate}` },
  wav: { encoding: 'linear16', container: 'wav', supportsSampleRate: true, mimeType: () => 'audio/wav' },
  mp3: { encoding: 'mp3', supportsSampleRate: false, mimeType: () => 'audio/mpeg' },
  opus: { encoding: 'opus', container: 'ogg', supportsSampleRate: false, mimeType: () => 'audio/ogg;codecs=opus' },
  flac: { encoding: 'flac', supportsSampleRate: true, mimeType: () => 'audio/flac' },
  aac: { encoding: 'aac', supportsSampleRate: false, mimeType: () => 'audio/aac' },
};

interface DeepgramErrorResponseBody {
  request_id?: string;
}

/**
 * Borne une vitesse a la plage documentee Deepgram Aura-2 (0.7-1.5), plus
 * etroite que la plage du contrat core `TTSConfig.speed` (0.5-2.0, cf.
 * `session.context.speechSpeed`) — correction d'audit DG-2/#108. Le
 * constructeur applique deja cette plage via `deepgramAuraTTSSettingsSchema`
 * (`this.speed` y est toujours conforme) ; seule la valeur par appel a
 * besoin d'etre bornee ici avant tout envoi au fournisseur.
 */
function clampAuraSpeed(speed: number): number {
  return Math.min(1.5, Math.max(0.7, speed));
}

export class DeepgramAuraTTS extends BaseTTSService {
  readonly name = 'deepgram-aura';

  private readonly apiKey: string;
  private readonly language: string;
  private readonly voice: string;
  private readonly batchOutputFormat: AuraOutputFormat;
  private readonly sampleRate: number;
  private readonly speed: number;
  private readonly mipOptOut: boolean;

  constructor(options: DeepgramAuraTTSOptions) {
    const { apiKey, ...rawSettings } = options;
    const settings = parseDeepgramAuraTTSSettings(rawSettings);

    super({ apiKey, timeout: settings.limits.openTimeoutMs });

    if (!apiKey) {
      throw new SpeechServiceError('Deepgram API key is required.', 'deepgram', 'AUTH_FAILED');
    }

    this.apiKey = apiKey;
    this.language = settings.language ? settings.language : resolveLanguageDefaults(this.defaultLanguage).language;
    this.voice = settings.voice ?? resolveLanguageDefaults(this.language).auraVoice;
    this.defaultVoice = this.voice;
    this.batchOutputFormat = settings.batchOutputFormat;
    this.sampleRate = settings.sampleRate;
    this.speed = settings.speed;
    this.mipOptOut = settings.mipOptOut;

    // Verification locale voix/langue avant toute connexion (FR-014a).
    assertModelSupportsLanguage(this.voice, this.language);
  }

  async synthesize(config: TTSConfig): Promise<TTSResult> {
    this.validateConfig(config);

    const text = this.normalizeText(config.text);
    if (text.length > DEEPGRAM_AURA_MAX_TEXT_LENGTH) {
      throw toSpeechServiceError({
        kind: 'local',
        code: 'PAYLOAD_TOO_LARGE',
        message: `Text exceeds the Deepgram Aura limit of ${DEEPGRAM_AURA_MAX_TEXT_LENGTH} characters.`,
      });
    }

    const language = config.languageCode ?? this.language;
    const voice = config.voice ?? this.voice;
    assertModelSupportsLanguage(voice, language);

    const format = AURA_FORMATS[(config.outputFormat as AuraOutputFormat | undefined) ?? this.batchOutputFormat];

    const url = new URL(SPEAK_URL);
    url.searchParams.set('model', voice);
    url.searchParams.set('encoding', format.encoding);
    if (format.container) {
      url.searchParams.set('container', format.container);
    }
    if (format.supportsSampleRate) {
      url.searchParams.set('sample_rate', String(this.sampleRate));
    }
    const speed = clampAuraSpeed(config.speed ?? this.speed);
    url.searchParams.set('speed', String(speed));
    if (this.mipOptOut) {
      url.searchParams.set('mip_opt_out', 'true');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => undefined)) as DeepgramErrorResponseBody | undefined;
        throw toSpeechServiceError({ kind: 'http', status: response.status, requestId: errorBody?.request_id });
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBytes = new Uint8Array(arrayBuffer);

      return {
        audioBase64: this.bufferToBase64(audioBytes),
        mimeType: format.mimeType(this.sampleRate),
        duration: this.estimateDuration(text, speed),
        characterCount: text.length,
        metadata: { voice },
      };
    } catch (error) {
      if (error instanceof SpeechServiceError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw toSpeechServiceError({ kind: 'timeout', operation: 'speak' });
      }
      throw toSpeechServiceError({
        kind: 'local',
        code: 'PROVIDER_UNAVAILABLE',
        message: 'Deepgram request failed before a response was received.',
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  getCapabilities(): DeepgramSpeechCapabilities {
    return getDeepgramAuraTTSCapabilities({ voice: this.voice, language: this.language });
  }
}
