import { useEffect, useMemo, useRef, useContext } from 'react';
import { createLogger, zodToToolParameters } from '@owllayer/core';
import { OwlLayerContext } from '../provider/OwlLayerContext.js';
import type {
  ResolverConfig,
  UseAgentToolResolverOptions,
  UseAgentToolResolverResult,
  ResolverToolDefinition,
} from '../types/resolver.js';

const log = createLogger('OwlLayer:ToolResolver');

/**
 * Hook pour créer un resolver centralisé de tools.
 *
 * Permet de définir plusieurs tools groupés par domaine fonctionnel,
 * sans avoir à gérer manuellement un switch case géant.
 *
 * @example
 * ```tsx
 * function ShoppingApp() {
 *   const [uiState, setUiState] = useState('idle');
 *   const [cart, setCart] = useState([]);
 *
 *   useAgentToolResolver({
 *     navigation: {
 *       tools: {
 *         set_ui_view: {
 *           description: "Change la vue principale",
 *           schema: z.object({
 *             view: z.enum(['grid', 'detail', 'cart']),
 *           }),
 *           handler: async ({ view }) => {
 *             setUiState(view);
 *             return { result: `Vue changée vers ${view}` };
 *           },
 *         },
 *       },
 *     },
 *     cart: {
 *       tools: {
 *         add_to_cart: {
 *           description: "Ajouter un produit au panier",
 *           schema: z.object({
 *             product_id: z.string(),
 *             quantity: z.number().min(1).default(1),
 *           }),
 *           handler: async ({ product_id, quantity }) => {
 *             setCart(prev => [...prev, { id: product_id, quantity }]);
 *             return { result: "Produit ajouté" };
 *           },
 *         },
 *       },
 *     },
 *   });
 *
 *   return <div>{/* Your UI *\/}</div>;
 * }
 * ```
 */
export function useAgentToolResolver(
  config: ResolverConfig,
  options: UseAgentToolResolverOptions = {}
): UseAgentToolResolverResult {
  const ctx = useContext(OwlLayerContext);

  if (!ctx) {
    throw new Error('useAgentToolResolver doit être utilisé dans un <OwlLayerProvider>');
  }

  const { registerTool, unregisterToolsByComponent, debug: debugMode } = ctx;
  const componentId = useRef(`resolver_${Math.random().toString(36).slice(2, 9)}`).current;

  // Stabiliser les options avec useRef — évite re-registration si les callbacks
  // sont définis inline (nouvelle référence à chaque render)
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; });

  const { prefix: globalPrefix = '', debug = debugMode ?? false, global: isGlobal = false } = options;

  // Aplatir tous les tools (avec support du prefix au niveau groupe ET global)
  const flatTools = useMemo(() => {
    const tools: Record<string, ResolverToolDefinition<any>> = {};

    for (const groupName in config) {
      const group = config[groupName];
      // Le prefix global (options) est prioritaire sur le prefix du groupe
      const effectivePrefix = globalPrefix || (group.prefix ?? '');

      for (const toolName in group.tools) {
        const fullName = effectivePrefix ? `${effectivePrefix}${toolName}` : toolName;
        tools[fullName] = group.tools[toolName];
      }
    }

    if (debug) log.info(`Resolver créé avec ${Object.keys(tools).length} tools`);

    return tools;
  }, [config, globalPrefix, debug]);

  const flatToolsRef = useRef(flatTools);
  flatToolsRef.current = flatTools;

  const toolSignature = useMemo(
    () =>
      JSON.stringify(
        Object.entries(flatTools).map(([name, toolDef]) => ({
          name,
          description: toolDef.description,
          risk: toolDef.risk,
          parameters: zodToToolParameters(toolDef.schema),
        }))
      ),
    [flatTools]
  );

  useEffect(() => {
    if (optionsRef.current.disabled) return;

    for (const [toolName, toolDef] of Object.entries(flatTools)) {
      const handler = async (rawArgs: any) => {
        const { debug: dbg, onBeforeAnyCall, onAfterAnyCall, onErrorAnyCall } = optionsRef.current;
        const toolDef = flatToolsRef.current[toolName];
        if (!toolDef) {
          throw new Error(`Tool definition not found for "${toolName}"`);
        }
        const startTime = Date.now();
        let args = rawArgs;

        try {
          if (dbg) log.debug(`Executing ${toolName}`, args);

          // Validation Zod
          if (toolDef.schema) {
            const parsed = toolDef.schema.safeParse(args);
            if (!parsed.success) {
              throw new Error(`Validation failed for "${toolName}": ${parsed.error.issues[0]?.message}`);
            }
            args = parsed.data;
          }

          // Callbacks avant (tool-level puis global)
          await toolDef.onBeforeCall?.(args);
          await onBeforeAnyCall?.(toolName, args);

          const result = await toolDef.handler(args);
          const duration = Date.now() - startTime;

          // Callbacks après
          await toolDef.onAfterCall?.(args, result);
          await onAfterAnyCall?.(toolName, args, result);

          if (dbg) log.debug(`${toolName} completed in ${duration}ms`, result);

          return result;
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          await toolDef.onError?.(args, error);
          await onErrorAnyCall?.(toolName, args, error);
          if (optionsRef.current.debug) log.error(`${toolName} failed:`, error);
          throw error;
        }
      };

      const declaration = {
        name: toolName,
        description: toolDef.description,
        parameters: zodToToolParameters(toolDef.schema),
        risk: toolDef.risk || 'low',
      };

      registerTool(componentId, declaration, handler, isGlobal);

      if (debug) log.debug(`Tool registered: ${toolName}`);
    }

    // Ne pas nettoyer si global: true
    if (!isGlobal) {
      return () => {
        unregisterToolsByComponent(componentId);
        if (debug) log.info(`Resolver unmounted, ${Object.keys(flatTools).length} tools removed`);
      };
    }
  }, [toolSignature, componentId, debug, isGlobal, registerTool, unregisterToolsByComponent]);

  return {
    toolCount: Object.keys(flatTools).length,
    toolNames: Object.keys(flatTools),
  };
}
