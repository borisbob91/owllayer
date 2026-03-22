/**
 * CartContextSync — listens to Shopify cart events and keeps DomOS context
 * up to date in real time.
 *
 * Listens to:
 * - document 'cart:updated' event (emitted by most Shopify themes)
 * - Polling fallback every 30s if event not available
 *
 * Sprint 2 implementation.
 */
export class CartContextSync {
  private _onUpdate: (ctx: Record<string, unknown>) => void;
  private _pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(onUpdate: (ctx: Record<string, unknown>) => void) {
    this._onUpdate = onUpdate;
  }

  start(): void {
    // TODO Sprint 2: bind cart:updated event + polling fallback
    document.addEventListener('cart:updated', () => this._fetchAndEmit());
    this._pollInterval = setInterval(() => this._fetchAndEmit(), 30_000);
    // Initial fetch
    this._fetchAndEmit();
  }

  stop(): void {
    if (this._pollInterval) clearInterval(this._pollInterval);
  }

  private async _fetchAndEmit(): Promise<void> {
    // TODO Sprint 2: fetch /cart.js and build context
    try {
      const res = await fetch('/cart.js');
      if (!res.ok) return;
      const cart = await res.json();
      this._onUpdate({
        cart: {
          itemCount: cart.item_count as number,
          totalPrice: ((cart.total_price as number) / 100).toFixed(2),
          currency: cart.currency as string,
          items: (cart.items as unknown[]).map((i: Record<string, unknown>) => ({
            id: i.variant_id,
            productId: i.product_id,
            title: i.title,
            qty: i.quantity,
            price: ((i.price as number) / 100).toFixed(2),
          })),
        },
      });
    } catch {
      // Cart fetch failed silently — agent works with last known state
    }
  }
}
