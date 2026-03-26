// ============================================================
// Plugin UI Types — framework-agnostic declarations
// ============================================================

/**
 * Carte de composants declaree par un plugin.
 * Le type de chaque composant est opaque ici (framework-specific).
 * Les SDK React/Vue/Svelte fournissent des accesseurs types via usePluginComponents().
 */
export type PluginComponentMap = Record<string, unknown>;

/**
 * Declaration UI optionnelle d'un plugin.
 *
 * Un plugin peut exposer des composants visuels en plus de ses tools.
 * Les composants sont declares ici au niveau du plugin et recuperes
 * cote framework via usePluginComponents<T>(plugin).
 *
 * @example
 * ```ts
 * export const BarChartReactPlugin: DomOSClientPlugin<BarChartConfig> = {
 *   meta: { name: '@domos-plugins/bar-chart', version: '1.0.0' },
 *   setup(ctx, config) {
 *     ctx.updateContext({ chart: { theme: config.theme } });
 *   },
 *   ui: {
 *     components: { BarChart }   // composant React/Vue/Svelte
 *   }
 * };
 * ```
 */
export interface PluginUIDeclaration {
  components?: PluginComponentMap;
}
