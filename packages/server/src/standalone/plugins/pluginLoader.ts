import type { DomOSServer } from '../../core/DomOSServer.js';

/**
 * Charge les plugins listés dans la config YAML et les installe sur le serveur DomOS.
 *
 * Un plugin peut être :
 * - Un objet `DomOSServerPlugin` exporté en default : `export default StockPlugin`
 * - Une factory function qui reçoit la config : `export default (config) => StockPlugin`
 *
 * Configuration YAML :
 * ```yaml
 * plugins:
 *   - package: "@domos-plugins/demo-promotions"
 *   - package: "@domos/plugin-shopify"
 *     config:
 *       clientId: ${SHOPIFY_CLIENT_ID}
 * ```
 *
 * @param server - Instance DomOSServer sur laquelle installer les plugins
 * @param plugins - Liste des plugins à charger (depuis config.plugins)
 */
export async function loadPluginsFromConfig(
  server: DomOSServer,
  plugins?: Array<{ package: string; config?: Record<string, unknown> }>,
): Promise<void> {
  if (!plugins || plugins.length === 0) return;

  for (const pluginDef of plugins) {
    try {
      const mod = await import(pluginDef.package);
      const raw: unknown = mod.default ?? mod;

      let plugin: unknown;

      if (typeof raw === 'function') {
        // Plugin factory — passe la config
        plugin = raw(pluginDef.config ?? {});
      } else {
        plugin = raw;
      }

      // DomOSServer.installPlugin attend (plugin, config) — la config est already merged
      server.installPlugin(plugin as any, pluginDef.config as any);

      console.log(`[DomOS] Plugin chargé : ${pluginDef.package}`);
    } catch (err) {
      console.error(`[DomOS] Impossible de charger le plugin ${pluginDef.package}:`, String(err));
    }
  }
}
