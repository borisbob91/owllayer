/** UI-layer types for WooWidget — independent from the Store API data layer. */

export type AgentState =
  | 'connecting'
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'streaming'
  | 'error';

export interface UIMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  streaming?: boolean;
}

export interface UIVariant {
  id: string;
  title: string;
  available: boolean;
  price: string;
}

/** Normalised product for the UI — mapped from WooProduct. */
export interface UIProduct {
  /** String(wooProduct.id) */
  id: string;
  /** wooProduct.slug */
  handle: string;
  /** wooProduct.name */
  title: string;
  /** Formatted from prices.price (minor units ÷ 100) */
  price: string;
  compareAtPrice?: string;
  /** wooProduct.images[0]?.src ?? '' */
  imageUrl: string;
  /** short_description with HTML stripped */
  description?: string;
  /** wooProduct.is_in_stock */
  available: boolean;
  vendor?: string;
  variants?: UIVariant[];
}

/** Normalised cart item for the UI — mapped from WooCartItem. */
export interface UICartItem {
  /** wooCartItem.key */
  id: string;
  title: string;
  /** Formatted from prices.price (minor units ÷ 100) */
  price: string;
  imageUrl: string;
  quantity: number;
  variantId?: string;
}

export type PanelView =
  | { type: 'none' }
  | { type: 'products'; products: UIProduct[]; query?: string }
  | { type: 'product-detail'; product: UIProduct }
  | { type: 'cart'; items: UICartItem[] }
  | { type: 'upsell'; product: UIProduct; reason: string }
  | { type: 'checkout' };

// ── Custom event detail shapes (UITools → WooWidgetApp) ───────────────────────

export interface UIShowProductsDetail {
  products: UIProduct[];
  query?: string;
}

export interface UIShowProductDetailDetail {
  product: UIProduct;
}

export interface UIShowCartDetail {
  items: UICartItem[];
}

export interface UIShowNotificationDetail {
  message: string;
  variant: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
}

export interface UIShowUpsellDetail {
  product: UIProduct;
  reason: string;
}

// ── Cart update event (CartContextSync → WooWidgetApp) ────────────────────────

export interface UICartUpdatedDetail {
  items: UICartItem[];
  count: number;
}
