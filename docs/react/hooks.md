# Hooks — @owllayer/react

Les hooks React sont la couche la plus directe pour relier votre interface au runtime OwlLayer.

Ils servent a trois choses principales :

- lire l'etat courant de l'agent
- declarer les actions que l'agent peut utiliser
- synchroniser le contexte et les validations avec votre interface React

Ce document ne liste donc pas seulement une API. Il montre quel hook utiliser selon le type de besoin dans l'application.

## useAgent

Accès à l'état de l'agent et aux méthodes d'envoi.

Utiliser `useAgent` quand votre interface doit refleter la conversation en cours : connexion, reflexion, parole, dernier message, erreur, ou envoi manuel d'un texte.

C'est le hook de base pour brancher une UI conversationnelle ou un panneau d'etat.

```tsx
import { useAgent } from '@owllayer/react';

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

Utiliser `useAgentTool` quand vous voulez exposer une action metier precise a l'agent depuis un composant React.

Exemple typique : ajouter au panier, appliquer un filtre, ouvrir une fiche, soumettre un formulaire, lancer une recherche.

```tsx
import { useAgentTool } from '@owllayer/react';
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

Utiliser `useAgentToolResolver` quand l'application contient beaucoup d'actions et que vous voulez eviter de disperser la logique dans des dizaines d'appels a `useAgentTool`.

Ce hook est plus adapte a une architecture orientee domaines, par exemple `navigation`, `cart`, `checkout`, `account`.

```tsx
import { useAgentToolResolver } from '@owllayer/react';
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

Utiliser ce hook quand vous voulez autoriser l'agent a changer de page de facon explicite et encadree, sans reinventer un tool de navigation a chaque projet.

```tsx
import { useNavigationTool } from '@owllayer/react';
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

Utiliser ce hook quand l'agent doit piloter une interface locale sans changer d'URL : ouvrir un panneau, changer d'onglet, afficher une modale, selectionner une vue.

```tsx
import { useViewStateTool } from '@owllayer/react';

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

Utiliser `useAgentContext` pour donner a l'agent une meilleure comprehension de la situation courante, sans lui donner un nouveau pouvoir d'action.

Autrement dit, c'est le hook qui enrichit le contexte, pas celui qui declenche une commande.

```tsx
import { useAgentContext } from '@owllayer/react';

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

Utiliser `useApproval` quand vous voulez construire votre propre interface de validation humaine au lieu de laisser le Provider monter l'UI par defaut.

```tsx
import { useApproval } from '@owllayer/react';

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

Utiliser `useVoiceMode` quand vous voulez construire une experience vocale sur mesure : bouton micro, orb, niveau d'entree, talkback, barge-in, ou interface live dediee.

Si vous utilisez seulement le widget standard, vous n'avez pas toujours besoin de ce hook. Il devient surtout utile pour une UI vocale personnalisee.

```tsx
import { useVoiceMode } from '@owllayer/react';

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
