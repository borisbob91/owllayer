export interface WooFeatures {
  inChatPayments?: boolean;
  paymentGateway?: 'stripe' | 'paypal' | 'auto';
  orderTracking?: boolean;
}

export interface DomOSWooConfig {
  /** DomOS Cloud API key — passed via wp_localize_script in the WordPress plugin */
  apiKey: string;
  /** DomOS WebSocket endpoint */
  endpoint?: string;
  /** WooCommerce Store API base URL — defaults to /wp-json/wc/store/v1 */
  storeApiBase?: string;
  /** WordPress nonce for authenticated Store API requests */
  nonce?: string;
  features?: WooFeatures;
  widget?: {
    agentName?: string;
    agentTitle?: string;
    mode?: 'text' | 'voice';
  };
}

/** WooCommerce cart item (WC Store API v1 format) */
export interface WooCartItem {
  key: string;
  id: number;
  quantity: number;
  name: string;
  prices: { price: string; regular_price: string; currency_code: string };
  totals: { line_total: string };
}

/** WooCommerce cart state from Store API */
export interface WooCart {
  items: WooCartItem[];
  items_count: number;
  totals: { total_price: string; currency_code: string };
}
