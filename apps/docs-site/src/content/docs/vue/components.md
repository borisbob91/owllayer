---
title: "Composants � @domos/vue"
description: Documentation DomOS.
---

# Composants — @domos/vue

## AgentIndicator

Badge d'état visuel de l'agent — aucune prop requise. Le composant lit l'état en interne via `useAgent()` et se met à jour automatiquement.

```vue
<template>
  <AgentIndicator />
</template>

<script setup>
import { AgentIndicator } from '@domos/vue';
</script>
```

Positionné en bas à droite de la fenêtre. Rendu via `<Teleport to="body">`.

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

Modal centrée pour confirmer les actions HITL avec `risk: 'high'` ou `'critical'`. Utilisée quand une gestion manuelle est nécessaire — si `hitl.ui: 'modal'` est configuré dans le plugin, cette modal est montée automatiquement sans code supplémentaire.

```vue
<script setup>
import { useApproval, ApprovalModal } from '@domos/vue';

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

| Prop | Type | Description |
|---|---|---|
| `tool-name` | `string` | Nom du tool à confirmer |
| `message` | `string` | Message d'approbation |
| `risk` | `'high' \| 'critical'` | Niveau de risque — détermine la couleur du badge |

| Événement | Description |
|---|---|
| `@approve` | L'utilisateur a confirmé l'action |
| `@deny` | L'utilisateur a refusé l'action |

Rendu via `<Teleport to="body">`. Un clic en dehors de la modal déclenche automatiquement `@deny`.

---

## ApprovalBanner

Version compacte de la confirmation HITL — bandeau fixe en bas à droite. Contrairement à `ApprovalModal`, ce composant n'a pas de props : il lit directement `useApproval()` en interne.

```vue
<template>
  <ApprovalBanner />
</template>

<script setup>
import { ApprovalBanner } from '@domos/vue';
</script>
```

Activé automatiquement quand `hitl: { ui: 'banner' }` est défini dans le plugin. Pour une utilisation manuelle, monter le composant aux côtés de `AgentIndicator`.

---

## DomOSTool

Associe un tool agent à un élément HTML existant sans en modifier la mise en page. Fournir `action` pour un déclenchement DOM ou `:handler` pour une logique métier directe — jamais les deux en même temps.

```vue
<script setup>
import { DomOSTool } from '@domos/vue';
</script>

<template>
  <!-- Action DOM — l'IA peut cliquer ce lien -->
  <DomOSTool
    name="go_to_checkout"
    description="Naviguer vers la page de commande"
    action="click"
  >
    <a href="/checkout">Commander →</a>
  </DomOSTool>

  <!-- Handler Vue réactif — logique métier directe -->
  <DomOSTool
    name="clear_cart"
    description="Vider intégralement le panier"
    risk="high"
    :handler="() => clearCart()"
  >
    <button @click="clearCart">Vider le panier</button>
  </DomOSTool>

  <!-- Contexte — données annexées à la description pour le LLM -->
  <DomOSTool
    name="toggle_favorite"
    description="Ajouter ce produit aux favoris"
    action="click"
    :context="{ productId: product.id, name: product.name }"
  >
    <button @click="toggleFavorite(product.id)">♡</button>
  </DomOSTool>
</template>
```

| Prop | Type | Description |
|---|---|---|
| `name` | `string` | Nom unique du tool |
| `description` | `string` | Description pour le LLM |
| `risk` | `RiskLevel` | Niveau HITL (défaut : `'none'`) |
| `context` | `Record<string, unknown>` | Données annexées à la description — utiliser `:context` (binding dynamique) |
| `action` | `'click' \| 'focus' \| 'scrollIntoView' \| 'show' \| 'hide'` | Action DOM sur le premier enfant |
| `handler` | `() => unknown` | Callback direct — utiliser `:handler` (binding dynamique) — exclusif avec `action` |

> Toujours utiliser `:handler="..."` et `:context="..."` avec les deux-points (liaison dynamique Vue) pour passer des fonctions et des objets.

---

## DomOSToolBtn

Bouton qui expose simultanément un tool agent. Le même `handler` est appelé par le clic de l'utilisateur et par l'agent de façon indépendante.

```vue
<script setup>
import { DomOSToolBtn } from '@domos/vue';

const props = defineProps<{ product: Product }>();
</script>

<template>
  <DomOSToolBtn
    name="add_to_cart"
    :description="`Ajouter ${product.name} au panier (${product.price}€)`"
    risk="low"
    :handler="() => addToCart(product)"
    class="btn-primary"
  >
    Ajouter au panier
  </DomOSToolBtn>
</template>
```

| Prop | Type | Description |
|---|---|---|
| `name` | `string` | Nom unique du tool |
| `description` | `string` | Description pour le LLM |
| `risk` | `RiskLevel` | Niveau HITL (défaut : `'none'`) |
| `context` | `Record<string, unknown>` | Données annexées à la description |
| `handler` | `() => unknown` | Appelé par l'agent et par le clic — utiliser `:handler` |
| `class` | `string` | Classes CSS appliquées au `<button>` rendu |
| `disabled` | `boolean` | Désactive le clic utilisateur, mais l'agent peut toujours déclencher le handler |

> En Vue, utiliser `class` (pas `className` comme en React) pour styler le bouton.
