import { assertInInjectionContext } from '@angular/core';
import { z } from 'zod';
import { injectDomOS } from '../providers/provideDomOS.js';
import type {
  DomOSNavigationHandler,
  DomOSNavigationOptions,
} from '../types/types.js';

/**
 * registerNavigationTool — Enregistre l'outil de navigation globale DomOS.
 *
 * L'agent peut ainsi déclencher une navigation via l'outil `navigate`.
 *
 * @public
 *
 * @example
 * ```typescript
 * registerNavigationTool((args) => router.navigate([args.url]));
 * ```
 */
export function registerNavigationTool(
  handler: DomOSNavigationHandler,
  options?: DomOSNavigationOptions
): VoidFunction {
  assertInInjectionContext(registerNavigationTool);

  if (options?.disabled) {
    return () => {};
  }

  const domos = injectDomOS();
  const schema = z.object({
    url: z.string().min(1).describe('URL ou route a ouvrir'),
    replace: z.boolean().optional().describe('Remplacer l historique'),
    state: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('State optionnel de navigation'),
  });

  return domos.registerTool(
    {
      name: 'navigate',
      description: options?.description ?? 'Naviguer vers une URL (navigation globale).',
      schema,
      risk: 'none',
      global: options?.global ?? true,
    },
    handler
  );
}
