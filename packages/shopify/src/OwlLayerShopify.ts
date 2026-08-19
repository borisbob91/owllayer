import { OwlLayer } from '@owllayer/browser';
import type { OwlLayerShopifyConfig } from './types.js';
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
 * OwlLayerShopify — Native Shopify integration layer built on @owllayer/browser.
 * Call OwlLayerShopify.init() once in theme.liquid (or App Embed Block).
 */
export const OwlLayerShopify = {
  async init(config: OwlLayerShopifyConfig): Promise<void> {
    // Sprint 1: init @owllayer/browser core — disable default widget (ShopifyWidget takes over)
    await OwlLayer.init({
      endpoint: config.endpoint ?? 'wss://cloud.owllayer.dev/owllayer',
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
    OwlLayer.updateContext(contextBuilder.build());

    // Sprint 4: inject customer context (is logged in, customer ID)
    OwlLayer.updateContext({ customer: readCustomerContext() });

    // Sprint 2: start real-time cart sync
    const cartSync = new CartContextSync((cartCtx) => OwlLayer.updateContext(cartCtx));
    cartSync.start();

    // Sprint 2: cart tools
    registerCartTools(OwlLayer);

    // Sprint 3: instantiate StorefrontClient once — shared with product tools + Sprint 4 order tools
    const storefrontClient =
      config.storefrontToken && config.shopDomain
        ? new StorefrontClient(config.shopDomain, config.storefrontToken, config.storefrontApiVersion)
        : null;

    // Sprint 3: product + navigation tools
    registerProductTools(OwlLayer, storefrontClient);
    registerNavigationTools(OwlLayer);

    // Sprint 4: checkout + order tools
    registerCheckoutTools(OwlLayer, config);
    if (config.features?.orderTracking) {
      registerOrderTools(OwlLayer, storefrontClient);
    }

    // Sprint 6: register UI tools (show_products, show_cart, etc.) before mounting widget
    registerUITools(OwlLayer);

    // Sprint 6: build bridge adapter between OwlLayer API and ShopifyWidget's OwlLayerBridge interface.
    // OwlLayer callbacks are push-only (void return), so we wrap them with Sets to support unsubscribers.
    type ResponseCb = (data: { text: string; done: boolean }) => void;
    type StateCb = (state: import('@owllayer/browser').AgentState) => void;
    const responseSubs = new Set<ResponseCb>();
    const stateSubs = new Set<StateCb>();
    OwlLayer.onResponse((text, done) => responseSubs.forEach((cb) => cb({ text, done })));
    OwlLayer.onAgentStateChange((state) => stateSubs.forEach((cb) => cb(state)));

    // Sprint 6: mount the custom Shopify voice widget in its own Shadow DOM
    const widget = new ShopifyWidget({
      startVoice: () => { void OwlLayer.startVoice(); },
      stopVoice: () => OwlLayer.stopVoice(),
      muteMic: () => OwlLayer.muteMic(),
      sendText: (text) => OwlLayer.sendText(text),
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
