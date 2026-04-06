import type { StoreApiClient } from '../api/StoreApiClient.js';
import type { WooCart } from '../types.js';

/**
 * CartContextSync — keeps DomOS cart context in sync with WooCommerce cart.
 * Uses WooCommerce Store API v1 GET /cart + DOM events + polling.
 *
 * Sprint 2 implementation.
 */
export class CartContextSync {
  private _pollInterval: ReturnType<typeof setInterval> | null = null;
  private _mutationObserver: MutationObserver | null = null;
  private _boundFetch: () => void;

  constructor(
    private readonly api: StoreApiClient,
    private readonly onUpdate: (ctx: Record<string, unknown>) => void,
  ) {
    this._boundFetch = () => { void this._fetchAndEmit(); };
  }

  start(): void {
    // WooCommerce Blocks events
    document.addEventListener('wc-blocks_added_to_cart', this._boundFetch);
    document.addEventListener('wc-blocks_removed_from_cart', this._boundFetch);
    document.addEventListener('wc-blocks_cart_item_quantity_changed', this._boundFetch);

    // Classic themes: jQuery event (woocommerce_cart_updated fires on body)
    // jQuery triggers are not native DOM events — wrap safely
    const jq = (window as unknown as Record<string, unknown>)['jQuery'] as
      | ((sel: string) => { on: (ev: string, fn: () => void) => void })
      | undefined;
    jq?.('body').on('woocommerce_cart_updated', this._boundFetch);

    // Classic themes: MutationObserver on cart form (fallback)
    const cartForm = document.querySelector('.woocommerce-cart-form');
    if (cartForm) {
      this._mutationObserver = new MutationObserver(this._boundFetch);
      this._mutationObserver.observe(cartForm, { childList: true, subtree: true });
    }

    // Polling fallback (30s)
    this._pollInterval = setInterval(this._boundFetch, 30_000);

    // Initial fetch
    void this._fetchAndEmit();
  }

  stop(): void {
    document.removeEventListener('wc-blocks_added_to_cart', this._boundFetch);
    document.removeEventListener('wc-blocks_removed_from_cart', this._boundFetch);
    document.removeEventListener('wc-blocks_cart_item_quantity_changed', this._boundFetch);
    if (this._pollInterval) { clearInterval(this._pollInterval); this._pollInterval = null; }
    this._mutationObserver?.disconnect();
    this._mutationObserver = null;
  }

  async _fetchAndEmit(): Promise<void> {
    try {
      const cart = await this.api.get<WooCart>('/cart');
      this.onUpdate({
        cart: {
          isEmpty: cart.items_count === 0,
          itemCount: cart.items_count,
          total: this._formatPrice(cart.totals.total_price, cart.totals.currency_code),
          productIds: cart.items.map(i => String(i.id)),
          items: cart.items.map(i => ({
            key: i.key,
            id: i.id,
            title: i.name,
            qty: i.quantity,
            unitPrice: this._formatPrice(i.prices.price, i.prices.currency_code),
            lineTotal: this._formatPrice(i.totals.line_total, cart.totals.currency_code),
          })),
        },
      });
    } catch {
      // Silent — agent works with last known state
    }
  }

  private _formatPrice(minorUnits: string, currency: string): string {
    return (parseInt(minorUnits) / 100).toFixed(2) + ' ' + currency;
  }
}
