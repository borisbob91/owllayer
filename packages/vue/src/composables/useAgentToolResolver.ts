import { inject, onMounted, onUnmounted, getCurrentInstance, computed } from 'vue';
import { zodToToolParameters, type ToolDeclaration } from '@domos/core';
import { DOMOS_CLIENT_KEY } from '../plugin/DomOSPlugin.js';
import type {
  ResolverConfig,
  UseAgentToolResolverOptions,
  UseAgentToolResolverResult,
  ResolverToolDefinition,
} from './types/resolver.js';

/**
 * useAgentToolResolver - Enregistrer plusieurs tools centralisés.
 *
 * Alternative à useAgentTool pour les apps avec beaucoup de tools globaux.
 * Au lieu de définir un tool par composant, vous définissez tous les tools
 * en un seul endroit avec une structure groupée.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useAgentToolResolver } from '@domos/vue';
 * import { z } from 'zod';
 *
 * const cart = ref([]);
 *
 * useAgentToolResolver({
 *   cart: {
 *     prefix: 'cart_',
 *     tools: {
 *       add: {
 *         description: 'Ajouter un produit au panier',
 *         schema: z.object({
 *           product_id: z.string(),
 *           quantity: z.number().min(1).default(1),
 *         }),
 *         risk: 'low',
 *         handler: async ({ product_id, quantity }) => {
 *           cart.value.push({ id: product_id, quantity });
 *           return { success: true };
 *         },
 *       },
 *       clear: {
 *         description: 'Vider le panier',
 *         schema: z.object({}),
 *         handler: async () => {
 *           cart.value = [];
 *           return { success: true };
 *         },
 *       },
 *     },
 *   },
 * });
 * </script>
 * ```
 */
export function useAgentToolResolver(
  config: ResolverConfig,
  options: UseAgentToolResolverOptions = {}
): UseAgentToolResolverResult {
  const client = inject(DOMOS_CLIENT_KEY);

  if (!client) {
    throw new Error('useAgentToolResolver: DomOSPlugin non installé.');
  }

  const instance = getCurrentInstance();
  const componentId = instance?.uid?.toString() || Math.random().toString(36).slice(2);

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
  onMounted(() => {
    if (options.disabled) return;

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
            console.log(`[DomOS Resolver] Calling tool "${name}"`, args);
          }

          // Global before callback
          if (options.onBeforeAnyCall) {
            await options.onBeforeAnyCall(name, args);
          }

          // Tool-specific before callback
          if (definition.onBeforeCall) {
            await definition.onBeforeCall(args);
          }

          // Validation Zod
          const parsed = definition.schema.safeParse(args);
          if (!parsed.success) {
            throw new Error(
              `Validation failed for "${name}": ${parsed.error.issues[0]?.message}`
            );
          }

          // Exécution
          const result = await definition.handler(parsed.data);

          // Tool-specific after callback
          if (definition.onAfterCall) {
            await definition.onAfterCall(parsed.data, result);
          }

          // Global after callback
          if (options.onAfterAnyCall) {
            await options.onAfterAnyCall(name, parsed.data, result);
          }

          if (options.debug) {
            console.log(`[DomOS Resolver] Tool "${name}" succeeded`, result);
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
            console.error(`[DomOS Resolver] Tool "${name}" failed`, error);
          }

          throw error;
        }
      };

      client.registerTool({ declaration, handler, componentId, global: options.global });
    }
  });

  // Ne pas désinscrire au démontage si global: true
  if (!options.global) {
    onUnmounted(() => {
      if (client.unregisterToolsByComponent) {
        client.unregisterToolsByComponent(componentId);
      } else {
        for (const { name } of flatTools) {
          client.unregisterTool(name);
        }
      }
    });
  }

  return {
    toolCount: flatTools.length,
    toolNames: flatTools.map((t) => t.name),
  };
}
