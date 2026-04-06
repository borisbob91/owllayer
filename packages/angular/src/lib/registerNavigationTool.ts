import { assertInInjectionContext } from '@angular/core';
import { z } from 'zod';
import { injectDomOS } from './provideDomOS.js';
import type {
  DomOSNavigationHandler,
  DomOSNavigationOptions,
} from './types.js';

export function registerNavigationTool(
  handler: DomOSNavigationHandler,
  options?: DomOSNavigationOptions
): VoidFunction {
  assertInInjectionContext(registerNavigationTool);

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
      global: true,
    },
    handler
  );
}