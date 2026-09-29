import { spawn } from 'child_process';
import type { PluginCapabilities } from '../plugins/plugin.types.js';
import type { ServerToolHandler } from '../core/ToolRouter.js';

// ============================================================
// WorkerExecutor
//
// Executes a plugin tool handler inside a separate Node.js process
// started with the Node permission model (`--permission`), for
// `untrusted` plugins.
//
// Isolation guarantees provided by this implementation:
//   ✓ Separate process — no shared memory with the server
//   ✓ Filesystem denied, except `filesystem.readAllowPaths` / `writeAllowPaths`
//   ✓ Child processes, worker threads and native addons denied
//     (`process.allowSpawn` re-enables child processes: they are NOT confined)
//   ✓ Filtered process.env — only `env.allowKeys` are injected
//   ✓ Hard timeout — the process is killed after `timeoutMs`
//   ✓ Crash isolation — handler error does not affect OwlLayerServer
//
// Limitations:
//   ✗ Network is NOT restricted (Node 22 permission model has no network
//     scope): `network.allowDomains` is not enforced yet
//   ✗ Only tool handlers run here. The plugin module itself and its
//     `setup()` run in the server process: install only plugins whose
//     package you trust or have audited
// ============================================================

const DEFAULT_TIMEOUT_MS = 10_000;

// Node >= 22.13 / 23.5 : --permission ; versions anterieures : --experimental-permission
const PERMISSION_FLAG = process.allowedNodeEnvironmentFlags.has('--permission')
  ? '--permission'
  : '--experimental-permission';

export interface WorkerExecutorOptions {
  capabilities: PluginCapabilities;
  timeoutMs?: number;
}

// ============================================================
// Script du processus isole (execute via `node --permission -e`)
// ============================================================

/* eslint-disable */
const CHILD_SCRIPT = `
process.once('message', async ({ handlerSource, args }) => {
  try {
    const fn = new Function('return (' + handlerSource + ')')();
    const result = await fn(args);
    process.send({ ok: true, result });
  } catch (err) {
    process.send({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});
`.trim();
/* eslint-enable */

// ============================================================
// WorkerExecutor class
// ============================================================

/**
 * Executes a tool handler in an isolated Node.js process.
 *
 * The handler is serialized as a function source string and reconstructed
 * inside the process. As a result, **the handler must be a self-contained
 * function** — it cannot close over variables from the outer scope.
 *
 * For handlers that need external state (DB clients, caches, etc.),
 * pass the necessary data through `args` or use `trusted` mode instead.
 */
export class WorkerExecutor {
  private readonly capabilities: PluginCapabilities;
  private readonly timeoutMs: number;

  constructor(options: WorkerExecutorOptions) {
    this.capabilities = options.capabilities;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Runs `handler` with `args` inside an isolated process.
   *
   * @throws if the handler throws, times out, or the process crashes.
   */
  async execute(handler: ServerToolHandler, args: Record<string, unknown>): Promise<unknown> {
    const handlerSource = handler.toString();

    return new Promise((resolve, reject) => {
      let settled = false;

      // `env` remplace process.env dans le processus isole : seules les cles autorisees sont presentes
      const child = spawn(process.execPath, [...this.buildPermissionArgs(), '-e', CHILD_SCRIPT], {
        env: this.buildEnv(),
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
        serialization: 'advanced',
      });

      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        child.kill('SIGKILL');
        fn();
      };

      const timer = setTimeout(() => {
        finish(() => reject(new Error(`Plugin tool timed out after ${this.timeoutMs}ms`)));
      }, this.timeoutMs);

      child.once('message', (msg: { ok: boolean; result?: unknown; error?: string }) => {
        finish(() => {
          if (msg.ok) {
            resolve(msg.result);
          } else {
            reject(new Error(msg.error ?? 'Plugin tool error'));
          }
        });
      });

      child.once('error', (err) => {
        finish(() => reject(new Error(`Plugin process error: ${err.message}`)));
      });

      child.once('exit', (code) => {
        finish(() => reject(new Error(`Plugin process exited unexpectedly with code ${code}`)));
      });

      child.send({ handlerSource, args });
    });
  }

  /**
   * Options du modele de permission Node derivees des capacites effectives.
   */
  private buildPermissionArgs(): string[] {
    const flags = [PERMISSION_FLAG];
    for (const path of this.capabilities.filesystem?.readAllowPaths ?? []) {
      flags.push(`--allow-fs-read=${path}`);
    }
    for (const path of this.capabilities.filesystem?.writeAllowPaths ?? []) {
      flags.push(`--allow-fs-write=${path}`);
    }
    if (this.capabilities.process?.allowSpawn) {
      flags.push('--allow-child-process');
    }
    return flags;
  }

  /**
   * Builds the env object injected into the isolated process.
   * Only keys listed in `capabilities.env.allowKeys` are included.
   */
  private buildEnv(): Record<string, string> {
    const allowKeys = this.capabilities.env?.allowKeys;
    if (!allowKeys || allowKeys.length === 0) return {};

    const env: Record<string, string> = {};
    for (const key of allowKeys) {
      const value = process.env[key];
      if (value !== undefined) env[key] = value;
    }
    return env;
  }
}
