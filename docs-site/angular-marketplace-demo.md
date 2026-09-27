# Angular Marketplace Demo Tutorial — Step-by-Step Guide

This guide walks you through setting up, configuring, and testing the **OwlLayer Angular Marketplace** (`apps/demo-angular`) connected to the AITP WebSocket server (`apps/demo-server`).

You will learn how to prepare the test environment, configure environment variables, leverage **Angular 19 Signals & reactive DI** (`injectOwlLayer`, `injectOwlLayerDevTools`, `registerContext`), implement a **complete Internationalization (i18n) architecture** (English 🇬🇧 & French 🇫🇷) with reactive signals and LocalStorage persistence, declare classifieds marketplace tools (`search_listings`, `filter_by_category`, `add_favorite`, `create_listing`, `delete_listing`), handle **Human-in-the-Loop (HITL)** approvals, and embed the native **Angular OwlLayer Widget Component**.

---

## ⚡ TL;DR — 2-Minute Quick Start

Get the full Angular marketplace demo environment running in 3 minimal steps:

```bash
# 1. Install dependencies & build packages
pnpm install && pnpm build:packages

# 2. Set up environment files (Gemini API key in demo-server)
cp apps/demo-server/.env.example apps/demo-server/.env
# Edit apps/demo-server/.env -> set GOOGLE_API_KEY=your_gemini_api_key

# 3. Start both the AITP Server & the Angular Marketplace
pnpm --filter @owllayer/demo-server dev & pnpm --filter @owllayer/demo-angular dev
```

👉 Open **`http://localhost:4400`** in your browser!
- **Automatic Connection**: The pre-configured demo API key (`pk_78ab37_angular_marketplace`) connects immediately to the AITP server on `ws://localhost:4001/owllayer`.
- **Instant Language Switching**: Toggle between 🇬🇧 **EN** and 🇫🇷 **FR** anytime from the top-right header switcher.
- **AI Agent Assistant**: Click the floating assistant widget or press the voice/chat button to search ads, filter by price, manage favorites, or publish new listings.

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│               Angular 19 Marketplace App (Port 4400)                   │
│                                                                        │
│  - I18nService: Signal-based dictionary (EN 🇬🇧 / FR 🇫🇷) + LocalStorage │
│  - AppComponent (App Shell):                                           │
│      ├── injectOwlLayer(): Reactive connection & state signal          │
│      ├── injectOwlLayerDevTools(): Integrated debug capabilities       │
│      ├── Header: Language Switcher, Nav Links & Agent Status           │
│      └── <owllayer-widget>: Native Angular AI assistant component      │
│  - ListingsStoreService: Signal store for ads with Unsplash HD photos  │
│  - registerDemoTools():                                                │
│      ├── registerNavigationTool: Router navigation                     │
│      ├── createResolverFromSwitch: search_listings, filter_category    │
│      └── createCRUDResolver: create, update, delete (HITL protected)   │
│  - Pages & Components:                                                 │
│      ├── HomePageComponent: Ads grid + SearchFilters + live context    │
│      ├── ListingDetailPageComponent: Listing details + <owllayer-tool-button> │
│      ├── EditListingPageComponent: Create & edit form                  │
│      └── FavoritesPageComponent: Shortlisted ads                       │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │  WebSocket AITP Protocol
                                    │  ws://localhost:4001/owllayer
┌───────────────────────────────────▼────────────────────────────────────┐
│                      OwlLayer Server (Port 4001)                       │
│                                                                        │
│  - Server i18n: English & French marketplace agent system prompts       │
│  - OwlLayerServer + SecurityMiddleware (HITL approval engine)          │
│  - GoogleAdapter (Gemini Live & Gemini 2.0 / 3.6 flash models)         │
│  - API Key Registry: Dedicated permissions for pk_angular_demo         │
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

# AITP API Keys (Angular Marketplace app)
OWLLAYER_REQUIRE_API_KEY=true
OWLLAYER_MARKETPLACE_API_KEY=pk_angular_demo
```

### B. Angular Client Configuration (`apps/demo-angular/src/app/app.config.ts`)

The Angular app connects to the AITP server through `provideOwlLayer`:

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideOwlLayer } from '@owllayer/angular';
import { routes } from './app.routes.js';

export const demoOwlLayerConfig = {
  endpoint: 'ws://localhost:4001/owllayer',
  apiKey: 'pk_angular_demo',
  reconnect: {
    maxAttempts: 5,
    delayMs: 1500,
  },
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideOwlLayer(demoOwlLayerConfig),
  ],
};
```

---

## 2. Signal-Based Internationalization (i18n)

The application provides a reactive, signal-based `I18nService` (`apps/demo-angular/src/app/core/i18n/i18n.service.ts`):

```typescript
import { computed, Injectable, signal } from '@angular/core';

export type Locale = 'en' | 'fr';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly localeSignal = signal<Locale>(getInitialLocale());

  readonly locale = this.localeSignal.asReadonly();

  readonly t = computed(() => {
    return translations[this.localeSignal()] ?? translations.fr;
  });

  setLocale(locale: Locale): void {
    this.localeSignal.set(locale);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('owllayer_demo_lang_angular', locale);
    }
  }

  toggleLocale(): void {
    this.setLocale(this.localeSignal() === 'fr' ? 'en' : 'fr');
  }

  formatPrice(price: number): string {
    return this.localeSignal() === 'en'
      ? `$${price.toFixed(2)}`
      : `${price.toFixed(2)} €`;
  }

  getCategoryLabel(catKey: string): string {
    const current = this.t();
    return current.categories[catKey] || catKey;
  }
}
```

### Using i18n in Angular Templates
Components inject `I18nService` and access reactive translations directly:

```html
<h1>{{ i18n.t().home.title }}</h1>
<p>{{ i18n.t().home.subtitle }}</p>

<!-- Price formatting based on active locale -->
<span class="price">{{ i18n.formatPrice(listing.price) }}</span>

<!-- Category label lookup -->
<span class="category">{{ i18n.getCategoryLabel(listing.category) }}</span>
```

---

## 3. Registering Marketplace Tools with the Angular SDK

All marketplace capabilities are declared inside `registerDemoTools()` (`apps/demo-angular/src/app/core/register-demo-tools.ts`):

### A. Navigation Tools
```typescript
import { registerNavigationTool } from '@owllayer/angular';

const disposeNavigation = registerNavigationTool(async ({ url, replace, state }) => {
  return { success: true, navigatedTo: url, state };
});
```

### B. Search & Filtering Tools with Switch Resolver
```typescript
import { createResolverFromSwitch } from '@owllayer/angular';
import { z } from 'zod';

const searchConfig = createResolverFromSwitch({
  search_listings: {
    description: 'Search marketplace listings by keyword in title, description, or seller name',
    schema: z.object({
      query: z.string().describe('Search keywords: e.g. "bicycle", "monitor", "Paris"'),
      category: z.enum(['vehicules', 'immobilier', 'electronique', 'sport', 'maison', 'divers']).optional(),
    }),
    handler: async ({ query, category }) => {
      filtersService.setQuery(query);
      if (category) filtersService.setCategory(category);
      const results = store.list(filtersService.filters());
      return { count: results.length, listings: results };
    },
    risk: 'none',
  },
  filter_by_category: {
    description: 'Filter listings by category or clear filter',
    schema: z.object({
      category: z.enum(['vehicules', 'immobilier', 'electronique', 'sport', 'maison', 'divers', 'none']),
    }),
    handler: async ({ category }) => {
      filtersService.setCategory(category === 'none' ? null : category);
      return { count: store.list(filtersService.filters()).length };
    },
    risk: 'none',
  },
});
```

### C. Human-in-the-Loop (HITL) CRUD Operations
Operations that alter data or delete listings are flagged with `risk: 'high'` or `risk: 'critical'`. This automatically invokes the approval modal before execution:

```typescript
import { createCRUDResolver } from '@owllayer/angular';

const crudConfig = createCRUDResolver({
  resourceName: 'listing',
  delete: {
    handler: async ({ id }) => {
      store.deleteListing(id);
      return { success: true, deletedId: id };
    },
    risk: 'high', // Requires user confirmation in UI
  },
  update: {
    handler: async ({ id, data }) => {
      const updated = store.updateListing(id, data);
      return { success: true, listing: updated };
    },
    risk: 'medium',
  },
});
```

---

## 4. Co-locating UI Actions with `<owllayer-tool-button>`

In `ListingDetailPageComponent`, the contact seller action is co-located directly with the tool button:

```html
<owllayer-tool-button
  toolName="contact_seller"
  [toolArgs]="{ listingId: listing.id, seller: listing.seller }"
  buttonClass="contact-btn"
>
  {{ i18n.t().detail.sellerContact }}
</owllayer-tool-button>
```

When clicked by the user or invoked by the AI agent, the action executes seamlessly with full telemetry.

---

## 5. Rich Live Context with `registerContext`

Whenever the user navigates between pages or filters change, the page registers dynamic context for the LLM:

```typescript
import { registerContext } from '@owllayer/angular';

registerContext(() => ({
  page: 'home',
  pageName: 'Classifieds Listings',
  filters: {
    query: this.filters().query ?? null,
    category: this.filters().category ?? null,
    priceRange: {
      min: this.filters().minPrice ?? null,
      max: this.filters().maxPrice ?? null,
    },
  },
  listingsDisplayed: this.filteredListings().length,
  totalListings: this.store.listings().length,
  favoritesCount: this.favoriteCount(),
}));
```

---

## 6. Testing & Verification Scenarios

Run these tests to verify that the Angular Marketplace demo functions properly:

### 🧪 Test Scenario 1: Multilingual Keyword Search
1. Open `http://localhost:4400`.
2. Type or ask the agent in French: *"Trouve un vélo à moins de 250€"*.
3. Verify that the listings filter down to the vintage bicycle ad.
4. Toggle language to English (🇬🇧 EN).
5. Ask: *"Find me a monitor"*.
6. Verify that the 27" QHD Monitor appears in the listings grid.

### 🧪 Test Scenario 2: Category Filtering & Favorites
1. Ask the agent: *"Filter by sports category and add the first item to my favorites"*.
2. Verify that the sports filter is applied and the heart icon illuminates on the bicycle ad.
3. Navigate to `⭐ Favorites` and confirm the item is stored in the list.

### 🧪 Test Scenario 3: Human-in-the-Loop (HITL) Ad Deletion
1. Open any ad detail page.
2. Ask the agent: *"Delete this ad"*.
3. Verify that the HITL confirmation modal opens with parameters `{ listingId: "..." }`.
4. Click **Deny**: the listing remains intact.
5. Ask again and click **Approve**: the listing is removed from the store and you are redirected to the homepage.

---

## 7. Build & Unit Test Commands

```bash
# Run unit tests
pnpm --filter @owllayer/demo-angular test

# Build production bundle
pnpm --filter @owllayer/demo-angular build
```
