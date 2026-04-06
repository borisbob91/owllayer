import { DomOS } from '@domos/browser';
import type { DomOSWooConfig, WooStoreStatus } from './types.js';
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
 * DomOSWoo — Native WooCommerce integration layer built on @domos/browser.
 *
 * Usage (via WordPress plugin — automatic):
 *   Plugin handles DomOSWoo.init() automatically via wp_footer hook.
 *
 * Usage (manual / advanced):
 *   DomOSWoo.init(window.domos_config);
 */

// Sprint 7: Store Connect status — module-level (not exposed via closure)
let _storeStatus: WooStoreStatus | null = null;

export const DomOSWoo = {
  /** Semver version du package @domos/woocommerce */
  version: '0.8.0' as const,
  async init(config: DomOSWooConfig): Promise<void> {
    const storeBase = config.storeApiBase ?? '/wp-json/wc/store/v1';
    const apiClient = new StoreApiClient(storeBase, config.nonce);

    // Sprint 7: resolve siteUrl (auto-detect from window.location.origin if absent)
    const siteUrl = resolveSiteUrl(config.siteUrl);

    // Sprint 7: validate API key format — warn only, not blocking (supports legacy keys)
    if (config.apiKey && !validateApiKey(config.apiKey)) {
      console.debug('[DomOSWoo] API key format standalone (non Store Connect)');
    }

    // Sprint 7: store identity + connection status
    _storeStatus = {
      connected: !!config.shopId,
      siteUrl,
      shopId: config.shopId,
    };

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
        // Sprint 7: transmit store identity to DomOS Cloud for per-shop routing
        storeIdentity: config.shopId ? { siteUrl, shopId: config.shopId } : { siteUrl },
      },
    });

    // Sprint 1: inject initial WooCommerce context (from PHP-injected JSON block)
    const contextBuilder = new WooContextBuilder();
    DomOS.updateContext(contextBuilder.build());

    // Sprint 2: cart sync + cart tools
    const cartSync = new CartContextSync(apiClient, (ctx) => DomOS.updateContext(ctx));
    cartSync.start();
    registerCartTools(DomOS, apiClient, cartSync);

    // Sprint 3: product tools
    registerProductTools(DomOS, apiClient);

    // Sprint 4: checkout + order tools
    registerCheckoutTools(DomOS, apiClient, config);
    if (config.features?.orderTracking) {
      registerOrderTools(DomOS, apiClient);
    }

    // Sprint 6 Bloc A: register UI tools (dispatches Custom Events → WooWidget)
    registerUITools(DomOS);

    // Sprint 6 Bloc A: build DomOSBridge adapter and mount the custom WooCommerce chat widget.
    // DomOS callbacks are push-only (void), so we wrap them with Sets to support multiple subscribers.
    type ResponseCb = (data: { text: string; done: boolean }) => void;
    type StateCb = (state: import('@domos/browser').AgentState) => void;
    const responseSubs = new Set<ResponseCb>();
    const stateSubs = new Set<StateCb>();
    DomOS.onResponse((text, done) => responseSubs.forEach((cb) => cb({ text, done })));
    DomOS.onAgentStateChange((state) => stateSubs.forEach((cb) => cb(state)));

    const widget = new WooWidget({
      domos: {
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

    // Sprint 6 Bloc B: register payment tools (dispatches domos:payment:open → WooWidget content-panel)
    if (config.features?.inChatPayments) {
      const { registerPaymentTools } = await import('./tools/PaymentTools.js');
      registerPaymentTools(DomOS, apiClient);
    }

    // Sprint 8: product recommendations (opt-in via features.productRecommendations)
    if (config.features?.productRecommendations) {
      const { registerRecommendationTools } = await import('./tools/RecommendationTools.js');
      registerRecommendationTools(DomOS, apiClient);
    }

    // Sprint 7: emit Store Connect status event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('domos:store:status', { detail: _storeStatus }));
    }
  },

  /** Retourne le statut de connexion Store Connect (disponible après init()) */
  getStoreStatus(): WooStoreStatus | null {
    return _storeStatus;
  },
};
