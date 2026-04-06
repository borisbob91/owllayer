// UI-specific types for the ShopifyWidget
// Separate from the main types.ts to keep e-commerce API types clean

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

// ─── UI Product types (simplified view layer, independent of Storefront API) ─

export interface UIProduct {
  id: string;
  handle: string;
  title: string;
  price: string;
  compareAtPrice?: string;
  imageUrl: string;
  description?: string;
  available: boolean;
  vendor?: string;
  variants?: UIVariant[];
}

export interface UIVariant {
  id: string;
  title: string;
  available: boolean;
  price: string;
}

export interface UICartItem {
  id: string;
  variantId?: string;
  title: string;
  price: string;
  imageUrl: string;
  quantity: number;
}

// ─── Layout / Panel state ────────────────────────────────────────────────────

export type PanelView =
  | { type: 'none' }
  | { type: 'products'; products: UIProduct[]; query?: string }
  | { type: 'product-detail'; product: UIProduct }
  | { type: 'cart'; items: UICartItem[] }
  | { type: 'upsell'; product: UIProduct; reason: string };

// ─── Custom events dispatched by UITools → consumed by ShopifyWidgetApp ──────

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
