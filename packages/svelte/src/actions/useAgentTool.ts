import { get } from 'svelte/store';
import { owlLayerClient } from '../stores/owllayer.store.js';
import { type z } from 'zod';
import { zodToToolParameters, type ToolDeclaration } from '@owllayer/core';

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
export function agentTool(node: HTMLElement, initialOptions: AgentToolOptions) {
  let options = initialOptions;
  const client = get(owlLayerClient);
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
    // Called by Svelte when the action parameters change reactively.
    // Re-registers the tool with the updated description/handler.
    update(newOptions: AgentToolOptions) {
      const c = get(owlLayerClient);
      if (!c) return;
      c.unregisterTool(options.name);
      const newDeclaration: ToolDeclaration = {
        name: newOptions.name,
        description: newOptions.description,
        parameters: newOptions.schema ? zodToToolParameters(newOptions.schema) : undefined,
        risk: newOptions.risk ?? 'none',
      };
      const newHandler = async (args: any) => {
        if (newOptions.schema) {
          const parsed = newOptions.schema.safeParse(args);
          if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
          return newOptions.handler(parsed.data);
        }
        return newOptions.handler(args);
      };
      c.registerTool({ declaration: newDeclaration, handler: newHandler, componentId, global: newOptions.global });
      // Keep options ref in sync so destroy() uses the latest name
      options = newOptions;
    },
    destroy() {
      // Ne pas supprimer les tools globaux au retrait du DOM
      if (!options.global) {
        client.unregisterTool(options.name);
      }
    },
  };
}
