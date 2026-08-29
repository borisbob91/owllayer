import { Routes, Route, useNavigate } from 'react-router-dom';
import { OwlLayerProvider, useNavigationTool, useAgentToolResolver, useAgentContext, PluginDevPanel } from '@owllayer/react';
import type { PluginEntry } from '@owllayer/core';
import { DemoCRMPlugin } from '@owllayer-plugins/demo-crm';
import { BarChartReactPlugin } from '@owllayer-plugins/bar-chart/react';
import { FormFillerReactPlugin } from '@owllayer-plugins/form-filler/react';
import { ScrollPlugin } from '@owllayer-plugins/scroll';
import { z } from 'zod';
import { products, getProduct } from './data/products';
import { useCart } from './data/cart';
import { useWishlist } from './data/wishlist';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ProductPage } from './pages/ProductPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import { WishlistPage } from './pages/WishlistPage';
import { PluginsPage } from './pages/PluginsPage';
import { ChatPanel } from './components/ChatPanel';
import { AgentToolbar } from './components/AgentToolbar';
import { LiveKitRoomButton } from './components/LiveKitRoomButton';

const OWLLAYER_ENDPOINT = import.meta.env.VITE_OWLLAYER_ENDPOINT || 'ws://localhost:4001/owllayer';
const OWLLAYER_API_KEY_DISABLED = import.meta.env.VITE_OWLLAYER_DISABLE_API_KEY === 'true';
const OWLLAYER_API_KEY = OWLLAYER_API_KEY_DISABLED ? '' : (import.meta.env.VITE_OWLLAYER_API_KEY || '');
const USE_DEFAULT_WIDGET = import.meta.env.VITE_USE_DEFAULT_WIDGET === 'true';

import { useI18n } from './i18n';

/**
 * AppTools - Tools globaux enregistres une fois, disponibles sur toutes les pages.
 * Doit etre rendu a l'interieur de OwlLayerProvider.
 */
function AppTools() {
  const navigate = useNavigate();
  const { addToCart, items, total, itemCount } = useCart();
  const {
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    isInWishlist,
    items: wishlistItems,
    count: wishlistCount,
  } = useWishlist();
  const { t, locale, format, getProductName, formatPrice } = useI18n();

  // Navigation globale — description dynamique avec toutes les routes de l'app
  useNavigationTool(({ url }) => navigate(url), {
    description: t.nav.routesDescription,
  });

  // Contexte de rôle dynamique — indique au LLM qu'il est en mode boutique et sa langue active
  useAgentContext({
    role: 'shopping',
    description: t.agent.roleDescription,
    language: locale,
    currency: t.common.currency,
  });

  // ============================================================
  // useAgentToolResolver — tous les tools globaux centralises
  // Groupe cart : panier | Groupe wishlist : favoris
  // ============================================================
  useAgentToolResolver(
    {
      // --------------------------------------------------------
      // Groupe 1 : Panier
      // --------------------------------------------------------
      cart: {
        tools: {
          add_to_cart: {
            description: `${t.agent.addToCartDesc} (${products
              .map((p) => `${getProductName(p)} [id:${p.id}, ${formatPrice(p.price)}, stock:${p.stock}]`)
              .join(' | ')}).`,
            schema: z.object({
              productId: z.string().describe(t.agent.productIdAddToCartParam),
              quantity: z.number().min(1).default(1).describe(t.agent.quantityParam),
            }),
            risk: 'low',
            handler: async ({ productId, quantity = 1 }) => {
              const product = getProduct(productId);
              if (!product)
                return { success: false, error: format(t.agent.productNotFound, { id: productId }) };
              if (quantity > product.stock)
                return { success: false, error: format(t.agent.stockInsufficient, { stock: product.stock }) };
              addToCart(product, quantity);
              return {
                success: true,
                message: format(t.agent.productAddedToCart, { quantity, name: getProductName(product) }),
                subtotal: formatPrice(product.price * quantity),
              };
            },
          },
          cart_summary: {
            description: t.agent.cartSummaryDesc,
            schema: z.object({}),
            risk: 'none',
            handler: async () => ({
              itemCount,
              total: formatPrice(total),
              items: items.map((i) => ({
                id: i.product.id,
                name: getProductName(i.product),
                quantity: i.quantity,
                subtotal: formatPrice(i.product.price * i.quantity),
              })),
              empty: items.length === 0,
            }),
          },
          go_to_checkout: {
            description: t.agent.goToCheckoutDesc,
            schema: z.object({}),
            risk: 'none',
            handler: async () => {
              if (itemCount === 0)
                return { success: false, message: t.cart.emptyTitle };
              navigate('/checkout');
              return {
                success: true,
                message: `${t.checkout.title}. ${itemCount} ${t.common.items}, ${formatPrice(total)}.`,
              };
            },
          },
        },
      },

      // --------------------------------------------------------
      // Groupe 2 : Favoris
      // --------------------------------------------------------
      wishlist: {
        tools: {
          add_to_wishlist: {
            description: `${t.agent.addToWishlistDesc} (${products
              .map((p) => `${getProductName(p)} [id:${p.id}]`)
              .join(' | ')}).`,
            schema: z.object({
              productId: z.string().describe(t.agent.productIdParam),
            }),
            risk: 'high',
            handler: async ({ productId }) => {
              const product = getProduct(productId);
              if (!product) return { success: false, error: format(t.agent.productNotFound, { id: productId }) };
              const name = getProductName(product);
              if (isInWishlist(productId))
                return { success: false, message: format(t.agent.alreadyInWishlist, { name }) };
              addToWishlist(product);
              return { success: true, message: format(t.agent.addedToWishlist, { name }) };
            },
          },
          remove_from_wishlist: {
            description: t.agent.removeFromWishlistDesc,
            schema: z.object({
              productId: z.string().describe(t.agent.productIdRemoveWishlistParam),
            }),
            risk: 'none',
            handler: async ({ productId }) => {
              if (!isInWishlist(productId))
                return { success: false, message: t.agent.productNotFound };
              removeFromWishlist(productId);
              return { success: true, message: t.agent.removedFromWishlist };
            },
          },
          wishlist_summary: {
            description: t.agent.wishlistSummaryDesc,
            schema: z.object({}),
            risk: 'none',
            handler: async () => ({
              count: wishlistCount,
              empty: wishlistCount === 0,
              products: wishlistItems.map((p) => ({
                id: p.id,
                name: getProductName(p),
                price: formatPrice(p.price),
              })),
            }),
          },
          move_to_cart: {
            description: t.agent.moveToCartDesc,
            schema: z.object({
              productId: z.string().describe(t.agent.productIdMoveToCartParam),
              quantity: z.number().min(1).default(1).describe(t.agent.quantityParam),
            }),
            risk: 'low',
            handler: async ({ productId, quantity = 1 }) => {
              const product = getProduct(productId);
              if (!product) return { success: false, error: format(t.agent.productNotFound, { id: productId }) };
              if (!isInWishlist(productId))
                return { success: false, message: format(t.agent.productNotFound, { id: productId }) };
              addToCart(product, quantity);
              removeFromWishlist(productId);
              return { success: true, message: format(t.agent.movedToCart, { name: getProductName(product) }) };
            },
          },
          clear_wishlist: {
            description: t.agent.clearWishlistDesc,
            schema: z.object({}),
            risk: 'low',
            handler: async () => {
              clearWishlist();
              return { success: true, message: t.agent.wishlistCleared };
            },
          },
        },
      },
    },
    { global: true }
  );

  return null;
}

const DEMO_PLUGINS: PluginEntry[] = [
  [DemoCRMPlugin, { apiUrl: '/mock', tenantId: 'demo' }] as PluginEntry,
  [BarChartReactPlugin, { theme: 'dark', color: '#7c3aed' }] as PluginEntry,
  [FormFillerReactPlugin, { theme: 'dark', accentColor: '#7c3aed' }] as PluginEntry,
  [ScrollPlugin, { defaultBehavior: 'smooth' }] as PluginEntry,
];

export default function App() {
  return (
    <OwlLayerProvider
      apiKey={OWLLAYER_API_KEY}
      endpoint={OWLLAYER_ENDPOINT}
      plugins={DEMO_PLUGINS}
      config={{
        voice: true,
        debug: true,
        virtualLines: false,
        approvalBanner: true,
        widget: USE_DEFAULT_WIDGET
          ? {
              enabled: true,
              config: { stylePreset: 'travel', mode: 'audio', allowModeSwitch: true },
            }
          : undefined,
      }}
    >
      <AppTools />
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/confirmation/:orderId" element={<ConfirmationPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/plugins" element={<PluginsPage />} />
        </Routes>
      </Layout>

      {/* UI Agentique flottante */}
      {!USE_DEFAULT_WIDGET && <ChatPanel />}
      <LiveKitRoomButton />
      <AgentToolbar />
      {import.meta.env.DEV && <PluginDevPanel plugins={DEMO_PLUGINS} position="bottom-left" />}
    </OwlLayerProvider>
  );
}
