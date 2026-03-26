import { Routes, Route, useNavigate } from 'react-router-dom';
import { DomOSProvider, useNavigationTool, useAgentToolResolver, useAgentContext, PluginDevPanel } from '@domos/react';
import { DemoCRMPlugin } from '@domos-plugins/demo-crm';
import { BarChartReactPlugin } from '@domos-plugins/bar-chart/react';
import { FormFillerReactPlugin } from '@domos-plugins/form-filler/react';
import { ScrollPlugin } from '@domos-plugins/scroll';
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

const DOMOS_ENDPOINT = import.meta.env.VITE_DOMOS_ENDPOINT || 'ws://localhost:4001/domos';
const DOMOS_API_KEY_DISABLED = import.meta.env.VITE_DOMOS_DISABLE_API_KEY === 'true';
const DOMOS_API_KEY = DOMOS_API_KEY_DISABLED ? '' : (import.meta.env.VITE_DOMOS_API_KEY || '');
const USE_DEFAULT_WIDGET = import.meta.env.VITE_USE_DEFAULT_WIDGET === 'true';

/**
 * AppTools - Tools globaux enregistres une fois, disponibles sur toutes les pages.
 * Doit etre rendu a l'interieur de DomOSProvider.
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

  // Navigation globale — description avec toutes les routes de l'app
  useNavigationTool(({ url }) => navigate(url), {
    description:
      "Naviguer vers une page de l'app. Routes disponibles : " +
      "/ (catalogue, page d'accueil), " +
      "/product/:id (fiche produit — remplacer :id par l'id du produit ex: /product/casque-bt-pro), " +
      "/cart (panier, voir les articles), " +
      "/wishlist (favoris, liste de souhaits), " +
      "/checkout (paiement, finaliser la commande). " +
      "Utiliser navigate pour changer de page sans recharger.",
  });

  // Contexte de rôle — indique au LLM qu'il est en mode boutique
  useAgentContext({
    role: 'shopping',
    description: "Tu es l'assistant de la boutique DomOS, une boutique en ligne de périphériques informatiques. Tu aides les clients à trouver des produits, gérer leur panier et finaliser leurs commandes.",
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
            description: `Ajouter un produit au panier. Catalogue : ${products
              .map((p) => `${p.name} (id:${p.id}, ${p.price}EUR, stock:${p.stock})`)
              .join(' | ')}.`,
            schema: z.object({
              productId: z.string().describe('ID du produit a ajouter'),
              quantity: z.number().min(1).default(1).describe('Quantite (defaut: 1)'),
            }),
            risk: 'low',
            handler: async ({ productId, quantity = 1 }) => {
              const product = getProduct(productId);
              if (!product)
                return { success: false, error: `Produit "${productId}" introuvable.` };
              if (quantity > product.stock)
                return { success: false, error: `Stock insuffisant (${product.stock} dispo).` };
              addToCart(product, quantity);
              return {
                success: true,
                message: `${quantity}x ${product.name} ajoute au panier.`,
                subtotal: (product.price * quantity).toFixed(2) + ' EUR',
              };
            },
          },
          cart_summary: {
            description: "Resume du panier : articles, quantites et total.",
            schema: z.object({}),
            risk: 'none',
            handler: async () => ({
              itemCount,
              total: total.toFixed(2) + ' EUR',
              items: items.map((i) => ({
                id: i.product.id,
                name: i.product.name,
                quantity: i.quantity,
                subtotal: (i.product.price * i.quantity).toFixed(2) + ' EUR',
              })),
              empty: items.length === 0,
            }),
          },
          go_to_checkout: {
            description: 'Naviguer vers le checkout pour finaliser la commande.',
            schema: z.object({}),
            risk: 'none',
            handler: async () => {
              if (itemCount === 0)
                return { success: false, message: 'Le panier est vide.' };
              navigate('/checkout');
              return {
                success: true,
                message: `Checkout ouvert. ${itemCount} article(s), ${total.toFixed(2)} EUR.`,
              };
            },
          },
        },
      },

      // --------------------------------------------------------
      // Groupe 2 : Favoris (nouvelle feature)
      // --------------------------------------------------------
      wishlist: {
        tools: {
          add_to_wishlist: {
            description: `Ajouter un produit aux favoris pour plus tard. Catalogue : ${products
              .map((p) => `${p.name} (id:${p.id})`)
              .join(' | ')}.`,
            schema: z.object({
              productId: z.string().describe('ID du produit a mettre en favori'),
            }),
            risk: 'high',
            handler: async ({ productId }) => {
              const product = getProduct(productId);
              if (!product) return { success: false, error: `Produit "${productId}" introuvable.` };
              if (isInWishlist(productId))
                return { success: false, message: `${product.name} est deja dans les favoris.` };
              addToWishlist(product);
              return { success: true, message: `${product.name} ajoute aux favoris.` };
            },
          },
          remove_from_wishlist: {
            description: 'Retirer un produit des favoris.',
            schema: z.object({
              productId: z.string().describe('ID du produit a retirer des favoris'),
            }),
            risk: 'none',
            handler: async ({ productId }) => {
              if (!isInWishlist(productId))
                return { success: false, message: 'Produit pas dans les favoris.' };
              removeFromWishlist(productId);
              return { success: true, message: 'Retire des favoris.' };
            },
          },
          wishlist_summary: {
            description: 'Lister tous les produits en favoris.',
            schema: z.object({}),
            risk: 'none',
            handler: async () => ({
              count: wishlistCount,
              empty: wishlistCount === 0,
              products: wishlistItems.map((p) => ({
                id: p.id,
                name: p.name,
                price: p.price.toFixed(2) + ' EUR',
              })),
            }),
          },
          move_to_cart: {
            description: 'Deplacer un produit des favoris directement dans le panier.',
            schema: z.object({
              productId: z.string().describe('ID du produit favori a deplacer dans le panier'),
              quantity: z.number().min(1).default(1).describe('Quantite'),
            }),
            risk: 'low',
            handler: async ({ productId, quantity = 1 }) => {
              const product = getProduct(productId);
              if (!product) return { success: false, error: 'Produit introuvable.' };
              if (!isInWishlist(productId))
                return { success: false, message: 'Produit pas dans les favoris.' };
              addToCart(product, quantity);
              removeFromWishlist(productId);
              return { success: true, message: `${product.name} deplace dans le panier.` };
            },
          },
          clear_wishlist: {
            description: 'Vider completement la liste de favoris.',
            schema: z.object({}),
            risk: 'low',
            handler: async () => {
              clearWishlist();
              return { success: true, message: 'Favoris vides.' };
            },
          },
        },
      },
    },
    { global: true }
  );

  return null;
}

const DEMO_PLUGINS = [
  [DemoCRMPlugin, { apiUrl: '/mock', tenantId: 'demo' }],
  [BarChartReactPlugin, { theme: 'dark', color: '#7c3aed' }],
  [FormFillerReactPlugin, { theme: 'dark', accentColor: '#7c3aed' }],
  [ScrollPlugin, { defaultBehavior: 'smooth' }],
] as const;

export default function App() {
  return (
    <DomOSProvider
      apiKey={DOMOS_API_KEY}
      endpoint={DOMOS_ENDPOINT}
      plugins={DEMO_PLUGINS}
      config={{
        voice: true,
        debug: true,
        virtualLines: false,
        approvalBanner: false,
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
      <AgentToolbar />
      {import.meta.env.DEV && <PluginDevPanel plugins={DEMO_PLUGINS} />}
    </DomOSProvider>
  );
}
