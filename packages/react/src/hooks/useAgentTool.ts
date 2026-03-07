import { useContext, useEffect, useId, useRef } from 'react';
import { type z } from 'zod';
import { zodToToolParameters, type ToolDeclaration } from '@domos/core';
import { DomOSContext } from '../provider/DomOSContext.js';

/**
 * Definition d'un tool pour useAgentTool.
 */
export interface AgentToolDefinition<T = unknown> {
  /** Nom unique du tool */
  name: string;

  /** Description pour le LLM (ce que fait ce tool) */
  description: string;

  /** Schema Zod pour valider les arguments */
  schema?: z.ZodObject<any>;

  /** Niveau de risque ('none' | 'low' | 'high' | 'critical') */
  risk?: 'none' | 'low' | 'high' | 'critical';

  /**
   * Si true, le tool persiste meme quand le composant est demonte.
   * Parfait pour navigation, panier, auth — outils toujours disponibles
   * independamment de la page affichee. Utilise useNavigationTool pour
   * les outils de navigation standard.
   */
  global?: boolean;
}

/**
 * useAgentTool - Enregistrer un tool IA directement dans un composant React.
 *
 * L'outil n'existe QUE quand le composant est monte (rendu).
 * Il est automatiquement desenregistre au demontage.
 * Le callback a acces au scope local (state, props, etc.).
 *
 * @example
 * ```tsx
 * function ProductCard({ product }) {
 *   const [isLiked, setIsLiked] = useState(false);
 *
 *   useAgentTool({
 *     name: 'like_product',
 *     description: `Ajoute ${product.name} aux favoris`,
 *     schema: z.object({
 *       shouldLike: z.boolean().describe("True pour liker")
 *     }),
 *   }, async ({ shouldLike }) => {
 *     setIsLiked(shouldLike);
 *     await api.like(product.id, shouldLike);
 *     return shouldLike ? "Ajoute aux favoris" : "Retire des favoris";
 *   });
 *
 *   return <div>{product.name}</div>;
 * }
 * ```
 */
export function useAgentTool<T>(
  definition: AgentToolDefinition<T>,
  callback: (args: T) => Promise<unknown> | unknown
): void {
  const ctx = useContext(DomOSContext);
  const componentId = useId();
  // Ref pour garder le callback toujours a jour sans re-enregistrer le tool
  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback; });

  if (!ctx) {
    throw new Error('useAgentTool doit etre utilise dans un <DomOSProvider>');
  }

  useEffect(() => {
    // Construire la declaration du tool
    const declaration: ToolDeclaration = {
      name: definition.name,
      description: definition.description,
      parameters: definition.schema ? zodToToolParameters(definition.schema) : undefined,
      risk: definition.risk ?? 'none',
    };

    // Handler stable qui appelle toujours la derniere version du callback
    const handler = async (args: any): Promise<unknown> => {
      // Valider les args avec Zod si un schema est fourni
      if (definition.schema) {
        const parsed = definition.schema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Validation args "${definition.name}": ${parsed.error.issues[0]?.message}`);
        }
        return callbackRef.current(parsed.data as T);
      }
      return callbackRef.current(args as T);
    };

    // Enregistrer le tool (global = jamais supprime par le cycle de vie)
    ctx.registerTool(componentId, declaration, handler, definition.global);

    // Desenregistrer au demontage seulement si NON global
    if (!definition.global) {
      return () => {
        ctx.unregisterTool(definition.name);
      };
    }
  }, [definition.name, definition.description, definition.risk, definition.global, componentId]);
}
