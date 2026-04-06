import { Worker } from 'worker_threads';
import type { PluginCapabilities } from '../plugins/plugin.types.js';
import type { ServerToolHandler } from '../core/ToolRouter.js';

// ============================================================
// WorkerExecutor
//
// Executes a plugin tool handler inside an isolated worker_threads
// context for `untrusted` plugins.
//
// Isolation guarantees provided by this implementation:
//   ✓ Separate V8 context — no shared memory with the main thread
//   ✓ Filtered process.env — only `allowKeys` injected via Worker `env` option
//   ✓ Hard timeout — worker.terminate() after `timeoutMs`
//   ✓ Crash isolation — handler error does not affect DomOSServer
//
// Limitations (addressed in feature #10 — Rust + napi):
//   ~ Network restriction is best-effort (no OS-level interception)
//   ~ Filesystem restriction is best-effort (no syscall-level filter)
//
// Implementation note:
//   The worker logic is embedded as an inline CJS script via `eval: true`.
//   This avoids file-extension issues (.ts vs .js) in both dev and test,
//   and removes the need for a separate worker entry file.
// ============================================================

const DEFAULT_TIMEOUT_MS = 10_000;

export interface WorkerExecutorOptions {
  capabilities: PluginCapabilities;
  timeoutMs?: number;
}

// ============================================================
// Inline worker script (CJS — executed via eval:true)
// ============================================================

// Note: `require` is available because eval:true uses a CommonJS context.
/* eslint-disable */
const WORKER_SCRIPT = `
const { workerData, parentPort } = require('worker_threads');
const { handlerSource, args } = workerData;

(async () => {
  try {
    const fn = new Function('return (' + handlerSource + ')')();
    const result = await fn(args);
    parentPort.postMessage({ ok: true, result });
  } catch (err) {
    parentPort.postMessage({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
})();
`.trim();
/* eslint-enable */

// ============================================================
// WorkerExecutor class
// ============================================================

/**
 * Executes a tool handler in an isolated worker thread.
 *
 * The handler is serialized as a function source string and reconstructed
 * inside the worker. As a result, **the handler must be a self-contained
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
   * Runs `handler` with `args` inside an isolated worker thread.
   *
   * @throws if the handler throws, times out, or the worker crashes.
   */
  async execute(handler: ServerToolHandler, args: Record<string, unknown>): Promise<unknown> {
    const handlerSource = handler.toString();
    const env = this.buildEnv();

    return new Promise((resolve, reject) => {
      let settled = false;

      // `env` replaces process.env in the worker — only allowed keys are present.
      const worker = new Worker(WORKER_SCRIPT, {
        eval: true,
        workerData: { handlerSource, args },
        env: env as NodeJS.ProcessEnv,
      });

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        worker.terminate();
        reject(new Error(`Plugin tool timed out after ${this.timeoutMs}ms`));
      }, this.timeoutMs);

      worker.once('message', (msg: { ok: boolean; result?: unknown; error?: string }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (msg.ok) {
          resolve(msg.result);
        } else {
          reject(new Error(msg.error ?? 'Plugin tool error'));
        }
      });

      worker.once('error', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Plugin worker error: ${err.message}`));
      });

      worker.once('exit', (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Plugin worker exited unexpectedly with code ${code}`));
      });
    });
  }

  /**
   * Builds the env object injected into the worker.
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
