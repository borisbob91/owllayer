import { DomOS } from '@domos/browser';
import type { DomOSShopifyConfig } from './types.js';
import { ShopifyContextBuilder } from './context/ShopifyContextBuilder.js';
import { CartContextSync } from './context/CartContextSync.js';
import { registerProductTools } from './tools/ProductTools.js';
import { registerCartTools } from './tools/CartTools.js';
import { registerCheckoutTools } from './tools/CheckoutTools.js';
import { registerOrderTools } from './tools/OrderTools.js';
import { registerNavigationTools } from './tools/NavigationTools.js';

/**
 * DomOSShopify — Native Shopify integration layer built on @domos/browser.
 * Call DomOSShopify.init() once in theme.liquid (or App Embed Block).
 */
export const DomOSShopify = {
  async init(config: DomOSShopifyConfig): Promise<void> {
    // Sprint 1: init @domos/browser core
    await DomOS.init({
      endpoint: config.endpoint ?? 'wss://cloud.domos.dev/domos',
      apiKey: config.apiKey,
      widget: { enabled: true },
      hitl: { enabled: true },
      autoDiscovery: { enabled: true },
      session: { autoResume: true },
      context: {
        role: 'shopify-assistant',
        description: "Tu es l'assistant vocal de la boutique. Tu aides les clients à trouver des produits, gérer leur panier et passer commande.",
      },
    });

    // Sprint 1: inject initial Shopify context
    const contextBuilder = new ShopifyContextBuilder();
    DomOS.updateContext(contextBuilder.build());

    // Sprint 2: start real-time cart sync
    const cartSync = new CartContextSync((cartCtx) => DomOS.updateContext(cartCtx));
    cartSync.start();

    // Sprint 2: cart tools
    registerCartTools(DomOS);

    // Sprint 3: product + navigation tools
    registerProductTools(DomOS, config.storefrontToken, config.shopDomain);
    registerNavigationTools(DomOS);

    // Sprint 4: checkout + order tools
    registerCheckoutTools(DomOS, config);
    if (config.features?.orderTracking) {
      registerOrderTools(DomOS, config.storefrontToken, config.shopDomain);
    }
  },
};
