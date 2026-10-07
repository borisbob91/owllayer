import { get } from 'svelte/store';
import { owlLayerClient } from '../stores/owllayer.store.js';
import { z } from 'zod';
import { zodToToolParameters, type ToolDeclaration } from '@owllayer/core';

interface NavigateToolOptions {
  handler: (args: { url: string; replace?: boolean; state?: Record<string, unknown> }) => Promise<unknown> | unknown;
  description?: string;
  /**
   * Si true, le tool persiste apres le retrait du noeud.
   * Defaut : true (la navigation est globale par nature).
   */
  global?: boolean;
}

/**
 * Action Svelte pour enregistrer l'outil standard "navigate".
 *
 * @example
 * <div use:navigateTool={{ handler: ({ url }) => goto(url) }} />
 */
export function navigateTool(node: HTMLElement, options: NavigateToolOptions) {
  const client = get(owlLayerClient);
  if (!client) return;

  const schema = z.object({
    url: z.string().min(1),
    replace: z.boolean().optional(),
    state: z.record(z.unknown()).optional(),
  });

  const declaration: ToolDeclaration = {
    name: 'navigate',
    description: options.description || 'Naviguer vers une URL (navigation globale).',
    parameters: zodToToolParameters(schema),
  };

  // Arguments deja valides par le client avec le schema, avant l'approbation (#160)
  const handler = async (args: any) => options.handler(args);

  const isGlobal = options.global ?? true;
  const componentId = Math.random().toString(36).slice(2);
  client.registerTool({ declaration, handler, componentId, global: isGlobal, schema });

  return {
    destroy() {
      // Un tool global reste enregistre apres le retrait du noeud
      if (isGlobal) return;
      client.unregisterTool('navigate');
    },
  };
}
