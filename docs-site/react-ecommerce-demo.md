# React E-Commerce Demo Tutorial — Step-by-Step Guide

This guide walks you through setting up, configuring, and testing the **OwlLayer React E-Commerce ShopMate Application** (`apps/demo-react`) connected to the AITP WebSocket server (`apps/demo-server`).

You will learn how to prepare the test environment, configure environment variables, implement a **complete Internationalization (i18n) architecture** (English 🇬🇧 & French 🇫🇷) across both client and server, declare reactive tools (`useAgentToolResolver`, `useNavigationTool`), manage dynamic context (`useAgentContext`), handle **Human-in-the-Loop (HITL)** approvals, enable voice mode (`useVoiceMode` & `VoiceOverlay`), and format rich Markdown chat responses.

---

## ⚡ TL;DR — 2-Minute Quick Start

Get the full demo environment running in 3 minimal steps with zero code modifications:

```bash
# 1. Install dependencies & build packages
pnpm install && pnpm build:packages

# 2. Set up environment files (only your Gemini API key is needed)
cp apps/demo-server/.env.example apps/demo-server/.env
# Edit apps/demo-server/.env -> set GOOGLE_API_KEY=your_gemini_api_key

cp apps/demo-react/.env.example apps/demo-react/.env

# 3. Start both the AITP Server & the React Store
pnpm --filter @owllayer/demo-server dev & pnpm --filter @owllayer/demo-react dev
```

👉 Open **`http://localhost:4100`** in your browser!
- **Automatic Connection**: The pre-configured demo API key (`pk_demo_local`) connects immediately.
- **Instant Language Switching**: Toggle between 🇬🇧 **EN** and 🇫🇷 **FR** anytime from the top navigation bar.

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                 React E-Commerce ShopMate (Port 4100)                  │
│                                                                        │
│  - i18n Store (useI18n): EN 🇬🇧 / FR 🇫🇷 with LocalStorage persistence   │
│  - Layout.tsx: Instant Language Switcher & localized navigation        │
│  - App.tsx: Dynamic useAgentContext, useNavigationTool, ToolResolver   │
│  - HomePage.tsx: Localized catalog, search & category filtering tools  │
│  - ProductPage.tsx: Product details & localized cart/wishlist tools    │
│  - CartPage.tsx: Reactive cart quantity & removal tools                │
│  - WishlistPage.tsx: Saved items management & quick move-to-cart       │
│  - CheckoutPage.tsx: Multi-step checkout with HITL payment confirmation│
│  - PluginsPage.tsx: Dynamic BarChart and FormFiller plugins            │
│  - ChatPanel.tsx & VoiceOverlay.tsx:                                   │
│      ├── useVoiceMode (Live audio) / useAgent (Text fallback)          │
│      ├── LiveKitRoomButton.tsx (Optional WebRTC Voice Room)            │
│      └── MarkdownText.tsx (Safe HTML & table sanitization)             │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │  WebSocket AITP Protocol
                                    │  ws://localhost:4001/owllayer
┌───────────────────────────────────▼────────────────────────────────────┐
│                      OwlLayer Server (Port 4001)                       │
│                                                                        │
│  - Server i18n (serverMessages): English & French system prompts       │
│  - Dynamic Audio Config: STT (en-US / fr-FR) & TTS Neural2 voices      │
│  - OwlLayerServer + SecurityMiddleware (HITL approval engine)          │
│  - GoogleAdapter (Gemini Live & Gemini 3.6-flash fallback)             │
│  - Localized Server Tools (get_server_time, get_store_info)           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Test Environment Requirements & Configuration

### Prerequisites
- **Node.js**: v18+ or v20+
- **pnpm**: v9+
- **Google Gemini API Key**: Obtain an API key from [Google AI Studio](https://aistudio.google.com/)

### A. Demo Server Configuration (`apps/demo-server/.env`)

Create or update `apps/demo-server/.env`:

```env
PORT=4001
OWLLAYER_PORT=4001
LOG_LEVEL=info

# Default server language (en or fr)
DEFAULT_LANGUAGE=en

# Google Gemini API & Model Configuration
GOOGLE_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.6-flash

# AITP API Keys (React Demo app)
OWLLAYER_REQUIRE_API_KEY=true
OWLLAYER_API_KEY=pk_demo_local

# LiveKit allowed origins (if using voice rooms)
OWLLAYER_LIVEKIT_ALLOWED_ORIGINS=http://localhost:4100,http://localhost:4200,http://localhost:4300
```

::: tip Model Selection & Quotas
Use `GEMINI_MODEL=gemini-3.6-flash` for high-speed tool execution with generous rate limits on Google AI Studio.
:::

### B. React Client Configuration (`apps/demo-react/.env`)

Configure the WebSocket endpoint, API key, and initial language in `apps/demo-react/.env`:

```env
# OwlLayer React Demo Configuration
VITE_OWLLAYER_ENDPOINT=ws://localhost:4001/owllayer
VITE_OWLLAYER_API_KEY=pk_demo_local
VITE_APP_LANGUAGE=en
VITE_USE_DEFAULT_WIDGET=false
```

---

## 2. Core Implementation Patterns

### Step 1: Fully Typed i18n Dictionary (`apps/demo-react/src/i18n/index.tsx`)

All UI strings, Zod tool parameter descriptions, error messages, and context metadata are centralized in a strongly typed dictionary:

```tsx
// apps/demo-react/src/i18n/index.tsx
export const translations = {
  en: {
    common: { appName: 'OwlLayer Store', ... },
    nav: { catalog: 'Catalog', cart: 'Cart', wishlist: 'Wishlist', ... },
    pages: { catalog: 'catalog', productDetail: 'product_detail', cart: 'cart', ... },
    agent: {
      addToCartDesc: 'Add a product to the shopping cart by ID',
      productIdParam: 'Product ID (e.g. casque-bt-pro, clavier-meca)',
      productAddedToCart: '{name} added to cart.',
      ...
    },
    livekit: {
      joinRoom: 'Join Voice Room',
      micActive: 'Mic active',
      micMuted: 'Mic muted',
      ...
    },
  },
  fr: {
    common: { appName: 'Boutique OwlLayer', ... },
    nav: { catalog: 'Catalogue', cart: 'Panier', wishlist: 'Favoris', ... },
    pages: { catalog: 'catalogue', productDetail: 'fiche_produit', cart: 'panier', ... },
    agent: {
      addToCartDesc: 'Ajouter un produit au panier via son identifiant',
      productIdParam: 'Identifiant du produit (ex: casque-bt-pro, clavier-meca)',
      productAddedToCart: '{name} ajouté au panier.',
      ...
    },
    livekit: {
      joinRoom: 'Rejoindre le salon vocal',
      micActive: 'Micro actif',
      micMuted: 'Micro coupé',
      ...
    },
  },
};
```

### Step 2: Global Navigation & Tool Resolvers (`apps/demo-react/src/App.tsx`)

Tools are registered declaratively using `useNavigationTool` and `useAgentToolResolver`:

```tsx
// apps/demo-react/src/App.tsx
function AppTools() {
  const navigate = useNavigate();
  const { addToCart, items, total } = useCart();
  const { addToWishlist, removeFromWishlist } = useWishlist();
  const { t, locale, format, getProductName } = useI18n();

  // Dynamic navigation tool
  useNavigationTool(({ url }) => navigate(url), {
    description: t.nav.routesDescription,
  });

  // Dynamic context for the LLM
  useAgentContext({
    role: 'shopping',
    description: t.agent.roleDescription,
    language: locale,
    currency: t.common.currency,
  });

  // Centralized tools
  useAgentToolResolver(
    createResolverFromSwitch([
      {
        name: 'cart_add',
        description: t.agent.addToCartDesc,
        schema: z.object({
          productId: z.string().describe(t.agent.productIdAddToCartParam),
          quantity: z.number().int().min(1).default(1).describe(t.agent.quantityParam),
        }),
        handler: async ({ productId, quantity }) => {
          const product = getProduct(productId);
          if (!product) return { error: format(t.agent.productNotFound, { id: productId }) };
          addToCart(product, quantity);
          return {
            success: true,
            message: format(t.agent.productAddedToCartWithQty, {
              quantity,
              name: getProductName(product),
            }),
          };
        },
      },
    ])
  );
}
```

### Step 3: Human-in-the-Loop (HITL) on Sensitive Actions (`apps/demo-react/src/pages/CheckoutPage.tsx`)

Actions with high risk (e.g. payment and order processing) are guarded with `risk: 'high'` so that the user must approve the action in the UI before execution:

```tsx
// apps/demo-react/src/pages/CheckoutPage.tsx
useAgentTool(
  {
    name: 'checkout_place_order',
    description: t.agent.placeOrderDesc,
    risk: 'high', // Requires user confirmation in overlay
    schema: z.object({
      confirm: z.boolean().describe(t.agent.confirmPaymentParam),
    }),
  },
  async ({ confirm }) => {
    if (!confirm) return { error: t.agent.orderCancelledByUser };
    const order = placeOrder({
      shipping: shippingInfo,
      payment: { cardName, cardNumber, expiry, cvv },
      items,
      total,
    });
    clearCart();
    navigate(`/confirmation/${order.id}`);
    return { success: true, orderId: order.id, total: formatPrice(order.total) };
  }
);
```

---

## 3. Testing Scenarios & Prompts

Test these real-world interactions in either English or French:

### Scenario 1: Product Discovery & Cart Manipulation
- **User Prompt (EN)**: *"Show me the wireless headphones and add 2 units to my shopping cart."*
- **User Prompt (FR)**: *"Montre-moi le casque sans fil et ajoute 2 exemplaires à mon panier."*
- **Expected Agent Behavior**:
  1. Invokes `navigation({ url: '/product/casque-bt-pro' })`.
  2. Invokes `cart_add({ productId: 'casque-bt-pro', quantity: 2 })`.
  3. Responds with confirmation and updated cart subtotal.

### Scenario 2: Wishlist Management
- **User Prompt (EN)**: *"Save the mechanical keyboard to my wishlist and navigate to my favorites."*
- **User Prompt (FR)**: *"Mets le clavier mécanique dans mes favoris et emmène-moi sur ma liste de souhaits."*
- **Expected Agent Behavior**:
  1. Invokes `wishlist_add({ productId: 'clavier-meca' })`.
  2. Invokes `navigation({ url: '/wishlist' })`.
  3. Highlights the saved item in markdown.

### Scenario 3: Automated Checkout Flow with HITL
- **User Prompt (EN)**: *"Fill in my shipping address as Alice Smith, 12 Broadway St, New York, US and proceed to checkout."*
- **User Prompt (FR)**: *"Remplis l'adresse de livraison pour Alice Dupont, 12 rue de la Paix, Paris, France et valide la commande."*
- **Expected Agent Behavior**:
  1. Navigates to `/checkout`.
  2. Fills in shipping details via `checkout_set_shipping_info`.
  3. Requests `checkout_place_order` -> prompts the user with the HITL confirmation dialog before charging.

---

## 4. Verification Checklist

- [x] React demo renamed to `@owllayer/demo-react` in `apps/demo-react/`.
- [x] All inline `locale === 'fr'` conditions replaced with centralized dictionary keys in `src/i18n/index.tsx`.
- [x] Markdown text rendering safe against XSS attacks.
- [x] Dynamic `useAgentContext` active on every page.
- [x] Full build passes with exit code 0 (`pnpm --filter @owllayer/demo-react build`).
