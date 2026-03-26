// ============================================================
// Tests for WorkerExecutor (Feature #09)
// ============================================================

import { describe, it, expect } from 'vitest';
import { WorkerExecutor } from '../src/runtime/WorkerExecutor.js';

describe('WorkerExecutor', () => {
  describe('successful execution', () => {
    it('executes a simple handler and returns the result', async () => {
      const executor = new WorkerExecutor({ capabilities: {} });
      const handler = async (args: Record<string, unknown>) => {
        return { echo: args['input'] };
      };

      const result = await executor.execute(handler, { input: 'hello' });
      expect(result).toEqual({ echo: 'hello' });
    });

    it('handles async handlers', async () => {
      const executor = new WorkerExecutor({ capabilities: {} });
      const handler = async () => {
        return new Promise((resolve) => setTimeout(() => resolve('done'), 10));
      };

      const result = await executor.execute(handler, {});
      expect(result).toBe('done');
    });
  });

  describe('error handling', () => {
    it('rejects when the handler throws', async () => {
      const executor = new WorkerExecutor({ capabilities: {} });
      const handler = async () => {
        throw new Error('handler failure');
      };

      await expect(executor.execute(handler, {})).rejects.toThrow('handler failure');
    });

    it('does not affect subsequent executions after a handler failure', async () => {
      const executor = new WorkerExecutor({ capabilities: {} });

      const failing = async () => { throw new Error('boom'); };
      const ok = async () => 42;

      await expect(executor.execute(failing, {})).rejects.toThrow();
      const result = await executor.execute(ok, {});
      expect(result).toBe(42);
    });
  });

  describe('timeout', () => {
    it('rejects when the handler exceeds timeoutMs', async () => {
      const executor = new WorkerExecutor({ capabilities: {}, timeoutMs: 100 });
      const handler = async () => {
        return new Promise((resolve) => setTimeout(resolve, 5000));
      };

      await expect(executor.execute(handler, {})).rejects.toThrow(/timed out/i);
    }, 3000);
  });

  describe('env filtering', () => {
    it('filters process.env to only allowKeys in the worker', async () => {
      process.env['_TEST_ALLOWED'] = 'yes';
      process.env['_TEST_BLOCKED'] = 'secret';

      const executor = new WorkerExecutor({
        capabilities: { env: { allowKeys: ['_TEST_ALLOWED'] } },
      });

      const handler = async () => ({
        allowed: process.env['_TEST_ALLOWED'],
        blocked: process.env['_TEST_BLOCKED'],
      });

      const result = await executor.execute(handler, {}) as Record<string, unknown>;
      expect(result['allowed']).toBe('yes');
      expect(result['blocked']).toBeUndefined();

      delete process.env['_TEST_ALLOWED'];
      delete process.env['_TEST_BLOCKED'];
    });

    it('injects no env when allowKeys is empty', async () => {
      process.env['_TEST_SECRET'] = 'should-not-leak';

      const executor = new WorkerExecutor({
        capabilities: { env: { allowKeys: [] } },
      });

      const handler = async () => process.env['_TEST_SECRET'];
      const result = await executor.execute(handler, {});
      expect(result).toBeUndefined();

      delete process.env['_TEST_SECRET'];
    });
  });
});
