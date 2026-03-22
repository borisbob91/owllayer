import type { StoreApiClient } from '../api/StoreApiClient.js';
import type { WooCart } from '../types.js';

/**
 * CartContextSync — keeps DomOS cart context in sync with WooCommerce cart.
 * Uses WooCommerce Store API v1 GET /cart + page events.
 *
 * Sprint 2 implementation.
 */
export class CartContextSync {
  private _pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly api: StoreApiClient,
    private readonly onUpdate: (ctx: Record<string, unknown>) => void,
  ) {}

  start(): void {
    // TODO Sprint 2: bind WooCommerce cart events
    document.addEventListener('wc-blocks_added_to_cart', () => this._fetchAndEmit());
    document.addEventListener('wc-blocks_removed_from_cart', () => this._fetchAndEmit());
    // Polling fallback
    this._pollInterval = setInterval(() => this._fetchAndEmit(), 30_000);
    this._fetchAndEmit();
  }

  stop(): void {
    if (this._pollInterval) clearInterval(this._pollInterval);
  }

  private async _fetchAndEmit(): Promise<void> {
    // TODO Sprint 2
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
