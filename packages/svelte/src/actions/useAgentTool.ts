import { get } from 'svelte/store';
import { domosClient } from '../stores/domos.store.js';
import { type z } from 'zod';
import { zodToToolParameters, type ToolDeclaration } from '@domos/core';

interface AgentToolOptions<T = unknown> {
  name: string;
  description: string;
  schema?: z.ZodObject<any>;
  risk?: 'none' | 'low' | 'high' | 'critical';
  handler: (args: T) => Promise<unknown> | unknown;
  /**
   * Si true, le tool persiste quand le noeud est retire du DOM.
   * Utilise pour les outils de navigation et actions metier globales.
   */
  global?: boolean;
}

/**
 * Action Svelte pour enregistrer un tool.
 *
 * @example
 * ```svelte
 * <div use:agentTool={{
 *   name: 'add_to_cart',
 *   description: 'Ajouter au panier',
 *   schema: z.object({ quantity: z.number() }),
 *   handler: async ({ quantity }) => cart.add(product, quantity),
 * }}>
 *   {product.name}
 * </div>
 * ```
 */
export function agentTool(node: HTMLElement, options: AgentToolOptions) {
  const client = get(domosClient);
  if (!client) return;

  const declaration: ToolDeclaration = {
    name: options.name,
    description: options.description,
    parameters: options.schema ? zodToToolParameters(options.schema) : undefined,
    risk: options.risk ?? 'none',
  };

  const handler = async (args: any) => {
    if (options.schema) {
      const parsed = options.schema.safeParse(args);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
      return options.handler(parsed.data);
    }
    return options.handler(args);
  };

  const componentId = Math.random().toString(36).slice(2);
  client.registerTool({ declaration, handler, componentId, global: options.global });

  return {
    destroy() {
      // Ne pas supprimer les tools globaux au retrait du DOM
      if (!options.global) {
        client.unregisterTool(options.name);
      }
    },
  };
}
