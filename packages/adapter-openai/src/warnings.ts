// ============================================================
// Avertissement de construction (FR-016) : un logger minimal (compatible
// `createLogger` de @owllayer/core) recoit un avertissement unique quand un
// modele est deprecie/retire. La valeur configuree est toujours conservee.
// ============================================================

import { getOpenAIDeprecatedModel } from './models.js';

/** Sous-ensemble de Logger utilise ici. */
export interface WarnLogger {
  warn(...args: unknown[]): void;
}

/**
 * Avertit une fois si `id` est dans le catalogue deprecie OpenAI (FR-016).
 * Format exact : `Model "<id>" is <deprecated|retired> (shutdown <date>); use "<replacement>".`
 */
export function warnIfDeprecatedOpenAIModel(log: WarnLogger, id: string): void {
  const entry = getOpenAIDeprecatedModel(id);
  if (!entry) {
    return;
  }
  const shutdown = entry.shutdownDate ?? 'not announced';
  const replacement = entry.replacement ?? 'a documented alternative';
  log.warn(`Model "${id}" is ${entry.status} (shutdown ${shutdown}); use "${replacement}".`);
}
