import { describe, it, expect, beforeEach } from 'vitest';
import { installServerPlugin } from '@owllayer/server';
import type { ServerToolHandler } from '@owllayer/server';
import { PromotionsPlugin, type PromotionsConfig } from '../index.js';

// ============================================================
// FakeToolRouter — minimal ToolRouter stub for tests
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

  async call(name: string, args: Record<string, unknown>): Promise<unknown> {
    const handler = this.tools.get(name);
    if (!handler) throw new Error(`Tool "${name}" not found`);
    return handler(args);
  }
}

// ============================================================
// Helpers
// ============================================================

const PLUGIN_NS = 'demo-promotions';

function toolName(short: string): string {
  return `${PLUGIN_NS}_${short}`;
}

// ============================================================
// Tests
// ============================================================

describe('PromotionsPlugin', () => {
  let router: FakeToolRouter;
  let uninstall: () => void;

  beforeEach(() => {
    router = new FakeToolRouter();
  });

  function install(config: PromotionsConfig = {}): void {
    uninstall = installServerPlugin(router as never, PromotionsPlugin, config);
  }

  // ----------------------------------------------------------
  // Installation
  // ----------------------------------------------------------

  describe('installation', () => {
    it('registers 3 tools under the plugin namespace', () => {
      install();
      expect(router.getRegisteredNames()).toContain(toolName('get_current_promotions'));
      expect(router.getRegisteredNames()).toContain(toolName('apply_promo_code'));
      expect(router.getRegisteredNames()).toContain(toolName('get_flash_sale'));
    });

    it('uninstall removes all tools', () => {
      install();
      uninstall();
      expect(router.getRegisteredNames()).toHaveLength(0);
    });
  });

  // ----------------------------------------------------------
  // get_current_promotions
  // ----------------------------------------------------------

  describe('get_current_promotions', () => {
    it('returns default promo codes when no config provided', async () => {
      install();
      const result = await router.call(toolName('get_current_promotions'), {}) as {
        promoCodes: { code: string }[];
        flashSale: { active: boolean };
      };
      expect(result.promoCodes.length).toBeGreaterThan(0);
      expect(result.promoCodes.map((c) => c.code)).toContain('BIENVENUE10');
      expect(result.flashSale.active).toBe(false);
    });

    it('returns custom promo codes from config', async () => {
      install({
        promoCodes: [
          { code: 'TEST10', discountPercent: 10, description: 'Test code' },
        ],
      });
      const result = await router.call(toolName('get_current_promotions'), {}) as {
        promoCodes: { code: string }[];
      };
      expect(result.promoCodes).toHaveLength(1);
      expect(result.promoCodes[0].code).toBe('TEST10');
    });

    it('excludes expired codes', async () => {
      install({
        promoCodes: [
          { code: 'EXPIRED', discountPercent: 10, expiresAt: Date.now() - 1000, description: 'Old' },
          { code: 'VALID', discountPercent: 5, description: 'Valid' },
        ],
      });
      const result = await router.call(toolName('get_current_promotions'), {}) as {
        promoCodes: { code: string }[];
      };
      expect(result.promoCodes.map((c) => c.code)).not.toContain('EXPIRED');
      expect(result.promoCodes.map((c) => c.code)).toContain('VALID');
    });

    it('returns active flash sale when within window', async () => {
      install({
        flashSale: {
          discountPercent: 30,
          label: 'Flash -30%',
          startsAt: Date.now() - 1000,
          endsAt: Date.now() + 60_000,
        },
      });
      const result = await router.call(toolName('get_current_promotions'), {}) as {
        flashSale: { active: boolean; discountPercent: number };
      };
      expect(result.flashSale.active).toBe(true);
      expect(result.flashSale.discountPercent).toBe(30);
    });
  });

  // ----------------------------------------------------------
  // apply_promo_code
  // ----------------------------------------------------------

  describe('apply_promo_code', () => {
    beforeEach(() => {
      install({
        promoCodes: [
          { code: 'SAVE10', discountPercent: 10, description: '10% off' },
          { code: 'BIG20', discountPercent: 20, minCartTotal: 100, description: '20% over €100' },
          { code: 'EXPIRED', discountPercent: 50, expiresAt: Date.now() - 1000, description: 'Old' },
        ],
      });
    });

    it('returns valid:true and correct amounts for a valid code', async () => {
      const result = await router.call(toolName('apply_promo_code'), {
        code: 'SAVE10',
        cartTotal: 80,
      }) as { valid: boolean; discountPercent: number; discountAmount: number; finalTotal: number };

      expect(result.valid).toBe(true);
      expect(result.discountPercent).toBe(10);
      expect(result.discountAmount).toBe(8);
      expect(result.finalTotal).toBe(72);
    });

    it('is case-insensitive', async () => {
      const result = await router.call(toolName('apply_promo_code'), {
        code: 'save10',
        cartTotal: 50,
      }) as { valid: boolean };
      expect(result.valid).toBe(true);
    });

    it('returns valid:false for unknown code', async () => {
      const result = await router.call(toolName('apply_promo_code'), {
        code: 'FAKE',
        cartTotal: 100,
      }) as { valid: boolean; message: string };
      expect(result.valid).toBe(false);
      expect(result.message).toMatch(/not recognised/i);
    });

    it('returns valid:false for expired code', async () => {
      const result = await router.call(toolName('apply_promo_code'), {
        code: 'EXPIRED',
        cartTotal: 100,
      }) as { valid: boolean; message: string };
      expect(result.valid).toBe(false);
      expect(result.message).toMatch(/expired/i);
    });

    it('returns valid:false when minCartTotal not reached', async () => {
      const result = await router.call(toolName('apply_promo_code'), {
        code: 'BIG20',
        cartTotal: 50,
      }) as { valid: boolean; message: string };
      expect(result.valid).toBe(false);
      expect(result.message).toMatch(/minimum/i);
    });

    it('applies correctly when minCartTotal is reached', async () => {
      const result = await router.call(toolName('apply_promo_code'), {
        code: 'BIG20',
        cartTotal: 150,
      }) as { valid: boolean; discountAmount: number; finalTotal: number };
      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(30);
      expect(result.finalTotal).toBe(120);
    });

    it('returns valid:false when no code provided', async () => {
      const result = await router.call(toolName('apply_promo_code'), {
        code: '',
        cartTotal: 100,
      }) as { valid: boolean };
      expect(result.valid).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // get_flash_sale
  // ----------------------------------------------------------

  describe('get_flash_sale', () => {
    it('returns active:false when no flash sale configured', async () => {
      install();
      const result = await router.call(toolName('get_flash_sale'), {}) as { active: boolean };
      expect(result.active).toBe(false);
    });

    it('returns active:false when flash sale has ended', async () => {
      install({
        flashSale: {
          discountPercent: 30,
          label: 'Past sale',
          startsAt: Date.now() - 10_000,
          endsAt: Date.now() - 1_000,
        },
      });
      const result = await router.call(toolName('get_flash_sale'), {}) as { active: boolean };
      expect(result.active).toBe(false);
    });

    it('returns active:true with full details during active window', async () => {
      install({
        flashSale: {
          discountPercent: 25,
          label: 'Flash -25%',
          startsAt: Date.now() - 1_000,
          endsAt: Date.now() + 60_000,
        },
      });
      const result = await router.call(toolName('get_flash_sale'), {}) as {
        active: boolean;
        discountPercent: number;
        remainingMs: number;
      };
      expect(result.active).toBe(true);
      expect(result.discountPercent).toBe(25);
      expect(result.remainingMs).toBeGreaterThan(0);
    });
  });
});
