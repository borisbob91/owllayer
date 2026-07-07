import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assertNamespace, installPlugin } from '../src/index.js';
import type { DomOSClientPlugin, PluginClientContext } from '../src/index.js';
import type { DomOSClient, PluginMeta, RegisteredTool } from '../src/index.js';

// ============================================================
// Minimal DomOSClient stub — no WebSocket, no network
// ============================================================

class FakeClient {
  private _tools = new Map<string, RegisteredTool>();
  private _ctx: Record<string, unknown> = {};

  registerTool(tool: RegisteredTool): void {
    this._tools.set(tool.declaration.name, tool);
  }

  unregisterTool(name: string): void {
    this._tools.delete(name);
  }

  unregisterToolsByComponent(componentId: string): void {
    for (const [name, tool] of this._tools) {
      if (tool.componentId === componentId) this._tools.delete(name);
    }
  }

  hasTool(name: string): boolean {
    return this._tools.has(name);
  }

  updateContext(data: Record<string, unknown>): void {
    this._ctx = { ...this._ctx, ...data };
  }

  getContext(): Record<string, unknown> {
    return { ...this._ctx };
  }

  // Test helpers not on DomOSClient
  getTool(name: string): RegisteredTool | undefined {
    return this._tools.get(name);
  }

  toolCount(): number {
    return this._tools.size;
  }
}

class TrackingFakeClient extends FakeClient {
  trackedPlugins: PluginMeta[] = [];

  trackPlugin(meta: PluginMeta): void {
    this.trackedPlugins.push(meta);
  }
}

function makeClient(): { client: DomOSClient; fake: FakeClient } {
  const fake = new FakeClient();
  return { client: fake as unknown as DomOSClient, fake };
}

// ============================================================
// assertNamespace
// ============================================================

describe('assertNamespace', () => {
  it('accepts valid @scope/name formats', () => {
    expect(() => assertNamespace('@domos/shopify')).not.toThrow();
    expect(() => assertNamespace('@acme/crm')).not.toThrow();
    expect(() => assertNamespace('@a/b')).not.toThrow();
    expect(() => assertNamespace('@my-scope/my-plugin')).not.toThrow();
    expect(() => assertNamespace('@domos-plugins/demo-crm')).not.toThrow();
  });

  it('throws when missing @ prefix', () => {
    expect(() => assertNamespace('shopify')).toThrow();
    expect(() => assertNamespace('domos/shopify')).toThrow();
  });

  it('throws on uppercase letters in scope', () => {
    expect(() => assertNamespace('@Domos/shopify')).toThrow();
  });

  it('throws on uppercase letters in name segment', () => {
    expect(() => assertNamespace('@domos/My-Plugin')).toThrow();
    expect(() => assertNamespace('@domos/TOOLS')).toThrow();
  });

  it('throws when scope segment is empty (@/name)', () => {
    expect(() => assertNamespace('@/shopify')).toThrow();
  });

  it('throws with extra path segment (@scope/name/extra)', () => {
    expect(() => assertNamespace('@acme/crm/tools')).toThrow();
  });

  it('throws on empty string', () => {
    expect(() => assertNamespace('')).toThrow();
  });
});

// ============================================================
// installPlugin — tool registration
// ============================================================

describe('installPlugin — tool registration', () => {
  let client: DomOSClient;
  let fake: FakeClient;

  beforeEach(() => {
    ({ client, fake } = makeClient());
  });

  it('auto-prefixes tool name with plugin namespace', () => {
    const plugin: DomOSClientPlugin<void> = {
      meta: { name: '@acme/crm', version: '1.0.0' },
      setup(ctx) {
        ctx.registerTool('search', { description: 'Search', handler: async () => [] });
      },
    };

    installPlugin(client, plugin, undefined as void);

    expect(fake.hasTool('crm_search')).toBe(true);
    expect(fake.hasTool('search')).toBe(false); // raw unprefixed name must NOT exist
  });

  it('registers all tools with correct prefix', () => {
    const plugin: DomOSClientPlugin<void> = {
      meta: { name: '@acme/crm', version: '1.0.0' },
      setup(ctx) {
        ctx.registerTool('search', { description: 'Search', handler: async () => [] });
        ctx.registerTool('get', { description: 'Get', handler: async () => null });
        ctx.registerTool('delete', { description: 'Delete', handler: async () => null });
      },
    };

    installPlugin(client, plugin, undefined as void);

    expect(fake.toolCount()).toBe(3);
    expect(fake.hasTool('crm_search')).toBe(true);
    expect(fake.hasTool('crm_get')).toBe(true);
    expect(fake.hasTool('crm_delete')).toBe(true);
  });

  it('tool handler is callable and returns the correct value', async () => {
    const plugin: DomOSClientPlugin<void> = {
      meta: { name: '@acme/crm', version: '1.0.0' },
      setup(ctx) {
        ctx.registerTool('ping', {
          description: 'Echo args back',
          handler: async ({ msg }) => ({ pong: msg }),
        });
      },
    };

    installPlugin(client, plugin, undefined as void);

    const tool = fake.getTool('crm_ping')!
    expect(tool).toBeDefined();
    const result = await tool.handler({ msg: 'hello' });
    expect(result).toEqual({ pong: 'hello' });
  });

  it('throws on tool name collision (same prefixed name already exists)', () => {
    const plugin: DomOSClientPlugin<void> = {
      meta: { name: '@acme/crm', version: '1.0.0' },
      setup(ctx) {
        ctx.registerTool('search', { description: 'Search', handler: async () => [] });
      },
    };

    installPlugin(client, plugin, undefined as void); // first install — OK

    // Second install: crm_search already registered → collision
    expect(() => installPlugin(client, plugin, undefined as void)).toThrow('crm_search');
  });

  it('passes typed config through to setup()', () => {
    interface CfgType { apiUrl: string }
    let received: CfgType | null = null;

    const plugin: DomOSClientPlugin<CfgType> = {
      meta: { name: '@acme/cfg', version: '1.0.0' },
      setup(_ctx, config) { received = config; },
    };

    installPlugin(client, plugin, { apiUrl: 'https://crm.acme.com' });
    expect(received).toEqual({ apiUrl: 'https://crm.acme.com' });
  });

  it('tracks plugin metadata when the client supports plugin tracking', () => {
    const fake = new TrackingFakeClient();
    const trackingClient = fake as unknown as DomOSClient;
    const plugin: DomOSClientPlugin<void> = {
      meta: { name: '@acme/tracked', version: '1.2.3', description: 'Tracked plugin' },
      setup() {},
    };

    installPlugin(trackingClient, plugin, undefined as void);

    expect(fake.trackedPlugins).toEqual([plugin.meta]);
  });
});

// ============================================================
// installPlugin — PluginClientContext
// ============================================================

describe('installPlugin — PluginClientContext', () => {
  it('ctx.updateContext merges data into the client context', () => {
    const { client, fake } = makeClient();
    const plugin: DomOSClientPlugin<void> = {
      meta: { name: '@acme/ctx', version: '1.0.0' },
      setup(ctx) {
        ctx.updateContext({ crm: { tenantId: 'acme-1' } });
      },
    };

    installPlugin(client, plugin, undefined as void);

    expect(fake.getContext()).toEqual({ crm: { tenantId: 'acme-1' } });
  });

  it('ctx.getContext returns a shallow copy, not the live reference', () => {
    const { client } = makeClient();
    let savedCtx!: PluginClientContext;

    const plugin: DomOSClientPlugin<void> = {
      meta: { name: '@acme/ctxcopy', version: '1.0.0' },
      setup(ctx) {
        savedCtx = ctx;
        ctx.updateContext({ stable: 'yes' });
      },
    };

    installPlugin(client, plugin, undefined as void);

    const snapshot = savedCtx.getContext() as Record<string, unknown>;
    snapshot.injected = true; // mutate the returned object

    // A fresh call must not carry the mutation
    expect(savedCtx.getContext()).not.toHaveProperty('injected');
    expect(savedCtx.getContext()).toHaveProperty('stable', 'yes');
  });
});

// ============================================================
// installPlugin — uninstall()
// ============================================================

describe('installPlugin — uninstall()', () => {
  it('removes all tools registered by this plugin', () => {
    const { client, fake } = makeClient();
    let savedCtx!: PluginClientContext;

    const plugin: DomOSClientPlugin<void> = {
      meta: { name: '@acme/uninstall', version: '1.0.0' },
      setup(ctx) {
        savedCtx = ctx;
        ctx.registerTool('t1', { description: 'T1', handler: async () => null });
        ctx.registerTool('t2', { description: 'T2', handler: async () => null });
      },
    };

    installPlugin(client, plugin, undefined as void);
    expect(fake.toolCount()).toBe(2);

    savedCtx.uninstall();
    expect(fake.toolCount()).toBe(0);
  });

  it('does not remove tools belonging to a different plugin', () => {
    const { client, fake } = makeClient();
    let ctxA!: PluginClientContext;

    const pluginA: DomOSClientPlugin<void> = {
      meta: { name: '@acme/a', version: '1.0.0' },
      setup(ctx) {
        ctxA = ctx;
        ctx.registerTool('tool', { description: 'Tool A', handler: async () => null });
      },
    };
    const pluginB: DomOSClientPlugin<void> = {
      meta: { name: '@acme/b', version: '1.0.0' },
      setup(ctx) {
        ctx.registerTool('tool', { description: 'Tool B', handler: async () => null });
      },
    };

    installPlugin(client, pluginA, undefined as void);
    installPlugin(client, pluginB, undefined as void);
    expect(fake.toolCount()).toBe(2);

    ctxA.uninstall(); // removes only a_tool

    expect(fake.toolCount()).toBe(1);
    expect(fake.hasTool('b_tool')).toBe(true);
    expect(fake.hasTool('a_tool')).toBe(false);
  });

  it('allows reinstalling the same plugin after uninstall (no collision)', () => {
    const { client, fake } = makeClient();
    let savedCtx!: PluginClientContext;

    const plugin: DomOSClientPlugin<void> = {
      meta: { name: '@acme/reinstall', version: '1.0.0' },
      setup(ctx) {
        savedCtx = ctx;
        ctx.registerTool('tool', { description: 'Tool', handler: async () => null });
      },
    };

    installPlugin(client, plugin, undefined as void);
    savedCtx.uninstall();

    // Re-install: reinstall_tool was removed — no collision
    expect(() => installPlugin(client, plugin, undefined as void)).not.toThrow();
    expect(fake.hasTool('reinstall_tool')).toBe(true);
  });
});

// ============================================================
// installPlugin — namespace validation at install time
// ============================================================

describe('installPlugin — namespace validation at install time', () => {
  it('throws before calling setup() when meta.name has no @ prefix', () => {
    const { client } = makeClient();
    const setup = vi.fn();
    const plugin: DomOSClientPlugin<void> = {
      meta: { name: 'bad-plugin-name', version: '1.0.0' },
      setup,
    };

    expect(() => installPlugin(client, plugin, undefined as void)).toThrow();
    expect(setup).not.toHaveBeenCalled();
  });

  it('throws before calling setup() when meta.name has uppercase', () => {
    const { client } = makeClient();
    const setup = vi.fn();
    const plugin: DomOSClientPlugin<void> = {
      meta: { name: '@Acme/CRM', version: '1.0.0' },
      setup,
    };

    expect(() => installPlugin(client, plugin, undefined as void)).toThrow();
    expect(setup).not.toHaveBeenCalled();
  });

  it('does not throw synchronously when async setup() rejects', async () => {
    const { client } = makeClient();
    const plugin: DomOSClientPlugin<void> = {
      meta: { name: '@acme/asyncerr', version: '1.0.0' },
      setup: async () => {
        throw new Error('Simulated async setup failure');
      },
    };

    // Synchronous call must not throw — the error is caught and logged internally
    expect(() => installPlugin(client, plugin, undefined as void)).not.toThrow();

    // Allow the rejected microtask to settle
    await Promise.resolve();
  });
});
