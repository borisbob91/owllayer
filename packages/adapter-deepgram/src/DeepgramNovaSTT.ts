// ============================================================
// DeepgramNovaSTT — Speech-to-Text batch (POST /v1/listen)
// Implemente `STTService` (core) via `BaseSTTService`. Instance sans etat
// partage, partageable entre sessions (contrat public, DG-1).
// ============================================================

import { BaseSTTService, SpeechServiceError } from '@owllayer/core';
import type { STTAudioConfig, STTResult } from '@owllayer/core';
import { mimeTypeToDeepgramEncoding } from './audio.js';
import { getDeepgramNovaSTTCapabilities, type DeepgramSpeechCapabilities } from './capabilities.js';
import { toSpeechServiceError } from './errors.js';
import { assertModelSupportsLanguage, normalizeLanguageCode, resolveDocumentedLanguageCode } from './language.js';
import { parseDeepgramNovaSTTSettings, type DeepgramNovaSTTOptions } from './settings.js';

const LISTEN_URL = 'https://api.deepgram.com/v1/listen';

/** Forme de la reponse `/v1/listen` que nous lisons (le reste est ignore). */
interface DeepgramListenResponseBody {
  metadata?: {
    request_id?: string;
    duration?: number;
    detected_language?: string;
  };
  results?: {
    channels?: Array<{
      alternatives?: Array<{ transcript?: string; confidence?: number }>;
    }>;
  };
}

interface DeepgramErrorResponseBody {
  request_id?: string;
}

export class DeepgramNovaSTT extends BaseSTTService {
  readonly name = 'deepgram-nova';

  private readonly apiKey: string;
  private readonly model: string;
  private readonly language: string;
  private readonly smartFormat: boolean;
  private readonly keyterms: readonly string[];
  private readonly mipOptOut: boolean;
  private readonly tags: readonly string[];

  constructor(options: DeepgramNovaSTTOptions) {
    const { apiKey, ...rawSettings } = options;
    const settings = parseDeepgramNovaSTTSettings(rawSettings);

    super({ apiKey, timeout: settings.requestTimeoutMs });

    if (!apiKey) {
      throw new SpeechServiceError('Deepgram API key is required.', 'deepgram', 'AUTH_FAILED');
    }

    this.apiKey = apiKey;
    this.model = settings.model ?? 'nova-3';
    this.language = settings.language ? settings.language : normalizeLanguageCode(this.defaultLanguage);
    this.smartFormat = settings.smartFormat;
    this.keyterms = settings.keyterms;
    this.mipOptOut = settings.mipOptOut;
    this.tags = settings.tags;

    // Verification locale langue/modele avant toute connexion (FR-014a).
    assertModelSupportsLanguage(this.model, this.language);
  }

  async transcribe(config: STTAudioConfig): Promise<STTResult> {
    this.validateConfig(config);

    const language = config.languageCode ?? this.language;
    assertModelSupportsLanguage(this.model, language);

    const url = new URL(LISTEN_URL);
    url.searchParams.set('model', this.model);
    if (language) {
      // Envoie le code documente par Deepgram pour ce modele (tel quel si
      // liste, sinon son sous-tag primaire normalise s'il est liste) —
      // correction d'audit DG-1/#107.
      url.searchParams.set('language', resolveDocumentedLanguageCode(this.model, language));
    }
    url.searchParams.set('smart_format', String(this.smartFormat));
    for (const keyterm of this.keyterms) {
      url.searchParams.append('keyterm', keyterm);
    }
    for (const tag of this.tags) {
      url.searchParams.append('tag', tag);
    }
    if (this.mipOptOut) {
      url.searchParams.set('mip_opt_out', 'true');
    }
    const rawEncoding = mimeTypeToDeepgramEncoding(config.mimeType);
    if (rawEncoding) {
      url.searchParams.set('encoding', rawEncoding.encoding);
      url.searchParams.set('sample_rate', String(rawEncoding.sampleRate));
    }

    const audioBuffer = this.base64ToBuffer(config.audioBase64);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Token ${this.apiKey}`,
          'Content-Type': config.mimeType,
        },
        body: audioBuffer,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => undefined)) as DeepgramErrorResponseBody | undefined;
        throw toSpeechServiceError({ kind: 'http', status: response.status, requestId: errorBody?.request_id });
      }

      const data = (await response.json()) as DeepgramListenResponseBody;
      const alternative = data.results?.channels?.[0]?.alternatives?.[0];

      return {
        text: alternative?.transcript ?? '',
        confidence: alternative?.confidence,
        detectedLanguage: data.metadata?.detected_language,
        audioDuration: typeof data.metadata?.duration === 'number' ? Math.round(data.metadata.duration * 1000) : undefined,
        metadata: {
          requestId: data.metadata?.request_id,
          model: this.model,
        },
      };
    } catch (error) {
      if (error instanceof SpeechServiceError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw toSpeechServiceError({ kind: 'timeout', operation: 'listen' });
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
    return getDeepgramNovaSTTCapabilities({ model: this.model, language: this.language });
  }
}
