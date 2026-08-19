import { OwlLayer } from '@owllayer/browser';
import type { OwlLayerWooConfig, WooStoreStatus } from './types.js';
import { WooContextBuilder } from './context/WooContextBuilder.js';
import { CartContextSync } from './context/CartContextSync.js';
import { registerProductTools } from './tools/ProductTools.js';
import { registerCartTools } from './tools/CartTools.js';
import { registerCheckoutTools } from './tools/CheckoutTools.js';
import { registerOrderTools } from './tools/OrderTools.js';
import { registerUITools } from './tools/UITools.js';
import { StoreApiClient } from './api/StoreApiClient.js';
import { WooWidget } from './ui/WooWidget.js';
import { resolveSiteUrl, validateApiKey } from './utils/storeIdentity.js';

/**
 * OwlLayerWoo — Native WooCommerce integration layer built on @owllayer/browser.
 *
 * Usage (via WordPress plugin — automatic):
 *   Plugin handles OwlLayerWoo.init() automatically via wp_footer hook.
 *
 * Usage (manual / advanced):
 *   OwlLayerWoo.init(window.owllayer_config);
 */

// Sprint 7: Store Connect status — module-level (not exposed via closure)
let _storeStatus: WooStoreStatus | null = null;

export const OwlLayerWoo = {
  /** Semver version du package @owllayer/woocommerce */
  version: '0.8.0' as const,
  async init(config: OwlLayerWooConfig): Promise<void> {
    const storeBase = config.storeApiBase ?? '/wp-json/wc/store/v1';
    const apiClient = new StoreApiClient(storeBase, config.nonce);

    // Sprint 7: resolve siteUrl (auto-detect from window.location.origin if absent)
    const siteUrl = resolveSiteUrl(config.siteUrl);

    // Sprint 7: validate API key format — warn only, not blocking (supports legacy keys)
    if (config.apiKey && !validateApiKey(config.apiKey)) {
      console.debug('[OwlLayerWoo] API key format standalone (non Store Connect)');
    }

    // Sprint 7: store identity + connection status
    _storeStatus = {
      connected: !!config.shopId,
      siteUrl,
      shopId: config.shopId,
    };

    // Sprint 1: init @owllayer/browser core
    await OwlLayer.init({
      endpoint: config.endpoint ?? 'wss://cloud.owllayer.dev/owllayer',
      apiKey: config.apiKey,
      widget: { enabled: true },
      hitl: { enabled: true },
      autoDiscovery: { enabled: true },
      session: { autoResume: true },
      context: {
        role: 'woocommerce-assistant',
        description: "Tu es l'assistant vocal de la boutique WooCommerce. Tu aides les clients à trouver des produits, gérer leur panier et passer commande.",
        // Sprint 7: transmit store identity to OwlLayer Cloud for per-shop routing
        storeIdentity: config.shopId ? { siteUrl, shopId: config.shopId } : { siteUrl },
      },
    });

    // Sprint 1: inject initial WooCommerce context (from PHP-injected JSON block)
    const contextBuilder = new WooContextBuilder();
    OwlLayer.updateContext(contextBuilder.build());

    // Sprint 2: cart sync + cart tools
    const cartSync = new CartContextSync(apiClient, (ctx) => OwlLayer.updateContext(ctx));
    cartSync.start();
    registerCartTools(OwlLayer, apiClient, cartSync);

    // Sprint 3: product tools
    registerProductTools(OwlLayer, apiClient);

    // Sprint 4: checkout + order tools
    registerCheckoutTools(OwlLayer, apiClient, config);
    if (config.features?.orderTracking) {
      registerOrderTools(OwlLayer, apiClient);
    }

    // Sprint 6 Bloc A: register UI tools (dispatches Custom Events → WooWidget)
    registerUITools(OwlLayer);

    // Sprint 6 Bloc A: build OwlLayerBridge adapter and mount the custom WooCommerce chat widget.
    // OwlLayer callbacks are push-only (void), so we wrap them with Sets to support multiple subscribers.
    type ResponseCb = (data: { text: string; done: boolean }) => void;
    type StateCb = (state: import('@owllayer/browser').AgentState) => void;
    const responseSubs = new Set<ResponseCb>();
    const stateSubs = new Set<StateCb>();
    OwlLayer.onResponse((text, done) => responseSubs.forEach((cb) => cb({ text, done })));
    OwlLayer.onAgentStateChange((state) => stateSubs.forEach((cb) => cb(state)));

    const widget = new WooWidget({
      owllayer: {
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
      },
      // Sprint 6 Bloc B: payment inline in the same widget (no second shadow DOM)
      ...(config.features?.inChatPayments
        ? {
            api: apiClient,
            stripeKey: config.features.stripeKey,
            paypalClientId: config.features.paypalClientId,
          }
        : {}),
    });
    widget.mount();

    // Sprint 6 Bloc B: register payment tools (dispatches owllayer:payment:open → WooWidget content-panel)
    if (config.features?.inChatPayments) {
      const { registerPaymentTools } = await import('./tools/PaymentTools.js');
      registerPaymentTools(OwlLayer, apiClient);
    }

    // Sprint 8: product recommendations (opt-in via features.productRecommendations)
    if (config.features?.productRecommendations) {
      const { registerRecommendationTools } = await import('./tools/RecommendationTools.js');
      registerRecommendationTools(OwlLayer, apiClient);
    }

    // Sprint 7: emit Store Connect status event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('owllayer:store:status', { detail: _storeStatus }));
    }
  },

  /** Retourne le statut de connexion Store Connect (disponible après init()) */
  getStoreStatus(): WooStoreStatus | null {
    return _storeStatus;
  },
};
