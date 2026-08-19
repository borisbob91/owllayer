---
title: "D�marrage � @owllayer/react"
description: Documentation OwlLayer.
---

# Démarrage — @owllayer/react

Ce guide montre comment brancher OwlLayer dans une application React de maniere progressive.

L'idee generale est simple :

1. connecter l'application au runtime OwlLayer
2. exposer des actions metier que l'agent peut utiliser
3. lire l'etat de l'agent dans l'interface
4. encadrer les actions sensibles avec validation humaine

Autrement dit, on commence par relier l'app, puis on donne a l'agent de quoi comprendre et agir, puis on affiche son etat dans l'UI.

## 1. Wrap l'app

### Ce que cette etape fait

`OwlLayerProvider` est le point d'entree de l'integration React. Il ouvre la connexion avec OwlLayer et rend les hooks du SDK disponibles dans l'arbre React.

Sans ce Provider, les composants de votre application ne peuvent ni declarer de tools, ni lire l'etat de l'agent, ni utiliser les composants OwlLayer.

### Pourquoi on commence par la

Dans React, tout le reste depend de ce Provider. C'est lui qui joue le role de socle commun pour la session agent, la voix, le contexte et les approbations HITL.

### Comment le brancher

```tsx
// app.tsx
import { OwlLayerProvider } from '@owllayer/react';

export default function App() {
  return (
    <OwlLayerProvider
      apiKey="pk_live_xxx"
      endpoint="wss://api.example.com/owllayer"
    >
      <Router />
    </OwlLayerProvider>
  );
}
```

Dans une application reelle, ce composant est generalement place tres haut dans l'arbre, souvent autour du routeur ou du layout principal.

**Props `OwlLayerProvider` :**

| Prop | Type | Description |
|---|---|---|
| `apiKey` | `string` | Clé publique |
| `endpoint` | `string` | WebSocket endpoint AITP |
| `config.voice` | `boolean` | Active le mode vocal |
| `config.debug` | `boolean` | Logs WebSocket en console |
| `config.autoConnect` | `boolean` | Connexion auto au mount (défaut : `true`) |
| `config.hitl.ui` | `'modal' \| 'banner' \| 'none'` | UI HITL montée automatiquement (défaut : `'modal'`) |
| `config.widget.enabled` | `boolean` | Monte le widget automatiquement |
| `config.widget.config` | `WidgetConfig` | Configuration du widget ([référence](./widget.md)) |

## 2. Premier tool

### Ce qu'est un tool

Un tool est une action metier que l'agent est autorise a declencher.

Par exemple : ajouter un produit au panier, ouvrir une page, appliquer un filtre, lancer une recherche, vider un brouillon ou preparer une commande.

### Pourquoi c'est important

Un agent ne doit pas deviner comment agir dans votre produit. Il doit utiliser des points d'entree explicites, definis par votre equipe. Les tools sont justement cette couche de controle.

### Comment cela marche dans React

Avec `useAgentTool`, vous declarez un tool directement depuis un composant. Tant que le composant est monte, le tool est disponible. Quand le composant disparait, le tool est retire automatiquement.

```tsx
import { useAgentTool } from '@owllayer/react';
import { z } from 'zod';

function ProductPage({ product }) {
  useAgentTool(
    {
      name: 'add_to_cart',
      description: `Ajouter "${product.name}" au panier (${product.price}€)`,
      risk: 'low',
      schema: z.object({ quantity: z.number().default(1) }),
    },
    async ({ quantity }) => {
      await addToCart(product.id, quantity);
      return { ok: true };
    }
  );

  return <button onClick={() => addToCart(product.id, 1)}>Ajouter</button>;
}
```

Le tool est enregistré au mount et retiré au unmount — aucune gestion manuelle.

Dans cet exemple, l'agent peut appeler `add_to_cart` avec une quantite. Le schema Zod sert a valider les arguments recus avant execution.

## 3. État agent

### Ce que cette partie apporte

Une fois l'agent connecte et les tools exposes, l'application a besoin de savoir ce qu'il se passe : l'agent est-il connecte, en train d'ecouter, de reflechir ou de repondre ?

### Pourquoi c'est utile

Sans etat visible, l'experience semble opaque. L'utilisateur ne comprend pas si la requete est partie, si l'agent travaille ou si une erreur s'est produite.

### Comment on le lit

Le hook `useAgent` expose l'etat courant et plusieurs raccourcis derives utilisables directement dans l'UI.

```tsx
import { useAgent } from '@owllayer/react';

function StatusBar() {
  const { agentState, isConnected, isThinking, isSpeaking, lastResponse } = useAgent();

  return (
    <div>
      <span>{agentState}</span>
      {lastResponse && <p>{lastResponse}</p>}
    </div>
  );
}
```

Cette information peut etre utilisee dans une barre d'etat, un widget, une orb vocale, un bouton, ou toute autre interface maison.

## 4. HITL — approbation manuelle

### Ce que signifie HITL

HITL signifie Human In The Loop. L'idee est qu'une personne garde le dernier mot sur les actions sensibles.

### Pourquoi c'est indispensable

Certaines actions ne doivent pas partir sans validation explicite : supprimer des donnees, valider un paiement, envoyer un message critique, modifier une configuration ou lancer une operation irreversible.

### Comment OwlLayer le gere

Les tools marques avec `risk: 'high'` ou `risk: 'critical'` sont interceptes avant execution. Le Provider peut monter automatiquement une UI de confirmation, ou vous pouvez la gerer vous-meme.

Les tools avec `risk: 'high'` ou `'critical'` sont bloqués en attente d'une confirmation humaine. Le Provider monte la modal automatiquement (configurable via `config.hitl.ui`).

Pour un contrôle manuel :

```tsx
import { useApproval, ApprovalModal } from '@owllayer/react';

function SafetyLayer() {
  const { pendingApproval, approve, deny } = useApproval();

  if (!pendingApproval) return null;

  return (
    <ApprovalModal
      toolName={pendingApproval.toolName}
      message={pendingApproval.message}
      risk={pendingApproval.risk}
      onApprove={approve}
      onDeny={deny}
    />
  );
}
```

Ce mecanisme permet de garder une experience agentique fluide tout en conservant des garde-fous clairs sur les actions a risque.

## Contraintes

Ces regles evitent les erreurs d'integration les plus frequentes :

- `useAgentTool`, `useAgent`, `OwlLayerTool`, `OwlLayerToolBtn` : doivent être **à l'intérieur** de `OwlLayerProvider`
- Ces hooks/composants doivent être **en dehors** de `ShadowContainer` — le Shadow DOM rompt le context React
- Un seul `OwlLayerProvider` par app
- `useAgentTool` dans une boucle `.map()` : utiliser un seul tool avec une description exhaustive de tous les items, pas N tools quasi-identiques
