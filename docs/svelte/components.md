# Composants — @owllayer/svelte

## AgentIndicator

Badge d'état visuel de l'agent. Le composant lit directement les stores OwlLayer et se met à jour automatiquement.

```svelte
<script>
  import { AgentIndicator } from '@owllayer/svelte';
</script>

<AgentIndicator />
```

| État agent | Apparence |
|---|---|
| `disconnected` | Rouge, statique |
| `connecting` | Orange, pulsing |
| `connected` | Vert, statique |
| `listening` | Vert accent, pulsing |
| `thinking` | Orange, pulsing |
| `speaking` | Indigo, pulsing |
| `error` | Rouge, statique |

---

## ApprovalModal

Modal centrée pour confirmer une action à risque.

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

| Prop | Type | Description |
|---|---|---|
| `toolName` | `string` | Nom du tool à confirmer |
| `message` | `string` | Message d'approbation |
| `risk` | `'high' \| 'critical'` | Niveau de risque |
| `args` | `Record<string, unknown>` | Arguments affichés dans l'UI |
| `onapprove` | `() => void` | Callback de confirmation |
| `ondeny` | `() => void` | Callback de refus |

---

## ApprovalBanner

Version compacte de l'approbation HITL. Le composant lit directement `$pendingApproval`.

```svelte
<script>
  import { ApprovalBanner } from '@owllayer/svelte';
</script>

<ApprovalBanner />
```

---

## OwlLayerTool

Associe un tool agent à un élément existant. Utiliser `action` pour déclencher un comportement DOM simple ou `handler` pour exécuter une logique métier.

```svelte
<script>
  import { OwlLayerTool } from '@owllayer/svelte';
  export let product;
</script>

<OwlLayerTool name="go_to_checkout" description="Naviguer vers la commande" action="click">
  <a href="/checkout">Commander →</a>
</OwlLayerTool>

<OwlLayerTool
  name="clear_cart"
  description="Vider le panier"
  risk="high"
  handler={() => clearCart()}
>
  <button on:click={clearCart}>Vider le panier</button>
</OwlLayerTool>

<OwlLayerTool
  name="toggle_favorite"
  description="Ajouter ce produit aux favoris"
  action="click"
  context={{ productId: product.id, name: product.name }}
>
  <button on:click={() => toggleFavorite(product.id)}>♡</button>
</OwlLayerTool>
```

| Prop | Type | Description |
|---|---|---|
| `name` | `string` | Nom unique du tool |
| `description` | `string` | Description pour le LLM |
| `risk` | `'none' \| 'low' \| 'high' \| 'critical'` | Niveau HITL |
| `context` | `Record<string, unknown>` | Données annexées à la description |
| `action` | `'click' \| 'focus' \| 'scrollIntoView' \| 'show' \| 'hide'` | Action DOM standard |
| `handler` | `() => unknown` | Callback direct |

> Fournir `action` ou `handler`, jamais les deux.

---

## OwlLayerToolBtn

Bouton qui expose simultanément un tool agent. Le même handler est appelé par le clic humain et par l'agent.

```svelte
<script>
  import { OwlLayerToolBtn } from '@owllayer/svelte';
  export let product;
</script>

<OwlLayerToolBtn
  name="add_to_cart"
  description={`Ajouter ${product.name} au panier (${product.price}€)`}
  risk="low"
  handler={() => addToCart(product)}
  class="btn-primary"
>
  Ajouter au panier
</OwlLayerToolBtn>
```

| Prop | Type | Description |
|---|---|---|
| `name` | `string` | Nom unique du tool |
| `description` | `string` | Description pour le LLM |
| `risk` | `'none' \| 'low' \| 'high' \| 'critical'` | Niveau HITL |
| `context` | `Record<string, unknown>` | Données annexées à la description |
| `handler` | `() => unknown` | Callback appelé par l'agent et par le clic |
| `class` | `string` | Classes CSS du bouton |
| `disabled` | `boolean` | Désactive le clic humain, mais pas l'agent |

> `disabled` empêche seulement l'interaction utilisateur. Le tool reste disponible pour l'agent tant qu'il est enregistré.
