import { DomOS } from '@domos/browser';
import type { DomOSWooConfig } from './types.js';
import { WooContextBuilder } from './context/WooContextBuilder.js';
import { CartContextSync } from './context/CartContextSync.js';
import { registerProductTools } from './tools/ProductTools.js';
import { registerCartTools } from './tools/CartTools.js';
import { registerCheckoutTools } from './tools/CheckoutTools.js';
import { registerOrderTools } from './tools/OrderTools.js';
import { StoreApiClient } from './api/StoreApiClient.js';

/**
 * DomOSWoo — Native WooCommerce integration layer built on @domos/browser.
 *
 * Usage (via WordPress plugin — automatic):
 *   Plugin handles DomOSWoo.init() automatically via wp_footer hook.
 *
 * Usage (manual / advanced):
 *   DomOSWoo.init(window.domos_config);
 */
export const DomOSWoo = {
  async init(config: DomOSWooConfig): Promise<void> {
    const storeBase = config.storeApiBase ?? '/wp-json/wc/store/v1';
    const apiClient = new StoreApiClient(storeBase, config.nonce);

    // Sprint 1: init @domos/browser core
    await DomOS.init({
      endpoint: config.endpoint ?? 'wss://cloud.domos.dev/domos',
      apiKey: config.apiKey,
      widget: { enabled: true },
      hitl: { enabled: true },
      autoDiscovery: { enabled: true },
      session: { autoResume: true },
      context: {
        role: 'woocommerce-assistant',
        description: "Tu es l'assistant vocal de la boutique WooCommerce. Tu aides les clients à trouver des produits, gérer leur panier et passer commande.",
      },
    });

    // Sprint 1: inject initial WooCommerce context (from PHP-injected JSON block)
    const contextBuilder = new WooContextBuilder();
    DomOS.updateContext(contextBuilder.build());

    // Sprint 2: cart sync + cart tools
    const cartSync = new CartContextSync(apiClient, (ctx) => DomOS.updateContext(ctx));
    cartSync.start();
    registerCartTools(DomOS, apiClient);

    // Sprint 3: product tools
    registerProductTools(DomOS, apiClient);

    // Sprint 4: checkout + order tools
    registerCheckoutTools(DomOS, apiClient, config);
    if (config.features?.orderTracking) {
      registerOrderTools(DomOS, apiClient);
    }
  },
};
