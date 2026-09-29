// ============================================================
// Avertissement de construction (FR-016) : un logger minimal recoit un
// avertissement unique quand un modele Gemini (Live ou TTS) est
// deprecie/retire. La valeur configuree est toujours conservee.
// ============================================================

import { getGeminiDeprecatedModel } from './capabilities.js';

/** Sous-ensemble de Logger utilise ici. */
export interface WarnLogger {
  warn(...args: unknown[]): void;
}

/**
 * Avertit une fois si `id` est dans le catalogue deprecie Gemini (FR-016).
 * Format exact : `Model "<id>" is <deprecated|retired> (shutdown <date>); use "<replacement>".`
 */
export function warnIfDeprecatedGeminiModel(log: WarnLogger, id: string): void {
  const entry = getGeminiDeprecatedModel(id);
  if (!entry) {
    return;
  }
  const shutdown = entry.shutdownDate ?? 'not announced';
  const replacement = entry.replacement ?? 'a documented alternative';
  log.warn(`Model "${id}" is ${entry.status} (shutdown ${shutdown}); use "${replacement}".`);
}
