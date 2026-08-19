# Composables — @owllayer/vue

## useAgent

Accès à l'état réactif de l'agent et aux méthodes d'envoi.

```vue
<script setup>
import { useAgent } from '@owllayer/vue';

const {
  state,           // OwlLayerReactiveState — réactif, utilisable directement dans le template
  sendText,        // (text: string) => void
  sendInterrupt,   // () => void — barge-in, interrompt l'agent
  sendAudio,       // (audioBase64, mimeType?) => void
  sendAudioStream, // (audioBase64, mimeType?) => void — mode Live
  sendAudioEnd,    // (reason?) => void
  onAudioOutput,   // (callback) => () => void
} = useAgent();
</script>
```

**`OwlLayerReactiveState` :**

| Propriété | Type | Description |
|---|---|---|
| `state.agentState` | `AgentState` | État courant de l'agent |
| `state.sessionId` | `string \| null` | Identifiant de la session WebSocket |
| `state.isConnected` | `boolean` | Connexion active |
| `state.isThinking` | `boolean` | L'agent traite une requête |
| `state.isSpeaking` | `boolean` | L'agent joue l'audio de réponse |
| `state.lastResponse` | `string \| null` | Dernier message de l'agent |
| `state.voiceEnabled` | `boolean` | Mode vocal actif |

**`AgentState` :**

| Valeur | Description |
|---|---|
| `'disconnected'` | Pas de connexion WebSocket |
| `'connecting'` | Handshake en cours |
| `'connected'` | Connecté et en attente |
| `'listening'` | L'agent reçoit l'audio |
| `'thinking'` | L'agent traite la requête |
| `'speaking'` | L'agent joue la réponse audio |
| `'error'` | Erreur de connexion |

---

## useAgentTool

Enregistre un tool agent dans un composant. Le tool est actif tant que le composant est monté.

```vue
<script setup lang="ts">
import { useAgentTool } from '@owllayer/vue';
import { z } from 'zod';

const props = defineProps<{ product: Product }>();

useAgentTool(
  {
    name: 'filter_by_category',
    description: 'Filtrer les produits par catégorie',
    risk: 'none',
    schema: z.object({
      category: z.enum(['audio', 'video', 'peripheriques']),
    }),
    global: false,
  },
  async ({ category }) => {
    setFilter(category);
    return { ok: true };
  }
);
</script>
```

**Définition du tool :**

| Champ | Type | Description |
|---|---|---|
| `name` | `string` | Nom unique du tool |
| `description` | `string` | Description injectée dans le system prompt |
| `schema` | `z.ZodObject` | Validation des arguments par Zod (optionnel) |
| `risk` | `RiskLevel` | Niveau HITL — `'none' \| 'low' \| 'high' \| 'critical'` (défaut : `'none'`) |
| `global` | `boolean` | Si `true`, le tool persiste après le démontage du composant (défaut : `false`) |

> Pour afficher N éléments dans un `v-for`, déclarer un seul tool avec une description exhaustive de tous les items plutôt que N tools quasi-identiques qui fragmentent inutilement le contexte de l'agent.

---

## useAgentToolResolver

Resolver centralisé pour les applications avec de nombreux tools. Regroupe les tools par domaine fonctionnel et évite de multiplier les appels à `useAgentTool`.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useAgentToolResolver } from '@owllayer/vue';
import { z } from 'zod';

const cart = ref([]);

useAgentToolResolver(
  {
    navigation: {
      tools: {
        go_to_page: {
          description: 'Naviguer vers une page de l\'application',
          schema: z.object({ page: z.enum(['home', 'catalog', 'cart', 'checkout']) }),
          handler: async ({ page }) => router.push(`/${page}`),
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
          handler: async ({ productId, qty }) => {
            cart.value.push({ id: productId, qty });
            return { ok: true };
          },
        },
        clear: {
          description: 'Vider intégralement le panier',
          risk: 'high',
          schema: z.object({}),
          handler: async () => { cart.value = []; return { ok: true }; },
        },
      },
    },
  },
  {
    debug: false,
    onBeforeAnyCall: (toolName, args) => console.log(toolName, args),
  }
);
</script>
```

**Options :**

| Option | Type | Description |
|---|---|---|
| `debug` | `boolean` | Affiche les logs de chaque appel de tool |
| `disabled` | `boolean` | Désactive temporairement tous les tools du resolver |
| `global` | `boolean` | Persiste après le démontage du composant |
| `onBeforeAnyCall` | `(name, args) => void` | Hook appelé avant chaque tool |
| `onAfterAnyCall` | `(name, args, result) => void` | Hook appelé après chaque tool |
| `onErrorAnyCall` | `(name, args, error) => void` | Hook appelé en cas d'erreur |

**Retour :** `{ toolCount: number, toolNames: string[] }`

### createCRUDResolver

Génère automatiquement les 5 tools CRUD d'une ressource.

```ts
import { createCRUDResolver, useAgentToolResolver } from '@owllayer/vue';

const productResolver = createCRUDResolver('product', {
  onCreate: async (data) => api.products.create(data),
  onRead:   async (id) => api.products.get(id),
  onUpdate: async (id, data) => api.products.update(id, data),
  onDelete: async (id) => api.products.delete(id),
  onList:   async (filters) => api.products.list(filters),
});

useAgentToolResolver(productResolver);
// Tools générés : product_create, product_read, product_update, product_delete, product_list
```

### createResolverFromSwitch

Convertit une map clé/handler en configuration resolver, sans schéma.

```ts
import { createResolverFromSwitch } from '@owllayer/vue';

const config = createResolverFromSwitch({
  set_view: {
    description: 'Changer la vue active',
    schema: z.object({ view: z.string() }),
    handler: ({ view }) => setCurrentView(view),
  },
});
```

---

## useNavigationTool

Enregistre un tool `navigate` standard pour la navigation URL. Toujours global et sans risque HITL.

```vue
<script setup>
import { useRouter } from 'vue-router';
import { useNavigationTool } from '@owllayer/vue';

const router = useRouter();

useNavigationTool(
  ({ url, replace, state }) => router.push({ path: url, replace }),
  { description: 'Routes disponibles : / (accueil), /catalogue, /panier, /commande' }
);
</script>
```

**Args reçus :**

| Champ | Type | Description |
|---|---|---|
| `url` | `string` | Chemin de destination |
| `replace` | `boolean` | Remplacer l'entrée dans l'historique |
| `state` | `Record<string, unknown>` | State de navigation |

---

## useViewStateTool

Enregistre un tool `ui_state` standard pour les changements d'état UI locaux (tabs, modals, accordéons) sans modifier l'URL. Toujours sans risque HITL.

```vue
<script setup>
import { ref } from 'vue';
import { useViewStateTool } from '@owllayer/vue';

const activeTab = ref('details');
const showModal = ref(false);

useViewStateTool(({ viewId, action, params }) => {
  if (viewId === 'product_tabs' && action === 'set_tab') {
    activeTab.value = params?.tab;
  }
  if (viewId === 'quick_view' && action === 'open') {
    showModal.value = true;
  }
});
</script>
```

**Args reçus :**

| Champ | Type | Description |
|---|---|---|
| `viewId` | `string` | Identifiant de la vue ciblée |
| `action` | `string` | Action à effectuer : `open`, `close`, `set_tab`, `select`... |
| `params` | `Record<string, unknown>` | Paramètres additionnels optionnels |

---

## useAgentContext

Injecte du contexte passif dans la session LLM. Les données sont disponibles en lecture pour l'agent sans créer de tool.

La particularité Vue est que `useAgentContext` accepte soit un objet statique, soit **une fonction getter** qui est observée de façon réactive — les données sont automatiquement synchronisées quand les `ref` ou `computed` sous-jacents changent.

```vue
<script setup>
import { computed, ref } from 'vue';
import { useAgentContext } from '@owllayer/vue';

const cart = ref([]);
const total = computed(() => cart.value.reduce((sum, i) => sum + i.price, 0));

// Forme réactive — se met à jour automatiquement quand cart ou total changent
useAgentContext(() => ({
  currentPage: 'catalog',
  cart: {
    itemCount: cart.value.length,
    total: total.value,
    items: cart.value.map(i => ({ id: i.id, name: i.name })),
  },
}));
</script>
```

---

## useApproval

Accès aux demandes d'approbation HITL en attente.

```vue
<script setup>
import { useApproval } from '@owllayer/vue';

const { pendingApproval, approve, deny } = useApproval();
// pendingApproval est une Ref<PendingApproval | null>
</script>
```

**`PendingApproval` :**

| Champ | Type | Description |
|---|---|---|
| `callId` | `string` | Identifiant de l'appel en attente |
| `toolName` | `string` | Nom du tool à confirmer |
| `args` | `Record<string, unknown>` | Arguments de l'appel |
| `message` | `string` | Message d'approbation destiné à l'utilisateur |
| `risk` | `'high' \| 'critical'` | Niveau de risque |

> Quand `hitl.ui` vaut `'modal'` (défaut) ou `'banner'`, le plugin gère les confirmations automatiquement. `useApproval` est utile uniquement pour une interface HITL entièrement personnalisée.

---

## useVoiceMode

Microphone et streaming audio vers l'agent. Retourne des `Ref` réactifs directement utilisables dans les templates.

```vue
<script setup>
import { useVoiceMode } from '@owllayer/vue';

const {
  isRecording,    // Ref<boolean>
  isMuted,        // Ref<boolean>
  voiceState,     // Ref<VoiceState>
  startRecording, // () => Promise<void>
  stopRecording,  // () => void
  muteMic,        // () => void
  unmuteMic,      // () => void
} = useVoiceMode({
  sampleRate: 16000,
  live: false,
  onTranscript: (text) => console.log(text),
});
</script>

<template>
  <button @click="isRecording ? stopRecording() : startRecording()">
    {{ isRecording ? 'Arrêter' : 'Parler' }}
  </button>
  <span>{{ voiceState }}</span>
</template>
```

**Options :**

| Option | Type | Description |
|---|---|---|
| `sampleRate` | `number` | Fréquence d'échantillonnage (défaut : `16000`) |
| `live` | `boolean` | `false` = STT classique, `true` = streaming temps réel (compatible Gemini Live) |
| `onTranscript` | `(text) => void` | Transcription temps réel (mode STT) |
| `onInputLevel` | `(level) => void` | Niveau micro de 0 à 1, pour la visualisation |

**`VoiceState` :**

| Valeur | Description |
|---|---|
| `'idle'` | Inactif |
| `'capturing'` | Capture micro active |
| `'awaiting_model'` | Audio envoyé, réponse attendue |
| `'playing'` | L'agent joue la réponse audio |
| `'interrupted'` | Barge-in effectué |
| `'error'` | Erreur micro ou audio |
