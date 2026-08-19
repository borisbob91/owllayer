import { inject, onMounted, onUnmounted, getCurrentInstance } from 'vue';
import { type z } from 'zod';
import { zodToToolParameters, type ToolDeclaration } from '@owllayer/core';
import { OWLLAYER_CLIENT_KEY } from '../plugin/OwlLayerPlugin.js';

/**
 * Definition d'un tool pour useAgentTool.
 */
export interface AgentToolDefinition<T = unknown> {
  /** Nom unique du tool */
  name: string;

  /** Description pour le LLM */
  description: string;

  /** Schema Zod pour valider les arguments */
  schema?: z.ZodObject<any>;

  /** Niveau de risque ('none' | 'low' | 'high' | 'critical') */
  risk?: 'none' | 'low' | 'high' | 'critical';

  /**
   * Si true, le tool persiste meme quand le composant est demonte.
   * Parfait pour navigation, panier, auth — outils toujours disponibles.
   */
  global?: boolean;
}

/**
 * useAgentTool - Enregistrer un tool IA directement dans un composant Vue.
 *
 * L'outil n'existe QUE quand le composant est monte.
 * Il est automatiquement desenregistre au demontage.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useAgentTool } from '@owllayer/vue';
 * import { z } from 'zod';
 *
 * const props = defineProps<{ productName: string; productId: string }>();
 *
 * useAgentTool({
 *   name: 'like_product',
 *   description: `Ajouter ${props.productName} aux favoris`,
 *   schema: z.object({
 *     shouldLike: z.boolean().describe("True pour liker"),
 *   }),
 * }, async ({ shouldLike }) => {
 *   await api.like(props.productId, shouldLike);
 *   return shouldLike ? "Ajoute aux favoris" : "Retire des favoris";
 * });
 * </script>
 * ```
 */
export function useAgentTool<T>(
  definition: AgentToolDefinition<T>,
  callback: (args: T) => Promise<unknown> | unknown
): void {
  const client = inject(OWLLAYER_CLIENT_KEY);

  if (!client) {
    throw new Error('useAgentTool: OwlLayerPlugin non installe.');
  }

  const instance = getCurrentInstance();
  const componentId = instance?.uid?.toString() || Math.random().toString(36).slice(2);

  // Construire la declaration
  const declaration: ToolDeclaration = {
    name: definition.name,
    description: definition.description,
    parameters: definition.schema ? zodToToolParameters(definition.schema) : undefined,
    risk: definition.risk ?? 'none',
  };

  // Handler avec validation Zod
  const handler = async (args: any): Promise<unknown> => {
    if (definition.schema) {
      const parsed = definition.schema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Validation args "${definition.name}": ${parsed.error.issues[0]?.message}`);
      }
      return callback(parsed.data as T);
    }
    return callback(args as T);
  };

  onMounted(() => {
    client.registerTool({ declaration, handler, componentId, global: definition.global });
  });

  // Ne pas desenregistrer au demontage si global: true
  if (!definition.global) {
    onUnmounted(() => {
      client.unregisterTool(definition.name);
    });
  }
}
