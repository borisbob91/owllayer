// ============================================================
// Integration tests for installServerPlugin with PluginRuntimeOptions
// (Feature #09)
// ============================================================

import { describe, it, expect } from 'vitest';
import { installServerPlugin } from '../src/plugins/installServerPlugin.js';
import type { OwlLayerServerPlugin } from '../src/plugins/plugin.types.js';
import type { ServerToolHandler } from '../src/core/ToolRouter.js';

// ============================================================
// FakeToolRouter — minimal ToolRouter stub
// ============================================================

class FakeToolRouter {
  private tools = new Map<string, ServerToolHandler>();

  registerServerTool(name: string, handler: ServerToolHandler): void {
    this.tools.set(name, handler);
  }

  hasServerTool(name: string): boolean {
    return this.tools.has(name);
  }

  unregisterServerTool(name: string): void {
    this.tools.delete(name);
  }

  getRegisteredNames(): string[] {
    return Array.from(this.tools.keys());
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const handler = this.tools.get(name);
    if (!handler) throw new Error(`Tool "${name}" not found`);
    return handler(args);
  }
}

// ============================================================
// Test fixtures
// ============================================================

const EchoPlugin: OwlLayerServerPlugin<void> = {
  meta: { name: '@test/echo', version: '1.0.0' },
  setup(ctx) {
    ctx.registerTool('echo', async ({ message }) => ({ message }));
  },
};

const EchoPluginWithCapabilities: OwlLayerServerPlugin<void> = {
  meta: {
    name: '@test/echo-caps',
    version: '1.0.0',
    capabilities: {
      network: { allowDomains: ['api.example.com'] },
      env: { allowKeys: ['ECHO_API_KEY'] },
    },
  },
  setup(ctx) {
    ctx.registerTool('echo', async ({ message }) => ({ message }));
  },
};

// ============================================================
// Tests
// ============================================================

describe('installServerPlugin with PluginRuntimeOptions', () => {
  describe('trusted mode (default)', () => {
    it('installs without options — backward compatible', () => {
      const router = new FakeToolRouter();
      const uninstall = installServerPlugin(router, EchoPlugin, undefined);

      expect(router.getRegisteredNames()).toContain('echo_echo');
      uninstall();
      expect(router.getRegisteredNames()).not.toContain('echo_echo');
    });

    it('installs with explicit mode: trusted', () => {
      const router = new FakeToolRouter();
      const uninstall = installServerPlugin(router, EchoPlugin, undefined, { mode: 'trusted' });

      expect(router.getRegisteredNames()).toContain('echo_echo');
      uninstall();
    });

    it('executes the tool handler in-process', async () => {
      const router = new FakeToolRouter();
      installServerPlugin(router, EchoPlugin, undefined);

      const result = await router.callTool('echo_echo', { message: 'hello' });
      expect(result).toEqual({ message: 'hello' });
    });
  });

  describe('untrusted mode (worker_threads)', () => {
    it('registers tools when mode is untrusted', () => {
      const router = new FakeToolRouter();
      const uninstall = installServerPlugin(router, EchoPluginWithCapabilities, undefined, {
        mode: 'untrusted',
      });

      expect(router.getRegisteredNames()).toContain('echo-caps_echo');
      uninstall();
    });

    it('executes the tool handler in a worker and returns result', async () => {
      const router = new FakeToolRouter();
      installServerPlugin(router, EchoPluginWithCapabilities, undefined, {
        mode: 'untrusted',
        timeoutMs: 5000,
      });

      const result = await router.callTool('echo-caps_echo', { message: 'from worker' });
      expect(result).toEqual({ message: 'from worker' });
    });

    it('uninstalls cleanly in untrusted mode', () => {
      const router = new FakeToolRouter();
      const uninstall = installServerPlugin(router, EchoPluginWithCapabilities, undefined, {
        mode: 'untrusted',
      });

      expect(router.getRegisteredNames()).toContain('echo-caps_echo');
      uninstall();
      expect(router.getRegisteredNames()).not.toContain('echo-caps_echo');
    });
  });

  describe('namespace validation', () => {
    it('throws on invalid plugin name', () => {
      const router = new FakeToolRouter();
      const badPlugin: OwlLayerServerPlugin<void> = {
        meta: { name: 'no-scope', version: '1.0.0' },
        setup() {},
      };
      expect(() => installServerPlugin(router, badPlugin, undefined)).toThrow(
        /Invalid plugin name/,
      );
    });
  });
});
