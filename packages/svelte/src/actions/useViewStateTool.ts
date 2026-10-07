import { get } from 'svelte/store';
import { owlLayerClient } from '../stores/owllayer.store.js';
import { z } from 'zod';
import { zodToToolParameters, type ToolDeclaration } from '@owllayer/core';

interface ViewStateToolOptions {
  handler: (args: { viewId: string; action: string; params?: Record<string, unknown> }) => Promise<unknown> | unknown;
  description?: string;
  /**
   * Si true, le tool persiste apres le retrait du noeud.
   * Defaut : false (ui_state est local par nature).
   */
  global?: boolean;
}

/**
 * Action Svelte pour enregistrer l'outil standard "ui_state".
 *
 * @example
 * <div use:uiStateTool={{ handler: ({ viewId, action }) => ... }} />
 */
export function uiStateTool(node: HTMLElement, options: ViewStateToolOptions) {
  const client = get(owlLayerClient);
  if (!client) return;

  const schema = z.object({
    viewId: z.string().min(1),
    action: z.string().min(1),
    params: z.record(z.unknown()).optional(),
  });

  const declaration: ToolDeclaration = {
    name: 'ui_state',
    description: options.description || 'Changer un etat UI local (view) sans changer l URL.',
    parameters: zodToToolParameters(schema),
  };

  // Arguments deja valides par le client avec le schema, avant l'approbation (#160)
  const handler = async (args: any) => options.handler(args);

  const isGlobal = options.global ?? false;
  const componentId = Math.random().toString(36).slice(2);
  client.registerTool({ declaration, handler, componentId, global: isGlobal, schema });

  return {
    destroy() {
      // Un tool global reste enregistre apres le retrait du noeud
      if (isGlobal) return;
      client.unregisterTool('ui_state');
    },
  };
}
