import type { ServerToolHandler, ServerToolMetadata } from '../core/ToolRouter.js';

// ============================================================
// @domos/server — Plugin system (server-side)
// ============================================================

/**
 * Isolated context provided to the plugin during setup.
 *
 * Intentionally reduced surface: the plugin cannot access ToolRouter
 * directly, sessions, or WebSocket connections.
 */
export interface ServerPluginContext {
  /**
   * Register a tool under the plugin namespace.
   * The name is automatically prefixed: 'check_stock' → '@scope/name/check_stock'.
   * @throws if the tool name is already registered (collision)
   */
  registerTool(name: string, handler: ServerToolHandler): void;
  registerTool(name: string, declaration: ServerToolMetadata, handler: ServerToolHandler): void;

  /**
   * Remove all tools registered by this plugin.
   * Does not affect any other plugin or tool.
   */
  uninstall(): void;
}

// ============================================================
// Plugin capabilities — declared by the plugin author in meta
// ============================================================

/**
 * Declares what system resources the plugin needs to operate.
 * Used as the plugin's manifest of intended access.
 *
 * In `untrusted` mode, these capabilities are enforced at runtime.
 * In `trusted` mode (default), they are informational only.
 */
export interface PluginCapabilities {
  /** Network access — list of allowed outbound domains. */
  network?: {
    allowDomains?: string[];
  };
  /** Filesystem access — allowed read and write paths. */
  filesystem?: {
    readAllowPaths?: string[];
    writeAllowPaths?: string[];
  };
  /** Environment variable access — allowed keys from process.env. */
  env?: {
    allowKeys?: string[];
  };
  /** Child process spawning. */
  process?: {
    allowSpawn?: boolean;
  };
}

// ============================================================
// Runtime options — chosen by the installer
// ============================================================

/**
 * Execution mode for the plugin.
 *
 * - `trusted`: runs in-process, same as today. No overhead. Use for
 *   first-party or audited plugins.
 * - `untrusted`: runs in an isolated `worker_threads` context with
 *   `capabilities` enforced. Use for third-party plugins.
 */
export type PluginMode = 'trusted' | 'untrusted';

/**
 * Runtime options passed by the installer when calling `server.installPlugin()`.
 *
 * - `mode` defaults to `'trusted'` for full backward compatibility.
 * - `capabilities` restricts the plugin's declared `meta.capabilities`.
 *   The installer can only restrict, never grant more than the author declared.
 * - `timeoutMs` caps tool handler execution time in both modes.
 */
export interface PluginRuntimeOptions {
  mode?: PluginMode;
  capabilities?: PluginCapabilities;
  timeoutMs?: number;
}

// ============================================================
// DomOSServerPlugin — public contract
// ============================================================

/**
 * Contract for a DomOS server-side plugin.
 *
 * @template C - Configuration type passed at installation time.
 *
 * @example
 * ```ts
 * export const StockPlugin: DomOSServerPlugin<{ dbUrl: string }> = {
 *   meta: {
 *     name: '@acme/stock',
 *     version: '1.0.0',
 *     capabilities: {
 *       network: { allowDomains: ['api.acme.com'] },
 *       env:     { allowKeys: ['ACME_API_KEY'] },
 *     },
 *   },
 *   setup(ctx, config) {
 *     ctx.registerTool('check_stock', {
 *       description: 'Verifier le stock disponible.',
 *       risk: 'none',
 *     }, async ({ productId }) => { … });
 *   },
 * };
 * ```
 */
export interface DomOSServerPlugin<C = void> {
  meta: {
    /** Required format: @scope/name lowercase (e.g. @domos/shopify, @acme/crm) */
    name: string;
    version: string;
    description?: string;
    /**
     * Declares what system resources this plugin needs.
     * Enforced at runtime in `untrusted` mode.
     */
    capabilities?: PluginCapabilities;
  };
  /**
   * Single entry point for the plugin.
   * All setup logic goes through `ctx`.
   */
  setup(ctx: ServerPluginContext, config: C): void | Promise<void>;

  // ── Lifecycle hooks (optionnels) ───────────────────────────

  /** Appelé après init du serveur, avant la première connexion. */
  onInit?(context: PluginLifecycleContext): Promise<void>;
  /** Appelé quand une session client démarre. */
  onSessionStart?(sessionId: string): Promise<void>;
  /** Appelé quand une session client se termine. */
  onSessionEnd?(sessionId: string): Promise<void>;

  // ── Tool providers déclaratifs (optionnels) ────────────────

  /**
   * Liste de providers d'outils déclaratifs.
   * Alternative à `ctx.registerTool()` pour des outils dynamiques.
   */
  toolProviders?: ToolProvider[];
}

// ============================================================
// PluginLifecycleContext — contexte lifecycle (onInit)
// ============================================================

export interface PluginLifecycleContext {
  pluginName: string;
  config: Record<string, unknown>;
}

// ============================================================
// ToolProvider — outil déclaratif fourni par un plugin
// ============================================================

/**
 * Provider d'outils déclaratifs.
 * Alternativeà `ctx.registerTool()` pour des outils dynamiques
 * (ex: outils dont la liste dépend de la session ou du contexte runtime).
 */
export interface ToolProvider {
  /** Nom unique du provider (ex: '@acme/crm/contacts') */
  name: string;
  /**
   * Retourne la liste des déclarations d'outils.
   * Appelé à chaque nouvelle session.
   */
  getTools(): Array<{ name: string; description: string; parameters?: Record<string, unknown> }>;
  /** Exécute un outil par son nom. */
  execute(toolName: string, args: Record<string, unknown>): Promise<unknown>;
  /** Filtre optionnel — retourne false pour désactiver ce provider sur certaines sessions. */
  shouldActivate?(sessionId: string): boolean;
}
