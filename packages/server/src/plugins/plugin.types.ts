import type { ServerToolHandler } from '../core/ToolRouter.js';

// ============================================================
// @domos/server — Plugin system (server-side)
// Mirror de @domos/core plugin.types.ts pour le côté serveur.
// ============================================================

/**
 * Contexte isolé fourni au plugin lors de son setup.
 *
 * Surface intentionnellement réduite : le plugin ne peut pas accéder
 * à ToolRouter directement, ni aux sessions, ni aux connexions WebSocket.
 */
export interface ServerPluginContext {
  /**
   * Enregistre un tool sous le namespace du plugin.
   * Le nom est automatiquement préfixé : 'check_stock' → '@scope/name/check_stock'.
   * @throws si le tool est déjà enregistré (collision)
   */
  registerTool(name: string, handler: ServerToolHandler): void;

  /**
   * Retire tous les tools enregistrés par ce plugin.
   * N'affecte aucun autre tool.
   */
  uninstall(): void;
}

/**
 * Contrat d'un plugin serveur DomOS.
 *
 * @template C - Type de la configuration passée à l'installation.
 *
 * @example
 * ```ts
 * export const StockPlugin: DomOSServerPlugin<{ dbUrl: string }> = {
 *   meta: { name: '@domos-plugins/stock', version: '1.0.0' },
 *   setup(ctx, config) {
 *     ctx.registerTool('check_stock', async ({ productId }) => { … });
 *   },
 * };
 * ```
 */
export interface DomOSServerPlugin<C = void> {
  meta: {
    /** Format requis : @scope/name en minuscules (ex: @domos/shopify, @acme/crm) */
    name: string;
    version: string;
    description?: string;
  };
  /**
   * Point d'entrée unique du plugin.
   * Toute la logique de setup passe par `ctx`.
   */
  setup(ctx: ServerPluginContext, config: C): void | Promise<void>;
}
