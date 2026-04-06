import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CartContextSync, buildCartContext } from '../context/CartContextSync.js';
import type { ShopifyCart } from '../types.js';

const mockCart: ShopifyCart = {
  token: 'abc123',
  item_count: 2,
  total_price: 9998,
  currency: 'EUR',
  items: [
    { id: 111, variant_id: 111, product_id: 222, title: 'Red T-Shirt - L', quantity: 1, price: 4999, handle: 'red-t-shirt' },
    { id: 333, variant_id: 333, product_id: 444, title: 'Blue Jeans - M', quantity: 1, price: 4999, handle: 'blue-jeans' },
  ],
};

function makeFetchMock(cart: ShopifyCart = mockCart) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue(cart),
  });
}

describe('buildCartContext()', () => {
  it('construit le format DomOS correct', () => {
    const ctx = buildCartContext(mockCart);
    const cart = ctx.cart as Record<string, unknown>;
    expect(cart.isEmpty).toBe(false);
    expect(cart.itemCount).toBe(2);
    expect(cart.total).toBe('99.98 EUR');
    expect(cart.currency).toBe('EUR');
    expect(cart.productIds).toEqual(['111', '333']);
  });

  it('isEmpty est true quand itemCount = 0', () => {
    const ctx = buildCartContext({ ...mockCart, item_count: 0, total_price: 0, items: [] });
    expect((ctx.cart as Record<string, unknown>).isEmpty).toBe(true);
  });

  it('calcule unitPrice et lineTotal correctement', () => {
    const ctx = buildCartContext(mockCart);
    const items = ((ctx.cart as Record<string, unknown>).items) as Record<string, unknown>[];
    expect(items[0].variantId).toBe('111');
    expect(items[0].productId).toBe('222');
    expect(items[0].unitPrice).toBe('49.99 EUR');
    expect(items[0].lineTotal).toBe('49.99 EUR');
  });

  it('lineTotal est multiplié par qty', () => {
    const cartWith2 = {
      ...mockCart,
      items: [{ id: 111, variant_id: 111, product_id: 222, title: 'Shirt', quantity: 3, price: 2000, handle: 'shirt' }],
    };
    const ctx = buildCartContext(cartWith2);
    const items = ((ctx.cart as Record<string, unknown>).items) as Record<string, unknown>[];
    expect(items[0].lineTotal).toBe('60.00 EUR');
    expect(items[0].unitPrice).toBe('20.00 EUR');
  });

  it('productIds liste les variantIds (strings)', () => {
    const ctx = buildCartContext(mockCart);
    const cart = ctx.cart as Record<string, unknown>;
    expect(cart.productIds).toEqual(['111', '333']);
  });
});

describe('CartContextSync', () => {
  let sync: CartContextSync;
  let onUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onUpdate = vi.fn();
    sync = new CartContextSync(onUpdate);
    vi.stubGlobal('fetch', makeFetchMock());
    (window as unknown as Record<string, unknown>).Shopify = { routes: { root: '/' } };
  });

  afterEach(() => {
    sync.stop();
    vi.restoreAllMocks();
    delete (window as unknown as Record<string, unknown>).Shopify;
  });

  it('start() déclenche un fetch initial et appelle onUpdate', async () => {
    sync.start();
    await vi.waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
    const ctx = onUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(ctx.cart).toBeDefined();
    expect((ctx.cart as Record<string, unknown>).itemCount).toBe(2);
  });

  it('réagit à l\'événement cart:updated', async () => {
    sync.start();
    await vi.waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
    document.dispatchEvent(new Event('cart:updated'));
    await vi.waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(2));
  });

  it('réagit à l\'événement cart:refresh', async () => {
    sync.start();
    await vi.waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
    document.dispatchEvent(new Event('cart:refresh'));
    await vi.waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(2));
  });

  it('utilise window.Shopify.routes.root pour les URLs locale-aware', async () => {
    (window as unknown as Record<string, unknown>).Shopify = { routes: { root: '/fr/' } };
    sync.start();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(vi.mocked(fetch)).toHaveBeenCalledWith('/fr/cart.js');
  });

  it('fallback sur "/" si Shopify absent', async () => {
    delete (window as unknown as Record<string, unknown>).Shopify;
    sync.start();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(vi.mocked(fetch)).toHaveBeenCalledWith('/cart.js');
  });

  it('stop() supprime les listeners cart:updated et cart:refresh', async () => {
    sync.start();
    await vi.waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
    sync.stop();
    const callsBefore = vi.mocked(fetch).mock.calls.length;
    document.dispatchEvent(new Event('cart:updated'));
    document.dispatchEvent(new Event('cart:refresh'));
    // Allow microtask queue to flush
    await new Promise((r) => setTimeout(r, 20));
    expect(vi.mocked(fetch).mock.calls.length).toBe(callsBefore);
  });

  it('ne throw pas si fetch retourne une erreur HTTP', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    sync.start();
    await new Promise((r) => setTimeout(r, 50));
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('ne throw pas si fetch rejette (network error)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    sync.start();
    await new Promise((r) => setTimeout(r, 50));
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
