import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerCheckoutTools } from '../tools/CheckoutTools.js';
import type { OwlLayerShopifyConfig } from '../types.js';

const config: OwlLayerShopifyConfig = { apiKey: 'test-key' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMockOwlLayer() {
  const tools: Record<string, { handler: (args: Record<string, unknown>) => unknown }> = {};
  return {
    registerTool: vi.fn((name: string, def: { handler: (a: Record<string, unknown>) => unknown }) => {
      tools[name] = def;
    }),
    getHandler: (name: string) => tools[name]?.handler,
  };
}

function mockLocation() {
  let capturedHref = '';
  Object.defineProperty(window, 'location', {
    value: { href: '' },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window.location, 'href', {
    set: (v: string) => { capturedHref = v; },
    get: () => capturedHref,
    configurable: true,
  });
  return { getCaptured: () => capturedHref };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('registerCheckoutTools', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if ('Shopify' in window) delete (window as Window & { Shopify?: unknown }).Shopify;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('enregistre initiate_checkout et apply_discount', () => {
    const owllayer = makeMockOwlLayer();
    registerCheckoutTools(owllayer, config);

    const names = owllayer.registerTool.mock.calls.map(([n]) => n as string);
    expect(names).toContain('initiate_checkout');
    expect(names).toContain('apply_discount');
  });

  // ── initiate_checkout ────────────────────────────────────────────────────────

  describe('initiate_checkout', () => {
    it('redirige vers /checkout si le panier est non vide', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ item_count: 2 }),
      }));
      const loc = mockLocation();

      const owllayer = makeMockOwlLayer();
      registerCheckoutTools(owllayer, config);

      const result = (await owllayer.getHandler('initiate_checkout')!({})) as {
        success: boolean;
        redirecting: boolean;
      };

      expect(result.success).toBe(true);
      expect(result.redirecting).toBe(true);
      expect(loc.getCaptured()).toContain('/checkout');
    });

    it("retourne success: false si le panier est vide", async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ item_count: 0 }),
      }));

      const owllayer = makeMockOwlLayer();
      registerCheckoutTools(owllayer, config);

      const result = (await owllayer.getHandler('initiate_checkout')!({})) as {
        success: boolean;
        error: string;
      };

      expect(result.success).toBe(false);
      expect(result.error).toContain('vide');
    });

    it('retourne success: false si la requête cart.js échoue', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));

      const owllayer = makeMockOwlLayer();
      registerCheckoutTools(owllayer, config);

      const result = (await owllayer.getHandler('initiate_checkout')!({})) as { success: boolean };
      expect(result.success).toBe(false);
    });

    it('utilise routes.root pour le checkout locale-aware', async () => {
      (window as Window & { Shopify?: unknown }).Shopify = { routes: { root: '/fr/' } };
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ item_count: 1 }),
      }));
      const loc = mockLocation();

      const owllayer = makeMockOwlLayer();
      registerCheckoutTools(owllayer, config);
      await owllayer.getHandler('initiate_checkout')!({});

      expect(loc.getCaptured()).toBe('/fr/checkout');
    });

    it('a risk: high (HITL)', () => {
      const owllayer = makeMockOwlLayer();
      registerCheckoutTools(owllayer, config);

      const call = owllayer.registerTool.mock.calls.find(([n]) => n === 'initiate_checkout');
      expect((call?.[1] as Record<string, unknown>)?.risk).toBe('high');
    });
  });

  // ── apply_discount ───────────────────────────────────────────────────────────

  describe('apply_discount', () => {
    it('redirige vers /checkout?discount=CODE', () => {
      const loc = mockLocation();

      const owllayer = makeMockOwlLayer();
      registerCheckoutTools(owllayer, config);

      const result = owllayer.getHandler('apply_discount')!({ code: 'SUMMER20' }) as {
        success: boolean;
        code: string;
        url: string;
      };

      expect(result.success).toBe(true);
      expect(result.code).toBe('SUMMER20');
      expect(result.url).toContain('discount=SUMMER20');
      expect(loc.getCaptured()).toContain('discount=SUMMER20');
    });

    it('normalise le code en majuscules', () => {
      mockLocation();

      const owllayer = makeMockOwlLayer();
      registerCheckoutTools(owllayer, config);

      const result = owllayer.getHandler('apply_discount')!({ code: 'bienvenue10' }) as { code: string };
      expect(result.code).toBe('BIENVENUE10');
    });

    it('encode les caractères spéciaux dans le code promo', () => {
      const loc = mockLocation();

      const owllayer = makeMockOwlLayer();
      registerCheckoutTools(owllayer, config);

      owllayer.getHandler('apply_discount')!({ code: 'FÊTE&ÉTÉ' });
      expect(loc.getCaptured()).toContain('discount=');
      expect(loc.getCaptured()).not.toContain('&');
    });

    it('utilise routes.root pour apply_discount locale-aware', () => {
      (window as Window & { Shopify?: unknown }).Shopify = { routes: { root: '/de/' } };
      const loc = mockLocation();

      const owllayer = makeMockOwlLayer();
      registerCheckoutTools(owllayer, config);

      owllayer.getHandler('apply_discount')!({ code: 'TEST' });
      expect(loc.getCaptured()).toContain('/de/checkout');
    });

    it('retourne success: false pour un code vide', () => {
      const owllayer = makeMockOwlLayer();
      registerCheckoutTools(owllayer, config);

      const result = owllayer.getHandler('apply_discount')!({ code: '   ' }) as { success: boolean };
      expect(result.success).toBe(false);
    });
  });
});
