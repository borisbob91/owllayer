// ============================================================
// Configuration de langue Deepgram
// Normalisation des codes de langue, verification locale modele/voix <->
// langue (recherche R9, FR-014a), et resolution des valeurs par defaut
// dependantes de la langue de session.
// ============================================================

import { SpeechServiceError } from '@owllayer/core';
import {
  DEEPGRAM_AURA_VOICES_BY_LANGUAGE,
  DEEPGRAM_DEFAULT_AURA_VOICE_BY_LANGUAGE,
  DEEPGRAM_STT_MODEL_LANGUAGES,
  type DeepgramAuraVoice,
  type DeepgramAuraVoiceEntry,
  type DeepgramFluxModel,
  type DeepgramNovaModel,
} from './models.js';

/** Vue large (index par chaine) du catalogue de voix Aura-2, pour un acces par langue calculee au runtime. */
const AURA_VOICES_BY_LANGUAGE: Record<string, readonly DeepgramAuraVoiceEntry[]> = DEEPGRAM_AURA_VOICES_BY_LANGUAGE;

/**
 * Normalise un code de langue de type `fr-FR` -> `fr`. Les codes deja
 * courts, ou composes de facon non standard, passent par la meme regle
 * (sous-tag primaire avant `-`/`_`, en minuscules).
 */
export function normalizeLanguageCode(language: string): string {
  const [primary] = language.trim().split(/[-_]/);
  return primary.toLowerCase();
}

/** Table de langues supportees, construite une fois a partir du catalogue (modeles STT + voix Aura-2). */
const SUPPORTED_LANGUAGES_BY_ID: Record<string, readonly string[]> = (() => {
  const table: Record<string, readonly string[]> = { ...DEEPGRAM_STT_MODEL_LANGUAGES };
  for (const [language, voices] of Object.entries(DEEPGRAM_AURA_VOICES_BY_LANGUAGE)) {
    for (const voice of voices) {
      table[voice.id] = [language];
    }
  }
  return table;
})();

/**
 * Verifie qu'un modele ou une voix repertorie supporte la langue donnee.
 * Un identifiant absent du catalogue n'est pas verifiable localement : il
 * est accepte sans erreur (edge case du spec — un rejet eventuel remonte du
 * fournisseur sous forme d'erreur de requete invalide).
 */
export function assertModelSupportsLanguage(modelOrVoiceId: string, language: string): void {
  const supported = SUPPORTED_LANGUAGES_BY_ID[modelOrVoiceId];
  if (!supported) {
    return;
  }

  const normalized = normalizeLanguageCode(language);
  const matches = supported.some((code) => normalizeLanguageCode(code) === normalized);
  if (!matches) {
    throw new SpeechServiceError(
      `Language "${language}" is not supported by "${modelOrVoiceId}". Supported languages: ${supported.join(', ')}.`,
      'deepgram',
      'UNSUPPORTED_LANGUAGE',
    );
  }
}

/**
 * Resout le code de langue a envoyer au fournisseur pour un modele/voix
 * repertorie (correction d'audit DG-1/#107) : le code demande tel quel s'il
 * est documente pour ce modele (ex. 'fr-CA'), sinon son sous-tag primaire
 * normalise s'il est documente (ex. 'fr-FR' -> 'fr'), dans la casse
 * documentee par Deepgram dans les deux cas. Pour un identifiant non
 * repertorie, le code demande est renvoye tel quel (memes edge case que
 * `assertModelSupportsLanguage`, un rejet eventuel remonte du fournisseur).
 */
export function resolveDocumentedLanguageCode(modelOrVoiceId: string, language: string): string {
  const supported = SUPPORTED_LANGUAGES_BY_ID[modelOrVoiceId];
  if (!supported) {
    return language;
  }

  const exact = supported.find((code) => code.toLowerCase() === language.toLowerCase());
  if (exact) {
    return exact;
  }

  const normalized = normalizeLanguageCode(language);
  const normalizedMatch = supported.find((code) => code.toLowerCase() === normalized);
  return normalizedMatch ?? language;
}

/** Valeurs par defaut resolues pour une langue de session (recherche R9). */
export interface DeepgramLanguageDefaults {
  language: string;
  novaModel: DeepgramNovaModel;
  fluxModel: DeepgramFluxModel;
  /** Indices de langue a transmettre au modele Flux multilingue (absent pour flux-general-en). */
  languageHints?: string[];
  auraVoice: DeepgramAuraVoice;
}

/**
 * Resout les valeurs par defaut (modele Nova, modele Flux, voix Aura-2)
 * pour une langue de session donnee. Leve `UNSUPPORTED_LANGUAGE` si aucune
 * voix n'est catalogue pour cette langue (FR-014a).
 */
export function resolveLanguageDefaults(sessionLanguage: string): DeepgramLanguageDefaults {
  const language = normalizeLanguageCode(sessionLanguage || 'fr');

  const fluxModel: DeepgramFluxModel = language === 'en' ? 'flux-general-en' : 'flux-general-multi';
  const novaModel: DeepgramNovaModel = 'nova-3';

  const auraVoice = DEEPGRAM_DEFAULT_AURA_VOICE_BY_LANGUAGE[language] ?? AURA_VOICES_BY_LANGUAGE[language]?.[0]?.id;

  if (!auraVoice) {
    throw new SpeechServiceError(
      `No Deepgram Aura-2 voice is available for language "${language}".`,
      'deepgram',
      'UNSUPPORTED_LANGUAGE',
    );
  }

  return {
    language,
    novaModel,
    fluxModel,
    ...(fluxModel === 'flux-general-multi' ? { languageHints: [language] } : {}),
    auraVoice,
  };
}
