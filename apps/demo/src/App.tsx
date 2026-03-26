import { Routes, Route, useNavigate } from 'react-router-dom';
import { DomOSProvider, useNavigationTool, useAgentToolResolver, useAgentContext } from '@domos/react';
import { DemoCRMPlugin } from '@domos-plugins/demo-crm';
import { BarChartReactPlugin, type BarChartDataPoint } from '@domos-plugins/bar-chart/react';
import { FormFillerReactPlugin, type MultiStepFormProps } from '@domos-plugins/form-filler/react';
import { usePluginComponents, PluginDevPanel } from '@domos/react';
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
] as const;

const CHECKOUT_STEPS: MultiStepFormProps['steps'] = [
  {
    id: 'contact',
    title: 'Contact',
    fields: [
      { name: 'email', label: 'Email', type: 'email', placeholder: 'alice@example.com', required: true },
      { name: 'firstName', label: 'Prénom', type: 'text', placeholder: 'Alice', required: true },
      { name: 'phone', label: 'Téléphone', type: 'tel', placeholder: '+33 6 12 34 56 78' },
    ],
  },
  {
    id: 'livraison',
    title: 'Livraison',
    fields: [
      { name: 'address', label: 'Adresse', type: 'text', placeholder: '12 rue de la Paix', required: true },
      { name: 'city', label: 'Ville', type: 'text', placeholder: 'Paris', required: true },
      {
        name: 'country',
        label: 'Pays',
        type: 'select',
        options: [
          { value: 'fr', label: 'France' },
          { value: 'be', label: 'Belgique' },
          { value: 'ch', label: 'Suisse' },
          { value: 'lu', label: 'Luxembourg' },
        ],
      },
      { name: 'notes', label: 'Instructions de livraison', type: 'textarea', placeholder: 'Code portail, étage...' },
    ],
  },
  {
    id: 'paiement',
    title: 'Paiement',
    fields: [
      { name: 'cardName', label: 'Nom sur la carte', type: 'text', placeholder: 'ALICE DUPONT', required: true },
      { name: 'cardNumber', label: 'Numéro de carte', type: 'text', placeholder: '4242 4242 4242 4242', required: true },
      { name: 'expiry', label: 'Expiration', type: 'text', placeholder: 'MM/AA', required: true },
      { name: 'cvv', label: 'CVV', type: 'text', placeholder: '123' },
    ],
  },
];

function FormSection() {
  const { MultiStepForm } = usePluginComponents<{ MultiStepForm: (props: MultiStepFormProps) => JSX.Element | null }>(FormFillerReactPlugin);
  if (!MultiStepForm) return null;
  return (
    <div style={{ padding: '24px 16px', display: 'flex', justifyContent: 'center' }}>
      <MultiStepForm
        formId="checkout"
        steps={CHECKOUT_STEPS}
        theme="dark"
        accentColor="#7c3aed"
        onSubmit={(values) => console.log('[DomOS Demo] Form submitted:', values)}
      />
    </div>
  );
}

const DEMO_CHART_DATA: BarChartDataPoint[] = [
  { label: 'Jan', value: 1200 },
  { label: 'Fév', value: 1850 },
  { label: 'Mar', value: 1430 },
  { label: 'Avr', value: 2100 },
  { label: 'Mai', value: 1675 },
  { label: 'Jun', value: 2340 },
];

function ChartSection() {
  const { BarChart } = usePluginComponents<{ BarChart: (props: { data: BarChartDataPoint[]; title?: string }) => JSX.Element | null }>(BarChartReactPlugin);
  if (!BarChart) return null;
  return (
    <div style={{ padding: '16px', maxWidth: '480px', margin: '0 auto' }}>
      <BarChart data={DEMO_CHART_DATA} title="Ventes mensuelles" />
    </div>
  );
}

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
        </Routes>
      </Layout>

      {/* UI Agentique flottante */}
      {!USE_DEFAULT_WIDGET && <ChatPanel />}
      <AgentToolbar />
      <ChartSection />
      <FormSection />
      {import.meta.env.DEV && <PluginDevPanel plugins={DEMO_PLUGINS} />}
    </DomOSProvider>
  );
}
