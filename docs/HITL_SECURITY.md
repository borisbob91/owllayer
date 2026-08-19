# Securite HITL (Human-in-the-Loop)

Guide complet du systeme de securite OwlLayer.

## Pourquoi HITL ?

Quand une IA a le pouvoir d'agir sur l'interface (ajouter au panier, supprimer des donnees, confirmer des paiements), il faut un mecanisme de controle. OwlLayer integre un systeme a 4 niveaux pour que l'utilisateur garde toujours le controle.

## Les 4 niveaux de risque

### `none` — Execution silencieuse

Actions sans consequence visible. L'utilisateur ne voit rien.

```tsx
useAgentTool({
  name: 'search_products',
  description: 'Rechercher des produits',
  risk: 'none',
}, async ({ query }) => {
  return searchProducts(query);
});
```

**Exemples :** recherche, filtrage, navigation, lecture de donnees.

### `low` — Execution + notification

L'action est executee mais l'utilisateur est notifie via un toast.

```tsx
useAgentTool({
  name: 'add_to_cart',
  description: 'Ajouter un produit au panier',
  risk: 'low',
}, async ({ quantity }) => {
  cart.add(product, quantity);
  return 'Ajoute au panier';
});
```

**Exemples :** ajout au panier, like, mise a jour de preferences.

### `high` — Approbation requise

L'action est **bloquee** jusqu'a ce que l'utilisateur approuve via un modal.

```tsx
useAgentTool({
  name: 'clear_cart',
  description: 'Vider le panier',
  risk: 'high',
}, async () => {
  cart.clear();
  return 'Panier vide';
});
```

**Exemples :** suppression de donnees, modification de parametres importants.

### `critical` — Approbation renforcee

Comme `high` mais avec un avertissement visuel renforce (badge rouge, message explicite).

```tsx
useAgentTool({
  name: 'confirm_order',
  description: 'Confirmer la commande et proceder au paiement',
  risk: 'critical',
}, async () => {
  await api.processPayment();
  return 'Commande confirmee';
});
```

**Exemples :** paiement, suppression de compte, actions irreversibles.

## Architecture de securite

```
                    Tool Call du LLM
                         │
                         ▼
              ┌─────────────────────┐
              │  HITLSecurityMiddleware  │
              │                     │
              │  1. Tool bloque ?   │──── Oui → Rejete
              │  2. Tool existe ?   │──── Non → Rejete
              │  3. Evaluer risque  │
              └────────┬────────────┘
                       │
            ┌──────────┼──────────────┐
            │          │              │
         none/low    high          critical
            │          │              │
            ▼          ▼              ▼
        Executer   Modal HITL     Modal HITL
        (+ toast   (approval)    (renforce)
         si low)
```

## Composants UI

### React

```tsx
import { OwlLayerProvider } from '@owllayer/react';

function App() {
  return (
    <OwlLayerProvider
      apiKey="pk_dev_123"
      endpoint="ws://localhost:3000/owllayer"
      config={{
        hitl: { ui: 'modal' }, // 'modal' (defaut) | 'banner' | 'none'
      }}
    >
      <MyApp />
    </OwlLayerProvider>
  );
}
```

Par defaut, `OwlLayerProvider` affiche un **modal global bloquant** pour `risk: high|critical`.

### Vue

```ts
// main.ts
import { createApp } from 'vue';
import { OwlLayerPlugin } from '@owllayer/vue';
import App from './App.vue';

createApp(App).use(OwlLayerPlugin, {
  endpoint: 'ws://localhost:3000/owllayer',
  apiKey: 'pk_dev_123',
  hitl: { ui: 'modal' }, // 'modal' (defaut) | 'banner' | 'none'
}).mount('#app');
```

Par defaut, `OwlLayerPlugin` monte aussi une UI HITL globale bloquante.

## Isolation Shadow DOM

Le modal d'approbation est rendu dans un **Shadow DOM ferme** (`mode: 'closed'`). Cela signifie que :

- Le CSS de l'application ne peut pas le masquer
- Les scripts de la page ne peuvent pas y acceder
- L'IA ne peut pas manipuler le DOM du modal
- Le modal est visuellement et fonctionnellement isole

```tsx
// Le ShadowContainer cree un shadow root ferme
<ShadowContainer>
  <ApprovalForm ... />
</ShadowContainer>
```

## Blocage serveur

Le serveur peut bloquer certains tools meme si le client les a enregistres :

```ts
// server.ts
server.blockTool('delete_all_data');   // Empeche toute execution
server.unblockTool('delete_all_data'); // Re-autorise
```

## HITLPolicy

La classe `HITLPolicy` dans `@owllayer/core` determine l'action a prendre :

```ts
import { HITLPolicy, RiskLevel } from '@owllayer/core';

const policy = new HITLPolicy();

const action = policy.evaluate('call_123', 'delete_account', RiskLevel.CRITICAL, {});
// → { type: 'require_approval', request: { id, callId, toolName, message, ... } }

const action2 = policy.evaluate('call_456', 'search', RiskLevel.NONE, {});
// → { type: 'execute' }
```

## Bonnes pratiques

1. **Utilisez `none` par defaut** pour les actions de lecture
2. **Utilisez `low`** pour les modifications mineures et reversibles
3. **Utilisez `high`** pour les suppressions et modifications importantes
4. **Utilisez `critical`** uniquement pour les actions irreversibles (paiement, suppression permanente)
5. **Bloquez cote serveur** les tools dangereux en production
6. **Ne faites pas confiance au client** — validez aussi cote serveur

## SSR (Next/Nuxt)

- React/Next: utilisez OwlLayer dans un composant client (`'use client'`).
- Vue/Nuxt: installez OwlLayer dans un plugin client (`plugins/owllayer.client.ts`).
- Le SDK UI est **client-only officiel** en V1: pas de rendu SSR complet du widget/modal.
