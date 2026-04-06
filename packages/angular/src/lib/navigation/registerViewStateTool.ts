import { assertInInjectionContext } from '@angular/core';
import { z } from 'zod';
import { injectDomOS } from '../providers/provideDomOS.js';
import type { DomOSViewStateHandler } from '../types/types.js';

/**
 * registerViewStateTool — Enregistre l'outil de changement d'état UI local DomOS.
 *
 * Permet à l'agent de modifier un état UI (ouvrir/fermer un panel, changer un
 * onglet, etc.) sans changer l'URL.
 *
 * @public
 *
 * @example
 * ```typescript
 * registerViewStateTool(({ viewId, action, params }) => {
 *   if (viewId === 'sidebar' && action === 'open') openSidebar();
 * });
 * ```
 */
export function registerViewStateTool(handler: DomOSViewStateHandler): VoidFunction {
  assertInInjectionContext(registerViewStateTool);

  const domos = injectDomOS();
  const schema = z.object({
    viewId: z.string().min(1).describe('ID logique du view'),
    action: z.string().min(1).describe('Action (open, close, set_tab, select, etc.)'),
    params: z.record(z.string(), z.unknown()).optional().describe('Parametres d action'),
  });

  return domos.registerTool(
    {
      name: 'ui_state',
      description: 'Changer un etat UI local (view) sans changer l URL.',
      schema,
      risk: 'none',
    },
    handler
  );
}
