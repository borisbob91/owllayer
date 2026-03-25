# Hooks — @domos/react

## useAgent

Accès à l'état de l'agent et aux méthodes d'envoi.

```tsx
import { useAgent } from '@domos/react';

const {
  agentState,       // AgentState
  sessionId,        // string | null
  isConnected,      // boolean
  isThinking,       // boolean
  isSpeaking,       // boolean
  lastResponse,     // string | null
  voiceEnabled,     // boolean
  agentError,       // string | null
  sendText,         // (text: string) => void
  sendInterrupt,    // () => void  — barge-in
  setVoiceEnabled,  // (enabled: boolean) => void
  clearAgentError,  // () => void
} = useAgent();
```

**`AgentState`**

| Valeur | Description |
|---|---|
| `'disconnected'` | Pas de connexion |
| `'connecting'` | Handshake en cours |
| `'connected'` | Connecté, en attente |
| `'listening'` | Agent reçoit la voix |
| `'thinking'` | Agent traite la requête |
| `'speaking'` | Agent joue l'audio |
| `'error'` | Erreur de connexion |

---

## useAgentTool

Enregistre un tool agent dans un composant. Le tool est actif tant que le composant est monté.

```tsx
import { useAgentTool } from '@domos/react';
import { z } from 'zod';

useAgentTool(
  {
    name: 'set_filter',
    description: 'Filtrer les produits par catégorie',
    risk: 'none',
    schema: z.object({
      category: z.enum(['audio', 'video', 'peripheriques']),
    }),
    global: false, // true = persiste après unmount
  },
  async ({ category }) => {
    setFilter(category);
    return { ok: true };
  }
);
```

**Définition :**

| Champ | Type | Description |
|---|---|---|
| `name` | `string` | Nom unique du tool |
| `description` | `string` | Description injectée dans le system prompt |
| `schema` | `z.ZodObject` | Validation des arguments (optionnel) |
| `risk` | `RiskLevel` | Niveau HITL (défaut : `'none'`) |
| `global` | `boolean` | Persiste après unmount (défaut : `false`) |

**`RiskLevel`** : `'none' | 'low' | 'high' | 'critical'`

> Pour N éléments dans un `.map()` : déclarer un seul tool avec une description exhaustive de tous les items plutôt que N tools quasi-identiques.

---

## useAgentToolResolver

Resolver centralisé pour les apps avec de nombreux tools.

```tsx
import { useAgentToolResolver } from '@domos/react';
import { z } from 'zod';

useAgentToolResolver(
  {
    navigation: {
      tools: {
        go_to_page: {
          description: 'Naviguer vers une page',
          schema: z.object({ page: z.enum(['home', 'cart', 'checkout']) }),
          handler: async ({ page }) => navigate(`/${page}`),
        },
      },
    },
    cart: {
      prefix: 'cart_',
      tools: {
        add: {
          description: 'Ajouter un produit au panier',
          schema: z.object({ productId: z.string(), qty: z.number().default(1) }),
          risk: 'low',
          handler: async ({ productId, qty }) => addToCart(productId, qty),
        },
        clear: {
          description: 'Vider le panier',
          risk: 'high',
          schema: z.object({}),
          handler: async () => clearCart(),
        },
      },
    },
  },
  {
    debug: false,
    disabled: false,
    onBeforeAnyCall: (toolName, args) => console.log(toolName, args),
  }
);
```

**Options :**

| Option | Type | Description |
|---|---|---|
| `prefix` | `string` | Préfixe ajouté à tous les noms de tools du groupe |
| `debug` | `boolean` | Logs détaillés de chaque appel |
| `disabled` | `boolean` | Désactive tous les tools du resolver |
| `global` | `boolean` | Persiste après unmount |
| `onBeforeAnyCall` | `(name, args) => void` | Hook avant chaque appel |
| `onAfterAnyCall` | `(name, args, result) => void` | Hook après chaque appel |
| `onErrorAnyCall` | `(name, args, error) => void` | Hook sur erreur |

**Retour :** `{ toolCount: number, toolNames: string[] }`

---

## useNavigationTool

Enregistre un tool `navigate` standard pour la navigation URL.

```tsx
import { useNavigationTool } from '@domos/react';
import { useNavigate } from 'react-router-dom';

function App() {
  const navigate = useNavigate();

  useNavigationTool(({ url, replace, state }) => {
    navigate(url, { replace, state });
  });
}
```

**Args reçus :**

| Champ | Type | Description |
|---|---|---|
| `url` | `string` | URL cible |
| `replace` | `boolean` | Remplacer l'historique |
| `state` | `Record<string, unknown>` | State de navigation |

Toujours global, risk `none`, nom fixe `navigate`.

---

## useViewStateTool

Enregistre un tool `ui_state` standard pour la navigation UI locale (tabs, accordéons, modals...).

```tsx
import { useViewStateTool } from '@domos/react';

useViewStateTool(({ viewId, action, params }) => {
  if (viewId === 'product_modal' && action === 'open') {
    openModal(params?.productId);
  }
  if (viewId === 'tabs' && action === 'set_tab') {
    setActiveTab(params?.tab);
  }
});
```

**Args reçus :**

| Champ | Type | Description |
|---|---|---|
| `viewId` | `string` | Identifiant de la vue ciblée |
| `action` | `string` | Action : `open`, `close`, `set_tab`, `select`... |
| `params` | `Record<string, unknown>` | Paramètres optionnels |

Toujours risk `none`, nom fixe `ui_state`.

---

## useAgentContext

Injecte du contexte passif dans la session LLM. Ne crée pas de tool — les données sont disponibles en lecture seule pour l'agent.

```tsx
import { useAgentContext } from '@domos/react';

function CartPage() {
  const { items, total } = useCart();

  useAgentContext({
    cart: {
      itemCount: items.length,
      total,
      items: items.map(i => ({ id: i.id, name: i.name, qty: i.qty })),
    },
  });
}
```

Le contexte est mis à jour à chaque changement des données passées.

---

## useApproval

Accès aux demandes d'approbation HITL en attente.

```tsx
import { useApproval } from '@domos/react';

const { pendingApproval, approve, deny } = useApproval();
```

**`pendingApproval`** (ou `null`) :

| Champ | Type | Description |
|---|---|---|
| `callId` | `string` | ID de l'appel en attente |
| `toolName` | `string` | Nom du tool |
| `args` | `Record<string, unknown>` | Arguments de l'appel |
| `message` | `string` | Message d'approbation |
| `risk` | `'high' \| 'critical'` | Niveau de risque |

> Si `config.hitl.ui` est `'modal'` ou `'banner'`, le Provider gère les approbations automatiquement. `useApproval` est utile uniquement pour une UI HITL personnalisée.

---

## useVoiceMode

Microphone et streaming audio vers l'agent.

```tsx
import { useVoiceMode } from '@domos/react';

const {
  isRecording,    // boolean
  isMuted,        // boolean
  voiceState,     // VoiceState
  startRecording, // () => Promise<void>
  stopRecording,  // () => void
  muteMic,        // () => void
  unmuteMic,      // () => void
} = useVoiceMode({
  sampleRate: 16000,              // défaut: 16000
  live: false,                    // false = STT classique | true = streaming Live (Gemini Live)
  onTranscript: (text) => {},    // transcription temps réel (mode STT)
  onInputLevel: (level) => {},   // niveau micro 0–1 (pour visualisation)
});
```

**`VoiceState`**

| Valeur | Description |
|---|---|
| `'idle'` | Inactif |
| `'capturing'` | Capture micro active |
| `'awaiting_model'` | Audio envoyé, attente réponse |
| `'playing'` | Agent joue l'audio |
| `'interrupted'` | Barge-in effectué |
| `'error'` | Erreur micro / audio |

**Modes :**
- `live: false` — enregistrement→STT→texte (classique)
- `live: true` — streaming PCM temps réel, compatible Gemini Live et équivalents
