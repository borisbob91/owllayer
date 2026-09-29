import { get } from 'svelte/store';
import { owlLayerClient } from '../stores/owllayer.store.js';
import { zodToToolParameters, type ToolDeclaration } from '@owllayer/core';
import type {
  ResolverConfig,
  AgentToolResolverOptions,
  ResolverToolDefinition,
} from './types/resolver.js';

/**
 * Action Svelte pour enregistrer plusieurs tools centralisés.
 *
 * Alternative à agentTool pour les apps avec beaucoup de tools globaux.
 * Au lieu de définir un tool par composant, vous définissez tous les tools
 * en un seul endroit avec une structure groupée.
 *
 * @example
 * ```svelte
 * <script>
 *   import { agentToolResolver } from '@owllayer/svelte';
 *   import { z } from 'zod';
 *
 *   let cart = [];
 *
 *   const resolverConfig = {
 *     cart: {
 *       prefix: 'cart_',
 *       tools: {
 *         add: {
 *           description: 'Ajouter un produit au panier',
 *           schema: z.object({
 *             product_id: z.string(),
 *             quantity: z.number().min(1).default(1),
 *           }),
 *           risk: 'low',
 *           handler: async ({ product_id, quantity }) => {
 *             cart = [...cart, { id: product_id, quantity }];
 *             return { success: true };
 *           },
 *         },
 *         clear: {
 *           description: 'Vider le panier',
 *           schema: z.object({}),
 *           handler: async () => {
 *             cart = [];
 *             return { success: true };
 *           },
 *         },
 *       },
 *     },
 *   };
 * </script>
 *
 * <div use:agentToolResolver={{ config: resolverConfig }}>
 *   <!-- Votre UI -->
 * </div>
 * ```
 */
export function agentToolResolver(
  node: HTMLElement,
  params: { config: ResolverConfig; options?: AgentToolResolverOptions }
) {
  const client = get(owlLayerClient);
  if (!client) return;

  const { config, options = {} } = params;
  const componentId = Math.random().toString(36).slice(2);

  // Aplatir la config en liste de tools
  const flatTools: Array<{
    name: string;
    definition: ResolverToolDefinition;
  }> = [];

  for (const [groupName, group] of Object.entries(config)) {
    const prefix = group.prefix || '';

    for (const [toolName, toolDef] of Object.entries(group.tools)) {
      flatTools.push({
        name: `${prefix}${toolName}`,
        definition: toolDef,
      });
    }
  }

  // Enregistrer tous les tools
  if (!options.disabled) {
    for (const { name, definition } of flatTools) {
      const declaration: ToolDeclaration = {
        name,
        description: definition.description,
        parameters: definition.schema ? zodToToolParameters(definition.schema) : undefined,
        risk: definition.risk ?? 'none',
      };

      const handler = async (args: any): Promise<unknown> => {
        try {
          // Debug log
          if (options.debug) {
            console.log(`[OwlLayer Resolver] Calling tool "${name}"`, args);
          }

          // Global before callback
          if (options.onBeforeAnyCall) {
            await options.onBeforeAnyCall(name, args);
          }

          // Tool-specific before callback
          if (definition.onBeforeCall) {
            await definition.onBeforeCall(args);
          }

          // Exécution : arguments deja valides par le client avec le schema,
          // avant l'approbation (#160)
          const result = await definition.handler(args);

          // Tool-specific after callback
          if (definition.onAfterCall) {
            await definition.onAfterCall(args, result);
          }

          // Global after callback
          if (options.onAfterAnyCall) {
            await options.onAfterAnyCall(name, args, result);
          }

          if (options.debug) {
            console.log(`[OwlLayer Resolver] Tool "${name}" succeeded`, result);
          }

          return result;
        } catch (error) {
          // Tool-specific error callback
          if (definition.onError) {
            await definition.onError(args, error as Error);
          }

          // Global error callback
          if (options.onErrorAnyCall) {
            await options.onErrorAnyCall(name, args, error as Error);
          }

          if (options.debug) {
            console.error(`[OwlLayer Resolver] Tool "${name}" failed`, error);
          }

          throw error;
        }
      };

      client.registerTool({ declaration, handler, componentId, global: options.global, schema: definition.schema });
    }
  }

  return {
    destroy() {
      // Ne pas désinscrire les tools globaux au retrait du DOM
      if (options.global) return;

      if (client.unregisterToolsByComponent) {
        client.unregisterToolsByComponent(componentId);
      } else {
        for (const { name } of flatTools) {
          client.unregisterTool(name);
        }
      }
    },
  };
}
