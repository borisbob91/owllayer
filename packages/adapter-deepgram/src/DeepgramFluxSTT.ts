// ============================================================
// DeepgramFluxSTT — Speech-to-Text streaming, oriente tours de parole
// (wss /v2/listen). Implemente `StreamingSTTService` (core) directement :
// aucune methode batch factice (recherche R5/R20.1). Fabrique un
// `DeepgramFluxTurnStream` par appel a `openTurnStream()` (instance scope :
// factory, un flux par session vocale — contrat public).
// ============================================================

import type { STTTurnStream, STTTurnStreamOptions, StreamingSTTService } from '@owllayer/core';
import { SpeechServiceError } from '@owllayer/core';
import { getDeepgramFluxSTTCapabilities, type DeepgramSpeechCapabilities } from './capabilities.js';
import { DeepgramFluxTurnStream } from './DeepgramFluxTurnStream.js';
import { assertModelSupportsLanguage, resolveLanguageDefaults } from './language.js';
import { parseDeepgramFluxSTTSettings, type DeepgramConnectionLimits, type DeepgramFluxSTTOptions } from './settings.js';

export class DeepgramFluxSTT implements StreamingSTTService {
  readonly name = 'deepgram-flux';

  private readonly apiKey: string;
  private readonly model: string;
  private readonly language: string;
  private readonly languageHints: readonly string[];
  private readonly turnDetection: {
    endOfTurnThreshold: number;
    tentativeEndOfTurnThreshold?: number;
    endOfTurnTimeoutMs: number;
  };
  private readonly keyterms: readonly string[];
  private readonly mipOptOut: boolean;
  private readonly tags: readonly string[];
  private readonly limits: DeepgramConnectionLimits;

  constructor(options: DeepgramFluxSTTOptions) {
    const { apiKey, ...rawSettings } = options;
    const settings = parseDeepgramFluxSTTSettings(rawSettings);

    if (!apiKey) {
      throw new SpeechServiceError('Deepgram API key is required.', 'deepgram', 'AUTH_FAILED');
    }
    this.apiKey = apiKey;

    // Comme Nova/Aura : langue de session par defaut 'fr-FR' (recherche R9) en
    // l'absence d'un `defaultLanguage` explicite (pas de `BaseSTTService` ici,
    // `StreamingSTTService` est independant — recherche R5/R20.1).
    const defaults = resolveLanguageDefaults(settings.language ?? 'fr-FR');
    this.language = defaults.language;
    this.model = settings.model ?? defaults.fluxModel;
    this.languageHints = settings.languageHints ?? defaults.languageHints ?? [];
    this.turnDetection = settings.turnDetection;
    this.keyterms = settings.keyterms;
    this.mipOptOut = settings.mipOptOut;
    this.tags = settings.tags;
    this.limits = settings.limits;

    // Verification locale langue/modele avant toute connexion (FR-014a, S13).
    assertModelSupportsLanguage(this.model, this.language);
  }

  async openTurnStream(options: STTTurnStreamOptions): Promise<STTTurnStream> {
    return new DeepgramFluxTurnStream({
      apiKey: this.apiKey,
      model: this.model,
      language: this.language,
      languageHints: this.languageHints,
      turnDetection: this.turnDetection,
      keyterms: this.keyterms,
      mipOptOut: this.mipOptOut,
      tags: this.tags,
      limits: this.limits,
      mimeType: options.mimeType,
      languageCode: options.languageCode,
      onEvent: options.onEvent,
    });
  }

  getCapabilities(): DeepgramSpeechCapabilities {
    return getDeepgramFluxSTTCapabilities({ model: this.model, language: this.language });
  }
}
