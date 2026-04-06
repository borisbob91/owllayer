<p align="center">
  <img src="apps/demo/public/domos.svg" width="80" height="80" alt="DomOS Logo" />
</p>

<h1 align="center">DomOS</h1>

<p align="center">
  <strong>Agentic UI Framework</strong> — Donnez a votre IA le controle de votre interface.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#frameworks-ui-supportes">Frameworks</a> &bull;
  <a href="#packages">Packages</a> &bull;
  <a href="#browser-sdk">Browser</a> &bull;
  <a href="#react-sdk">React</a> &bull;
  <a href="#vue-sdk">Vue</a> &bull;
  <a href="#svelte-sdk">Svelte</a> &bull;
  <a href="#server">Server</a> &bull;
  <a href="#widget">Widget</a> &bull;
  <a href="#securite-hitl">Securite</a> &bull;
  <a href="#demo">Demo</a> &bull;
  <a href="#contributing">Contributing</a>
</p>

---

## Qu'est-ce que DomOS ?

DomOS est un framework open-source de pilotage d'interface.

Son role n'est pas de generer une nouvelle UI par-dessus votre produit. Son role est de rendre votre interface existante pilotable par une IA, de facon encadree, observable et utile.

En pratique, DomOS connecte un agent a votre application pour qu'il puisse comprendre ce que l'utilisateur voit, raisonner sur le contexte courant, puis agir via des outils que vous avez explicitement declares.

Autrement dit :

- vous gardez votre application, votre logique metier et vos composants
- vous n'avez pas besoin de rewriter votre front pour "faire de l'IA"
- vous exposez seulement les actions que l'agent a le droit d'utiliser
- vous gardez des garde-fous sur les operations sensibles

DomOS n'est donc pas un chatbot habille en framework.
DomOS est une couche d'orchestration entre le langage naturel, l'etat vivant du produit, et les actions reelles de votre interface.

```tsx
// L'IA peut maintenant ajouter ce produit au panier
useAgentTool({
  name: 'add_to_cart',
  description: 'Ajouter le produit au panier',
  schema: z.object({ quantity: z.number().min(1) }),
  risk: 'low',
}, async ({ quantity }) => {
  cart.add(product, quantity);
  return `${quantity}x ${product.name} ajoute au panier`;
});
```

**Les tools n'existent que quand le composant est monte.** Naviguer vers une autre page = les tools changent automatiquement. L'IA voit toujours exactement ce que l'utilisateur voit.

Cette idee est au coeur de DomOS : un registre d'outils vivant, aligne sur l'ecran courant, plutot qu'une liste statique d'actions chargees une fois pour toutes au demarrage.

### Concepts Cles

| Concept | Description |
|---|---|
| **ADTP** | Agent-to-DOM Transfer Protocol — protocole WebSocket JSON entre le client et le serveur |
| **Shadow Context** | Representation legere de l'etat UI, synchronisee en temps reel avec le serveur |
| **Neural-DOM Binding** | Les composants declarent des outils (`useAgentTool`) qui lient l'IA au DOM |
| **HITL Security** | Human-in-the-Loop — les actions risquees necessitent l'approbation de l'utilisateur |
| **DomOSClient** | Client framework-agnostic dans `@domos/core`, utilise par React et Vue |

En une phrase : DomOS transforme une interface passive en interface pilotable, sans lui faire perdre ses regles, sa logique et sa gouvernance.

---

## Frameworks UI Supportes

| Framework | Statut | Package | Docs | Notes |
|---|---|---|---|---|
| ![Browser](https://img.shields.io/badge/Browser-Ready-0f172a?logo=googlechrome&logoColor=white) | Supporte | `@domos/browser` | [docs/browser/README.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/browser/README.md) | HTML, templates serveur, WordPress, Shopify, multi-pages |
| ![React](https://img.shields.io/badge/React-Ready-0f172a?logo=react&logoColor=61dafb) | Supporte | `@domos/react` | [docs/react/README.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/react/README.md) | Hooks, composants, widget, HITL |
| ![Vue](https://img.shields.io/badge/Vue-Ready-0f172a?logo=vuedotjs&logoColor=42b883) | Supporte | `@domos/vue` | [docs/vue/README.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/vue/README.md) | Plugin, composables, widget |
| ![Svelte](https://img.shields.io/badge/Svelte-Ready-0f172a?logo=svelte&logoColor=ff3e00) | Supporte | `@domos/svelte` | [docs/svelte/README.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/svelte/README.md) | Stores, actions, widget |
| ![Flutter](https://img.shields.io/badge/Flutter-Pending-334155?logo=flutter&logoColor=54c5f8) | En attente | `-` | `-` | SDK mobile prevu |
| ![Swift](https://img.shields.io/badge/Swift-Pending-334155?logo=swift&logoColor=f05138) | En attente | `-` | `-` | SDK iOS natif prevu |
| ![Kotlin](https://img.shields.io/badge/Kotlin-Pending-334155?logo=kotlin&logoColor=7f52ff) | En attente | `-` | `-` | SDK Android natif prevu |

---

## Quick Start

### Prerequis

- Node.js >= 18
- pnpm >= 9

### Installation

```bash
git clone https://github.com/your-org/domos.git
cd domos
pnpm install
pnpm build
```

### Lancer la demo

```bash
# Terminal 1 — Serveur
cd apps/demo-server
cp .env.example .env   # Ajoutez votre GOOGLE_API_KEY
pnpm dev

# Terminal 2 — Client React
cd apps/demo
pnpm dev
```

Ouvrez `http://localhost:5173` et parlez a l'assistant via le chat.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Navigateur                          │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │ ProductCard  │  │  CartPage   │  │   ChatPanel   │  │
│  │             │  │             │  │               │  │
│  │useAgentTool │  │useAgentTool │  │  sendText()   │  │
│  │ add_to_cart │  │ confirm_order│  │  sendAudio()  │  │
│  └──────┬──────┘  └──────┬──────┘  └───────┬───────┘  │
│         │                │                  │          │
│  ┌──────┴──────────────┴──────────────────┴───────┐  │
│  │           DomOSClient (@domos/core)             │  │
│  │                                                  │  │
│  │  Tool Registry ←→ CONTEXT_UPDATE ←→ WebSocket   │  │
│  └──────────────────────┬───────────────────────────┘  │
│                         │ ADTP (WebSocket JSON)        │
└─────────────────────────┼───────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────┐
│                  DomOSServer                             │
│                         │                                │
│  ┌──────────────────────┴─────────────────────────────┐ │
│  │              ADTPTransport (WebSocket)              │ │
│  └──────────────────────┬─────────────────────────────┘ │
│                         │                                │
│  ┌──────────┐  ┌────────┴───────┐  ┌──────────────────┐│
│  │   Auth   │  │ SessionManager │  │ HITLSecurity     ││
│  │Middleware│  │                │  │ Middleware        ││
│  └──────────┘  │ Tool Registry  │  └──────────────────┘│
│                │ Conversation   │                        │
│                │ Shadow Context │                        │
│                └────────┬───────┘                        │
│                         │                                │
│  ┌──────────────────────┴─────────────────────────────┐ │
│  │           LLM Adapter (Google Gemini)               │ │
│  │                                                      │ │
│  │  System Prompt + Tools + Context → Reponse + Calls  │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Flux de communication

```
1. Composant monte     → useAgentTool() enregistre le tool
2. DomOSClient         → CONTEXT_UPDATE envoyé au serveur (tous les tools + contexte)
3. Utilisateur parle   → USER_INPUT envoyé
4. Serveur             → LLM recoit les tools + contexte + message
5. LLM decide          → TOOL_CALL envoyé au client
6. DomOSClient         → Execute le handler local, retourne TOOL_RESULT
7. LLM formule         → AGENT_RESPONSE envoyé au client
8. Composant unmount   → Tool automatiquement retiré du registre
```

---

## Packages

```
domos/
├── packages/
│   ├── core/             @domos/core          Protocole, Client, Types, Widget
│   ├── server/           @domos/server        Serveur WebSocket + LLM
│   ├── browser/          @domos/browser       SDK Browser natif (HTML + widget + voix)
│   ├── react/            @domos/react         SDK React (hooks + composants + widget)
│   ├── vue/              @domos/vue           SDK Vue 3 (composables + plugin + widget)
│   ├── svelte/           @domos/svelte        SDK Svelte (stores + actions + widget)
│   ├── adapter-google/   @domos/adapter-google Adaptateur Google Gemini
│   └── adapter-openai/   @domos/adapter-openai Adaptateur OpenAI GPT / Realtime
│
└── apps/
    ├── demo/             App demo React (e-commerce)
    └── demo-server/      Serveur demo
```

| Package | Description | Taille |
|---|---|---|
| `@domos/core` | Protocole ADTP, DomOSClient, ToolRegistry, Shadow Context, HITL, Widget types | ~18 fichiers |
| `@domos/server` | DomOSServer, Transport WebSocket, Sessions, Middleware, LLM | ~12 fichiers |
| `@domos/browser` | SDK Browser sans framework, widget, auto-discovery `data-domos-*`, voix, session | ~10 fichiers |
| `@domos/react` | DomOSProvider, useAgentTool, useAgent, DomOSWidget, composants Agentic UI | ~17 fichiers |
| `@domos/vue` | DomOSPlugin, useAgentTool, useAgent, DomOSWidget, composants Vue | ~10 fichiers |
| `@domos/svelte` | Stores, Actions, createAgent, DomOSWidget, composants Svelte | ~10 fichiers |
| `@domos/adapter-google` | GoogleAdapter + GoogleLiveAdapter pour Gemini texte et audio natif | ~3 fichiers |
| `@domos/adapter-openai` | OpenAIAdapter + OpenAILiveAdapter pour GPT texte et Realtime audio | ~4 fichiers |

---

## React SDK

| Documentation React | Lien |
|---|---|
| Vue d'ensemble | [docs/react/README.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/react/README.md) |
| Demarrage | [docs/react/getting-started.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/react/getting-started.md) |
| Hooks | [docs/react/hooks.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/react/hooks.md) |
| Composants | [docs/react/components.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/react/components.md) |
| Widget | [docs/react/widget.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/react/widget.md) |

### Installation

```bash
pnpm add @domos/react @domos/core zod
```

### Setup

```tsx
// main.tsx
import { DomOSProvider } from '@domos/react';

function App() {
  return (
    <DomOSProvider
      apiKey="pk_live_..."
      endpoint="wss://your-server.com/domos"
      config={{ voice: true, debug: false }}
    >
      <YourApp />
    </DomOSProvider>
  );
}
```

### useAgentTool — Declarer un outil IA dans un composant

```tsx
import { useAgentTool } from '@domos/react';
import { z } from 'zod';

function ProductCard({ product }) {
  const [liked, setLiked] = useState(false);

  // Cet outil N'EXISTE que quand ProductCard est monte
  useAgentTool({
    name: `like_${product.id}`,
    description: `Ajouter "${product.name}" aux favoris`,
    schema: z.object({
      shouldLike: z.boolean().describe('True pour liker, false pour retirer'),
    }),
    risk: 'none',   // Pas d'approbation requise
  }, async ({ shouldLike }) => {
    setLiked(shouldLike);
    await api.toggleLike(product.id, shouldLike);
    return shouldLike ? 'Ajoute aux favoris' : 'Retire des favoris';
  });

  return <div>{product.name} {liked ? '❤️' : ''}</div>;
}
```

### useAgentContext — Injecter du contexte passif

```tsx
import { useAgentContext } from '@domos/react';

function Dashboard({ user }) {
  // Le LLM sait toujours qui est l'utilisateur
  useAgentContext({
    userId: user.id,
    userName: user.name,
    plan: user.subscription,
    cartItems: user.cart.length,
  });

  return <div>Bienvenue {user.name}</div>;
}
```

### useAgent — Etat et envoi de messages

```tsx
import { useAgent } from '@domos/react';

function ChatInput() {
  const { sendText, lastResponse, isThinking, isConnected } = useAgent();

  return (
    <div>
      <p>{isThinking ? 'Reflexion...' : lastResponse}</p>
      <button onClick={() => sendText('Bonjour !')} disabled={!isConnected}>
        Envoyer
      </button>
    </div>
  );
}
```

### useVoiceMode — Mode vocal

```tsx
import { useVoiceMode } from '@domos/react';

function VoiceButton() {
  const { isRecording, startRecording, stopRecording } = useVoiceMode();

  return (
    <button onClick={isRecording ? stopRecording : startRecording}>
      {isRecording ? '🔴 Arreter' : '🎤 Parler'}
    </button>
  );
}
```

### DomOSTool

Associe un tool agent à un élément HTML existant. Fournir `action` (déclenchement DOM) **ou** `handler` (callback) — pas les deux.

```tsx
import { DomOSTool } from '@domos/react';

// Action DOM — l'agent peut cliquer ce lien
<DomOSTool name="go_to_checkout" description="Naviguer vers le checkout" action="click">
  <Link to="/checkout">Commander →</Link>
</DomOSTool>

// Handler — logique métier directe
<DomOSTool
  name="clear_cart"
  description="Vider le panier"
  risk="high"
  handler={() => clearCart()}
>
  <button onClick={clearCart}>Vider le panier</button>
</DomOSTool>
```

| Prop | Type | Description |
|---|---|---|
| `name` | `string` | Nom unique du tool |
| `description` | `string` | Description pour le LLM |
| `risk` | `'none' \| 'low' \| 'high' \| 'critical'` | Niveau HITL (défaut : `'none'`) |
| `context` | `Record<string, unknown>` | Données annexées à la description |
| `action` | `'click' \| 'focus' \| 'scrollIntoView' \| 'show' \| 'hide'` | Action DOM sur l'élément enfant |
| `handler` | `() => unknown` | Callback direct — exclusif avec `action` |

### DomOSToolBtn

Bouton qui expose simultanément un tool agent. Le même `handler` est appelé par le clic utilisateur et par l'agent.

```tsx
import { DomOSToolBtn } from '@domos/react';

<DomOSToolBtn
  name="add_to_cart"
  description={`Ajouter "${product.name}" au panier`}
  risk="low"
  handler={() => addToCart(product)}
  className="btn-primary"
>
  Ajouter au panier
</DomOSToolBtn>
```

| Prop | Type | Description |
|---|---|---|
| `name` | `string` | Nom unique du tool |
| `description` | `string` | Description pour le LLM |
| `risk` | `'none' \| 'low' \| 'high' \| 'critical'` | Niveau HITL (défaut : `'none'`) |
| `context` | `Record<string, unknown>` | Données annexées à la description |
| `handler` | `() => unknown` | Callback — appelé par l'agent et par le clic |
| `className` | `string` | Classes CSS du `<button>` rendu |
| `disabled` | `boolean` | Désactive le clic humain (l'agent reste actif) |

### useAgentToolResolver — Resolver centralisé (NOUVEAU ✨)

Pour les apps avec beaucoup de tools globaux (navigation, CRUD, checkout...), `useAgentToolResolver` remplace les switch cases géants par une config structurée.

```tsx
import { useAgentToolResolver } from '@domos/react';
import { z } from 'zod';

function ShoppingApp() {
  const [uiState, setUiState] = useState('idle');
  const [cart, setCart] = useState([]);

  // ✅ Définir tous les tools en un seul endroit, groupés par domaine
  useAgentToolResolver({
    // Groupe 1 : Navigation
    navigation: {
      tools: {
        set_ui_view: {
          description: "Change la vue principale",
          schema: z.object({
            view: z.enum(['grid', 'detail', 'cart', 'checkout']),
          }),
          handler: async ({ view }) => {
            setUiState(view);
            return { result: `Vue changée vers ${view}` };
          },
        },
      },
    },
    
    // Groupe 2 : Panier
    cart: {
      tools: {
        add_to_cart: {
          description: "Ajouter un produit au panier",
          schema: z.object({
            product_id: z.string(),
            quantity: z.number().min(1).default(1),
          }),
          risk: 'low',
          handler: async ({ product_id, quantity }) => {
            setCart(prev => [...prev, { id: product_id, quantity }]);
            return { result: "Produit ajouté au panier" };
          },
        },
      },
    },
  });

  return <div>{/* Votre UI */}</div>;
}
```

**Quand l'utiliser ?**
- ✅ Actions globales (navigation, settings, CRUD)
- ✅ Nombreux tools similaires (>10 tools)
- ✅ State management centralisé (Redux, Zustand)

**Quand utiliser `useAgentTool` ?**
- ✅ Actions locales à un composant
- ✅ Tools dynamiques (1 tool par item d'une liste)
- ✅ Accès au state local du composant

→ Voir le [guide de migration](./docs/MIGRATION_RESOLVER.md) pour migrer depuis un switch case.

### Helpers utilitaires

```tsx
import { createResolverFromSwitch, createCRUDResolver } from '@domos/react';

// Helper 1 : Migration rapide depuis switch case
const config = createResolverFromSwitch({
  set_view: {
    description: "Change view",
    schema: z.object({ view: z.string() }),
    handler: (args) => { /* ... */ }
  },
  // ... tous vos cases
});

// Helper 2 : CRUD automatique
const productCRUD = createCRUDResolver('product', {
  onCreate: async (data) => api.products.create(data),
  onUpdate: async (id, data) => api.products.update(id, data),
  onDelete: async (id) => api.products.delete(id),
  onRead: async (id) => api.products.get(id),
  onList: async (filters) => api.products.list(filters),
});

useAgentToolResolver(productCRUD);
```

### Composants UI

| Composant | Description |
|---|---|
| `<AgentIndicator />` | Badge d'etat (en ligne, reflexion, parle...) |
| `<ApprovalModal />` | Modal HITL pour les actions `high` / `critical` |
| `<Notification />` | Toast pour les actions `low` risk |
| `<ShadowContainer />` | Wrapper Shadow DOM pour l'isolation CSS |
| `<DomOSWidget />` | Widget de chat complet (voir [Widget](#widget)) |

---

## Vue SDK

| Documentation Vue | Lien |
|---|---|
| Vue d'ensemble | [docs/vue/README.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/vue/README.md) |
| Demarrage | [docs/vue/getting-started.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/vue/getting-started.md) |
| Composables | [docs/vue/composables.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/vue/composables.md) |
| Composants | [docs/vue/components.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/vue/components.md) |
| Widget | [docs/vue/widget.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/vue/widget.md) |

### Installation

```bash
pnpm add @domos/vue @domos/core zod
```

### Setup

```ts
// main.ts
import { createApp } from 'vue';
import { DomOSPlugin } from '@domos/vue';
import App from './App.vue';

const app = createApp(App);

app.use(DomOSPlugin, {
  endpoint: 'ws://localhost:3000/domos',
  apiKey: 'pk_live_...',
  debug: true,
  voice: true,
});

app.mount('#app');
```

### useAgentTool — Composable Vue

```vue
<script setup>
import { useAgentTool } from '@domos/vue';
import { z } from 'zod';

const props = defineProps(['product']);

// Meme API que React — mount/unmount automatique
useAgentTool({
  name: `add_to_cart_${props.product.id}`,
  description: `Ajouter "${props.product.name}" au panier (${props.product.price} EUR)`,
  schema: z.object({
    quantity: z.number().min(1).max(10),
  }),
  risk: 'low',
}, async ({ quantity }) => {
  cart.add(props.product, quantity);
  return `${quantity}x ${props.product.name} ajoute`;
});
</script>
```

### useAgentContext — Contexte reactif

```vue
<script setup>
import { useAgentContext } from '@domos/vue';

const props = defineProps(['user']);

// Le getter est reactif — se met a jour quand les props changent
useAgentContext(() => ({
  userId: props.user.id,
  userName: props.user.name,
  plan: props.user.plan,
}));
</script>
```

### useAgent — Etat et messages

```vue
<script setup>
import { useAgent } from '@domos/vue';

const { state, sendText } = useAgent();
</script>

<template>
  <p>Statut: {{ state.agentState }}</p>
  <p>{{ state.lastResponse }}</p>
  <button @click="sendText('Bonjour')" :disabled="!state.isConnected">
    Envoyer
  </button>
</template>
```

### Composants Vue

```vue
<template>
  <AgentIndicator />
  <ApprovalModal
    v-if="pendingApproval"
    :tool-name="pendingApproval.toolName"
    :message="pendingApproval.message"
    :risk="pendingApproval.risk"
    @approve="approve"
    @deny="deny"
  />
</template>

<script setup>
import { AgentIndicator, ApprovalModal } from '@domos/vue';
</script>
```

### DomOSTool & DomOSToolBtn

```vue
<script setup>
import { DomOSTool, DomOSToolBtn } from '@domos/vue';
</script>

<template>
  <DomOSTool name="go_to_checkout" description="Naviguer vers le checkout" action="click">
    <a href="/checkout">Commander →</a>
  </DomOSTool>

  <DomOSToolBtn
    name="add_to_cart"
    :description="`Ajouter ${product.name} au panier`"
    risk="low"
    :handler="() => addToCart(product)"
    class="btn-primary"
  >
    Ajouter au panier
  </DomOSToolBtn>
</template>
```

Props identiques à la version React (`name`, `description`, `risk`, `context`, `action`/`handler`, `class`, `disabled`).

---

## Svelte SDK

| Documentation Svelte | Lien |
|---|---|
| Vue d'ensemble | [docs/svelte/README.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/svelte/README.md) |
| Demarrage | [docs/svelte/getting-started.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/svelte/getting-started.md) |
| Stores et actions | [docs/svelte/stores-actions.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/svelte/stores-actions.md) |
| Composants | [docs/svelte/components.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/svelte/components.md) |
| Widget | [docs/svelte/widget.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/svelte/widget.md) |

### Installation

```bash
pnpm add @domos/svelte @domos/core zod
```

### Setup

```svelte
<!-- +layout.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { initDomOS } from '@domos/svelte';

  let cleanup;
  onMount(() => {
    cleanup = initDomOS({
      endpoint: 'ws://localhost:3000/domos',
      apiKey: 'pk_live_...',
      debug: true,
    });
  });
  onDestroy(() => cleanup?.());
</script>

<slot />
```

### agentTool — Action Svelte

```svelte
<script>
  import { agentTool } from '@domos/svelte';
  import { z } from 'zod';

  export let product;

  const toolOptions = {
    name: `add_to_cart_${product.id}`,
    description: `Ajouter "${product.name}" au panier`,
    schema: z.object({ quantity: z.number().min(1).max(10) }),
    risk: 'low',
    handler: async ({ quantity }) => {
      cart.add(product, quantity);
      return `${quantity}x ${product.name} ajoute`;
    },
  };
</script>

<div use:agentTool={toolOptions}>
  <h3>{product.name}</h3>
  <p>{product.price} EUR</p>
</div>
```

### createAgent — Etat et messages

```svelte
<script>
  import { createAgent } from '@domos/svelte';

  const { agentState, lastResponse, isThinking, sendText } = createAgent();
</script>

<p>Statut: {$agentState}</p>
<p>{$isThinking ? 'Reflexion...' : $lastResponse}</p>
<button on:click={() => sendText('Bonjour')}>Envoyer</button>
```

### createVoiceMode — Mode vocal

```svelte
<script>
  import { createVoiceMode } from '@domos/svelte';

  const { isRecording, startRecording, stopRecording } = createVoiceMode();
</script>

<button on:click={$isRecording ? stopRecording : startRecording}>
  {$isRecording ? 'Arreter' : 'Parler'}
</button>
```

### Composants Svelte

| Composant | Description |
|---|---|
| `<AgentIndicator />` | Badge d'etat (en ligne, reflexion, parle...) |
| `<ApprovalModal />` | Modal HITL pour les actions `high` / `critical` |
| `<DomOSWidget />` | Widget de chat complet (voir [Widget](#widget)) |

### DomOSTool & DomOSToolBtn

```svelte
<script>
  import { DomOSTool, DomOSToolBtn } from '@domos/svelte';
</script>

<DomOSTool name="go_to_checkout" description="Naviguer vers le checkout" action="click">
  <a href="/checkout">Commander →</a>
</DomOSTool>

<DomOSToolBtn
  name="add_to_cart"
  description="Ajouter le produit au panier"
  risk="low"
  handler={() => addToCart(product)}
  class="btn-primary"
>
  Ajouter au panier
</DomOSToolBtn>
```

Props identiques à la version React (`name`, `description`, `risk`, `context`, `action`/`handler`, `class`, `disabled`).

---

## Browser SDK

`@domos/browser` intègre DomOS dans n'importe quelle page HTML sans framework.

| Documentation Browser | Lien |
|---|---|
| Vue d'ensemble | [docs/browser/README.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/browser/README.md) |
| Demarrage | [docs/browser/getting-started.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/browser/getting-started.md) |
| API | [docs/browser/api-reference.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/browser/api-reference.md) |
| Auto-discovery HTML | [docs/browser/auto-discovery.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/browser/auto-discovery.md) |
| Widget, voix, session | [docs/browser/widget-voice-session.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/browser/widget-voice-session.md) |

### Installation

```bash
pnpm add @domos/browser
```

Ou via CDN :

```html
<script type="module">
  import { DomOS } from 'https://cdn.domos.dev/browser/latest/domos.min.js';
</script>
```

### Usage minimal

```html
<script type="module">
  import { DomOS } from '@domos/browser';

  await DomOS.init({
    apiKey: 'pk_live_xxx',
    endpoint: 'wss://api.example.com/domos',
    widget: { agentName: 'Alex', voiceEnabled: true },
  });
</script>
```

### API

| Méthode | Description |
|---|---|
| `DomOS.init(config)` | Initialise le runtime et monte le widget |
| `DomOS.registerTool(name, def)` | Enregistre un tool programmatiquement |
| `DomOS.unregisterTool(name)` | Retire un tool |
| `DomOS.updateContext(data)` | Met à jour le contexte courant |
| `DomOS.setContext(data)` | Remplace le contexte courant |
| `DomOS.sendText(text)` | Envoie un message texte à l'agent |
| `DomOS.startVoice()` | Démarre le mode vocal |
| `DomOS.stopVoice()` | Arrête le mode vocal |
| `DomOS.getAgentState()` | Retourne l'état courant de l'agent |
| `DomOS.onAgentStateChange(cb)` | Écoute les changements d'état |
| `DomOS.onResponse(cb)` | Écoute les réponses en streaming |
| `DomOS.onToolCall(cb)` | Écoute les appels de tools |
| `DomOS.disconnect()` | Ferme la connexion WebSocket |
| `DomOS.destroy()` | Démonte le widget et libère les ressources |

### `data-domos-*` — Déclaration HTML

Le SDK scanne le DOM au `init()` et expose comme tools agent tout élément marqué avec ces attributs :

```html
<button
  data-domos-tool="add_to_cart_casque"
  data-domos-description="Ajouter le Casque Bluetooth Pro au panier (149,99€, stock:15)"
  data-domos-risk="low"
  data-domos-action="click"
>
  Ajouter au panier
</button>

<a href="/checkout.html"
  data-domos-tool="go_to_checkout"
  data-domos-description="Naviguer vers la page de commande"
  data-domos-risk="none"
  data-domos-action="click"
>
  Commander →
</a>
```

| Attribut | Valeurs | Description |
|---|---|---|
| `data-domos-tool` | `string` | Nom unique du tool |
| `data-domos-description` | `string` | Description pour le LLM |
| `data-domos-risk` | `none \| low \| high \| critical` | Niveau HITL (défaut : `none`) |
| `data-domos-action` | `click \| focus \| scrollIntoView \| show \| hide` | Action déclenchée par l'agent |

Pour un DOM dynamique (SPA, injection JS), utiliser `DomOS.registerTool()` à la place.

Voir `apps/demo-browser/` pour une démo complète.

---

## Widget

Le `DomOSWidget` est un composant de chat complet, style "appel telephonique", disponible en React, Vue et Svelte.

```tsx
// React
import { DomOSWidget } from '@domos/react';

<DomOSWidget
  apiKey="pk_live_xxx"
  endpoint="wss://api.example.com/domos"
  config={{
    agentName: 'Alex',
    agentTitle: 'CEO',
    mode: 'audio',
    allowModeSwitch: true,
    labels: { callToAction: 'Appeler le CEO', badge: '1 appel manque' },
  }}
/>
```

```svelte
<!-- Svelte -->
<script>
  import { DomOSWidget } from '@domos/svelte';
</script>

<DomOSWidget
  apiKey="pk_live_xxx"
  endpoint="wss://api.example.com/domos"
  config={{ agentName: 'Alex', agentTitle: 'CEO' }}
/>
```

Le widget est autonome — il encapsule automatiquement le `DomOSProvider` (React) ou cree son propre `DomOSClient` (Vue/Svelte).

Pour la configuration complete, voir [docs/WIDGET.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/WIDGET.md), [docs/react/widget.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/react/widget.md), [docs/vue/widget.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/vue/widget.md) et [docs/svelte/widget.md](c:/Users/BorisBob/Downloads/autoflow-ai-hub%20(3)/domos/docs/svelte/widget.md).

---

## Server

### Installation

```bash
pnpm add @domos/server @domos/core @domos/adapter-google
```

### Configuration minimale

```ts
import { DomOSServer } from '@domos/server';
import { GoogleAdapter } from '@domos/adapter-google';

const server = new DomOSServer({
  llm: new GoogleAdapter({
    model: 'gemini-2.0-flash',
    apiKey: process.env.GOOGLE_API_KEY,
    systemPrompt: 'Tu es un assistant e-commerce...',
  }),
  port: 3000,
  path: '/domos',
});

// Autoriser une API key
server.addApiKey('pk_live_...');

// Tool cote serveur (acces DB, API externes, etc.)
server.tool('check_inventory', async ({ productId }) => {
  const stock = await db.products.getStock(productId);
  return { productId, stock, available: stock > 0 };
});

server.listen(() => {
  console.log('DomOS Server sur ws://localhost:3000/domos');
});
```

### Synchronisation des tools client

Les tools definis avec `useAgentTool()` dans React/Vue sont **automatiquement synchronises** avec le serveur :

1. Au demarrage (handshake), le `DomOSClient` envoie un `CONTEXT_UPDATE` avec tous les tools enregistres
2. A chaque `registerTool()` / `unregisterTool()`, un nouveau `CONTEXT_UPDATE` est envoye
3. Le serveur met a jour le `ToolRegistry` de la session et transmet les tools au LLM

```
useAgentTool('add_to_cart', ...)   →   CONTEXT_UPDATE   →   LLM connait le tool
composant unmount                  →   CONTEXT_UPDATE   →   LLM ne le voit plus
```

### Options du serveur

```ts
interface DomOSServerOptions {
  llm: LLMAdapter;              // Adaptateur LLM (requis)
  server?: HttpServer;           // Serveur HTTP existant (optionnel)
  port?: number;                 // Port (defaut: 3000)
  path?: string;                 // Path WebSocket (defaut: '/domos')
  rateLimit?: {
    maxRequests: number;         // Max requetes par fenetre
    windowMs: number;            // Taille de la fenetre en ms
  };
  toolTimeout?: number;          // Timeout des tools en ms (defaut: 30s)
  maxConversationMessages?: number; // Max messages en memoire (defaut: 100)
}
```

### Adaptateurs LLM

DomOS utilise un pattern Adapter pour supporter differents LLMs :

| Fournisseur | Statut | Package | Texte / tools | Live audio natif | STT serveur | TTS serveur | Notes |
|---|---|---|---|---|---|---|---|
| ![Google](https://img.shields.io/badge/Google-Ready-0f172a?logo=google&logoColor=white) | Supporte | `@domos/adapter-google` | `GoogleAdapter` pour Gemini (`gemini-2.0-flash`, `gemini-2.5-pro`, etc.) | `GoogleLiveAdapter` pour Gemini Live natif bidirectionnel | `GoogleSTT` | `GoogleTTS` | Stack Google complete: texte, live natif, STT et TTS |
| ![OpenAI](https://img.shields.io/badge/OpenAI-Ready-0f172a?logo=openai&logoColor=white) | Supporte | `@domos/adapter-openai` | `OpenAIAdapter` pour GPT texte + tools | `OpenAILiveAdapter` pour Realtime API | `WhisperSTT` | `OpenAITTS` | Stack OpenAI complete: texte, realtime, STT et TTS |
| ![ElevenLabs](https://img.shields.io/badge/ElevenLabs-Voice%20Only-334155?logo=elevenlabs&logoColor=white) | Partiel | `-` | `-` | `-` | `-` | `ElevenLabsTTS` | Fournisseur voix uniquement, pas d'adapter LLM dans le repo |
| ![Anthropic](https://img.shields.io/badge/Anthropic-Pending-334155?logo=anthropic&logoColor=white) | En attente | `@domos/adapter-anthropic` | Claude tools / texte | `-` | `-` | `-` | Adapteur LLM planifie, non implemente |
| ![Azure](https://img.shields.io/badge/Azure%20Speech-Pending-334155?logo=microsoftazure&logoColor=white) | En attente | `-` | `-` | `-` | `AzureSTT` | `AzureTTS` | Roadmap speech cote serveur, pas d'adapter LLM dedie |
| ![Mistral](https://img.shields.io/badge/Mistral-Pending-334155?logo=mistralai&logoColor=white) | En attente | `@domos/adapter-mistral` | Texte / tools | `-` | `-` | `-` | Candidat naturel pour un futur adapter texte |
| ![Groq](https://img.shields.io/badge/Groq-Pending-334155?logo=groq&logoColor=white) | En attente | `@domos/adapter-groq` | Texte / tools | `-` | `-` | `-` | Option envisageable pour faible latence texte |

> Les colonnes `STT serveur` et `TTS serveur` correspondent aux providers exposes par `@domos/server`, pas a des packages d'adapter LLM separes.

**Creer un adaptateur custom :**

```ts
import { BaseLLMAdapter, type LLMRequest, type LLMResponse } from '@domos/server';

class MyLLMAdapter extends BaseLLMAdapter {
  async chat(request: LLMRequest): Promise<LLMResponse> {
    // Appeler votre API LLM
    const response = await myApi.call({
      messages: request.messages,
      tools: request.tools,
      system: request.systemPrompt,
    });

    return {
      text: response.content,
      toolCalls: response.tools?.map(t => ({
        callId: t.id,
        name: t.name,
        args: t.arguments,
      })),
    };
  }
}
```

---

## Securite HITL

DomOS integre un systeme de securite **Human-in-the-Loop** a 4 niveaux :

| Niveau | Comportement | Exemple |
|---|---|---|
| `none` | Execution silencieuse | `search_products`, `filter_results` |
| `low` | Execution + notification toast | `add_to_cart`, `like_product` |
| `high` | **Approbation requise** (modal) | `clear_cart`, `delete_account` |
| `critical` | **Approbation requise** (modal renforce) | `confirm_order`, `process_payment` |

### Declarer le niveau de risque

```tsx
useAgentTool({
  name: 'delete_account',
  description: 'Supprimer le compte utilisateur',
  risk: 'critical',   // ← L'utilisateur DOIT approuver
}, async () => {
  await api.deleteAccount();
  return 'Compte supprime';
});
```

### Composants de securite

```tsx
// Le modal d'approbation est isole dans un Shadow DOM ferme
// pour empecher l'IA de le manipuler
<ApprovalModal />    // Affiche automatiquement quand risk >= high
<Notification />     // Toast pour risk === low
```

### Bloquer un tool cote serveur

```ts
// Empecher l'execution meme si le client l'a enregistre
server.blockTool('dangerous_tool');
```

---

## Protocole ADTP

Le protocole **Agent-to-DOM Transfer Protocol** definit 8 types de messages JSON echanges via WebSocket :

| Type | Direction | Description |
|---|---|---|
| `HANDSHAKE_INIT` | Client → Serveur | Initialiser la connexion |
| `HANDSHAKE_ACK` | Serveur → Client | Confirmer la session |
| `CONTEXT_UPDATE` | Client → Serveur | Envoyer les tools + contexte UI |
| `USER_INPUT` | Client → Serveur | Message texte ou audio |
| `TOOL_CALL` | Serveur → Client | L'IA demande l'execution d'un tool |
| `TOOL_RESULT` | Client → Serveur | Resultat de l'execution du tool |
| `AGENT_RESPONSE` | Serveur → Client | Reponse textuelle de l'IA |
| `SYSTEM_EVENT` | Bidirectionnel | Erreurs, notifications, deconnexion |

### Format d'un message

```json
{
  "type": "TOOL_CALL",
  "payload": {
    "callId": "tc_a1b2c3",
    "name": "add_to_cart",
    "args": { "quantity": 2 }
  },
  "meta": {
    "id": "msg_x7y8z9",
    "timestamp": 1706000000000,
    "version": "1.0.0"
  }
}
```

---

## DomOSClient

Le `DomOSClient` est le client **framework-agnostic** au coeur de DomOS. Il est utilise en interne par `@domos/react` et `@domos/vue`, mais peut aussi etre utilise directement :

```ts
import { DomOSClient } from '@domos/core';

const client = new DomOSClient({
  endpoint: 'ws://localhost:3000/domos',
  apiKey: 'pk_live_...',
  debug: true,
});

// Enregistrer un tool
client.registerTool({
  declaration: { name: 'greet', description: 'Dire bonjour' },
  handler: async () => 'Bonjour !',
});

// Ecouter les events
client.on({
  onAgentResponse: (text, done) => console.log('Agent:', text),
  onToolsSync: (tools) => console.log(`${tools.length} tools syncs`),
});

// Se connecter (sync automatique des tools)
client.connect();

// Envoyer un message
client.sendText('Bonjour !');
```

---

## Demo

L'application demo est un e-commerce fictif qui illustre tous les concepts DomOS :

### Pages et Tools

| Page | Tools enregistres | Risk |
|---|---|---|
| **Catalogue** (`/`) | `search_products`, `filter_by_category`, `clear_filters` | none |
| **Catalogue** (`/`) | `add_to_cart_{id}` (par produit visible) | low |
| **Produit** (`/product/:id`) | `add_to_cart`, `navigate_to_cart`, `go_back_to_catalogue` | low/none |
| **Panier** (`/cart`) | `remove_from_cart`, `continue_shopping` | low/none |
| **Panier** (`/cart`) | `clear_cart` | **high** |
| **Panier** (`/cart`) | `confirm_order` | **critical** |

### Contexte injecte (useAgentContext)

Chaque page injecte son contexte automatiquement :

```ts
// HomePage
{ page: 'catalogue', totalProducts: 6, activeFilter: 'tous', searchQuery: null }

// ProductPage
{ page: 'product_detail', productId: 'casque-bt-pro', productPrice: 149.99, productStock: 15 }

// CartPage
{ page: 'cart', cartItems: [...], cartTotal: 239.98, cartItemCount: 3 }
```

### Ce que vous pouvez dire a l'assistant

- "Montre-moi les peripheriques"
- "Ajoute le casque Bluetooth au panier"
- "Qu'est-ce qu'il y a dans mon panier ?"
- "Vide le panier" (demandera une approbation)
- "Confirme ma commande" (approbation critique)

---

## Structure du projet

```
domos/
├── package.json              # Monorepo root
├── pnpm-workspace.yaml       # Workspaces pnpm
├── turbo.json                # Config Turborepo
├── tsconfig.base.json        # TypeScript partage
│
├── packages/
│   ├── core/                 # @domos/core
│   │   └── src/
│   │       ├── protocol/     # ADTP (types, serializer, validator, constants)
│   │       ├── client/       # DomOSClient (framework-agnostic)
│   │       ├── tools/        # ToolRegistry, schema Zod→JSON
│   │       ├── context/      # Shadow Context (types, differ)
│   │       ├── security/     # HITL (policy, types)
│   │       └── utils/        # Logger, UUID
│   │
│   ├── server/               # @domos/server
│   │   └── src/
│   │       ├── core/         # DomOSServer, SessionManager, ToolRouter
│   │       ├── transport/    # ADTPTransport (WebSocket), ConnectionPool
│   │       ├── middleware/   # Auth, RateLimit, HITLSecurity
│   │       ├── llm/          # LLMAdapter interface, BaseLLMAdapter
│   │       └── memory/       # ConversationBuffer, SessionGraph
│   │
│   ├── react/                # @domos/react
│   │   └── src/
│   │       ├── provider/     # DomOSProvider, DomOSContext
│   │       ├── hooks/        # useAgentTool, useAgent, useAgentContext, useApproval
│   │       ├── components/   # AgentIndicator, ApprovalModal, Notification, ShadowContainer
│   │       └── voice/        # useVoiceMode
│   │
│   ├── vue/                  # @domos/vue
│   │   └── src/
│   │       ├── plugin/       # DomOSPlugin
│   │       ├── composables/  # useAgentTool, useAgent, useAgentContext, useVoiceMode
│   │       └── components/   # AgentIndicator, ApprovalModal, DomOSWidget
│   │
│   ├── svelte/               # @domos/svelte
│   │   └── src/
│   │       ├── stores/       # domos.store (writable stores + initDomOS)
│   │       ├── actions/      # agentTool, agentContext (use: directives)
│   │       ├── composables/  # createAgent, createVoiceMode
│   │       └── components/   # AgentIndicator, ApprovalModal, DomOSWidget
│   │
│   └── adapter-google/       # @domos/adapter-google
│       └── src/              # GoogleAdapter, toolConverter
│
└── apps/
    ├── demo/                 # App demo React + Tailwind v3
    └── demo-server/          # Serveur demo (Gemini 2.0 Flash)
```

---

## Scripts

```bash
# Depuis la racine du monorepo

pnpm install          # Installer les dependances
pnpm build            # Build tous les packages (ordre respecte par Turbo)
pnpm test             # Lancer tous les tests
pnpm dev              # Mode dev (watch) sur tous les packages

# Package specifique
pnpm --filter @domos/core build
pnpm --filter @domos/core test
pnpm --filter @domos/demo dev
```

---

## Tests

```bash
pnpm test
```

| Package | Tests | Couverture |
|---|---|---|
| `@domos/core` | 31 tests | Protocol, Registry, Context Differ |
| `@domos/server` | 21 tests | Session, Conversation, SessionGraph, RateLimit |

```
 ✓ protocol.test.ts (12 tests)
 ✓ registry.test.ts (11 tests)
 ✓ differ.test.ts (8 tests)
 ✓ SessionManager.test.ts (7 tests)
 ✓ ConversationBuffer.test.ts (6 tests)
 ✓ SessionGraph.test.ts (4 tests)
 ✓ RateLimit.test.ts (4 tests)
```

---

## Variables d'environnement

### Client (`.env` dans `apps/demo/`)

```env
VITE_DOMOS_ENDPOINT=ws://localhost:3000/domos
VITE_DOMOS_API_KEY=pk_demo_local
```

### Serveur (`.env` dans `apps/demo-server/`)

```env
PORT=3000
GOOGLE_API_KEY=your_gemini_api_key
DOMOS_API_KEY=pk_demo_local
```

---

## Roadmap

- [x] **@domos/core** — Protocole ADTP, ToolRegistry, Shadow Context, HITL
- [x] **@domos/server** — Serveur WebSocket, Sessions, Middleware, LLM
- [x] **@domos/react** — SDK React (hooks + composants)
- [x] **@domos/vue** — SDK Vue 3 (composables + plugin)
- [x] **@domos/svelte** — SDK Svelte (stores + actions)
- [x] **@domos/adapter-google** — Google Gemini
- [x] **@domos/adapter-openai** — OpenAI GPT-4o / Realtime
- [x] **DomOSClient** — Client framework-agnostic avec sync automatique
- [x] **DomOSWidget** — Widget de chat (React, Vue, Svelte)
- [x] **SystemPromptConfig** — System prompt structure et type
- [x] **Demo e-commerce** — App complete avec Tailwind CSS v3
- [ ] **@domos/adapter-anthropic** — Claude (Anthropic)
- [ ] **Mode Live Audio** — Streaming bidirectionnel natif (Gemini Live)
- [ ] **Azure Speech** — Azure STT / TTS cote serveur
- [ ] **Persistance** — MongoDB / Redis pour les sessions
- [ ] **Dashboard admin** — Monitoring des sessions et tools en temps reel
- [ ] **Tests E2E** — Playwright / Cypress
- [ ] **Publish npm** — Changesets + CI/CD

---

## Stack Technique

| Couche | Technologies |
|---|---|
| **Monorepo** | pnpm workspaces + Turborepo |
| **Langage** | TypeScript 5.5+ (strict) |
| **Build** | tsup (ESM) |
| **Tests** | Vitest |
| **React** | React 18+ |
| **Vue** | Vue 3.3+ |
| **Svelte** | Svelte 4+ |
| **Validation** | Zod |
| **Transport** | WebSocket (ws) |
| **LLM** | Google Gemini (extensible) |
| **CSS** | Tailwind CSS v3 (demo) |

---

## Contributing

Les contributions sont les bienvenues !

1. Fork le projet
2. Creez votre branche (`git checkout -b feature/ma-feature`)
3. Commitez vos changements (`git commit -m 'feat: ajouter ma feature'`)
4. Push (`git push origin feature/ma-feature`)
5. Ouvrez une Pull Request

### Convention de commits

```
feat:     Nouvelle fonctionnalite
fix:      Correction de bug
docs:     Documentation
refactor: Refactoring (pas de changement fonctionnel)
test:     Ajout/modification de tests
chore:    Maintenance (deps, config, CI)
```

### Nomenclature des fichiers

Les fichiers portent la terminologie du framework en prefixe :

```
adtp.types.ts           # Types du protocole ADTP
adtp.transport.ts       # Transport WebSocket ADTP
shadow-context.differ.ts # Diffing du Shadow Context
hitl.policy.ts          # Politique de securite HITL
hitl.security.ts        # Middleware securite HITL
agentic-ui.Indicator.tsx # Composant UI agentique
shadow-dom.Container.tsx # Container Shadow DOM
```

---

## Licence

MIT

---

<p align="center">
  <strong>DomOS</strong> — Agentic UI Framework
  <br />
  Donnez a votre IA le controle de votre interface, en toute securite.
</p>
