/**
 * ShopifyContextBuilder — reads Shopify data injected by Liquid into the DOM
 * and builds the DomOS Shadow Context.
 *
 * Shopify themes inject data via:
 * - window.ShopifyAnalytics.meta (product, page type)
 * - <script id="domos-shopify-context" type="application/json"> block (injected by App Embed / theme)
 *
 * Sprint 1 implementation.
 */
export class ShopifyContextBuilder {
  build(): Record<string, unknown> {
    // TODO Sprint 1: read window.ShopifyAnalytics.meta + JSON block
    const pageType = this._detectPageType();
    return {
      platform: 'shopify',
      currentPage: pageType,
      shop: this._readShopGlobals(),
      product: this._readProductContext(),
      collection: this._readCollectionContext(),
    };
  }

  private _detectPageType(): string {
    // TODO Sprint 1: read from window.ShopifyAnalytics or body data attribute
    return (document.body.dataset.pageType as string) ?? 'unknown';
  }

  private _readShopGlobals(): Record<string, unknown> {
    // TODO Sprint 1: read window.Shopify.shop, currency, locale
    return {};
  }

  private _readProductContext(): Record<string, unknown> | null {
    // TODO Sprint 1: read <script id="domos-product-json"> block
    return null;
  }

  private _readCollectionContext(): Record<string, unknown> | null {
    // TODO Sprint 1
    return null;
  }
}
