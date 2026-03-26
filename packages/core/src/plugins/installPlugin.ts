import { createLogger } from '../utils/logger.js';
import type { DomOSClient, RegisteredTool } from '../client/DomOSClient.js';
import type {
  DomOSClientPlugin,
  PluginClientContext,
  PluginToolDefinition,
  PluginToolParamsJsonSchema,
} from './plugin.types.js';
import type { ToolParameters } from '../protocol/adtp.types.js';

const log = createLogger('DomOS:Plugin');

const NAMESPACE_RE = /^@[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/;

// ============================================================
// Validation namespace
// ============================================================

/**
 * Valide que le nom du plugin respecte le format @scope/name.
 * @throws si le format est invalide
 */
export function assertNamespace(name: string): void {
  if (!NAMESPACE_RE.test(name)) {
    throw new Error(
      `[DomOS Plugin] Nom de plugin invalide : "${name}". ` +
        `Format requis : @scope/name en minuscules (ex: @domos/shopify, @acme/crm).`,
    );
  }
}

// ============================================================
// Normalisation parametres
// ============================================================

const VALID_TYPES = ['STRING', 'NUMBER', 'BOOLEAN', 'OBJECT', 'ARRAY'] as const;
type ValidType = (typeof VALID_TYPES)[number];

function normalizeParams(p?: ToolParameters | PluginToolParamsJsonSchema): ToolParameters | undefined {
  if (!p) return undefined;

  // Deja au format ToolParameters natif (type uppercase 'OBJECT')
  if ((p as ToolParameters).type === 'OBJECT' && typeof (p as ToolParameters).properties === 'object') {
    return p as ToolParameters;
  }

  // JSON Schema → ToolParameters
  const src = p as PluginToolParamsJsonSchema;
  const properties: ToolParameters['properties'] = {};

  if (src.properties) {
    for (const [key, prop] of Object.entries(src.properties)) {
      const upper = String(prop.type ?? 'string').toUpperCase() as ValidType;
      properties[key] = {
        type: (VALID_TYPES as readonly string[]).includes(upper) ? upper : 'STRING',
        description: prop.description,
      };
    }
  }

  return { type: 'OBJECT', properties, required: src.required };
}

// ============================================================
// Contexte isole du plugin
// ============================================================

function createPluginContext(client: DomOSClient, pluginName: string): PluginClientContext {
  const componentId = `plugin:${pluginName}`;

  return {
    registerTool(name: string, definition: PluginToolDefinition): void {
      const prefixedName = `${pluginName}/${name}`;

      if (client.hasTool(prefixedName)) {
        throw new Error(
          `[DomOS Plugin] Collision : le tool "${prefixedName}" est deja enregistre. ` +
            `Un autre plugin ou composant utilise ce nom.`,
        );
      }

      const tool: RegisteredTool = {
        declaration: {
          name: prefixedName,
          description: definition.description,
          parameters: normalizeParams(definition.parameters),
          risk: definition.risk ?? 'none',
        },
        handler: async (args) => definition.handler((args ?? {}) as Record<string, unknown>),
        componentId,
        global: false,
      };

      client.registerTool(tool);
      log.info(`[${pluginName}] Tool enregistre : ${prefixedName}`);
    },

    updateContext(ctx: Record<string, unknown>): void {
      client.updateContext(ctx);
    },

    getContext(): Record<string, unknown> {
      return client.getContext();
    },

    uninstall(): void {
      client.unregisterToolsByComponent(componentId);
      log.info(`[${pluginName}] Plugin desinstalle (tools supprimes)`);
    },
  };
}

// ============================================================
// installPlugin — point d'entree public
// ============================================================

/**
 * Installe un plugin sur un DomOSClient.
 *
 * Etapes :
 * 1. Valide le format @scope/name
 * 2. Cree un PluginClientContext isole
 * 3. Appelle plugin.setup(ctx, config)
 *
 * @example
 * ```ts
 * import { installPlugin } from '@domos/core';
 * installPlugin(client, MyCRMPlugin, { apiUrl: 'https://...' });
 * ```
 */
export function installPlugin<C>(client: DomOSClient, plugin: DomOSClientPlugin<C>, config: C): void {
  assertNamespace(plugin.meta.name);

  const ctx = createPluginContext(client, plugin.meta.name);
  const result = plugin.setup(ctx, config);

  if (result instanceof Promise) {
    result.catch((err: unknown) => {
      log.error(`Plugin "${plugin.meta.name}" erreur setup :`, String(err));
    });
  }

  log.info(`Plugin "${plugin.meta.name}" v${plugin.meta.version} installe`);
}
