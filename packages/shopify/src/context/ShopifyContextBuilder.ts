// Déclarations des globaux Shopify injectés par les thèmes Liquid
declare const window: Window & {
  Shopify?: {
    shop?: string;
    currency?: string;
    locale?: string;
    theme?: { name?: string };
  };
  ShopifyAnalytics?: {
    meta?: {
      page?: { pageType?: string };
    };
  };
};

/**
 * ShopifyContextBuilder — reads Shopify data injected by Liquid into the DOM
 * and builds the DomOS Shadow Context.
 *
 * Sources lues :
 * - window.Shopify         → shop, currency, locale
 * - window.ShopifyAnalytics.meta.page.pageType → type de page
 * - document.body.dataset.pageType             → fallback type de page
 * - <script id="domos-product-json">           → données produit injectées Liquid
 * - <script id="domos-collection-json">        → données collection injectées Liquid
 *
 * Sprint 1 implementation.
 */
export class ShopifyContextBuilder {
  build(): Record<string, unknown> {
    const pageType = this._detectPageType();
    const shop = this._readShopGlobals();
    const product = this._readProductContext();
    const collection = this._readCollectionContext();

    const ctx: Record<string, unknown> = {
      platform: 'shopify',
      currentPage: pageType,
      shop,
    };

    if (product) {
      const p = product as Record<string, unknown>;
      ctx.product = product;
      ctx.userLocation = `L'utilisateur consulte la page produit : ${p.title ?? ''}`;
      ctx.availableActions = [
        'Ajouter au panier → add_to_cart(variantId, qty)',
        'Voir les variantes → get_product(handle)',
        'Naviguer vers un produit → navigate_to_product(handle)',
      ];
    } else if (collection) {
      const c = collection as Record<string, unknown>;
      ctx.collection = collection;
      ctx.userLocation = `L'utilisateur consulte la collection : ${c.title ?? ''}`;
      ctx.availableActions = [
        'Chercher des produits → search_products(query)',
        'Naviguer vers un produit → navigate_to_product(handle)',
        'Naviguer vers une collection → navigate_to_collection(handle)',
      ];
    } else if (pageType === 'cart') {
      ctx.userLocation = "L'utilisateur consulte son panier";
      ctx.availableActions = [
        'Modifier la quantité → update_cart(variantId, qty)',
        'Retirer un article → remove_from_cart(variantId)',
        'Passer commande → initiate_checkout()',
      ];
    } else {
      ctx.userLocation = `L'utilisateur consulte la page : ${pageType}`;
      ctx.availableActions = [
        'Chercher des produits → search_products(query)',
        'Naviguer vers une collection → navigate_to_collection(handle)',
      ];
    }

    return ctx;
  }

  private _detectPageType(): string {
    // Priorité 1 : ShopifyAnalytics (disponible sur tous les thèmes modernes)
    const analyticsType = window.ShopifyAnalytics?.meta?.page?.pageType;
    if (analyticsType) return analyticsType;

    // Priorité 2 : data-page-type sur le body (injecté par certains thèmes Liquid)
    const bodyAttr = document.body.dataset.pageType;
    if (bodyAttr) return bodyAttr;

    // Priorité 3 : inférer depuis l'URL
    const path = window.location.pathname;
    if (path.startsWith('/products/')) return 'product';
    if (path.startsWith('/collections/')) return 'collection';
    if (path === '/cart') return 'cart';
    if (path === '/') return 'index';
    if (path.startsWith('/pages/')) return 'page';
    if (path.startsWith('/blogs/')) return 'article';

    return 'unknown';
  }

  private _readShopGlobals(): Record<string, unknown> {
    const shopify = window.Shopify;
    return {
      name: shopify?.shop ?? document.title,
      domain: shopify?.shop ?? window.location.hostname,
      currency: shopify?.currency ?? 'USD',
      locale: shopify?.locale ?? navigator.language ?? 'en',
    };
  }

  private _readProductContext(): Record<string, unknown> | null {
    const el = document.getElementById('domos-product-json');
    if (!el?.textContent) return null;

    try {
      const raw = JSON.parse(el.textContent) as Record<string, unknown>;
      const currency = window.Shopify?.currency ?? 'USD';

      // Normaliser les variantes
      const rawVariants = Array.isArray(raw.variants) ? raw.variants : [];
      const variants = rawVariants.map((v: Record<string, unknown>) => ({
        id: String(v.id ?? ''),
        title: String(v.title ?? ''),
        price: `${((Number(v.price) || 0) / 100).toFixed(2)} ${currency}`,
        available: Boolean(v.available),
      }));

      const price = variants[0]?.price ?? `${((Number(raw.price) || 0) / 100).toFixed(2)} ${currency}`;
      const compareAtPrice = raw.compare_at_price
        ? `${((Number(raw.compare_at_price)) / 100).toFixed(2)} ${currency}`
        : null;

      return {
        id: String(raw.id ?? ''),
        handle: String(raw.handle ?? ''),
        title: String(raw.title ?? ''),
        price,
        compareAtPrice,
        available: Boolean(raw.available),
        vendor: String(raw.vendor ?? ''),
        productType: String(raw.product_type ?? ''),
        tags: Array.isArray(raw.tags) ? raw.tags : [],
        variants,
      };
    } catch {
      return null;
    }
  }

  private _readCollectionContext(): Record<string, unknown> | null {
    const el = document.getElementById('domos-collection-json');
    if (!el?.textContent) return null;

    try {
      const raw = JSON.parse(el.textContent) as Record<string, unknown>;
      return {
        id: String(raw.id ?? ''),
        handle: String(raw.handle ?? ''),
        title: String(raw.title ?? ''),
        description: String(raw.description ?? ''),
        productsCount: Number(raw.products_count ?? 0),
      };
    } catch {
      return null;
    }
  }
}
