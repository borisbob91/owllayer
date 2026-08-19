import type { ToolParameters } from '../protocol/aitp.types.js';
import type { PluginUIDeclaration } from './ui.types.js';

// ============================================================
// PluginToolDefinition — Format accepte par ctx.registerTool()
// ============================================================

/**
 * Format JSON Schema relaxe (lowercase, comme l'API browser).
 * Converti automatiquement vers ToolParameters par createPluginContext.
 */
export type PluginToolParamsJsonSchema = {
  type?: string;
  properties?: Record<string, { type: string; description?: string; [k: string]: unknown }>;
  required?: string[];
};

/**
 * Definition d'un tool enregistre par un plugin.
 * Accepte le format ToolParameters natif (@owllayer/core) ou JSON Schema relaxe.
 */
export interface PluginToolDefinition {
  description: string;
  parameters?: ToolParameters | PluginToolParamsJsonSchema;
  risk?: 'none' | 'low' | 'high' | 'critical';
  handler: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

// ============================================================
// PluginClientContext — Surface restreinte exposee au plugin
// ============================================================

/**
 * Contexte injecte dans plugin.setup().
 *
 * Deliberement limite :
 * - Pas d'acces a client.connect() / disconnect()
 * - Pas d'acces a la memoire agent (OwlLayerAgent)
 * - Pas d'envoi de messages WebSocket bruts
 * - Les tools enregistres ne sont PAS globaux (cleanup via uninstall())
 */
export interface PluginClientContext {
  /**
   * Enregistrer un tool. Le nom sera prefixe automatiquement.
   * 'search_contacts' → '@acme/crm/search_contacts'
   */
  registerTool(name: string, definition: PluginToolDefinition): void;

  /**
   * Fusionner des donnees dans le Shadow Context.
   */
  updateContext(ctx: Record<string, unknown>): void;

  /**
   * Lire le Shadow Context courant (lecture seule).
   */
  getContext(): Record<string, unknown>;

  /**
   * Desinstaller le plugin : supprime tous ses tools enregistres.
   */
  uninstall(): void;
}

// ============================================================
// OwlLayerClientPlugin<C> — Interface publique du plugin
// ============================================================

/**
 * Interface a implementer pour creer un plugin OwlLayer client-side.
 *
 * @typeParam C - Type de configuration passe a l'installation
 *
 * @example
 * ```ts
 * export const MyCRMPlugin: OwlLayerClientPlugin<MyCRMConfig> = {
 *   meta: { name: '@acme/crm', version: '1.0.0' },
 *   setup(ctx, config) {
 *     ctx.updateContext({ crm: { tenantId: config.tenantId } });
 *     ctx.registerTool('search_contacts', { ... });
 *   },
 * };
 * ```
 */
export interface OwlLayerClientPlugin<C = void> {
  meta: {
    /** Nom du plugin. Format obligatoire : @scope/name (ex: '@owllayer/shopify') */
    name: string;
    version: string;
    description?: string;
  };
  setup(ctx: PluginClientContext, config: C): void | Promise<void>;
  /** Composants UI optionnels exposes par ce plugin (framework-specific). */
  ui?: PluginUIDeclaration;
}

/**
 * Entree dans le tableau plugins de OwlLayerProvider.
 * @example plugins={[[MyPlugin, { apiUrl: '...' }]]}
 */
export type PluginEntry<C = unknown> = readonly [OwlLayerClientPlugin<C>, C];
