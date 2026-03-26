// ============================================================
// Tests pour installServerPlugin (Feature #08)
// Tests unitaires sans instancier DomOSServer
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { installServerPlugin } from '../src/plugins/installServerPlugin.js';
import type { DomOSServerPlugin } from '../src/plugins/plugin.types.js';
import type { ServerToolHandler } from '../src/core/ToolRouter.js';

// ============================================================
// FakeToolRouter — stub minimal de ToolRouter pour les tests
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
    if (!handler) throw new Error(`Tool "${name}" non trouvé`);
    return handler(args);
  }
}

// ============================================================
// Helpers
// ============================================================

function makePlugin<C = void>(
  name: string,
  setup: DomOSServerPlugin<C>['setup'],
): DomOSServerPlugin<C> {
  return {
    meta: { name, version: '1.0.0' },
    setup,
  };
}

// ============================================================
// Tests
// ============================================================

describe('installServerPlugin', () => {
  let router: FakeToolRouter;

  beforeEach(() => {
    router = new FakeToolRouter();
  });

  // --- Validation namespace ---

  describe('namespace validation', () => {
    it('lève une erreur si le namespace est invalide (pas de @scope)', () => {
      const plugin = makePlugin('stock-manager', () => {});
      expect(() =>
        installServerPlugin(router as never, plugin, undefined as never),
      ).toThrow('[DomOS ServerPlugin] Nom de plugin invalide');
    });

    it('lève une erreur si le namespace contient des majuscules', () => {
      const plugin = makePlugin('@Domos/Stock', () => {});
      expect(() =>
        installServerPlugin(router as never, plugin, undefined as never),
      ).toThrow('[DomOS ServerPlugin] Nom de plugin invalide');
    });

    it('accepte un namespace valide @scope/name', () => {
      const plugin = makePlugin('@domos/stock', () => {});
      expect(() =>
        installServerPlugin(router as never, plugin, undefined as never),
      ).not.toThrow();
    });

    it('accepte @domos-plugins/demo-crm', () => {
      const plugin = makePlugin('@domos-plugins/demo-crm', () => {});
      expect(() =>
        installServerPlugin(router as never, plugin, undefined as never),
      ).not.toThrow();
    });
  });

  // --- Enregistrement et auto-préfixage ---

  describe('registerTool', () => {
    it("préfixe le nom du tool avec le namespace du plugin", () => {
      const handler = vi.fn().mockResolvedValue({ ok: true });
      const plugin = makePlugin('@domos/stock', (ctx) => {
        ctx.registerTool('check_stock', handler);
      });

      installServerPlugin(router as never, plugin, undefined as never);

      expect(router.getRegisteredNames()).toContain('@domos/stock/check_stock');
      expect(router.getRegisteredNames()).not.toContain('check_stock');
    });

    it('enregistre plusieurs tools avec le bon préfixe', () => {
      const plugin = makePlugin('@acme/crm', (ctx) => {
        ctx.registerTool('search_contacts', vi.fn());
        ctx.registerTool('get_contact', vi.fn());
      });

      installServerPlugin(router as never, plugin, undefined as never);

      expect(router.getRegisteredNames()).toContain('@acme/crm/search_contacts');
      expect(router.getRegisteredNames()).toContain('@acme/crm/get_contact');
    });

    it('le handler est appelable après enregistrement', async () => {
      const handler = vi.fn().mockResolvedValue({ qty: 42 });
      const plugin = makePlugin('@domos/stock', (ctx) => {
        ctx.registerTool('check_stock', handler);
      });

      installServerPlugin(router as never, plugin, undefined as never);

      const result = await router.callTool('@domos/stock/check_stock', { productId: 'abc' });
      expect(result).toEqual({ qty: 42 });
      expect(handler).toHaveBeenCalledWith({ productId: 'abc' });
    });
  });

  // --- Collision ---

  describe('collision', () => {
    it("lève une erreur si deux plugins enregistrent le même tool préfixé", () => {
      router.registerServerTool('@domos/stock/check_stock', vi.fn());

      const plugin = makePlugin('@domos/stock', (ctx) => {
        ctx.registerTool('check_stock', vi.fn());
      });

      expect(() =>
        installServerPlugin(router as never, plugin, undefined as never),
      ).toThrow('@domos/stock/check_stock');
    });

    it('deux plugins avec des namespaces différents ne collisionnent pas', () => {
      const pluginA = makePlugin('@acme/stock', (ctx) => {
        ctx.registerTool('check', vi.fn());
      });
      const pluginB = makePlugin('@beta/stock', (ctx) => {
        ctx.registerTool('check', vi.fn());
      });

      expect(() => {
        installServerPlugin(router as never, pluginA, undefined as never);
        installServerPlugin(router as never, pluginB, undefined as never);
      }).not.toThrow();

      expect(router.getRegisteredNames()).toContain('@acme/stock/check');
      expect(router.getRegisteredNames()).toContain('@beta/stock/check');
    });
  });

  // --- Désinstallation ---

  describe('uninstall', () => {
    it('retourne une fonction de désinstallation', () => {
      const plugin = makePlugin('@domos/stock', () => {});
      const uninstall = installServerPlugin(router as never, plugin, undefined as never);
      expect(typeof uninstall).toBe('function');
    });

    it('uninstall retire exactement les tools du plugin', () => {
      // Enregistrer un tool hors plugin (doit survivre)
      router.registerServerTool('server/manual_tool', vi.fn());

      const plugin = makePlugin('@domos/stock', (ctx) => {
        ctx.registerTool('check_stock', vi.fn());
        ctx.registerTool('reserve_stock', vi.fn());
      });

      const uninstall = installServerPlugin(router as never, plugin, undefined as never);

      expect(router.hasServerTool('@domos/stock/check_stock')).toBe(true);
      expect(router.hasServerTool('@domos/stock/reserve_stock')).toBe(true);

      uninstall();

      expect(router.hasServerTool('@domos/stock/check_stock')).toBe(false);
      expect(router.hasServerTool('@domos/stock/reserve_stock')).toBe(false);
      // Le tool hors plugin doit survivre
      expect(router.hasServerTool('server/manual_tool')).toBe(true);
    });

    it("uninstall n'affecte pas les tools d'un autre plugin", () => {
      const pluginA = makePlugin('@acme/stock', (ctx) => {
        ctx.registerTool('check', vi.fn());
      });
      const pluginB = makePlugin('@beta/orders', (ctx) => {
        ctx.registerTool('list', vi.fn());
      });

      const uninstallA = installServerPlugin(router as never, pluginA, undefined as never);
      installServerPlugin(router as never, pluginB, undefined as never);

      uninstallA();

      expect(router.hasServerTool('@acme/stock/check')).toBe(false);
      expect(router.hasServerTool('@beta/orders/list')).toBe(true);
    });
  });

  // --- Config typée ---

  describe('config typed', () => {
    it('passe la config au setup du plugin', () => {
      const setupSpy = vi.fn();
      const plugin: DomOSServerPlugin<{ apiUrl: string }> = {
        meta: { name: '@domos/crm', version: '1.0.0' },
        setup: setupSpy,
      };

      installServerPlugin(router as never, plugin, { apiUrl: 'https://crm.example.com' });

      expect(setupSpy).toHaveBeenCalledWith(
        expect.objectContaining({ registerTool: expect.any(Function) }),
        { apiUrl: 'https://crm.example.com' },
      );
    });
  });

  // --- Setup async ---

  describe('async setup', () => {
    it('gère un setup async sans bloquer', async () => {
      const plugin: DomOSServerPlugin = {
        meta: { name: '@domos/async-plugin', version: '1.0.0' },
        setup: async (ctx) => {
          await Promise.resolve();
          ctx.registerTool('async_tool', vi.fn());
        },
      };

      // installServerPlugin ne doit pas throw (le setup async se résout après)
      expect(() =>
        installServerPlugin(router as never, plugin, undefined as never),
      ).not.toThrow();
    });
  });
});
