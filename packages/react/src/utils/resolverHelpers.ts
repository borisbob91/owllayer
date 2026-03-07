import { z } from 'zod';
import type { ResolverConfig, ResolverToolDefinition, RiskLevel } from '../types/resolver.js';

/**
 * Utilitaire pour convertir un switch case en resolver config.
 *
 * Facilite la migration du code existant vers le pattern resolver.
 *
 * @example
 * ```tsx
 * // Avant (switch case)
 * switch (toolCall.name) {
 *   case 'set_view':
 *     setView(args.view);
 *     return { result: "OK" };
 *   case 'add_to_cart':
 *     addToCart(args.product_id);
 *     return { result: "Added" };
 * }
 *
 * // Après (resolver)
 * const config = createResolverFromSwitch({
 *   set_view: {
 *     description: "Change the view",
 *     schema: z.object({ view: z.string() }),
 *     handler: (args) => {
 *       setView(args.view);
 *       return { result: "OK" };
 *     }
 *   },
 *   add_to_cart: {
 *     description: "Add to cart",
 *     schema: z.object({ product_id: z.string() }),
 *     handler: (args) => {
 *       addToCart(args.product_id);
 *       return { result: "Added" };
 *     }
 *   }
 * });
 *
 * useAgentToolResolver(config);
 * ```
 */
export function createResolverFromSwitch(
  cases: Record<
    string,
    {
      description: string;
      schema: z.ZodTypeAny;
      handler: (args: any) => any;
      risk?: RiskLevel;
    }
  >
): ResolverConfig {
  return {
    main: {
      tools: cases as Record<string, ResolverToolDefinition<any>>,
    },
  };
}

/**
 * Créer un resolver pour des actions CRUD standard.
 *
 * @example
 * ```tsx
 * const crudConfig = createCRUDResolver('product', {
 *   onCreate: async (data) => api.products.create(data),
 *   onUpdate: async (id, data) => api.products.update(id, data),
 *   onDelete: async (id) => api.products.delete(id),
 *   onRead: async (id) => api.products.get(id),
 * });
 *
 * useAgentToolResolver(crudConfig);
 * ```
 */
export function createCRUDResolver(
  entityName: string,
  handlers: {
    onCreate?: (data: any) => Promise<any> | any;
    onUpdate?: (id: string, data: any) => Promise<any> | any;
    onDelete?: (id: string) => Promise<any> | any;
    onRead?: (id: string) => Promise<any> | any;
    onList?: (filters?: any) => Promise<any> | any;
  }
): ResolverConfig {
  const tools: Record<string, ResolverToolDefinition<any>> = {};

  if (handlers.onCreate) {
    tools[`create_${entityName}`] = {
      description: `Create a new ${entityName}`,
      schema: z.object({
        data: z.record(z.any()).describe(`${entityName} data`),
      }),
      handler: async ({ data }) => {
        const result = await handlers.onCreate!(data);
        return { result: `${entityName} created`, data: result };
      },
      risk: 'low',
    };
  }

  if (handlers.onUpdate) {
    tools[`update_${entityName}`] = {
      description: `Update an existing ${entityName}`,
      schema: z.object({
        id: z.string().describe(`${entityName} ID`),
        data: z.record(z.any()).describe('Updated data'),
      }),
      handler: async ({ id, data }) => {
        const result = await handlers.onUpdate!(id, data);
        return { result: `${entityName} updated`, data: result };
      },
      risk: 'low',
    };
  }

  if (handlers.onDelete) {
    tools[`delete_${entityName}`] = {
      description: `Delete a ${entityName}`,
      schema: z.object({
        id: z.string().describe(`${entityName} ID to delete`),
      }),
      handler: async ({ id }) => {
        await handlers.onDelete!(id);
        return { result: `${entityName} deleted`, id };
      },
      risk: 'high',
    };
  }

  if (handlers.onRead) {
    tools[`get_${entityName}`] = {
      description: `Get a ${entityName} by ID`,
      schema: z.object({
        id: z.string().describe(`${entityName} ID`),
      }),
      handler: async ({ id }) => {
        const data = await handlers.onRead!(id);
        return { result: `${entityName} retrieved`, data };
      },
      risk: 'none',
    };
  }

  if (handlers.onList) {
    tools[`list_${entityName}s`] = {
      description: `List all ${entityName}s`,
      schema: z.object({
        filters: z.record(z.any()).optional().describe('Optional filters'),
      }),
      handler: async ({ filters }) => {
        const data = await handlers.onList!(filters);
        return { result: `${entityName}s retrieved`, data };
      },
      risk: 'none',
    };
  }

  return {
    [entityName]: { tools },
  };
}
