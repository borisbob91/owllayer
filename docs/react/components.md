# Composants — @domos/react

Les composants React fournis par DomOS couvrent les besoins visuels les plus courants autour d'un agent : etat, validation, feedback et declenchement d'actions.

Ils sont utiles quand vous voulez aller vite avec une UI prete a l'emploi, tout en gardant la possibilite de composer votre propre experience autour du runtime DomOS.

## AgentIndicator

Badge d'état visuel de l'agent — aucune prop requise.

Utiliser ce composant quand vous avez besoin d'un retour visuel simple et permanent sur l'etat de l'agent.

Il convient bien a une integration legere, sans construire tout un panneau conversationnel.

```tsx
import { AgentIndicator } from '@domos/react';

<AgentIndicator />
```

Monté en Shadow DOM. Positionné en bas à droite de la fenêtre.

| État agent | Apparence |
|---|---|
| `disconnected` | rouge, statique |
| `connecting` | orange, pulsing |
| `connected` | vert, statique |
| `listening` | vert accent, pulsing |
| `thinking` | orange, pulsing |
| `speaking` | indigo, pulsing |
| `error` | rouge, statique |

---

## ApprovalModal

Modal centrée pour les confirmations HITL (`risk: 'high'` ou `'critical'`).

Utiliser `ApprovalModal` quand une action sensible doit etre relue et validee par un humain avant execution.

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

| Prop | Type | Description |
|---|---|---|
| `toolName` | `string` | Nom du tool à confirmer |
| `message` | `string` | Message d'approbation |
| `risk` | `'high' \| 'critical'` | Niveau de risque |
| `onApprove` | `() => void` | Callback approbation |
| `onDeny` | `() => void` | Callback refus |

Clic en dehors de la modal = refus automatique. Monté en Shadow DOM fermé.

> Si `config.hitl.ui` vaut `'modal'` (défaut), le Provider monte automatiquement cette modal. `ApprovalModal` est utile uniquement pour une UI HITL personnalisée.

---

## ApprovalBanner

Version compacte de la confirmation HITL — bandeau en bas à droite.

Utiliser `ApprovalBanner` si vous voulez une validation moins intrusive qu'une modale, tout en gardant un controle humain sur les actions critiques.

```tsx
import { useApproval, ApprovalBanner } from '@domos/react';

function SafetyLayer() {
  const { pendingApproval, approve, deny } = useApproval();

  if (!pendingApproval) return null;

  return (
    <ApprovalBanner
      toolName={pendingApproval.toolName}
      message={pendingApproval.message}
      risk={pendingApproval.risk}
      onApprove={approve}
      onDeny={deny}
    />
  );
}
```

Props identiques à `ApprovalModal`. Utilisé quand `config.hitl.ui: 'banner'`.

---

## Notification

Feedback temporaire pour les actions à faible risque.

Utiliser ce composant pour signaler qu'une action a bien ete prise en compte sans interrompre l'utilisateur.

```tsx
import { Notification } from '@domos/react';

{showNotif && (
  <Notification
    message="Produit ajouté au panier"
    duration={3000}
    onDismiss={() => setShowNotif(false)}
  />
)}
```

| Prop | Type | Description |
|---|---|---|
| `message` | `string` | Texte affiché |
| `duration` | `number` | Auto-dismiss en ms (défaut : `3000`) |
| `onDismiss` | `() => void` | Callback à la disparition |

---

## DomOSTool

Associe un tool agent à un élément HTML existant. Fournir `action` (déclenchement DOM) **ou** `handler` (callback) — pas les deux.

`DomOSTool` est utile quand votre interface existe deja et que vous voulez simplement la rendre exploitable par l'agent, sans recreer un composant metier.

```tsx
import { DomOSTool } from '@domos/react';

// Action DOM — l'agent peut cliquer ce lien
<DomOSTool
  name="go_to_checkout"
  description="Naviguer vers la page de commande"
  action="click"
>
  <Link to="/checkout">Commander →</Link>
</DomOSTool>

// Handler — logique métier directe
<DomOSTool
  name="clear_cart"
  description="Vider intégralement le panier"
  risk="high"
  handler={() => clearCart()}
>
  <button onClick={clearCart}>Vider le panier</button>
</DomOSTool>

// Contexte — données annexées à la description pour le LLM
<DomOSTool
  name="toggle_favorite"
  description="Ajouter ce produit aux favoris"
  action="click"
  context={{ productId: product.id, name: product.name }}
>
  <button onClick={() => toggleFavorite(product.id)}>♡</button>
</DomOSTool>
```

| Prop | Type | Description |
|---|---|---|
| `name` | `string` | Nom unique du tool |
| `description` | `string` | Description pour le LLM |
| `risk` | `RiskLevel` | Niveau HITL (défaut : `'none'`) |
| `context` | `Record<string, unknown>` | Données annexées à la description |
| `action` | `'click' \| 'focus' \| 'scrollIntoView' \| 'show' \| 'hide'` | Action DOM sur le premier enfant |
| `handler` | `() => unknown` | Callback direct — exclusif avec `action` |

---

## DomOSToolBtn

Bouton qui expose simultanément un tool agent. Le même `handler` est appelé par le clic utilisateur et par l'agent.

Utiliser `DomOSToolBtn` quand vous voulez un composant unique partage entre l'utilisateur et l'agent, avec la meme logique metier des deux cotes.

```tsx
import { DomOSToolBtn } from '@domos/react';

<DomOSToolBtn
  name="add_to_cart"
  description={`Ajouter "${product.name}" au panier (${product.price}€)`}
  risk="low"
  handler={() => addToCart(product)}
  className="btn-primary"
>
  Ajouter au panier
</DomOSToolBtn>
```

| Prop | Type | Description |
|---|---|---|
| `name` | `string` | Nom unique du tool |
| `description` | `string` | Description pour le LLM |
| `risk` | `RiskLevel` | Niveau HITL (défaut : `'none'`) |
| `context` | `Record<string, unknown>` | Données annexées à la description |
| `handler` | `() => unknown` | Appelé par l'agent et par le clic |
| `className` | `string` | Classes CSS du `<button>` rendu |
| `disabled` | `boolean` | Désactive le clic humain — l'agent reste actif |

---

## ShadowContainer

Isole les composants enfants dans un Shadow DOM fermé.

Utiliser `ShadowContainer` quand vous devez proteger une UI des styles globaux de l'application, ou isoler une couche visuelle complexe comme une validation ou une surcouche embarquee.

```tsx
import { ShadowContainer } from '@domos/react';

<ShadowContainer styles={`.my-modal { color: white; }`}>
  <MyCustomApprovalUI />
</ShadowContainer>
```

| Prop | Type | Description |
|---|---|---|
| `children` | `ReactNode` | Contenu isolé |
| `styles` | `string` | CSS injecté dans le Shadow DOM |

> Ne jamais placer `useAgent`, `useAgentTool`, `DomOSTool` ou tout hook DomOS à l'intérieur d'un `ShadowContainer` — le Shadow DOM rompt le context React du Provider.
