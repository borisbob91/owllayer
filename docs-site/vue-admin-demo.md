# Vue.js Admin Demo Tutorial — Step-by-Step Guide

This guide walks you through setting up, configuring, and testing the **OwlLayer Vue.js Admin Dashboard** (`apps/demo-vue`) connected to the AITP WebSocket server (`apps/demo-server`).

You will learn how to prepare the test environment, configure environment variables, implement a **complete Internationalization (i18n) architecture** (English 🇬🇧 & French 🇫🇷) across both client and server, declare reactive tools (`useAgentToolResolver`, `useNavigationTool`), manage dynamic context (`useAgentContext`), handle **Human-in-the-Loop (HITL)** approvals, and format rich Markdown chat responses.

---

## ⚡ TL;DR — 2-Minute Quick Start

Get the full demo environment running in 3 minimal steps with zero code modifications:

```bash
# 1. Install dependencies & build packages
pnpm install && pnpm build:packages

# 2. Set up environment files (only your Gemini API key is needed)
cp apps/demo-server/.env.example apps/demo-server/.env
# Edit apps/demo-server/.env -> set GOOGLE_API_KEY and the demo API keys

cp apps/demo-vue/.env.example apps/demo-vue/.env

# 3. Start both the AITP Server & the Vue Dashboard
pnpm --filter @owllayer/demo-server dev & pnpm --filter @owllayer/demo-vue dev
```

👉 Open **`http://localhost:4200`** in your browser!
- **Configured Connection**: Use the same private API key for `OWLLAYER_ADMIN_API_KEY` and `VITE_OWLLAYER_API_KEY`.
- **Instant Language Switching**: Toggle between 🇬🇧 **EN** and 🇫🇷 **FR** anytime from the sidebar button.

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Vue 3 Admin Dashboard (Port 4200)                    │
│                                                                        │
│  - i18n Store (useI18n): EN 🇬🇧 / FR 🇫🇷 with LocalStorage persistence   │
│  - Sidebar.vue: Instant Language Switcher & localized navigation       │
│  - App.vue: Dynamic useAgentContext & useAgentToolResolver             │
│  - ProductsPage.vue: Localized catalog, filters & OwlLayerTool button  │
│  - AddProductPage.vue: Localized forms, validations & categories       │
│  - VoiceWidgetStt.vue & AgentPanel.vue:                                │
│      ├── useVoiceMode (Live audio) / useAgent (Text fallback)          │
│      ├── useApproval (Contextual HITL confirmation card)               │
│      └── renderMarkdown (Safe HTML sanitization)                       │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │  WebSocket AITP Protocol
                                    │  ws://localhost:4001/owllayer
┌───────────────────────────────────▼────────────────────────────────────┐
│                      OwlLayer Server (Port 4001)                       │
│                                                                        │
│  - Server i18n (serverMessages): English & French system prompts       │
│  - Dynamic Audio Config: STT (en-US / fr-FR) & TTS Neural2 voices      │
│  - OwlLayerServer + SecurityMiddleware (HITL approval engine)          │
│  - GoogleAdapter (Gemini Live & configurable text fallback)           │
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
GEMINI_MODEL=gemini-2.0-flash

# AITP API Keys (Admin Vue app)
OWLLAYER_REQUIRE_API_KEY=true
OWLLAYER_ADMIN_API_KEY=your_vue_demo_api_key

# Admin Dashboard credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_admin_password
```

::: tip Model Selection
Use a Gemini model enabled for your Google AI Studio account. The default `gemini-2.0-flash` can be overridden through `GEMINI_MODEL`.
:::

### B. Vue Client Configuration (`apps/demo-vue/.env`)

Configure the WebSocket endpoint, API key, and initial language in `apps/demo-vue/.env`:

```env
VITE_OWLLAYER_ENDPOINT=ws://localhost:4001/owllayer
VITE_OWLLAYER_API_KEY=your_vue_demo_api_key

# Initial client language (en or fr)
VITE_APP_LANGUAGE=en
```

---

## 2. Build & Launch

From the root of the monorepo:

```bash
# 1. Build monorepo packages
pnpm --filter @owllayer/core build
pnpm --filter @owllayer/adapter-google build
pnpm --filter @owllayer/server build
pnpm --filter @owllayer/vue build

# 2. Terminal 1 — Start the AITP Server
pnpm --filter @owllayer/demo-server dev

# 3. Terminal 2 — Start the Vue 3 Admin Dashboard
pnpm --filter @owllayer/demo-vue dev
```

Open your browser at **`http://localhost:4200`**.

---

## 3. Complete Step-by-Step Implementation

### Step 1: Reactive i18n Store (`apps/demo-vue/src/i18n/index.ts`)

Centralize all user interface strings, product mock details, currency formatting, and agent tool metadata:

```typescript
// apps/demo-vue/src/i18n/index.ts
import { ref, computed } from 'vue';

export type Locale = 'en' | 'fr';

const initialLocale: Locale = (() => {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('owllayer_lang') : null;
  if (saved === 'en' || saved === 'fr') return saved;
  const envLang = import.meta.env.VITE_APP_LANGUAGE;
  if (envLang === 'fr' || envLang === 'en') return envLang;
  return 'en';
})();

const currentLocale = ref<Locale>(initialLocale);

export const translations = {
  en: {
    common: { currency: 'USD', currencySymbol: '$', cancel: 'Cancel', confirm: 'Confirm', delete: 'Delete' },
    nav: {
      catalog: 'Catalog',
      addProduct: 'Add Product',
      routesDescription: 'Navigate within the admin dashboard: /products (catalog), /products/add (new product), /products/edit/:id (edit product).',
    },
    categories: { Audio: 'Audio', Peripherals: 'Peripherals', Monitors: 'Monitors', Video: 'Video', Storage: 'Storage', Networking: 'Networking' },
    productItems: {
      'prod-001': { name: 'BT Pro Headphones', description: 'Premium Bluetooth ANC headphones, 30h battery life' },
      'prod-002': { name: 'Mechanical RGB Keyboard', description: 'Cherry MX Red switches, full RGB backlighting' },
      'prod-003': { name: 'Ergonomic Mouse', description: '6-button ergonomic mouse, 12000 DPI sensor' },
      // ...
    },
    agent: {
      roleDescription: 'You are the admin assistant for the OwlLayer dashboard. You manage the product catalog (view, add, edit, delete).',
      getCatalogDesc: 'Get the full list of products along with statistics (stock, status, prices).',
      addProductDesc: 'Create a new product in the catalog. Available categories: Audio, Peripherals, Monitors, Video, Storage, Networking.',
      editProductDesc: 'Modify an existing product in the catalog.',
      deleteProductDesc: 'Permanently delete a product from the catalog.',
      editIdParamDesc: 'ID of the product to modify (e.g. prod-001)',
      deleteIdParamDesc: 'ID of the product to delete (e.g. prod-001)',
      productCreatedMsg: 'Product "{name}" created with ID {id}.',
      productUpdatedMsg: 'Product "{name}" updated successfully.',
      productDeletedMsg: 'Product "{name}" permanently deleted.',
      productNotFoundMsg: 'Product "{id}" not found.',
      deleteFailedMsg: 'Failed to delete product.',
    },
  },
  fr: {
    common: { currency: 'EUR', currencySymbol: '€', cancel: 'Annuler', confirm: 'Confirmer', delete: 'Supprimer' },
    nav: {
      catalog: 'Catalogue',
      addProduct: 'Ajouter produit',
      routesDescription: 'Naviguer dans le dashboard admin : /products (liste des produits), /products/add (créer un produit), /products/edit/:id (modifier un produit).',
    },
    categories: { Audio: 'Audio', Peripherals: 'Périphériques', Monitors: 'Moniteurs', Video: 'Vidéo', Storage: 'Stockage', Networking: 'Réseaux' },
    productItems: {
      'prod-001': { name: 'Casque BT Pro', description: 'Casque Bluetooth ANC premium, autonomie de 30h' },
      'prod-002': { name: 'Clavier mécanique RGB', description: 'Switches Cherry MX Red, rétroéclairage complet RGB' },
      'prod-003': { name: 'Souris ergonomique', description: 'Souris ergonomique 6 boutons, capteur 12000 DPI' },
      // ...
    },
    agent: {
      roleDescription: 'Tu es l\'assistant admin du dashboard OwlLayer. Tu gères le catalogue de produits (consulter, ajouter, modifier, supprimer).',
      getCatalogDesc: 'Obtenir la liste complète des produits avec leurs statistiques (stock, statut, prix).',
      addProductDesc: 'Créer un nouveau produit dans le catalogue. Catégories disponibles : Audio, Périphériques, Moniteurs, Vidéo, Stockage, Réseaux.',
      editProductDesc: 'Modifier un produit existant dans le catalogue.',
      deleteProductDesc: 'Supprimer définitivement un produit du catalogue.',
      editIdParamDesc: 'ID du produit à modifier (ex : prod-001)',
      deleteIdParamDesc: 'ID du produit à supprimer (ex : prod-001)',
      productCreatedMsg: 'Produit "{name}" créé avec l\'ID {id}.',
      productUpdatedMsg: 'Produit "{name}" mis à jour avec succès.',
      productDeletedMsg: 'Produit "{name}" supprimé définitivement.',
      productNotFoundMsg: 'Produit "{id}" introuvable.',
      deleteFailedMsg: 'Échec de la suppression du produit.',
    },
  },
};

export function useI18n() {
  const locale = computed(() => currentLocale.value);
  const t = computed(() => translations[currentLocale.value]);

  function setLocale(newLocale: Locale) {
    currentLocale.value = newLocale;
    if (typeof localStorage !== 'undefined') localStorage.setItem('owllayer_lang', newLocale);
  }

  function getProductName(product: { id: string; name: string }) {
    const item = (t.value.productItems as any)?.[product.id];
    return item?.name ?? product.name;
  }

  function getProductDescription(product: { id: string; description: string }) {
    const item = (t.value.productItems as any)?.[product.id];
    return item?.description ?? product.description;
  }

  return { locale, currentLocale, setLocale, t, getProductName, getProductDescription };
}
```

---

### Step 2: Language Switcher in Sidebar (`Sidebar.vue`)

Provide a single-click interactive toggle in the sidebar navigation:

```vue
<!-- apps/demo-vue/src/components/Sidebar.vue -->
<script setup lang="ts">
import { useI18n } from '../i18n';

const { currentLocale, setLocale, t } = useI18n();
</script>

<template>
  <aside class="w-64 bg-slate-900 border-r border-slate-800 flex flex-col p-4">
    <!-- Language Toggle -->
    <div class="flex items-center bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 mb-4">
      <button
        @click="setLocale('en')"
        class="flex-1 text-xs py-1.5 rounded font-medium transition-all"
        :class="currentLocale === 'en' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'"
      >
        🇬🇧 EN
      </button>
      <button
        @click="setLocale('fr')"
        class="flex-1 text-xs py-1.5 rounded font-medium transition-all"
        :class="currentLocale === 'fr' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'"
      >
        🇫🇷 FR
      </button>
    </div>

    <!-- Navigation Links -->
    <nav class="space-y-1">
      <RouterLink to="/products" class="nav-item">{{ t.nav.catalog }}</RouterLink>
      <RouterLink to="/products/add" class="nav-item">{{ t.nav.addProduct }}</RouterLink>
    </nav>
  </aside>
</template>
```

---

### Step 3: Dynamic Context & Localized Tools (`App.vue`)

Use `useAgentContext` with a reactive getter function and `useAgentToolResolver` to register dynamic tools:

```vue
<!-- apps/demo-vue/src/App.vue -->
<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useNavigationTool, useAgentToolResolver, useAgentContext } from '@owllayer/vue';
import { z } from 'zod';
import { useProducts, CATEGORIES } from './store/products';
import { useI18n, type CategoryKey } from './i18n';

const router = useRouter();
const { products, stats, addProduct, editProduct, deleteProduct, getProduct } = useProducts();
const { t, format, currentLocale, getProductName, getProductDescription } = useI18n();

// 1. Navigation tool with reactive routes description
useNavigationTool(({ url }) => router.push(url), {
  description: t.value.nav.routesDescription,
});

// 2. Reactive Role Context — updates language and currency upon toggle
useAgentContext(() => ({
  role: 'admin',
  description: t.value.agent.roleDescription,
  language: currentLocale.value,
  currency: t.value.common.currency,
}));

// 3. Centralized CRUD Tool Resolver with dynamic descriptions
useAgentToolResolver(
  {
    products: {
      tools: {
        get_catalog: {
          description: t.value.agent.getCatalogDesc,
          schema: z.object({}),
          risk: 'none',
          handler: async () => ({
            products: products.map(p => ({
              id: p.id,
              name: getProductName(p),
              price: `${p.price} ${t.value.common.currency}`,
              stock: p.stock,
              status: p.status,
              category: t.value.categories[p.category as CategoryKey] || p.category,
              description: getProductDescription(p),
            })),
            stats: stats.value,
          }),
        },

        add_product: {
          description: t.value.agent.addProductDesc,
          schema: z.object({
            name: z.string().min(1).describe(t.value.form.nameLabel),
            price: z.number().positive().describe(t.value.form.priceLabel),
            stock: z.number().int().min(0).describe(t.value.form.stockLabel),
            category: z.enum(CATEGORIES).describe(t.value.form.categoryLabel),
            description: z.string().describe(t.value.form.descriptionLabel),
            status: z.enum(['active', 'draft', 'archived']).default('draft').describe(t.value.form.statusLabel),
          }),
          risk: 'low',
          handler: async (args) => {
            const product = addProduct(args);
            router.push('/products');
            return {
              success: true,
              message: format(t.value.agent.productCreatedMsg, { name: product.name, id: product.id }),
              product,
            };
          },
        },

        edit_product: {
          description: t.value.agent.editProductDesc,
          schema: z.object({
            id: z.string().describe(t.value.agent.editIdParamDesc),
            name: z.string().optional().describe(t.value.form.nameLabel),
            price: z.number().positive().optional().describe(t.value.form.priceLabel),
            stock: z.number().int().min(0).optional().describe(t.value.form.stockLabel),
            category: z.enum(CATEGORIES).optional().describe(t.value.form.categoryLabel),
            description: z.string().optional().describe(t.value.form.descriptionLabel),
            status: z.enum(['active', 'draft', 'archived']).optional().describe(t.value.form.statusLabel),
          }),
          risk: 'low',
          handler: async ({ id, ...updates }) => {
            const product = editProduct(id, updates);
            if (!product) return { success: false, error: format(t.value.agent.productNotFoundMsg, { id }) };
            return { success: true, message: format(t.value.agent.productUpdatedMsg, { name: product.name }), product };
          },
        },

        delete_product: {
          description: t.value.agent.deleteProductDesc,
          schema: z.object({
            id: z.string().describe(t.value.agent.deleteIdParamDesc),
          }),
          risk: 'high', // Triggers contextual HITL overlay
          handler: async ({ id }) => {
            const product = getProduct(id);
            if (!product) return { success: false, error: format(t.value.agent.productNotFoundMsg, { id }) };
            const ok = deleteProduct(id);
            return ok
              ? { success: true, message: format(t.value.agent.productDeletedMsg, { name: product.name }) }
              : { success: false, error: t.value.agent.deleteFailedMsg };
          },
        },
      },
    },
  },
  { global: true },
);
</script>
```

---

### Step 4: Reactive Catalog & Declarative Button (`ProductsPage.vue`)

Use `getProductName` and `getProductDescription` to render table cells and `<OwlLayerTool>` to expose UI buttons to the AI agent:

```vue
<!-- apps/demo-vue/src/pages/ProductsPage.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useProducts } from '../store/products';
import { useI18n, type CategoryKey } from '../i18n';
import { OwlLayerTool } from '@owllayer/vue';

const { products, stats, deleteProduct } = useProducts();
const { t, format, formatCurrency, getProductName, getProductDescription } = useI18n();

const search = ref('');
const categoryFilter = ref('');

const filtered = computed(() => {
  return products.filter(p => {
    const locName = getProductName(p).toLowerCase();
    const locDesc = getProductDescription(p).toLowerCase();
    const q = search.value.toLowerCase();
    const matchSearch = !q || locName.includes(q) || locDesc.includes(q) || p.name.toLowerCase().includes(q);
    const matchCat = !categoryFilter.value || p.category === categoryFilter.value;
    return matchSearch && matchCat;
  });
});
</script>

<template>
  <div class="p-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-white">{{ t.catalog.title }}</h1>

      <!-- Agent & Human action button -->
      <OwlLayerTool name="go_to_add_product" :description="t.agent.goToAddProductDesc" action="click">
        <RouterLink to="/products/add" class="btn-primary">+ {{ t.catalog.addProductBtn }}</RouterLink>
      </OwlLayerTool>
    </div>

    <!-- Table -->
    <table>
      <tr v-for="product in filtered" :key="product.id">
        <td>
          <div class="font-medium text-white">{{ getProductName(product) }}</div>
          <div class="text-xs text-slate-500">{{ getProductDescription(product) }}</div>
        </td>
        <td>{{ t.categories[product.category as CategoryKey] || product.category }}</td>
        <td>{{ formatCurrency(product.price) }}</td>
      </tr>
    </table>
  </div>
</template>
```

---

### Step 5: Contextual HITL & Safe Markdown Rendering (`VoiceWidgetStt.vue`)

Integrate `useApproval` for high-risk actions (`delete_product`) and `renderMarkdown` for sanitized formatting:

```vue
<!-- apps/demo-vue/src/components/VoiceWidgetStt.vue -->
<script setup lang="ts">
import { useApproval } from '@owllayer/vue';
import { useI18n } from '../i18n';
import { renderMarkdown } from '../utils/markdown';

const { pendingApproval, approve, deny } = useApproval();
const { t } = useI18n();
</script>

<template>
  <!-- Contextual HITL Approval Card -->
  <div v-if="pendingApproval" class="p-4 bg-slate-900 border border-amber-500/50 rounded-xl shadow-xl">
    <div class="text-xs font-semibold text-amber-300">
      ⚠️ {{ t.agent.approvalDeleteTitle }}
    </div>
    <p class="text-xs text-slate-200 my-1">
      {{ t.agent.approvalDeleteDesc }}
    </p>
    <div class="flex gap-2 justify-end mt-2">
      <button @click="deny" class="px-3 py-1 text-xs bg-slate-800 text-slate-300 rounded">
        {{ t.common.deny }}
      </button>
      <button @click="approve" class="px-3 py-1 text-xs bg-emerald-600 text-white rounded font-semibold">
        {{ t.common.confirm }}
      </button>
    </div>
  </div>
</template>
```

---

## 4. Multilingual Test Scenarios & Verification

You can test the agent in either **English** or **French** (toggle language from the sidebar):

| Feature | English Test Command 🇬🇧 | French Test Command 🇫🇷 | Expected Result |
|---|---|---|---|
| **Catalog Query** | *"What products are currently in stock?"* | *"Quels sont les produits actuellement en stock ?"* | Agent invokes `get_catalog` and formats a bulleted Markdown list in the active language. |
| **Navigation** | *"Open the add product page"* | *"Ouvre la page d'ajout de produit"* | Agent executes `useNavigationTool` and navigates to `/products/add`. |
| **Create Product** | *"Add a Gaming Mouse for $49.99 with stock 20 in Peripherals"* | *"Ajoute une Souris Gaming à 49.99€ avec 20 en stock dans Périphériques"* | Agent calls `add_product`, redirects to `/products`, and inserts the item. |
| **Edit Product** | *"Set the stock of the RGB Keyboard to 50"* | *"Passe le stock du clavier mécanique à 50"* | Agent calls `edit_product`, table updates instantly. |
| **HITL Security** | *"Delete the BT Pro Headphones"* | *"Supprime le casque BT Pro"* | Contextual confirmation card appears with Deny/Confirm buttons. Clicking Confirm deletes the product. |
| **Server Tool** | *"Give me the store contact details"* | *"Donne-moi les coordonnées de la boutique"* | Agent executes server-side tool `get_store_info` and displays contact details. |

---

## 5. Troubleshooting

- **Server logs in French vs English**: Verify `DEFAULT_LANGUAGE=en` (or `fr`) in `apps/demo-server/.env`.
- **Client language resets on refresh**: Language selection is saved in `localStorage.getItem('owllayer_lang')`. Clear local storage or set `VITE_APP_LANGUAGE=en` in `apps/demo-vue/.env`.
- **Gemini HTTP 429 Quota Exceeded**: Choose a Gemini model enabled for your account with `GEMINI_MODEL` in `apps/demo-server/.env`.
- **WebSocket Connection**: Confirm that `VITE_OWLLAYER_API_KEY` in `apps/demo-vue/.env` matches `OWLLAYER_ADMIN_API_KEY` in `apps/demo-server/.env`.
