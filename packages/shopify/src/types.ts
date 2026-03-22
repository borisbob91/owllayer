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
  /**
   * Shopify Storefront API version to use.
   * Defaults to '2026-01'. Set to '2024-01' if you encounter compatibility issues.
   */
  storefrontApiVersion?: '2026-01' | '2024-01';
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

// ─── Storefront API response types (Sprint 3+) ──────────────────────────────

export interface StorefrontProductVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  quantityAvailable?: number;
  price: { amount: string; currencyCode: string };
  selectedOptions?: Array<{ name: string; value: string }>;
}

export interface StorefrontProduct {
  id: string;
  handle: string;
  title: string;
  description?: string;
  availableForSale: boolean;
  productType: string;
  tags: string[];
  vendor: string;
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
  compareAtPriceRange?: { minVariantPrice: { amount: string } };
  featuredImage: { url: string; altText: string | null } | null;
  images?: { edges: Array<{ node: { url: string; altText: string | null } }> };
  variants: { edges: Array<{ node: StorefrontProductVariant }> };
}

export interface SearchProductsOptions {
  limit?: number;
  productType?: string;
  tag?: string;
  minPrice?: number;
  maxPrice?: number;
}

// ─── Customer context (Sprint 4+) ────────────────────────────────────────────

/** Customer state readable from the storefront (window.__st). */
export interface ShopifyCustomerContext {
  isLoggedIn: boolean;
  /** Shopify customer numeric ID, present only when logged in. */
  id?: string;
}

/**
 * Optional customer access token injectable via Liquid for order tracking.
 * In theme.liquid: <script>window.__domos_customer_token = {{ customer.access_token | json }};</script>
 * Only available on stores using Shopify's legacy customer accounts with token injection.
 */
export interface DomOSCustomerTokenInjection {
  __domos_customer_token?: string;
}
