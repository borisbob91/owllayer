# Démarrage — @owllayer/svelte

Svelte n'utilise ni Provider React ni plugin Vue. Le SDK repose sur une initialisation unique via `initOwlLayer()` puis sur des stores, des actions `use:` et des composants.

## 1. Initialiser OwlLayer

Appeler `initOwlLayer()` une seule fois à la racine de l'application, par exemple dans `+layout.svelte` ou dans le composant principal.

```svelte
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { initOwlLayer } from '@owllayer/svelte';

  const cleanup = initOwlLayer({
    apiKey: 'pk_live_xxx',
    endpoint: 'wss://api.example.com/owllayer',
  });

  onDestroy(() => cleanup());
</script>

<slot />
```

**Options `initOwlLayer()` :**

| Option | Type | Description |
|---|---|---|
| `apiKey` | `string` | Clé publique |
| `endpoint` | `string` | WebSocket endpoint AITP |
| `debug` | `boolean` | Logs techniques en console |
| `autoReconnect` | `boolean` | Reconnexion automatique |
| `globalTools` | `RegisteredTool[]` | Tools globaux disponibles dès l'initialisation |
| `widget.enabled` | `boolean` | Monte le widget automatiquement |
| `widget.config` | `WidgetConfig` | Configuration du widget ([référence](./widget.md)) |

## 2. Lire l'état de l'agent

Les stores Svelte se lisent avec le préfixe `$` dans les composants.

```svelte
<script>
  import { agentState, isConnected, lastResponse, sendText } from '@owllayer/svelte';
</script>

<div>
  <span>{$agentState}</span>
  {#if $lastResponse}
    <p>{$lastResponse}</p>
  {/if}
  <button on:click={() => sendText('Bonjour')}>Envoyer</button>
</div>
```

## 3. Premier tool avec une action Svelte

Le SDK Svelte utilise une action `use:agentTool` sur un nœud DOM pour enregistrer un tool.

```svelte
<script lang="ts">
  import { agentTool } from '@owllayer/svelte';
  import { z } from 'zod';

  export let product;

  async function addToCart(productId: string, quantity: number) {
    // ...
    return { ok: true };
  }
</script>

<button
  use:agentTool={{
    name: 'add_to_cart',
    description: `Ajouter ${product.name} au panier`,
    risk: 'low',
    schema: z.object({ quantity: z.number().default(1) }),
    handler: async ({ quantity }) => addToCart(product.id, quantity),
  }}
  on:click={() => addToCart(product.id, 1)}
>
  Ajouter au panier
</button>
```

## 4. HITL — approbation manuelle

Les actions `risk: 'high'` et `risk: 'critical'` attendent une confirmation humaine. La demande en attente est exposée via le store `pendingApproval`.

```svelte
<script>
  import { pendingApproval, approveAction, denyAction, ApprovalModal } from '@owllayer/svelte';
</script>

{#if $pendingApproval}
  <ApprovalModal
    toolName={$pendingApproval.toolName}
    message={$pendingApproval.message}
    risk={$pendingApproval.risk}
    args={$pendingApproval.args}
    onapprove={approveAction}
    ondeny={denyAction}
  />
{/if}
```

## Contraintes

- Appeler `initOwlLayer()` une seule fois par application Svelte.
- Les actions `use:` doivent être appliquées à de vrais nœuds DOM.
- Pour des listes longues, préférer un resolver ou un tool unique bien décrit plutôt qu'un grand nombre de tools presque identiques.
