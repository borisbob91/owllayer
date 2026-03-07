import { type z } from 'zod';
import type { ResolverConfig, ResolverToolDefinition } from './types/resolver.js';

/**
 * Convertir un switch-case existant en ResolverConfig.
 *
 * @example
 * ```ts
 * // AVANT
 * switch (toolName) {
 *   case 'set_view':
 *     setView(args.view);
 *     break;
 *   case 'add_to_cart':
 *     cart.update(c => [...c, args.product]);
 *     break;
 * }
 *
 * // APRÈS
 * const config = createResolverFromSwitch({
 *   set_view: {
 *     description: "Change la vue",
 *     schema: z.object({ view: z.string() }),
 *     handler: ({ view }) => setView(view),
 *   },
 *   add_to_cart: {
 *     description: "Ajouter au panier",
 *     schema: z.object({ product: z.any() }),
 *     handler: ({ product }) => cart.update(c => [...c, product]),
 *   },
 * });
 * ```
 */
export function createResolverFromSwitch(
  toolDefinitions: Record<string, ResolverToolDefinition>
): ResolverConfig {
  return {
    main: {
      tools: toolDefinitions,
    },
  };
}

/**
 * Générer automatiquement des tools CRUD pour une ressource.
 *
 * @example
 * ```ts
 * const productCRUD = createCRUDResolver('product', {
 *   onCreate: async (data) => api.products.create(data),
 *   onUpdate: async (id, data) => api.products.update(id, data),
 *   onDelete: async (id) => api.products.delete(id),
 *   onRead: async (id) => api.products.get(id),
 *   onList: async (filters) => api.products.list(filters),
 * });
 *
 * // Dans le composant
 * <div use:agentToolResolver={{ config: productCRUD }}>
 * ```
 */
export function createCRUDResolver<TData = any, TFilters = any>(
  resourceName: string,
  handlers: {
    onCreate?: (data: TData) => Promise<any> | any;
    onUpdate?: (id: string, data: Partial<TData>) => Promise<any> | any;
    onDelete?: (id: string) => Promise<any> | any;
    onRead?: (id: string) => Promise<any> | any;
    onList?: (filters?: TFilters) => Promise<any> | any;
  },
  schemas?: {
    createSchema?: z.ZodObject<any>;
    updateSchema?: z.ZodObject<any>;
    deleteSchema?: z.ZodObject<any>;
    readSchema?: z.ZodObject<any>;
    listSchema?: z.ZodObject<any>;
  }
): ResolverConfig {
  const { z } = require('zod');

  const tools: Record<string, ResolverToolDefinition> = {};

  if (handlers.onCreate) {
    tools.create = {
      description: `Créer un nouveau ${resourceName}`,
      schema: schemas?.createSchema || z.object({ data: z.any() }),
      risk: 'low',
      handler: async (args: any) => handlers.onCreate!(args.data || args),
    };
  }

  if (handlers.onUpdate) {
    tools.update = {
      description: `Mettre à jour un ${resourceName}`,
      schema:
        schemas?.updateSchema ||
        z.object({
          id: z.string(),
          data: z.any(),
        }),
      risk: 'low',
      handler: async (args: any) => handlers.onUpdate!(args.id, args.data),
    };
  }

  if (handlers.onDelete) {
    tools.delete = {
      description: `Supprimer un ${resourceName}`,
      schema: schemas?.deleteSchema || z.object({ id: z.string() }),
      risk: 'high',
      handler: async (args: any) => handlers.onDelete!(args.id),
    };
  }

  if (handlers.onRead) {
    tools.read = {
      description: `Lire un ${resourceName} par ID`,
      schema: schemas?.readSchema || z.object({ id: z.string() }),
      handler: async (args: any) => handlers.onRead!(args.id),
    };
  }

  if (handlers.onList) {
    tools.list = {
      description: `Lister tous les ${resourceName}s`,
      schema: schemas?.listSchema || z.object({ filters: z.any().optional() }),
      handler: async (args: any) => handlers.onList!(args.filters),
    };
  }

  return {
    [resourceName]: {
      prefix: `${resourceName}_`,
      tools,
    },
  };
}
