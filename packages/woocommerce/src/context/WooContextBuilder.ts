/**
 * WooContextBuilder — reads WooCommerce context injected by the WordPress plugin.
 *
 * The PHP plugin injects a JSON block before </body>:
 * <script id="domos-woo-context" type="application/json">{ ... }</script>
 *
 * Sprint 1 implementation.
 * Sprint 7 addition: siteUrl for backend apiKey+site_url validation.
 */
export class WooContextBuilder {
  build(): Record<string, unknown> {
    const raw = this._readInjectedBlock();
    const pageType = ((raw?.pageType as string | undefined) ?? this._detectPageType());
    const product = raw?.product ?? null;
    const category = raw?.category ?? null;
    return {
      platform: 'woocommerce',
      // siteUrl is used by the backend to validate apiKey + site_url combination (Sprint 7 §C.2)
      siteUrl: (raw?.siteUrl as string | undefined) ?? window.location.origin,
      currentPage: pageType,
      userLocation: this._buildUserLocation(pageType, raw),
      availableActions: this._buildAvailableActions(pageType),
      product,
      category,
      shop: raw?.shop ?? {
        name: document.title,
        currency: (raw?.currency as string) ?? 'EUR',
      },
      customer: raw?.customer ?? { isLoggedIn: false },
    };
  }

  private _readInjectedBlock(): Record<string, unknown> | null {
    const el = document.getElementById('domos-woo-context');
    if (!el) return null;
    try { return JSON.parse(el.textContent ?? '') as Record<string, unknown>; } catch { return null; }
  }

  private _detectPageType(): string {
    const body = document.body;
    if (body.classList.contains('single-product')) return 'product';
    if (body.classList.contains('tax-product_cat')) return 'category';
    if (body.classList.contains('woocommerce-cart')) return 'cart';
    if (body.classList.contains('woocommerce-checkout')) return 'checkout';
    if (body.classList.contains('woocommerce-account')) return 'account';
    return 'home';
  }

  private _buildUserLocation(pageType: string, raw: Record<string, unknown> | null): string {
    const productName = (raw?.product as Record<string, string> | null)?.name;
    const categoryName = (raw?.category as Record<string, string> | null)?.name;
    if (pageType === 'product') return `L'utilisateur consulte le produit : ${productName ?? ''}`;
    if (pageType === 'category') return `L'utilisateur consulte la catégorie : ${categoryName ?? ''}`;
    if (pageType === 'cart') return "L'utilisateur est sur la page Panier.";
    if (pageType === 'checkout') return "L'utilisateur est sur la page Commande.";
    if (pageType === 'account') return "L'utilisateur est sur son espace compte.";
    return "L'utilisateur navigue sur la boutique.";
  }

  private _buildAvailableActions(pageType: string): string[] {
    switch (pageType) {
      case 'product': return [
        'Ajouter au panier → add_to_cart(id, qty)',
        'Voir les variantes → get_product(id)',
        'Appliquer un coupon → apply_coupon(code)',
      ];
      case 'category': return [
        'Rechercher des produits → search_products(search)',
        'Voir un produit → get_product(id)',
      ];
      case 'cart': return [
        'Modifier la quantité → update_cart_item(key, quantity)',
        'Supprimer un article → remove_cart_item(key)',
        'Appliquer un coupon → apply_coupon(code)',
        'Passer commande → initiate_checkout()',
      ];
      case 'checkout': return [
        'Passer commande → initiate_checkout()',
        'Appliquer un coupon → apply_coupon(code)',
      ];
      case 'account': return [
        'Voir le statut de commande → get_order_status()',
      ];
      default: return [
        'Rechercher des produits → search_products(search)',
        'Voir le panier → get_cart()',
      ];
    }
  }
}
