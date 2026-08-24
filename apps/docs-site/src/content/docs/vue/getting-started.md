---
title: "Installation et configuration � @owllayer/vue"
description: Documentation OwlLayer.
---

# Installation et configuration — @owllayer/vue

## 1. Installer le plugin

Contrairement à React où un composant `<OwlLayerProvider>` wraps l'arbre, Vue utilise le système de plugins standard. Le plugin s'installe une seule fois dans `main.ts` et devient disponible dans tous les composants de l'application.

```ts
// main.ts
import { createApp } from 'vue';
import { OwlLayerPlugin } from '@owllayer/vue';
import App from './App.vue';

const app = createApp(App);

app.use(OwlLayerPlugin, {
  apiKey: 'pk_live_xxx',
  endpoint: 'wss://api.example.com/owllayer',
});

app.mount('#app');
```

**Options du plugin (`OwlLayerPluginOptions`) :**

| Option | Type | Description |
|---|---|---|
| `apiKey` | `string` | Clé publique |
| `endpoint` | `string` | WebSocket endpoint AITP |
| `debug` | `boolean` | Affiche les logs WebSocket en console |
| `autoConnect` | `boolean` | Connexion automatique au montage de l'app (défaut : `true`) |
| `voice` | `boolean` | Active le mode vocal dès le démarrage |
| `hitl.ui` | `'modal' \| 'banner' \| 'none'` | Interface HITL montée automatiquement (défaut : `'modal'`) |
| `widget.enabled` | `boolean` | Monte le widget automatiquement dans l'app |
| `widget.config` | `WidgetConfig` | Configuration du widget ([référence](./widget.md)) |

## 2. Premier composable

Une fois le plugin installé, tous les composables sont disponibles dans n'importe quel `<script setup>` de l'application. Aucun import de contexte supplémentaire n'est nécessaire.

```vue
<script setup lang="ts">
import { useAgentTool } from '@owllayer/vue';
import { z } from 'zod';

const props = defineProps<{ product: Product }>();

useAgentTool(
  {
    name: 'add_to_cart',
    description: `Ajouter "${props.product.name}" au panier (${props.product.price}€)`,
    risk: 'low',
    schema: z.object({ quantity: z.number().default(1) }),
  },
  async ({ quantity }) => {
    await addToCart(props.product.id, quantity);
    return { ok: true };
  }
);
</script>
```

Le tool est enregistré quand le composant est monté et retiré automatiquement quand il est démonté.

## 3. État de l'agent

`useAgent()` retourne un objet `state` entièrement réactif, utilisable directement dans les templates Vue sans `ref.value`.

```vue
<script setup>
import { useAgent } from '@owllayer/vue';

const { state, sendText } = useAgent();
</script>

<template>
  <div>
    <span>{{ state.agentState }}</span>
    <p v-if="state.lastResponse">{{ state.lastResponse }}</p>
    <button @click="sendText('Bonjour')">Envoyer</button>
  </div>
</template>
```

## 4. HITL — confirmation manuelle

Les tools déclarés avec `risk: 'high'` ou `'critical'` sont bloqués en attente d'une confirmation humaine avant d'être exécutés. Par défaut, le plugin monte automatiquement la modal de confirmation. Pour une interface personnalisée, désactiver la modal automatique avec `hitl: { ui: 'none' }` et gérer l'approbation manuellement.

```vue
<script setup>
import { useApproval, ApprovalModal } from '@owllayer/vue';

const { pendingApproval, approve, deny } = useApproval();
</script>

<template>
  <ApprovalModal
    v-if="pendingApproval"
    :tool-name="pendingApproval.toolName"
    :message="pendingApproval.message"
    :risk="pendingApproval.risk"
    @approve="approve"
    @deny="deny"
  />
</template>
```

## Contraintes

- Tous les composables (`useAgent`, `useAgentTool`, etc.) doivent être appelés dans le `<script setup>` d'un composant appartenant à l'application où `OwlLayerPlugin` est installé.
- Un seul `app.use(OwlLayerPlugin)` par application Vue.
- Il n'existe pas de composant `<OwlLayerProvider>` dans le SDK Vue — le plugin gère tout.
