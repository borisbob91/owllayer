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

/** Variation attribute (WooCommerce Store API format) */
export interface WooVariationAttribute {
  attribute: string;
  value: string;
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
  coupons?: Array<{
    code: string;
    totals?: { total_discount?: string; currency_code?: string };
  }>;
}

// ─── Product types (Store API v1 ProductSchema) ───────────────────────────────

export interface WooProductCategory {
  id: number;
  name: string;
  slug: string;
  link: string;
}

export interface WooProductTerm {
  id: number;
  name: string;
  slug: string;
}

export interface WooProductAttribute {
  id: number;
  name: string;
  taxonomy: string | null;
  has_variations: boolean;
  terms: WooProductTerm[];
}

export interface WooProductVariation {
  id: number;
  /** Attribute name → value for this variation (null = "any") */
  attributes: Array<{ name: string; value: string | null }>;
}

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  parent: number;
  type: string;
  permalink: string;
  sku: string;
  short_description: string;
  description: string;
  on_sale: boolean;
  prices: {
    price: string;
    regular_price: string;
    sale_price: string;
    price_range: { min_amount: string; max_amount: string } | null;
    currency_code: string;
    currency_minor_unit: number;
  };
  categories: WooProductCategory[];
  attributes: WooProductAttribute[];
  /** Variation IDs + their attribute combinations (variable products only) */
  variations: WooProductVariation[];
  has_options: boolean;
  is_purchasable: boolean;
  is_in_stock: boolean;
  is_on_backorder: boolean;
  low_stock_remaining: number | null;
}
