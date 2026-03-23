import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CartContextSync } from '../context/CartContextSync.js';
import type { StoreApiClient } from '../api/StoreApiClient.js';
import type { WooCart } from '../types.js';

const mockCart: WooCart = {
  items: [
    {
      key: 'abc123',
      id: 42,
      quantity: 2,
      name: 'T-Shirt Rouge',
      prices: { price: '2999', regular_price: '3499', currency_code: 'EUR' },
      totals: { line_total: '5998' },
    },
  ],
  items_count: 2,
  totals: { total_price: '5998', currency_code: 'EUR' },
};

const emptyCart: WooCart = {
  items: [],
  items_count: 0,
  totals: { total_price: '0', currency_code: 'EUR' },
};

function makeApiMock(cart: WooCart = mockCart): StoreApiClient {
  return { get: vi.fn().mockResolvedValue(cart) } as unknown as StoreApiClient;
}

describe('CartContextSync', () => {
  let onUpdate: ReturnType<typeof vi.fn>;

  // Helper: start the sync and flush the initial async _fetchAndEmit() call.
  // Using advanceTimersByTimeAsync(0) flushes pending microtasks without
  // running the repeating 30s setInterval (which would cause an infinite loop
  // if runAllTimersAsync were used with a recurring interval + async callbacks).
  async function startAndFlush(sync: CartContextSync): Promise<void> {
    sync.start();
    await vi.advanceTimersByTimeAsync(0);
  }

  beforeEach(() => {
    onUpdate = vi.fn();
    vi.useFakeTimers();
  });

  afterEach((ctx) => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    // Suppress unhandled promise warnings for the error-case test
    void ctx;
  });

  it('appelle onUpdate avec les données panier au démarrage', async () => {
    const api = makeApiMock();
    const sync = new CartContextSync(api, onUpdate);
    await startAndFlush(sync);
    sync.stop();
    expect(onUpdate).toHaveBeenCalled();
    const ctx = onUpdate.mock.calls[0][0] as Record<string, unknown>;
    const cart = ctx.cart as Record<string, unknown>;
    expect(cart.isEmpty).toBe(false);
    expect(cart.itemCount).toBe(2);
  });

  it('formate le total correctement (centimes → euros)', async () => {
    const api = makeApiMock();
    const sync = new CartContextSync(api, onUpdate);
    await startAndFlush(sync);
    sync.stop();
    const cart = (onUpdate.mock.calls[0][0] as Record<string, unknown>).cart as Record<string, unknown>;
    expect(cart.total).toBe('59.98 EUR');
  });

  it('expose les items avec key, id, title, qty', async () => {
    const api = makeApiMock();
    const sync = new CartContextSync(api, onUpdate);
    await startAndFlush(sync);
    sync.stop();
    const cart = (onUpdate.mock.calls[0][0] as Record<string, unknown>).cart as Record<string, unknown>;
    const items = cart.items as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    expect(items[0].key).toBe('abc123');
    expect(items[0].id).toBe(42);
    expect(items[0].qty).toBe(2);
    expect(items[0].title).toBe('T-Shirt Rouge');
  });

  it('isEmpty est true pour un panier vide', async () => {
    const api = makeApiMock(emptyCart);
    const sync = new CartContextSync(api, onUpdate);
    await startAndFlush(sync);
    sync.stop();
    const cart = (onUpdate.mock.calls[0][0] as Record<string, unknown>).cart as Record<string, unknown>;
    expect(cart.isEmpty).toBe(true);
    expect(cart.itemCount).toBe(0);
  });

  it('productIds est un tableau de strings', async () => {
    const api = makeApiMock();
    const sync = new CartContextSync(api, onUpdate);
    await startAndFlush(sync);
    sync.stop();
    const cart = (onUpdate.mock.calls[0][0] as Record<string, unknown>).cart as Record<string, unknown>;
    expect(cart.productIds).toEqual(['42']);
  });

  it('ne lance pas d\'erreur si GET /cart échoue (mode silencieux)', async () => {
    const api = { get: vi.fn().mockRejectedValue(new Error('Network error')) } as unknown as StoreApiClient;
    const sync = new CartContextSync(api, onUpdate);
    sync.start();
    await vi.advanceTimersByTimeAsync(0);
    sync.stop();
    // onUpdate not called on error
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('déclenche une re-sync sur événement wc-blocks_added_to_cart', async () => {
    const api = makeApiMock();
    const sync = new CartContextSync(api, onUpdate);
    await startAndFlush(sync);
    const callsBefore = onUpdate.mock.calls.length;

    document.dispatchEvent(new Event('wc-blocks_added_to_cart'));
    await vi.advanceTimersByTimeAsync(0);
    sync.stop();

    expect(onUpdate.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('déclenche une re-sync sur événement wc-blocks_removed_from_cart', async () => {
    const api = makeApiMock();
    const sync = new CartContextSync(api, onUpdate);
    await startAndFlush(sync);
    const callsBefore = onUpdate.mock.calls.length;

    document.dispatchEvent(new Event('wc-blocks_removed_from_cart'));
    await vi.advanceTimersByTimeAsync(0);
    sync.stop();

    expect(onUpdate.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('stop() annule le polling', async () => {
    const api = makeApiMock();
    const sync = new CartContextSync(api, onUpdate);
    await startAndFlush(sync);
    sync.stop();
    const callsAfterStop = onUpdate.mock.calls.length;

    // Advance 60s — the cleared interval should not fire after stop()
    await vi.advanceTimersByTimeAsync(60_000);
    expect(onUpdate.mock.calls.length).toBe(callsAfterStop);
  });
});
