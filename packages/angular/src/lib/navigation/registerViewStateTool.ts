import { assertInInjectionContext } from '@angular/core';
import { z } from 'zod';
import { injectOwlLayer } from '../providers/provideOwlLayer.js';
import type { OwlLayerViewStateHandler, OwlLayerViewStateOptions } from '../types/types.js';

/**
 * registerViewStateTool — Enregistre l'outil de changement d'état UI local OwlLayer.
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
export function registerViewStateTool(
  handler: OwlLayerViewStateHandler,
  options?: OwlLayerViewStateOptions
): VoidFunction {
  assertInInjectionContext(registerViewStateTool);

  if (options?.disabled) {
    return () => {};
  }

  const owllayer = injectOwlLayer();
  const schema = z.object({
    viewId: z.string().min(1).describe('ID logique du view'),
    action: z.string().min(1).describe('Action (open, close, set_tab, select, etc.)'),
    params: z.record(z.string(), z.unknown()).optional().describe('Parametres d action'),
  });

  return owllayer.registerTool(
    {
      name: 'ui_state',
      description: options?.description ?? 'Changer un etat UI local (view) sans changer l URL.',
      schema,
      risk: 'none',
      global: options?.global ?? false,
    },
    handler
  );
}
