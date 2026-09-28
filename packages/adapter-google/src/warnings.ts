// ============================================================
// Avertissements de construction (FR-014, FR-016) : un logger minimal
// (compatible avec `createLogger` de @owllayer/core) recoit un avertissement
// unique quand un modele est deprecie/retire, ou quand un modele/voix
// repertorie ne supporte pas la langue configuree. La valeur configuree est
// toujours conservee (aucune erreur levee).
// ============================================================

import { getGoogleDeprecatedModel } from './catalog.js';
import { googleSupportsLanguage } from './language.js';

/** Sous-ensemble de Logger utilise ici (evite une dependance directe au type exact de @owllayer/core). */
export interface WarnLogger {
  warn(...args: unknown[]): void;
}

/**
 * Avertit une fois si `id` est dans le catalogue deprecie Google (FR-016).
 * Format exact : `Model "<id>" is <deprecated|retired> (shutdown <date>); use "<replacement>".`
 */
export function warnIfDeprecatedGoogleModel(log: WarnLogger, id: string): void {
  const entry = getGoogleDeprecatedModel(id);
  if (!entry) {
    return;
  }
  const shutdown = entry.shutdownDate ?? 'not announced';
  const replacement = entry.replacement ?? 'a documented alternative';
  log.warn(`Model "${id}" is ${entry.status} (shutdown ${shutdown}); use "${replacement}".`);
}

/**
 * Avertit une fois si le modele/voix `id` est repertorie mais ne supporte pas
 * `language` (FR-014). Un identifiant non repertorie ne declenche jamais
 * d'avertissement.
 */
export function warnIfUnsupportedGoogleLanguage(log: WarnLogger, id: string, language: string): void {
  const result = googleSupportsLanguage(id, language);
  if (result.supported) {
    return;
  }
  log.warn(
    `"${id}" does not document support for language "${language}"; supported languages: ${result.supportedLanguages.join(', ')}.`,
  );
}
