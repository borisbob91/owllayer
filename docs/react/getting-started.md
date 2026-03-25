# Démarrage — @domos/react

## 1. Wrap l'app

```tsx
// app.tsx
import { DomOSProvider } from '@domos/react';

export default function App() {
  return (
    <DomOSProvider
      apiKey="pk_live_xxx"
      endpoint="wss://api.example.com/domos"
    >
      <Router />
    </DomOSProvider>
  );
}
```

**Props `DomOSProvider` :**

| Prop | Type | Description |
|---|---|---|
| `apiKey` | `string` | Clé publique |
| `endpoint` | `string` | WebSocket endpoint ADTP |
| `config.voice` | `boolean` | Active le mode vocal |
| `config.debug` | `boolean` | Logs WebSocket en console |
| `config.autoConnect` | `boolean` | Connexion auto au mount (défaut : `true`) |
| `config.hitl.ui` | `'modal' \| 'banner' \| 'none'` | UI HITL montée automatiquement (défaut : `'modal'`) |
| `config.widget.enabled` | `boolean` | Monte le widget automatiquement |
| `config.widget.config` | `WidgetConfig` | Configuration du widget ([référence](./widget.md)) |

## 2. Premier tool

```tsx
import { useAgentTool } from '@domos/react';
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

## 3. État agent

```tsx
import { useAgent } from '@domos/react';

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

## 4. HITL — approbation manuelle

Les tools avec `risk: 'high'` ou `'critical'` sont bloqués en attente d'une confirmation humaine. Le Provider monte la modal automatiquement (configurable via `config.hitl.ui`).

Pour un contrôle manuel :

```tsx
import { useApproval, ApprovalModal } from '@domos/react';

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

## Contraintes

- `useAgentTool`, `useAgent`, `DomOSTool`, `DomOSToolBtn` : doivent être **à l'intérieur** de `DomOSProvider`
- Ces hooks/composants doivent être **en dehors** de `ShadowContainer` — le Shadow DOM rompt le context React
- Un seul `DomOSProvider` par app
- `useAgentTool` dans une boucle `.map()` : utiliser un seul tool avec une description exhaustive de tous les items, pas N tools quasi-identiques
