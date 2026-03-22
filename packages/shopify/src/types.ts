export interface ShopifyFeatures {
  inChatPayments?: boolean;
  orderTracking?: boolean;
  productRecommendations?: boolean;
}

export interface DomOSShopifyConfig {
  /** DomOS Cloud API key */
  apiKey: string;
  /** DomOS WebSocket endpoint — defaults to wss://cloud.domos.dev/domos */
  endpoint?: string;
  /** Shopify Storefront API token (public, read-only) */
  storefrontToken?: string;
  /** Shopify store domain (e.g. my-store.myshopify.com) */
  shopDomain?: string;
  features?: ShopifyFeatures;
  widget?: {
    agentName?: string;
    agentTitle?: string;
    mode?: 'text' | 'voice';
  };
}

/** Shopify cart item as returned by Cart AJAX API */
export interface ShopifyCartItem {
  id: number;
  variant_id: number;
  product_id: number;
  title: string;
  quantity: number;
  price: number;
  handle: string;
}

/** Shopify cart state from /cart.js */
export interface ShopifyCart {
  token: string;
  item_count: number;
  total_price: number;
  currency: string;
  items: ShopifyCartItem[];
}
