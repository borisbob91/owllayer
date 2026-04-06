/**
 * CartContextSync — keeps DomOS context synchronized with the Shopify cart in real time.
 *
 * Strategy (multi-layer, covers most themes):
 * 1. document 'cart:updated'    — Dawn, Debut, most Shopify themes
 * 2. document 'cart:refresh'    — Turbo and some premium themes
 * 3. MutationObserver on [data-cart-count] — DOM fallback when no custom events
 * 4. Polling every 30s          — guaranteed last-resort fallback
 *
 * All URLs use window.Shopify.routes.root for locale-aware compatibility
 * (required for multi-market / multi-language Shopify stores).
 */

import type { ShopifyCart } from '../types.js';

declare const window: Window & {
  Shopify?: { routes?: { root?: string }; currency?: string };
};

export class CartContextSync {
  private _onUpdate: (ctx: Record<string, unknown>) => void;
  private _pollInterval: ReturnType<typeof setInterval> | null = null;
  private _observer: MutationObserver | null = null;
  // Store bound handlers so removeEventListener works correctly
  private _cartUpdatedHandler = (): void => { void this._fetchAndEmit(); };
  private _cartRefreshHandler = (): void => { void this._fetchAndEmit(); };

  constructor(onUpdate: (ctx: Record<string, unknown>) => void) {
    this._onUpdate = onUpdate;
  }

  start(): void {
    // Layer 1 & 2: theme custom events
    document.addEventListener('cart:updated', this._cartUpdatedHandler);
    document.addEventListener('cart:refresh', this._cartRefreshHandler);

    // Layer 3: MutationObserver on [data-cart-count] (present in most themes)
    const cartCountEl = document.querySelector('[data-cart-count]');
    if (cartCountEl) {
      this._observer = new MutationObserver(this._cartUpdatedHandler);
      this._observer.observe(cartCountEl, { attributes: true, childList: true, subtree: true });
    }

    // Layer 4: Polling fallback every 30s
    this._pollInterval = setInterval(() => { void this._fetchAndEmit(); }, 30_000);

    // Initial fetch on start
    void this._fetchAndEmit();
  }

  stop(): void {
    document.removeEventListener('cart:updated', this._cartUpdatedHandler);
    document.removeEventListener('cart:refresh', this._cartRefreshHandler);
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
  }

  async _fetchAndEmit(): Promise<void> {
    const root = window.Shopify?.routes?.root ?? '/';
    try {
      const res = await fetch(`${root}cart.js`);
      if (!res.ok) return;
      const cart = await res.json() as ShopifyCart;
      this._onUpdate(buildCartContext(cart));
    } catch {
      // Cart fetch failed silently — agent works with last known state
    }
  }
}

/**
 * Transforms a raw Shopify /cart.js response into the DomOS context format.
 * Exported so CartTools can reuse it after mutations without a second fetch.
 */
export function buildCartContext(cart: ShopifyCart): Record<string, unknown> {
  const { item_count: itemCount, total_price: totalCents, currency, items } = cart;

  const mappedItems = items.map((i) => ({
    variantId: String(i.variant_id),
    productId: String(i.product_id),
    title: i.title,
    qty: i.quantity,
    unitPrice: `${(i.price / 100).toFixed(2)} ${currency}`,
    lineTotal: `${((i.price * i.quantity) / 100).toFixed(2)} ${currency}`,
  }));

  return {
    cart: {
      isEmpty: itemCount === 0,
      itemCount,
      total: `${(totalCents / 100).toFixed(2)} ${currency}`,
      currency,
      productIds: mappedItems.map((i) => i.variantId),
      items: mappedItems,
    },
  };
}
