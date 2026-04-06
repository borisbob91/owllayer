import { DomOS } from '@domos/browser';
import type { DomOSShopifyConfig } from './types.js';
import { ShopifyContextBuilder } from './context/ShopifyContextBuilder.js';
import { CartContextSync } from './context/CartContextSync.js';
import { StorefrontClient } from './storefront/StorefrontClient.js';
import { readCustomerContext } from './context/CustomerContext.js';
import { registerProductTools } from './tools/ProductTools.js';
import { registerCartTools } from './tools/CartTools.js';
import { registerCheckoutTools } from './tools/CheckoutTools.js';
import { registerOrderTools } from './tools/OrderTools.js';
import { registerNavigationTools } from './tools/NavigationTools.js';
import { registerUITools } from './tools/UITools.js';
import { ShopifyWidget } from './ui/ShopifyWidget.js';

/**
 * DomOSShopify — Native Shopify integration layer built on @domos/browser.
 * Call DomOSShopify.init() once in theme.liquid (or App Embed Block).
 */
export const DomOSShopify = {
  async init(config: DomOSShopifyConfig): Promise<void> {
    // Sprint 1: init @domos/browser core — disable default widget (ShopifyWidget takes over)
    await DomOS.init({
      endpoint: config.endpoint ?? 'wss://cloud.domos.dev/domos',
      apiKey: config.apiKey,
      widget: { enabled: false },
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

    // Sprint 4: inject customer context (is logged in, customer ID)
    DomOS.updateContext({ customer: readCustomerContext() });

    // Sprint 2: start real-time cart sync
    const cartSync = new CartContextSync((cartCtx) => DomOS.updateContext(cartCtx));
    cartSync.start();

    // Sprint 2: cart tools
    registerCartTools(DomOS);

    // Sprint 3: instantiate StorefrontClient once — shared with product tools + Sprint 4 order tools
    const storefrontClient =
      config.storefrontToken && config.shopDomain
        ? new StorefrontClient(config.shopDomain, config.storefrontToken, config.storefrontApiVersion)
        : null;

    // Sprint 3: product + navigation tools
    registerProductTools(DomOS, storefrontClient);
    registerNavigationTools(DomOS);

    // Sprint 4: checkout + order tools
    registerCheckoutTools(DomOS, config);
    if (config.features?.orderTracking) {
      registerOrderTools(DomOS, storefrontClient);
    }

    // Sprint 6: register UI tools (show_products, show_cart, etc.) before mounting widget
    registerUITools(DomOS);

    // Sprint 6: build bridge adapter between DomOS API and ShopifyWidget's DomOSBridge interface.
    // DomOS callbacks are push-only (void return), so we wrap them with Sets to support unsubscribers.
    type ResponseCb = (data: { text: string; done: boolean }) => void;
    type StateCb = (state: import('@domos/browser').AgentState) => void;
    const responseSubs = new Set<ResponseCb>();
    const stateSubs = new Set<StateCb>();
    DomOS.onResponse((text, done) => responseSubs.forEach((cb) => cb({ text, done })));
    DomOS.onAgentStateChange((state) => stateSubs.forEach((cb) => cb(state)));

    // Sprint 6: mount the custom Shopify voice widget in its own Shadow DOM
    const widget = new ShopifyWidget({
      startVoice: () => { void DomOS.startVoice(); },
      stopVoice: () => DomOS.stopVoice(),
      muteMic: () => DomOS.muteMic(),
      sendText: (text) => DomOS.sendText(text),
      onAgentStateChange: (cb) => {
        stateSubs.add(cb);
        return () => stateSubs.delete(cb);
      },
      onResponse: (cb) => {
        responseSubs.add(cb);
        return () => responseSubs.delete(cb);
      },
    });
    widget.mount();
  },
};
