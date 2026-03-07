import type { ShadowContext, ContextDiffResult } from './shadow-context.types.js';

/**
 * Calculer le diff entre deux ShadowContext.
 * Utilise pour envoyer uniquement les changements au serveur (economie de bande passante).
 *
 * @example
 * ```ts
 * const diff = diffContext(prevContext, currentContext);
 * if (diff.urlChanged || diff.dataChanges.added.length > 0) {
 *   sendContextUpdate();
 * }
 * ```
 */
export function diffContext(
  previous: ShadowContext,
  current: ShadowContext
): ContextDiffResult {
  const urlChanged = previous.url !== current.url;
  const titleChanged = previous.title !== current.title;

  const prevKeys = new Set(Object.keys(previous.data));
  const currKeys = new Set(Object.keys(current.data));

  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];

  // Cles ajoutees
  for (const key of currKeys) {
    if (!prevKeys.has(key)) {
      added.push(key);
    }
  }

  // Cles supprimees
  for (const key of prevKeys) {
    if (!currKeys.has(key)) {
      removed.push(key);
    }
  }

  // Cles modifiees
  for (const key of currKeys) {
    if (prevKeys.has(key)) {
      if (JSON.stringify(previous.data[key]) !== JSON.stringify(current.data[key])) {
        modified.push(key);
      }
    }
  }

  return {
    urlChanged,
    titleChanged,
    dataChanges: { added, removed, modified },
  };
}

/**
 * Verifier si un diff contient des changements.
 */
export function hasChanges(diff: ContextDiffResult): boolean {
  return (
    diff.urlChanged ||
    diff.titleChanged ||
    diff.dataChanges.added.length > 0 ||
    diff.dataChanges.removed.length > 0 ||
    diff.dataChanges.modified.length > 0
  );
}

/**
 * Creer un ShadowContext vide.
 */
export function createEmptyContext(): ShadowContext {
  return {
    url: '',
    data: {},
    updatedAt: Date.now(),
  };
}
