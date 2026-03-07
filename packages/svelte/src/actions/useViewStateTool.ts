import { get } from 'svelte/store';
import { domosClient } from '../stores/domos.store.js';
import { z } from 'zod';
import { zodToToolParameters, type ToolDeclaration } from '@domos/core';

interface ViewStateToolOptions {
  handler: (args: { viewId: string; action: string; params?: Record<string, unknown> }) => Promise<unknown> | unknown;
  description?: string;
}

/**
 * Action Svelte pour enregistrer l'outil standard "ui_state".
 *
 * @example
 * <div use:uiStateTool={{ handler: ({ viewId, action }) => ... }} />
 */
export function uiStateTool(node: HTMLElement, options: ViewStateToolOptions) {
  const client = get(domosClient);
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

  const handler = async (args: any) => {
    const parsed = schema.safeParse(args);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
    return options.handler(parsed.data);
  };

  const componentId = Math.random().toString(36).slice(2);
  client.registerTool({ declaration, handler, componentId });

  return {
    destroy() {
      client.unregisterTool('ui_state');
    },
  };
}
