# Svelte Travel Planner Demo Tutorial — Step-by-Step Guide

This guide walks you through setting up, configuring, and testing the **OwlLayer Svelte Travel Planner** (`apps/demo-svelte`) connected to the AITP WebSocket server (`apps/demo-server`).

You will learn how to prepare the test environment, configure environment variables, implement a **complete Internationalization (i18n) architecture** (English 🇬🇧 & French 🇫🇷) across client and server, declare reactive tools (`use:agentToolResolver`, `use:agentTool`), manage live context (`use:agentContext`), co-locate UI action tools (`<OwlLayerTool>`, `<OwlLayerToolBtn>`), handle **Human-in-the-Loop (HITL)** approvals, and run a **live voice interface with real-time audio spectrum visualization**.

---

## ⚡ TL;DR — 2-Minute Quick Start

Get the full Svelte demo environment running in 3 minimal steps with zero code modifications:

```bash
# 1. Install dependencies & build packages
pnpm install && pnpm build:packages

# 2. Set up environment files (only your Gemini API key is needed)
cp apps/demo-server/.env.example apps/demo-server/.env
# Edit apps/demo-server/.env -> set GOOGLE_API_KEY=your_gemini_api_key

cp apps/demo-svelte/.env.example apps/demo-svelte/.env

# 3. Start both the AITP Server & the Svelte Travel Planner
pnpm --filter @owllayer/demo-server dev & pnpm --filter @owllayer/demo-svelte dev
```

👉 Open **`http://localhost:4300`** in your browser!
- **Automatic Connection**: The pre-configured demo API key (`pk_78ab37_svelte_travel`) connects immediately.
- **Instant Language Switching**: Toggle between 🇬🇧 **EN** and 🇫🇷 **FR** anytime from the top header switcher.
- **Voice & Text Panel**: Click the microphone icon or the bottom-right assistant button to interact.

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                 Svelte 5 Travel Planner App (Port 4300)                │
│                                                                        │
│  - i18n Store ($currentLocale, $t): EN 🇬🇧 / FR 🇫🇷 with LocalStorage     │
│  - App.svelte:                                                         │
│      ├── Header: Language Switcher, Agent Status & Voice Toggle        │
│      ├── Live use:agentContext: reactive destination & trip data       │
│      └── Reactive use:agentToolResolver: 7 centralized travel tools    │
│  - DestinationGrid.svelte: Localized catalog + OwlLayerTool (clear)    │
│  - TripItinerary.svelte: Drag/drop trip + OwlLayerToolBtn (delete)     │
│  - BudgetTracker.svelte: Localized currencies & live estimation        │
│  - VoicePanel.svelte:                                                  │
│      ├── createVoiceMode (Live audio PCM pipeline)                     │
│      ├── 32-bar dynamic audio visualizer (Web Audio API)               │
│      └── pendingApproval / approveAction (HITL booking modal)          │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │  WebSocket AITP Protocol
                                    │  ws://localhost:4001/owllayer
┌───────────────────────────────────▼────────────────────────────────────┐
│                      OwlLayer Server (Port 4001)                       │
│                                                                        │
│  - Server i18n (serverMessages): English & French travel prompts       │
│  - Dynamic Audio Config: STT (en-US / fr-FR) & TTS Neural2 voices      │
│  - OwlLayerServer + SecurityMiddleware (HITL approval engine)          │
│  - GoogleAdapter (Gemini Live & Gemini 3.6-flash fallback)             │
│  - API Key Registry: Dedicated prompt for pk_78ab37_svelte_travel      │
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

# AITP API Keys (Svelte Travel app)
OWLLAYER_REQUIRE_API_KEY=true
OWLLAYER_TRAVEL_API_KEY=pk_78ab37_svelte_travel

# Allowed Origins (CORS / LiveKit)
OWLLAYER_LIVEKIT_ALLOWED_ORIGINS=http://localhost:4300,http://localhost:4200,http://localhost:5173
```

::: tip Model Selection & Quotas
Use `GEMINI_MODEL=gemini-3.6-flash` for high-speed tool execution with generous rate limits on Google AI Studio.
:::

### B. Svelte Client Configuration (`apps/demo-svelte/.env`)

Configure the WebSocket endpoint, API key, and initial language in `apps/demo-svelte/.env`:

```env
VITE_OWLLAYER_ENDPOINT=ws://localhost:4001/owllayer
VITE_OWLLAYER_API_KEY=pk_78ab37_svelte_travel

# Initial client language (en or fr)
VITE_APP_LANGUAGE=en
VITE_USE_DEFAULT_WIDGET=false
```

---

## 2. Build & Launch

From the root of the monorepo:

```bash
# 1. Build monorepo packages
pnpm --filter @owllayer/core build
pnpm --filter @owllayer/adapter-google build
pnpm --filter @owllayer/server build
pnpm --filter @owllayer/svelte build

# 2. Terminal 1 — Start the AITP Server
pnpm --filter @owllayer/demo-server dev

# 3. Terminal 2 — Start the Svelte Travel Planner
pnpm --filter @owllayer/demo-svelte dev
```

Open your browser at **`http://localhost:4300`**.

---

## 3. Complete Step-by-Step Implementation

### Step 1: Reactive i18n Store (`apps/demo-svelte/src/lib/i18n.ts`)

Centralize all UI strings, destination mock details, currency formatting, and agent tool metadata:

```typescript
// apps/demo-svelte/src/lib/i18n.ts
import { writable, derived, get } from 'svelte/store';

export type Locale = 'en' | 'fr';

const initialLocale: Locale = (() => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('owllayer_svelte_lang');
    if (saved === 'en' || saved === 'fr') return saved;
  }
  const envLang = import.meta.env.VITE_APP_LANGUAGE;
  if (envLang === 'fr' || envLang === 'en') return envLang;
  return 'en';
})();

export const currentLocale = writable<Locale>(initialLocale);

export function setLocale(newLocale: Locale) {
  currentLocale.set(newLocale);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('owllayer_svelte_lang', newLocale);
  }
}

export const translations = {
  en: {
    common: { appName: 'OwlLayer Travel', currency: 'USD', currencySymbol: '$', cancel: 'Cancel', confirm: 'Confirm', delete: 'Delete' },
    nav: {
      destinations: 'Destinations',
      offers: 'Accommodations',
      compare: 'Compare',
      details: 'Details',
      routesDescription: "Navigate between app pages: 'destinations' (destinations & itinerary), 'offres' (hotel & apartment deals), 'details' (accommodation details), 'comparer' (side-by-side comparison).",
    },
    destinations: {
      title: 'Explore Destinations',
      subtitle: 'Select dream locations or ask the AI agent to plan your custom route.',
      searchPlaceholder: 'Search a destination, country, vibe...',
      addToTripBtn: 'Add to Trip',
      inTripBadge: 'In Trip',
    },
    itinerary: {
      title: 'Your Itinerary',
      emptyTitle: 'No destinations yet',
      emptyDesc: 'Search or ask your assistant to add cities and activities.',
      bookTripBtn: 'Book Trip Now',
    },
    budget: {
      title: 'Trip Budget',
      remaining: 'Remaining',
      overBudget: 'Over budget by {amount}',
    },
    agent: {
      welcomeMsg: 'Hello! I am your OwlLayer Travel AI assistant. Try saying: "Plan a 2-week trip to Asia", "Add Tokyo for 7 days", or "What is my remaining budget?".',
      roleDescription: 'You are the OwlLayer Travel trip planning assistant — helping users discover destinations, organize itineraries, manage budgets, and book accommodations.',
      searchDestDesc: 'Search travel destinations from the catalog by keyword, vibe, or country.',
      addToTripDesc: 'Add a destination to the user trip itinerary with duration in days.',
      addActivityDesc: 'Add an activity to a planned destination in the itinerary.',
      setBudgetDesc: 'Set total trip budget in dollars/euros.',
      removeDestDesc: 'Remove a destination from the user itinerary.',
      bookTripDesc: 'Finalize and book the complete trip itinerary (irreversible action requiring user approval).',
      approvalBookDesc: 'Are you sure you want to book this trip and confirm all reservations?',
    },
    destItems: {
      lisbonne: { name: 'Lisbon', country: 'Portugal', description: 'Golden trams, azulejos tiles, and fresh pastéis de nata facing the Atlantic.' },
      tokyo: { name: 'Tokyo', country: 'Japan', description: 'Neon skylines, ancient serene shrines, and midnight ramen bars.' },
      bali: { name: 'Bali', country: 'Indonesia', description: 'Terraced rice fields, sacred water temples, and sunset surf breaks.' },
      rome: { name: 'Rome', country: 'Italy', description: 'Timeless Colosseum, baroque piazzas, and authentic trattorias.' },
      newyork: { name: 'New York', country: 'United States', description: 'Iconic skyscrapers, Broadway shows, and Central Park strolls.' },
      marrakech: { name: 'Marrakech', country: 'Morocco', description: 'Vibrant souks, peaceful riads, and the aromas of spice markets.' },
      kyoto: { name: 'Kyoto', country: 'Japan', description: 'Bamboo groves, golden pavilions, and traditional tea ceremonies.' },
      abidjan: { name: 'Abidjan', country: 'Ivory Coast', description: 'The pearl of West African lagoons, vibrant nightlife, and rich culture.' },
    },
  },
  fr: {
    common: { appName: 'OwlLayer Travel', currency: 'EUR', currencySymbol: '€', cancel: 'Annuler', confirm: 'Confirmer', delete: 'Supprimer' },
    nav: {
      destinations: 'Destinations',
      offers: 'Hébergements',
      compare: 'Comparer',
      details: 'Détails',
      routesDescription: "Naviguer entre les pages : 'destinations' (destinations et itinéraire), 'offres' (catalogue hébergements), 'details' (fiche hébergement), 'comparer' (comparateur côte-à-côte).",
    },
    destinations: {
      title: 'Explorer les destinations',
      subtitle: 'Sélectionnez vos étapes de rêve ou demandez à l\'IA de concevoir votre itinéraire sur mesure.',
      searchPlaceholder: 'Rechercher une destination, un pays, une ambiance...',
      addToTripBtn: 'Ajouter au voyage',
      inTripBadge: 'Dans le voyage',
    },
    itinerary: {
      title: 'Votre Itinéraire',
      emptyTitle: 'Aucune destination pour l\'instant',
      emptyDesc: 'Recherchez ou demandez à l\'assistant d\'ajouter des villes et des activités.',
      bookTripBtn: 'Réserver le voyage',
    },
    budget: {
      title: 'Budget Voyage',
      remaining: 'Reste disponible',
      overBudget: 'Dépassement de {amount}',
    },
    agent: {
      welcomeMsg: 'Bonjour ! Je planifie votre voyage idéal. Essayez : "Planifie un voyage en Asie de 2 semaines", "Ajoute Tokyo pour 7 jours", ou "Quel est mon budget restant ?".',
      roleDescription: 'Tu es l\'assistant de planification de voyage OwlLayer Travel — aide à trouver des destinations, planifier un itinéraire, gérer le budget et réserver des hébergements.',
      searchDestDesc: 'Rechercher des destinations de voyage dans le catalogue par mot-clé, pays ou ambiance.',
      addToTripDesc: 'Ajouter une destination au voyage avec une durée en jours.',
      addActivityDesc: 'Ajouter une activité à une destination prévue dans le voyage.',
      setBudgetDesc: 'Définir le budget total du voyage en euros/dollars.',
      removeDestDesc: 'Retirer une destination de l\'itinéraire.',
      bookTripDesc: 'Finaliser et réserver le voyage complet (action irréversible avec confirmation requise).',
      approvalBookDesc: 'Êtes-vous sûr de vouloir finaliser et réserver ce voyage complet ?',
    },
    destItems: {
      lisbonne: { name: 'Lisbonne', country: 'Portugal', description: 'Tramways dorés, azulejos et pastéis de nata face à l\'Atlantique.' },
      tokyo: { name: 'Tokyo', country: 'Japon', description: 'Néons frénétiques, temples silencieux, ramen à minuit.' },
      bali: { name: 'Bali', country: 'Indonésie', description: 'Rizières en terrasses, temples balinais et surf au crépuscule.' },
      rome: { name: 'Rome', country: 'Italie', description: 'Colisée millénaire, ruelles baroques et trattorias parfumées.' },
      newyork: { name: 'New York', country: 'États-Unis', description: 'Gratte-ciel vertigineux, lumières de Broadway et Central Park.' },
      marrakech: { name: 'Marrakech', country: 'Maroc', description: 'Souks vibrants, riads secrets et senteurs d\'épices.' },
      kyoto: { name: 'Kyoto', country: 'Japon', description: 'Forêts de bambous, pavillons dorés et cérémonies du thé.' },
      abidjan: { name: 'Abidjan', country: 'Côte d\'Ivoire', description: 'Perle des lagunes ouest-africaines, nightlife trépidante et culture riche.' },
    },
  },
};

export const t = derived(currentLocale, ($locale) => translations[$locale]);

export function formatCurrency(amount: number): string {
  const loc = get(currentLocale);
  if (loc === 'fr') return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
```

---

### Step 2: Language Switcher in Header (`App.svelte`)

Provide a single-click interactive toggle in the header:

```svelte
<!-- apps/demo-svelte/src/App.svelte -->
<div class="lang-switch">
  <button
    class="lang-btn"
    class:active={$currentLocale === 'en'}
    onclick={() => setLocale('en')}
  >
    🇬🇧 EN
  </button>
  <button
    class="lang-btn"
    class:active={$currentLocale === 'fr'}
    onclick={() => setLocale('fr')}
  >
    🇫🇷 FR
  </button>
</div>
```

---

### Step 3: Dynamic Live Context (`use:agentContext`)

Send the active language, budget, destinations, and itinerary state to the server on every interaction:

```svelte
<!-- apps/demo-svelte/src/App.svelte -->
<script lang="ts">
  import { agentContext } from '@owllayer/svelte';
  import { t, currentLocale, getDestinationName, getDestinationCountry } from './lib/i18n';
  import { tripStore, estimatedCost, COST_PER_DAY } from './lib/tripStore';

  const contextData = $derived({
    role: 'assistant_voyage',
    description: $t.agent.roleDescription,
    language: $currentLocale,
    currency: $t.common.currency,
    currentPage: $currentPage,

    itinerary: $tripStore.itinerary.map((i) => ({
      destinationId: i.destinationId,
      name: getDestinationName(i.destinationId, $tripStore.destinations.find((d) => d.id === i.destinationId)?.name ?? i.destinationId),
      days: i.days,
      activities: i.activities,
      estimatedCost: i.days * COST_PER_DAY,
    })),
    budget: $tripStore.budget,
    estimatedCost: $estimatedCost,
    remainingBudget: $tripStore.budget - $estimatedCost,
  });
</script>

<div class="app" use:agentContext={contextData}>
  <!-- App content -->
</div>
```

---

### Step 4: Reactive Centralized Tool Resolver (`use:agentToolResolver`)

Declare tools using Svelte 5 `$derived` so the LLM always receives up-to-date schema definitions and live data:

```svelte
<!-- apps/demo-svelte/src/App.svelte -->
<script lang="ts">
  import { z } from 'zod';
  import { agentToolResolver } from '@owllayer/svelte';
  import { t, formatCurrency, getDestinationName } from './lib/i18n';
  import { tripStore, addToTrip, addActivity, setBudget, removeFromTrip } from './lib/tripStore';

  const resolverConfig = $derived({
    travel: {
      tools: {
        search_destinations: {
          description: $t.agent.searchDestDesc,
          schema: z.object({ query: z.string().describe('Search query') }),
          risk: 'none' as const,
          handler: ({ query }: { query: string }) => {
            setSearchQuery(query);
            navigate('destinations');
            return { found: true };
          },
        },

        add_to_trip: {
          description: $t.agent.addToTripDesc,
          schema: z.object({
            destinationId: z.string().describe('Destination ID'),
            days: z.number().min(1).max(30).describe('Duration in days'),
          }),
          risk: 'none' as const,
          handler: ({ destinationId, days }: { destinationId: string; days: number }) => {
            addToTrip(destinationId, days);
            return { success: true };
          },
        },

        set_budget: {
          description: $t.agent.setBudgetDesc,
          schema: z.object({ amount: z.number().min(100).describe('Budget amount') }),
          risk: 'low' as const,
          handler: ({ amount }: { amount: number }) => {
            setBudget(amount);
            return { success: true, message: `Budget updated to ${formatCurrency(amount)}.` };
          },
        },

        book_trip: {
          description: $t.agent.bookTripDesc,
          schema: z.object({ confirm: z.boolean().describe('Confirm booking') }),
          risk: 'critical' as const, // Triggers HITL confirmation modal
          handler: ({ confirm }: { confirm: boolean }) => {
            if (!confirm) return { success: false, message: 'Booking cancelled.' };
            return { success: true, message: 'Trip confirmed and booked.' };
          },
        },
      },
    },
  });
</script>

<div class="app" use:agentToolResolver={{ config: resolverConfig, options: { global: true } }}>
  <!-- App content -->
</div>
```

---

### Step 5: Co-located UI Tools (`OwlLayerTool` & `OwlLayerToolBtn`)

Register contextual actions directly on components:

```svelte
<!-- apps/demo-svelte/src/components/DestinationGrid.svelte -->
<script lang="ts">
  import { OwlLayerTool } from '@owllayer/svelte';
  import { setSearchQuery } from '../lib/tripStore';

  function clearSearch() {
    setSearchQuery('');
  }
</script>

<OwlLayerTool
  name="clear_search"
  description="Clear current search and show all destinations."
  action="click"
>
  <button class="search-clear" onclick={clearSearch}>✕</button>
</OwlLayerTool>
```

```svelte
<!-- apps/demo-svelte/src/components/TripItinerary.svelte -->
<script lang="ts">
  import { OwlLayerToolBtn } from '@owllayer/svelte';
  import { clearTrip } from '../lib/tripStore';
  import { t } from '../lib/i18n';
</script>

<OwlLayerToolBtn
  name="clear_itinerary"
  description="Clear complete itinerary. Irreversible action."
  risk="high"
  handler={clearTrip}
  class="clear-btn"
>
  {$t.common.delete} {$t.itinerary.title}
</OwlLayerToolBtn>
```

---

### Step 6: Live Voice Mode & HITL Approvals (`VoicePanel.svelte`)

Implement bidirectional audio streaming, real-time frequency visualization, and human-in-the-loop confirmation:

```svelte
<!-- apps/demo-svelte/src/components/VoicePanel.svelte -->
<script lang="ts">
  import {
    createAgent,
    createVoiceMode,
    pendingApproval,
    approveAction,
    denyAction,
    isThinking,
    isSpeaking,
  } from '@owllayer/svelte';
  import { t, currentLocale } from '../lib/i18n';

  const { sendText, lastResponse } = createAgent();
  const { isRecording, startRecording, stopRecording } = createVoiceMode({ live: true });
</script>

<!-- HITL Confirmation Banner for High/Critical Risk Actions -->
{#if $pendingApproval}
  <div class="approval-card">
    <div class="approval-title">⚠️ {$pendingApproval.toolName}</div>
    <div class="approval-message">{$pendingApproval.message || $t.agent.approvalBookDesc}</div>
    <div class="approval-actions">
      <button class="btn-approve" onclick={approveAction}>{$t.common.confirm}</button>
      <button class="btn-deny" onclick={denyAction}>{$t.common.cancel}</button>
    </div>
  </div>
{/if}
```

---

## 4. Testing & Verification Checklist

Test these voice and text scenarios in both **English 🇬🇧** and **French 🇫🇷**:

### Scenario 1: Search & Browse Destinations
| English Command 🇬🇧 | French Command 🇫🇷 | Expected Tool & Effect |
|---|---|---|
| *"Search destinations in Asia"* | *"Recherche des destinations en Asie"* | `search_destinations({ query: 'Asia' })` → Filters grid to Tokyo, Kyoto, Bali |
| *"Clear search"* | *"Efface la recherche"* | `clear_search` → Restores full destination catalog |

### Scenario 2: Build Trip Itinerary & Activities
| English Command 🇬🇧 | French Command 🇫🇷 | Expected Tool & Effect |
|---|---|---|
| *"Add Tokyo for 7 days"* | *"Ajoute Tokyo pour 7 jours"* | `add_to_trip({ destinationId: 'tokyo', days: 7 })` → Adds Tokyo card in itinerary |
| *"Add activity Visit the Senso-ji Temple to Tokyo"* | *"Ajoute l'activité Visiter le temple Senso-ji à Tokyo"* | `add_activity({ destinationId: 'tokyo', activity: '...' })` → Appends bullet under Tokyo |
| *"Remove Tokyo from my trip"* | *"Retire Tokyo de mon voyage"* | `remove_destination({ destinationId: 'tokyo' })` → Deletes card from itinerary |

### Scenario 3: Budget Management
| English Command 🇬🇧 | French Command 🇫🇷 | Expected Tool & Effect |
|---|---|---|
| *"Set my trip budget to $5,000"* | *"Fixe mon budget à 5000 €"* | `set_budget({ amount: 5000 })` → Progress bar updates with new limit and remaining amount |

### Scenario 4: Critical HITL Booking
| English Command 🇬🇧 | French Command 🇫🇷 | Expected Tool & Effect |
|---|---|---|
| *"Book this trip now"* | *"Réserve ce voyage maintenant"* | `book_trip` (`risk: 'critical'`) → **HITL confirmation card pops up** in Voice Panel asking for user confirmation before executing |

### Scenario 5: Page Navigation
| English Command 🇬🇧 | French Command 🇫🇷 | Expected Tool & Effect |
|---|---|---|
| *"Show me available accommodations"* | *"Affiche les hébergements disponibles"* | `navigate_to({ page: 'offres' })` → Switches to the Accommodations catalog page |
| *"Compare accommodations"* | *"Ouvre le comparateur"* | `navigate_to({ page: 'comparer' })` → Switches to the side-by-side comparison page |

---

## 5. Troubleshooting & Best Practices

::: details 1. "Connecting..." or WebSocket Connection Error
- Ensure the demo server is running: `pnpm --filter @owllayer/demo-server dev`
- Verify that `VITE_OWLLAYER_API_KEY` in `apps/demo-svelte/.env` matches `OWLLAYER_TRAVEL_API_KEY` in `apps/demo-server/.env` (`pk_78ab37_svelte_travel`).
:::

::: details 2. Microphone & Audio Issues
- Grant browser microphone permissions when prompted.
- Check that your browser supports `AudioContext` and `navigator.mediaDevices.getUserMedia`.
:::

::: details 3. Svelte 5 Runes vs Svelte Stores
- `agentContext` and `agentToolResolver` accept reactive objects wrapped in Svelte 5 `$derived(...)`.
- Subscribable stores like `$isThinking`, `$isSpeaking`, `$agentState`, and `$pendingApproval` use the `$` prefix for automatic subscription in Svelte components.
:::
