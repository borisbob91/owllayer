import { get } from 'svelte/store';
import { owlLayerClient } from '../stores/owllayer.store.js';
import { z } from 'zod';
import { zodToToolParameters, type ToolDeclaration } from '@owllayer/core';

interface NavigateToolOptions {
  handler: (args: { url: string; replace?: boolean; state?: Record<string, unknown> }) => Promise<unknown> | unknown;
  description?: string;
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

  const handler = async (args: any) => {
    const parsed = schema.safeParse(args);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
    return options.handler(parsed.data);
  };

  const componentId = Math.random().toString(36).slice(2);
  client.registerTool({ declaration, handler, componentId });

  return {
    destroy() {
      client.unregisterTool('navigate');
    },
  };
}
