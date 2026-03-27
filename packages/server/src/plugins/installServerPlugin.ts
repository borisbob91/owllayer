import { createLogger } from '@domos/core';
import type { ToolRouter, ServerToolHandler } from '../core/ToolRouter.js';
import type { DomOSServerPlugin, ServerPluginContext, PluginRuntimeOptions } from './plugin.types.js';
import { capabilityIntersect } from '../runtime/capabilityIntersect.js';
import { WorkerExecutor } from '../runtime/WorkerExecutor.js';

const log = createLogger('DomOS:ServerPlugin');

const NAMESPACE_RE = /^@[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/;

// ============================================================
// Namespace validation
// ============================================================

/**
 * Validates that the plugin name follows the @scope/name format.
 * @throws if the format is invalid.
 */
function assertNamespace(name: string): void {
  if (!NAMESPACE_RE.test(name)) {
    throw new Error(
      `[DomOS ServerPlugin] Invalid plugin name: "${name}". ` +
        `Required format: @scope/name lowercase (e.g. @domos/shopify, @acme/crm).`,
    );
  }
}

// ============================================================
// trusted context (in-process, default)
// ============================================================

function createServerPluginContext(toolRouter: ToolRouter, pluginName: string): ServerPluginContext {
  const registered = new Set<string>();

  return {
    registerTool(name: string, handler: ServerToolHandler): void {
      const shortPluginName = pluginName.replace(/^@[^/]+\//, '');
      const prefixedName = `${shortPluginName}_${name.replace(/\//g, '_')}`;

      if (toolRouter.hasServerTool(prefixedName)) {
        throw new Error(
          `[DomOS ServerPlugin] Collision: tool "${prefixedName}" is already registered. ` +
            `Another plugin or component uses this name.`,
        );
      }

      toolRouter.registerServerTool(prefixedName, handler);
      registered.add(prefixedName);
      log.info(`[${pluginName}] Tool registered: ${prefixedName}`);
    },

    uninstall(): void {
      for (const name of registered) {
        toolRouter.unregisterServerTool(name);
      }
      log.info(`[${pluginName}] Plugin uninstalled (${registered.size} tool(s) removed)`);
      registered.clear();
    },
  };
}

// ============================================================
// untrusted context (isolated worker_threads)
// ============================================================

function createUntrustedPluginContext(
  toolRouter: ToolRouter,
  pluginName: string,
  executor: WorkerExecutor,
): ServerPluginContext {
  const registered = new Set<string>();

  return {
    registerTool(name: string, handler: ServerToolHandler): void {
      const shortPluginName = pluginName.replace(/^@[^/]+\//, '');
      const prefixedName = `${shortPluginName}_${name.replace(/\//g, '_')}`;

      if (toolRouter.hasServerTool(prefixedName)) {
        throw new Error(
          `[DomOS ServerPlugin] Collision: tool "${prefixedName}" is already registered. ` +
            `Another plugin or component uses this name.`,
        );
      }

      const wrappedHandler: ServerToolHandler = (args) => executor.execute(handler, args);

      toolRouter.registerServerTool(prefixedName, wrappedHandler);
      registered.add(prefixedName);
      log.info(`[${pluginName}] Tool registered (untrusted): ${prefixedName}`);
    },

    uninstall(): void {
      for (const name of registered) {
        toolRouter.unregisterServerTool(name);
      }
      log.info(`[${pluginName}] Plugin uninstalled (${registered.size} tool(s) removed)`);
      registered.clear();
    },
  };
}

// ============================================================
// installServerPlugin — public entry point
// ============================================================

/**
 * Installs a plugin on a ToolRouter.
 *
 * Steps:
 * 1. Validates `meta.name` format (@scope/name)
 * 2. Creates an isolated ServerPluginContext with auto-prefixing
 * 3. Calls `plugin.setup(ctx, config)`
 * 4. Returns `ctx.uninstall` for clean teardown
 *
 * Takes ToolRouter directly (not DomOSServer) to remain testable
 * without instantiating the full server.
 *
 * @param runtimeOptions - Optional. Controls execution mode and capabilities.
 *   Defaults to `{ mode: 'trusted' }` — fully backward compatible.
 * @returns Uninstall function — removes all tools registered by the plugin.
 *
 * @example
 * ```ts
 * // trusted (default) — in-process, no overhead
 * const uninstall = installServerPlugin(toolRouter, MyPlugin, config);
 *
 * // untrusted — isolated worker_threads with declared capabilities
 * const uninstall = installServerPlugin(toolRouter, ThirdPartyPlugin, config, {
 *   mode: 'untrusted',
 * });
 *
 * // untrusted + installer restricts capabilities further
 * const uninstall = installServerPlugin(toolRouter, ThirdPartyPlugin, config, {
 *   mode: 'untrusted',
 *   capabilities: { network: { allowDomains: [] } },
 *   timeoutMs: 3000,
 * });
 * ```
 */
export function installServerPlugin<C>(
  toolRouter: ToolRouter,
  plugin: DomOSServerPlugin<C>,
  config: C,
  runtimeOptions?: PluginRuntimeOptions,
): () => void {
  assertNamespace(plugin.meta.name);

  const mode = runtimeOptions?.mode ?? 'trusted';

  let ctx: ServerPluginContext;

  if (mode === 'untrusted') {
    const effectiveCapabilities = capabilityIntersect(
      plugin.meta.capabilities,
      runtimeOptions?.capabilities,
    );
    const executor = new WorkerExecutor({
      capabilities: effectiveCapabilities,
      timeoutMs: runtimeOptions?.timeoutMs,
    });
    ctx = createUntrustedPluginContext(toolRouter, plugin.meta.name, executor);
  } else {
    ctx = createServerPluginContext(toolRouter, plugin.meta.name);
  }

  const result = plugin.setup(ctx, config);

  if (result instanceof Promise) {
    result.catch((err: unknown) => {
      log.error(`Plugin "${plugin.meta.name}" setup error:`, String(err));
    });
  }

  log.info(`Server plugin "${plugin.meta.name}" v${plugin.meta.version} installed (mode: ${mode})`);

  return () => ctx.uninstall();
}
