// Sprint 2 — Unit tests for CartTools
// Covers: add_to_cart, update_cart_item, remove_cart_item, get_cart, apply_coupon, remove_coupon
// Sprint 4 fix: apply_coupon → POST /cart/coupons, remove_coupon → DELETE /cart/coupons/{code}

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerCartTools } from '../tools/CartTools.js';
import type { StoreApiClient } from '../api/StoreApiClient.js';
import type { CartContextSync } from '../context/CartContextSync.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ITEMS = [
  {
    key: 'abc123456789012345678901234567ab',
    id: 42,
    title: 'T-Shirt Rouge',
    qty: 2,
    unitPrice: '19.99 EUR',
    lineTotal: '39.98 EUR',
  },
];

function makeDomosMock(cartItems = ITEMS) {
  return {
    registerTool: vi.fn(),
    getContext: vi.fn().mockReturnValue({
      cart: {
        isEmpty: false,
        itemCount: 2,
        total: '39.98 EUR',
        productIds: ['42'],
        items: cartItems,
      },
    }),
  };
}

function makeApiMock(overrides: Partial<{
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
}> = {}): StoreApiClient {
  return {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    del: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as StoreApiClient;
}

function makeSyncMock(): CartContextSync {
  return { _fetchAndEmit: vi.fn().mockResolvedValue(undefined) } as unknown as CartContextSync;
}

/** Extract a registered tool handler by name from the domos mock */
function getHandler(domos: ReturnType<typeof makeDomosMock>, name: string) {
  const call = domos.registerTool.mock.calls.find(c => c[0] === name);
  if (!call) throw new Error(`Tool "${name}" was not registered`);
  return call[1].handler as (params: Record<string, unknown>) => Promise<unknown>;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('registerCartTools', () => {
  let domos: ReturnType<typeof makeDomosMock>;
  let api: StoreApiClient;
  let sync: CartContextSync;

  beforeEach(() => {
    domos = makeDomosMock();
    api = makeApiMock();
    sync = makeSyncMock();
    registerCartTools(domos, api, sync);
  });

  it('enregistre les 6 tools', () => {
    const names = domos.registerTool.mock.calls.map(c => c[0] as string);
    expect(names).toContain('add_to_cart');
    expect(names).toContain('update_cart_item');
    expect(names).toContain('remove_cart_item');
    expect(names).toContain('get_cart');
    expect(names).toContain('apply_coupon');
    expect(names).toContain('remove_coupon');
  });

  // ── add_to_cart ──────────────────────────────────────────────────────────

  describe('add_to_cart', () => {
    it('appelle POST /cart/add-item avec id et quantity', async () => {
      const handler = getHandler(domos, 'add_to_cart');
      await handler({ productId: 42, quantity: 1 });
      expect(api.post).toHaveBeenCalledWith('/cart/add-item', { id: 42, quantity: 1 });
    });

    it('inclut variation si fournie', async () => {
      const handler = getHandler(domos, 'add_to_cart');
      const variation = [{ attribute: 'pa_color', value: 'blue' }];
      await handler({ productId: 42, quantity: 1, variation });
      expect(api.post).toHaveBeenCalledWith('/cart/add-item', { id: 42, quantity: 1, variation });
    });

    it('ne passe pas variation si absent', async () => {
      const handler = getHandler(domos, 'add_to_cart');
      await handler({ productId: 42, quantity: 2 });
      const body = (api.post as ReturnType<typeof vi.fn>).mock.calls[0][1] as Record<string, unknown>;
      expect(body).not.toHaveProperty('variation');
    });

    it('appelle _fetchAndEmit() après la mutation', async () => {
      const handler = getHandler(domos, 'add_to_cart');
      await handler({ productId: 42, quantity: 1 });
      expect(sync._fetchAndEmit).toHaveBeenCalled();
    });

    it('retourne success: true', async () => {
      const handler = getHandler(domos, 'add_to_cart');
      const result = await handler({ productId: 42, quantity: 1 }) as Record<string, unknown>;
      expect(result.success).toBe(true);
    });

    it('propage l\'erreur hors stock via le message WooCommerce', async () => {
      const api2 = makeApiMock({
        post: vi.fn().mockRejectedValue(new Error('Product is out of stock.')),
      });
      const domos2 = makeDomosMock();
      const sync2 = makeSyncMock();
      registerCartTools(domos2, api2, sync2);
      const handler = getHandler(domos2, 'add_to_cart');
      await expect(handler({ productId: 99, quantity: 1 })).rejects.toThrow('out of stock');
    });
  });

  // ── update_cart_item ─────────────────────────────────────────────────────

  describe('update_cart_item', () => {
    it('appelle PUT /cart/items/{key} avec la quantité', async () => {
      const handler = getHandler(domos, 'update_cart_item');
      await handler({ key: 'abc123456789012345678901234567ab', qty: 5 });
      expect(api.put).toHaveBeenCalledWith('/cart/items/abc123456789012345678901234567ab', { quantity: 5 });
    });

    it('résout la clé depuis productId via contexte DomOS', async () => {
      const handler = getHandler(domos, 'update_cart_item');
      await handler({ productId: 42, qty: 3 });
      expect(api.put).toHaveBeenCalledWith(
        '/cart/items/abc123456789012345678901234567ab',
        { quantity: 3 },
      );
    });

    it('retourne erreur si productId introuvable dans le panier', async () => {
      const handler = getHandler(domos, 'update_cart_item');
      const result = await handler({ productId: 999, qty: 1 }) as Record<string, unknown>;
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('appelle _fetchAndEmit() après la mutation', async () => {
      const handler = getHandler(domos, 'update_cart_item');
      await handler({ key: 'abc123456789012345678901234567ab', qty: 1 });
      expect(sync._fetchAndEmit).toHaveBeenCalled();
    });
  });

  // ── remove_cart_item ─────────────────────────────────────────────────────

  describe('remove_cart_item', () => {
    it('appelle DELETE /cart/items/{key} avec la clé', async () => {
      const handler = getHandler(domos, 'remove_cart_item');
      await handler({ key: 'abc123456789012345678901234567ab' });
      expect(api.del).toHaveBeenCalledWith('/cart/items/abc123456789012345678901234567ab');
    });

    it('résout la clé depuis productId', async () => {
      const handler = getHandler(domos, 'remove_cart_item');
      await handler({ productId: 42 });
      expect(api.del).toHaveBeenCalledWith('/cart/items/abc123456789012345678901234567ab');
    });

    it('retourne erreur si article introuvable', async () => {
      const handler = getHandler(domos, 'remove_cart_item');
      const result = await handler({ productId: 999 }) as Record<string, unknown>;
      expect(result.success).toBe(false);
    });

    it('appelle _fetchAndEmit() après la suppression', async () => {
      const handler = getHandler(domos, 'remove_cart_item');
      await handler({ key: 'abc123456789012345678901234567ab' });
      expect(sync._fetchAndEmit).toHaveBeenCalled();
    });
  });

  // ── get_cart ─────────────────────────────────────────────────────────────

  describe('get_cart', () => {
    it('appelle _fetchAndEmit() puis retourne le contexte cart', async () => {
      const handler = getHandler(domos, 'get_cart');
      const result = await handler({}) as Record<string, unknown>;
      expect(sync._fetchAndEmit).toHaveBeenCalled();
      expect(result).toHaveProperty('itemCount');
      expect(result).toHaveProperty('items');
    });

    it('retourne panier vide par défaut si contexte absent', async () => {
      const domos2 = { registerTool: vi.fn(), getContext: vi.fn().mockReturnValue({}) };
      const sync2 = makeSyncMock();
      registerCartTools(domos2, api, sync2);
      const handler = getHandler(domos2 as ReturnType<typeof makeDomosMock>, 'get_cart');
      const result = await handler({}) as Record<string, unknown>;
      expect(result.isEmpty).toBe(true);
      expect(result.itemCount).toBe(0);
    });
  });

  // ── apply_coupon ─────────────────────────────────────────────────────────

  describe('apply_coupon', () => {
    it('appelle POST /cart/coupons avec body { code }', async () => {
      const handler = getHandler(domos, 'apply_coupon');
      await handler({ code: 'PROMO20' });
      expect(api.post).toHaveBeenCalledWith('/cart/coupons', { code: 'PROMO20' });
    });

    it('retourne success: true avec le code et la remise', async () => {
      const couponCart = {
        coupons: [{
          code: 'promo20',
          totals: { total_discount: '1000', currency_code: 'EUR' },
        }],
      };
      const api2 = makeApiMock({ post: vi.fn().mockResolvedValue(couponCart) });
      const sync2 = makeSyncMock();
      const domos2 = makeDomosMock();
      registerCartTools(domos2, api2, sync2);
      const handler = getHandler(domos2, 'apply_coupon');
      const result = await handler({ code: 'PROMO20' }) as Record<string, unknown>;
      expect(result.success).toBe(true);
      expect(result.code).toBe('PROMO20');
      expect(result.discount).toBe('10.00 EUR');
    });

    it('appelle _fetchAndEmit() après application', async () => {
      const handler = getHandler(domos, 'apply_coupon');
      await handler({ code: 'TEST10' });
      expect(sync._fetchAndEmit).toHaveBeenCalled();
    });
  });

  // ── remove_coupon ─────────────────────────────────────────────────────────

  describe('remove_coupon', () => {
    it('appelle DELETE /cart/coupons/{code}', async () => {
      const handler = getHandler(domos, 'remove_coupon');
      await handler({ code: 'PROMO20' });
      expect(api.del).toHaveBeenCalledWith('/cart/coupons/PROMO20');
    });

    it('retourne success: true', async () => {
      const handler = getHandler(domos, 'remove_coupon');
      const result = await handler({ code: 'PROMO20' }) as Record<string, unknown>;
      expect(result.success).toBe(true);
    });

    it('appelle _fetchAndEmit() après suppression', async () => {
      const handler = getHandler(domos, 'remove_coupon');
      await handler({ code: 'PROMO20' });
      expect(sync._fetchAndEmit).toHaveBeenCalled();
    });
  });
});
