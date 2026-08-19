---
title: "Stores et actions � @owllayer/svelte"
description: Documentation OwlLayer.
---

# Stores et actions — @owllayer/svelte

## Stores principaux

```svelte
<script>
  import {
    owllayerClient,
    agentState,
    sessionId,
    lastResponse,
    pendingApproval,
    isConnected,
    isThinking,
    isSpeaking,
  } from '@owllayer/svelte';
</script>
```

| Store | Type | Description |
|---|---|---|
| `owllayerClient` | `Writable<OwlLayerClient \| null>` | Instance cliente courante |
| `agentState` | `Writable<ClientState>` | État global de l'agent |
| `sessionId` | `Writable<string \| null>` | ID de session courant |
| `lastResponse` | `Writable<string \| null>` | Dernier message de l'agent |
| `pendingApproval` | `Writable<ApprovalRequest \| null>` | Demande HITL en attente |
| `isConnected` | `Derived<boolean>` | Connexion active |
| `isThinking` | `Derived<boolean>` | L'agent réfléchit |
| `isSpeaking` | `Derived<boolean>` | L'agent joue de l'audio |

**`ClientState`** : `'disconnected' | 'connecting' | 'connected' | 'listening' | 'thinking' | 'speaking' | 'error'`

## Fonctions de store

### `initOwlLayer(options)`

Initialise OwlLayer à la racine de l'application et retourne une fonction de nettoyage.

```svelte
<script>
  import { onDestroy } from 'svelte';
  import { initOwlLayer } from '@owllayer/svelte';

  const cleanup = initOwlLayer({
    apiKey: 'pk_live_xxx',
    endpoint: 'wss://api.example.com/owllayer',
  });

  onDestroy(cleanup);
</script>
```

### `sendText(text)`

Envoie un message texte à l'agent.

```ts
sendText('Montre-moi le panier');
```

### `sendAudio(audioBase64, mimeType?)`

Envoie un chunk audio pour une interaction orientée transcription.

### `sendAudioStream(audioBase64, mimeType?)`

Envoie un chunk audio dans un flux temps réel, compatible avec les modèles Live.

### `sendAudioEnd(reason?)`

Signale la fin du flux audio. Les raisons attendues sont en général `user_stop`, `vad` ou `timeout`.

### `sendInterrupt()`

Interrompt l'agent pendant sa réponse vocale. Utile pour le barge-in.

### `approveAction()` et `denyAction()`

Acceptent ou refusent la demande HITL actuellement stockée dans `pendingApproval`.

### `onAudioOutput(callback)`

Permet d'écouter les chunks audio de sortie générés par l'agent.

```ts
const unsubscribe = onAudioOutput((audioBase64, mimeType) => {
  // lecture ou visualisation personnalisée
});
```

---

## Actions Svelte

## `agentTool`

Enregistre un tool directement sur un nœud DOM.

```svelte
<script lang="ts">
  import { agentTool } from '@owllayer/svelte';
  import { z } from 'zod';

  export let product;
</script>

<button
  use:agentTool={{
    name: 'add_to_cart',
    description: `Ajouter ${product.name} au panier`,
    risk: 'low',
    schema: z.object({ quantity: z.number().default(1) }),
    handler: async ({ quantity }) => ({ ok: true }),
  }}
>
  Ajouter au panier
</button>
```

| Champ | Type | Description |
|---|---|---|
| `name` | `string` | Nom unique du tool |
| `description` | `string` | Description pour le LLM |
| `schema` | `z.ZodObject` | Validation des arguments |
| `risk` | `'none' \| 'low' \| 'high' \| 'critical'` | Niveau HITL |
| `handler` | `(args) => unknown` | Callback appelé par l'agent |
| `global` | `boolean` | Persiste après suppression du nœud |

## `agentToolResolver`

Enregistre un groupe de tools avec une seule action.

```svelte
<script lang="ts">
  import { agentToolResolver } from '@owllayer/svelte';
  import { z } from 'zod';

  const config = {
    cart: {
      prefix: 'cart_',
      tools: {
        clear: {
          description: 'Vider le panier',
          risk: 'high',
          schema: z.object({}),
          handler: async () => ({ ok: true }),
        },
      },
    },
  };
</script>

<div use:agentToolResolver={{ config, options: { debug: false } }} />
```

**Options** : `disabled`, `debug`, `global`, `onBeforeAnyCall`, `onAfterAnyCall`, `onErrorAnyCall`

## `agentContext`

Injecte du contexte passif sur un nœud DOM. Les données sont réappliquées automatiquement quand les props changent.

```svelte
<div use:agentContext={{ currentPage: 'cart', itemCount: cart.length }} />
```

## `navigateTool`

Déclare un tool standard de navigation URL.

```svelte
<script>
  import { goto } from '$app/navigation';
  import { navigateTool } from '@owllayer/svelte';
</script>

<div
  use:navigateTool={{
    handler: ({ url, replace }) => goto(url, { replaceState: replace }),
    description: 'Routes disponibles : /, /catalogue, /panier, /commande',
  }}
/>
```

## `uiStateTool`

Déclare un tool standard de changement d'état UI local.

```svelte
<script>
  import { uiStateTool } from '@owllayer/svelte';
  let activeTab = 'details';
</script>

<div
  use:uiStateTool={{
    handler: ({ viewId, action, params }) => {
      if (viewId === 'tabs' && action === 'set_tab') activeTab = params?.tab;
    },
  }}
/>
```

---

## Helpers et composables

## `createAgent()`

Regroupe les stores et fonctions agent les plus utiles dans un seul objet.

```ts
import { createAgent } from '@owllayer/svelte';

const agent = createAgent();
// agent.agentState, agent.lastResponse, agent.isThinking, agent.sendText(...)
```

## `createVoiceMode(options?)`

Helper pour la capture micro et la lecture audio.

```ts
import { createVoiceMode } from '@owllayer/svelte';

const voice = createVoiceMode({
  sampleRate: 16000,
  live: true,
});
```

Retourne : `isRecording`, `isMuted`, `voiceState`, `startRecording()`, `stopRecording()`, `toggleMute()`

## `createResolverFromSwitch()`

Construit rapidement un resolver à partir d'une map de handlers.

## `createCRUDResolver()`

Génère les tools CRUD d'une ressource.

```ts
const productResolver = createCRUDResolver('product', {
  onCreate: async (data) => api.products.create(data),
  onRead: async (id) => api.products.get(id),
  onUpdate: async (id, data) => api.products.update(id, data),
  onDelete: async (id) => api.products.delete(id),
  onList: async (filters) => api.products.list(filters),
});
```
