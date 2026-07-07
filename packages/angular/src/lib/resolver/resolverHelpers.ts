import { z } from 'zod';
import type { DomOSResolverConfig, DomOSResolverToolDefinition } from '../types/types.js';

/**
 * createResolverFromSwitch — Convertit un ensemble de cas nommés en
 * `DomOSResolverConfig` Angular, facilitant la migration d'un switch-case vers
 * le pattern resolver.
 *
 * @public
 *
 * @example
 * ```typescript
 * const config = createResolverFromSwitch({
 *   set_view: {
 *     description: 'Changer la vue active',
 *     schema: z.object({ view: z.string() }),
 *     handler: ({ view }) => setView(view),
 *   },
 *   add_to_cart: {
 *     description: 'Ajouter au panier',
 *     schema: z.object({ productId: z.string() }),
 *     handler: ({ productId }) => addToCart(productId),
 *   },
 * });
 *
 * registerToolResolver(config);
 * ```
 */
export function createResolverFromSwitch(
  cases: Record<
    string,
    {
      description: string;
      schema: z.ZodTypeAny;
      handler: (args: any) => any;
      risk?: DomOSResolverToolDefinition['risk'];
    }
  >
): DomOSResolverConfig {
  return {
    main: {
      tools: cases as Record<string, DomOSResolverToolDefinition<any>>,
    },
  };
}

/**
 * createCRUDResolver — Crée une `DomOSResolverConfig` Angular couvrant les
 * opérations CRUD standard sur une entité.
 *
 * @public
 *
 * @example
 * ```typescript
 * const config = createCRUDResolver('product', {
 *   onCreate: async (data) => api.products.create(data),
 *   onUpdate: async (id, data) => api.products.update(id, data),
 *   onDelete: async (id) => api.products.delete(id),
 *   onRead: async (id) => api.products.get(id),
 *   onList: async (filters) => api.products.list(filters),
 * });
 *
 * registerToolResolver(config);
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
): DomOSResolverConfig {
  const tools: Record<string, DomOSResolverToolDefinition<any>> = {};

  if (handlers.onCreate) {
    tools[`create_${entityName}`] = {
      description: `Create a new ${entityName}`,
      schema: z.object({
        data: z.record(z.string(), z.any()).describe(`${entityName} data`),
      }) as any,
      handler: async ({ data }: any) => {
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
        data: z.record(z.string(), z.any()).describe('Updated data'),
      }) as any,
      handler: async ({ id, data }: any) => {
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
      }) as any,
      handler: async ({ id }: any) => {
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
      }) as any,
      handler: async ({ id }: any) => {
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
        filters: z.record(z.string(), z.any()).optional().describe('Optional filters'),
      }) as any,
      handler: async ({ filters }: any) => {
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
