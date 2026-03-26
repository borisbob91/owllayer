import { createLogger } from '@domos/core';
import type { ToolRouter, ServerToolHandler } from '../core/ToolRouter.js';
import type { DomOSServerPlugin, ServerPluginContext } from './plugin.types.js';

const log = createLogger('DomOS:ServerPlugin');

const NAMESPACE_RE = /^@[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/;

// ============================================================
// Validation namespace (même règle que côté client)
// ============================================================

/**
 * Valide que le nom du plugin respecte le format @scope/name.
 * @throws si le format est invalide.
 */
function assertNamespace(name: string): void {
  if (!NAMESPACE_RE.test(name)) {
    throw new Error(
      `[DomOS ServerPlugin] Nom de plugin invalide : "${name}". ` +
        `Format requis : @scope/name en minuscules (ex: @domos/shopify, @acme/crm).`,
    );
  }
}

// ============================================================
// Contexte isolé du plugin
// ============================================================

function createServerPluginContext(toolRouter: ToolRouter, pluginName: string): ServerPluginContext {
  const registered = new Set<string>();

  return {
    registerTool(name: string, handler: ServerToolHandler): void {
      const prefixedName = `${pluginName}/${name}`;

      if (toolRouter.hasServerTool(prefixedName)) {
        throw new Error(
          `[DomOS ServerPlugin] Collision : le tool "${prefixedName}" est déjà enregistré. ` +
            `Un autre plugin ou composant utilise ce nom.`,
        );
      }

      toolRouter.registerServerTool(prefixedName, handler);
      registered.add(prefixedName);
      log.info(`[${pluginName}] Tool enregistré : ${prefixedName}`);
    },

    uninstall(): void {
      for (const name of registered) {
        toolRouter.unregisterServerTool(name);
      }
      log.info(`[${pluginName}] Plugin désinstallé (${registered.size} tool(s) supprimé(s))`);
      registered.clear();
    },
  };
}

// ============================================================
// installServerPlugin — point d'entrée public
// ============================================================

/**
 * Installe un plugin sur un ToolRouter.
 *
 * Étapes :
 * 1. Valide le format @scope/name du meta.name
 * 2. Crée un ServerPluginContext isolé avec auto-préfixage
 * 3. Appelle plugin.setup(ctx, config)
 * 4. Retourne ctx.uninstall pour une désinstallation propre
 *
 * Cette fonction prend ToolRouter directement (pas DomOSServer)
 * pour rester testable sans instancier le serveur complet.
 *
 * @returns Fonction de désinstallation — retire tous les tools du plugin
 *
 * @example
 * ```ts
 * // Préférer DomOSServer.installPlugin() en production
 * const uninstall = installServerPlugin(toolRouter, StockPlugin, { dbUrl: '…' });
 * uninstall(); // retrait propre
 * ```
 */
export function installServerPlugin<C>(
  toolRouter: ToolRouter,
  plugin: DomOSServerPlugin<C>,
  config: C,
): () => void {
  assertNamespace(plugin.meta.name);

  const ctx = createServerPluginContext(toolRouter, plugin.meta.name);
  const result = plugin.setup(ctx, config);

  if (result instanceof Promise) {
    result.catch((err: unknown) => {
      log.error(`Plugin "${plugin.meta.name}" erreur setup :`, String(err));
    });
  }

  log.info(`Plugin serveur "${plugin.meta.name}" v${plugin.meta.version} installé`);

  return () => ctx.uninstall();
}
