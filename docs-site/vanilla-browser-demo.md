# Vanilla Browser E-Commerce Demo Tutorial — Step-by-Step Guide

This guide walks you through setting up, configuring, and testing the **OwlLayer Vanilla JS Browser Demo** (`apps/demo-browser`) connected to the AITP WebSocket server (`apps/demo-server`).

You will learn how to integrate the `@owllayer/browser` SDK into standard HTML5 multi-page applications, leverage **HTML Data-Attribute Auto-Discovery** (`data-owllayer-tool`, `data-owllayer-action`), register programmatic tools with `OwlLayer.registerTool`, implement a **complete Internationalization (i18n) architecture** (English 🇬🇧 & French 🇫🇷), manage shopping cart state across pages using `localStorage`, handle **Human-in-the-Loop (HITL)** risk levels on checkout, and run the **embedded voice & chat widget**.

---

## ⚡ TL;DR — 2-Minute Quick Start

Get the Vanilla Browser demo running in 3 minimal steps:

```bash
# 1. Install dependencies & build packages
pnpm install && pnpm build:packages

# 2. Set up environment files (Gemini API key in demo-server)
cp apps/demo-server/.env.example apps/demo-server/.env
# Edit apps/demo-server/.env -> set GOOGLE_API_KEY=your_gemini_api_key

# 3. Start both the AITP Server & the Vanilla Browser E-Commerce App
pnpm --filter @owllayer/demo-server dev & pnpm --filter @owllayer/demo-browser dev
```

👉 Open **`http://localhost:5173`** in your browser!
- **Zero Framework Overhead**: Runs on lightweight Vanilla JS + Tailwind CSS.
- **Auto-Connected**: Connects seamlessly via `startOwlLayer` to `ws://localhost:4001/owllayer`.
- **Instant Language Switching**: Toggle between 🇬🇧 **EN** and 🇫🇷 **FR** anytime from the navbar.
- **Voice & Chat Assistant**: Talk or chat to search products, add items to cart, modify quantities, and complete checkout.

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│             Vanilla Browser E-Commerce App (Port 5173)                 │
│                                                                        │
│  - i18n.js: Centralized dictionary (EN 🇬🇧 / FR 🇫🇷) + LocalStorage        │
│  - Multi-Page Static HTML5 Architecture:                               │
│      ├── index.html + catalogue.js:                                    │
│      │     ├── Product catalog with Unsplash HD photos                 │
│      │     ├── Dynamic categories & keyword search                     │
│      │     └── OwlLayer.registerTool: add_to_cart, search_products     │
│      ├── panier.html + panier.js:                                      │
│      │     ├── Shopping cart table with live subtotals                 │
│      │     └── OwlLayer.registerTool: update_quantity, clear_cart      │
│      └── checkout.html + checkout.js:                                  │
│            ├── Step-by-step shipping & payment simulator               │
│            ├── Data-Attribute Tools: fill_firstName, fill_address...   │
│            └── OwlLayer.registerTool: fill_address, place_order (HITL) │
│  - @owllayer/browser SDK:                                              │
│      ├── Shadow DOM Widget Container (isolated styling)                │
│      ├── Auto-Discovery DOM Observer for data-owllayer-* attributes   │
│      └── VoiceManager: Web Audio API PCM capture & audio output        │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │  WebSocket AITP Protocol
                                    │  ws://localhost:4001/owllayer
┌───────────────────────────────────▼────────────────────────────────────┐
│                      OwlLayer Server (Port 4001)                       │
│                                                                        │
│  - Server i18n: English & French e-commerce agent system prompts       │
│  - OwlLayerServer + SecurityMiddleware (HITL approval engine)          │
│  - GoogleAdapter (Gemini Live & Gemini 2.0 / 3.6 flash models)         │
│  - API Key Registry: Dedicated permissions for pk_browser_demo         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Test Environment Requirements & Configuration

### Prerequisites
- **Node.js**: v18+ or v20+
- **pnpm**: v9+
- **Google Gemini API Key**: Obtain an API key from [Google AI Studio](https://aistudio.google.com/)

### A. Demo Server Configuration (`apps/demo-server/.env`)

Ensure `apps/demo-server/.env` contains your Gemini API key:

```env
PORT=4001
OWLLAYER_PORT=4001
LOG_LEVEL=info

# Default server language (en or fr)
DEFAULT_LANGUAGE=en

# Google Gemini API & Model Configuration
GOOGLE_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash

# AITP API Keys (Browser Demo app)
OWLLAYER_REQUIRE_API_KEY=true
OWLLAYER_BROWSER_API_KEY=pk_browser_demo
```

### B. Vanilla Client Configuration (`apps/demo-browser/src/owllayer.js`)

The SDK initialization helper resolves the endpoint and API key:

```javascript
import { BrowserOwlLayer } from '@owllayer/browser';

const ENDPOINT = import.meta.env.VITE_OWLLAYER_ENDPOINT || 'ws://localhost:4001/owllayer';
const API_KEY  = import.meta.env.VITE_OWLLAYER_API_KEY  || 'pk_browser_demo';

export const OwlLayer = new BrowserOwlLayer({
  endpoint: ENDPOINT,
  apiKey:   API_KEY,
});

export async function startOwlLayer({ role, description, voice = {} }) {
  try {
    await OwlLayer.connect();
    OwlLayer.setContext({
      page: location.pathname,
      pageRole: role,
      pageDescription: description,
    });
  } catch (err) {
    console.warn('[OwlLayer:Browser] Offline mode:', err);
  }
}
```

---

## 2. Multi-Language Support (i18n) in Vanilla JavaScript

The demo includes a centralized translation engine in `src/i18n.js`:

```javascript
export const TRANSLATIONS = {
  fr: {
    nav: { catalogue: 'Catalogue', panier: 'Panier', commande: 'Commande' },
    hero: { title: 'Catalogue', subtitle: 'Démo e-commerce — testez le chat OwlLayer !' },
    product: { addToCart: 'Ajouter au panier', stock: 'en stock' },
    // ...
  },
  en: {
    nav: { catalogue: 'Catalog', panier: 'Cart', commande: 'Checkout' },
    hero: { title: 'Catalog', subtitle: 'E-Commerce Demo — experience OwlLayer voice & text agent!' },
    product: { addToCart: 'Add to cart', stock: 'in stock' },
    // ...
  },
};

export function getLocale() {
  return localStorage.getItem('owllayer_demo_lang_browser') || 'fr';
}

export function setLocale(locale) {
  localStorage.setItem('owllayer_demo_lang_browser', locale);
}
```

### Language Toggle Handler
Every HTML page includes the toggle button:

```javascript
document.getElementById('lang-toggle-btn')?.addEventListener('click', () => {
  const next = getLocale() === 'fr' ? 'en' : 'fr';
  setLocale(next);
  renderLocalizedUI();
  applyFilters();
});
```

---

## 3. Tool Declaration Patterns

The Vanilla Browser SDK provides two complementary ways to expose tools to the AI agent:

### Pattern A: Declarative HTML Data-Attributes
Expose existing DOM elements as AI-invokable tools without writing JavaScript:

```html
<!-- Clickable Action Tool -->
<a href="/"
  data-owllayer-tool="continue_shopping"
  data-owllayer-description="Returns to the catalog to continue shopping."
  data-owllayer-risk="none"
  data-owllayer-action="click">
  Browse Catalog
</a>

<!-- Form Input Field Tool -->
<input id="field-firstName" type="text"
  data-owllayer-tool="fill_firstName"
  data-owllayer-description="Fill in the First Name field"
  data-owllayer-risk="low"
  data-owllayer-action="setValue" />
```

### Pattern B: Programmatic Tool Registration (`OwlLayer.registerTool`)
For custom business logic or complex multi-argument operations:

```javascript
// Registering a cart addition tool
OwlLayer.registerTool('add_to_cart', {
  description: 'Add a product to cart by product ID and quantity.',
  parameters: {
    type: 'object',
    properties: {
      productId: { type: 'string', description: 'Product ID (e.g. "casque-bt-pro", "ecran-27")' },
      quantity:  { type: 'number', description: 'Quantity to add (default 1)' },
    },
    required: ['productId'],
  },
  risk: 'low',
  handler({ productId, quantity = 1 }) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return { success: false, error: 'Product not found' };
    
    addToCart(product.id, product.name, product.price, quantity);
    return { success: true, cartCount: cartItemCount(getCart()) };
  },
});
```

---

## 4. Shopping Cart State Management Across Pages

The cart state is synchronized via `localStorage` and shared between `index.html`, `panier.html`, and `checkout.html`:

```javascript
export function getCart() {
  try {
    return JSON.parse(localStorage.getItem('owllayer_demo_cart') || '[]');
  } catch {
    return [];
  }
}

export function saveCart(cart) {
  localStorage.setItem('owllayer_demo_cart', JSON.stringify(cart));
}
```

Whenever the cart updates, `updateCartBadge()` updates the badge in the navigation header, and `OwlLayer.setContext({ cart })` notifies the agent of the updated contents.

---

## 5. Testing & Verification Scenarios

### 🧪 Test Scenario 1: Natural Language Product Discovery
1. Open `http://localhost:5173`.
2. Say or type: *"Trouve un écran 27 pouces et ajoute-le au panier"*.
3. The catalog filters to show the 27" QHD Monitor, and the cart badge increments to `1`.
4. Switch language to English (🇬🇧 EN) using the top navbar.
5. Say or type: *"Show me gaming audio headsets"*.
6. The catalog automatically displays the 7.1 Surround Gaming Headset.

### 🧪 Test Scenario 2: Modifying Cart Quantities
1. Navigate to `/panier.html`.
2. Ask the assistant: *"Mets 3 claviers mécaniques dans le panier"*.
3. The item row updates to quantity `3`, and the total price recalculates dynamically.

### 🧪 Test Scenario 3: Form Filling on Checkout
1. Navigate to `/checkout.html`.
2. Ask the assistant: *"Remplis l'adresse avec Sophie Martin, 45 avenue des Champs-Élysées, Paris 75008"*.
3. The form fields populate automatically via the `fill_address` tool.

---

## 6. Build Command

```bash
# Build production bundle with Vite
pnpm --filter @owllayer/demo-browser build
```
