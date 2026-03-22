/**
 * WooContextBuilder — reads WooCommerce context injected by the WordPress plugin.
 *
 * The PHP plugin injects a JSON block before </body>:
 * <script id="domos-woo-context" type="application/json">{ ... }</script>
 *
 * Sprint 1 implementation.
 */
export class WooContextBuilder {
  build(): Record<string, unknown> {
    const raw = this._readInjectedBlock();
    const pageType = raw?.pageType ?? this._detectPageType();
    return {
      platform: 'woocommerce',
      currentPage: pageType,
      userLocation: this._buildUserLocation(pageType, raw),
      product: raw?.product ?? null,
      category: raw?.category ?? null,
      shop: raw?.shop ?? {
        name: document.title,
        currency: (raw?.currency as string) ?? 'EUR',
      },
    };
  }

  private _readInjectedBlock(): Record<string, unknown> | null {
    // TODO Sprint 1: parse <script id="domos-woo-context">
    const el = document.getElementById('domos-woo-context');
    if (!el) return null;
    try { return JSON.parse(el.textContent ?? '') as Record<string, unknown>; } catch { return null; }
  }

  private _detectPageType(): string {
    // Fallback: infer from URL/body classes
    const body = document.body;
    if (body.classList.contains('single-product')) return 'product';
    if (body.classList.contains('tax-product_cat')) return 'category';
    if (body.classList.contains('woocommerce-cart')) return 'cart';
    if (body.classList.contains('woocommerce-checkout')) return 'checkout';
    return 'home';
  }

  private _buildUserLocation(pageType: string, raw: Record<string, unknown> | null): string {
    const productName = (raw?.product as Record<string, string> | null)?.name;
    if (pageType === 'product' && productName) return `L'utilisateur consulte le produit : ${productName}`;
    if (pageType === 'cart') return "L'utilisateur est sur la page Panier.";
    if (pageType === 'checkout') return "L'utilisateur est sur la page Commande.";
    return "L'utilisateur navigues sur la boutique.";
  }
}
