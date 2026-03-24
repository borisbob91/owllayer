# Sprint: `DomOSTool` + `DomOSToolBtn` — @domos/react

## Objectif

Ajouter deux composants React au package `@domos/react` pour permettre la co-localisation des tools IA directement dans le JSX, sur des éléments UI isolés (boutons standalone, liens singles, éléments uniques).

Ces composants utilisent `useAgentTool` en interne — ils ne remplacent pas `useAgentTool`, ils le complètent.

---

## Règle d'usage (à documenter dans les JSDoc)

| Situation | Pattern |
|---|---|
| Action sur une **liste** `.map()` (N articles, N produits...) | `useAgentTool` niveau composant — 1 tool, description liste tous les items |
| Action sur un **élément unique** (bouton "Vider", lien "Commander", bouton toggle...) | `<DomOSTool>` / `<DomOSToolBtn>` — co-localisation propre |

**Raison :** N tools quasi-identiques dans un `.map()` = confusion LLM + tokens gaspillés.
`useAgentTool` avec description exhaustive = 1 seul choix pour le LLM.

---

## Fichiers à créer / modifier

| Fichier | Action |
|---|---|
| `src/components/tool/types.ts` | CRÉER |
| `src/components/tool/DomOSTool.tsx` | CRÉER |
| `src/components/tool/DomOSToolBtn.tsx` | CRÉER |
| `src/components/tool/index.ts` | CRÉER |
| `src/index.ts` | MODIFIER (ajouter exports) |
| `tests/DomOSTool.test.tsx` | CRÉER |

---

## Phase 1 — Types

### `src/components/tool/types.ts`

```typescript
import type { ReactNode } from 'react';
import type { z } from 'zod';
import type { RiskLevel } from '../../types/resolver.js';

export interface DomOSToolBaseProps {
  /** Nom unique du tool — doit être unique dans la page */
  name: string;
  /** Description pour le LLM */
  description: string;
  /** Niveau de risque */
  risk?: RiskLevel;
  /**
   * Données contextuelles injectées automatiquement en fin de description.
   * L'agent les voit : "...description. Context: {"productId":"42","name":"Nike"}"
   * Ne pas utiliser dans les .map() — préférer useAgentTool avec liste exhaustive.
   */
  context?: Record<string, unknown>;
}

export interface DomOSToolProps extends DomOSToolBaseProps {
  children: ReactNode;
  /**
   * Action DOM à déclencher sur le premier enfant.
   * Mutuellement exclusif avec handler.
   */
  action?: 'click' | 'focus' | 'scrollIntoView' | 'show' | 'hide';
  /**
   * Handler direct appelé par l'agent sans passer par le DOM.
   * Mutuellement exclusif avec action.
   */
  handler?: () => unknown | Promise<unknown>;
}

export interface DomOSToolBtnProps extends DomOSToolBaseProps {
  /** Handler appelé par l'agent ET au clic utilisateur */
  handler: () => unknown | Promise<unknown>;
  /** Classes CSS du <button> rendu */
  className?: string;
  /**
   * Désactive le clic utilisateur mais pas l'appel agent.
   * L'agent peut toujours déclencher l'action.
   */
  disabled?: boolean;
  children: ReactNode;
}
```

---

## Phase 2 — `DomOSTool`

### `src/components/tool/DomOSTool.tsx`

**Architecture :**

1. `useRef<HTMLSpanElement>` — référence le wrapper transparent
2. `buildDescription(description, context?)` — helper interne :
   ```
   si context défini → `${description}. Context: ${JSON.stringify(context)}`
   sinon → description tel quel
   ```
3. `useAgentTool` avec `buildDescription(...)` comme `description` — se re-enregistre automatiquement quand `context` change (la description change → nouvelle dépendance)
4. Handler interne selon le mode :
   - `action="click"` → `wrapperRef.current?.firstElementChild?.click()`
   - `action="focus"` → `(firstElementChild as HTMLElement)?.focus()`
   - `action="scrollIntoView"` → `firstElementChild?.scrollIntoView({ behavior: 'smooth' })`
   - `action="show"` → `(firstElementChild as HTMLElement).style.display = ''`
   - `action="hide"` → `(firstElementChild as HTMLElement).style.display = 'none'`
   - `handler` fourni → appel direct `handler()`
5. Validation runtime (lever une Error) :
   - `action` ET `handler` ensemble → erreur
   - ni `action` ni `handler` → erreur
6. Render : `<span ref={wrapperRef} style={{ display: 'contents' }}>{children}</span>`
   - `display: contents` = le `<span>` est transparent pour le layout — aucun impact visuel

**JSDoc à inclure :**
```
@example — bouton standalone
<DomOSTool name="clear_cart" risk="high" action="click" description="Vider le panier">
  <button onClick={clearCart}>Vider</button>
</DomOSTool>

@example — lien React Router
<DomOSTool name="go_checkout" risk="none" action="click" description="Aller au checkout">
  <Link to="/checkout">Commander →</Link>
</DomOSTool>

@example — handler direct sans élément clickable
<DomOSTool name="toggle_theme" risk="none" handler={toggleTheme} description="Changer le thème">
  <ThemeIcon />
</DomOSTool>
```

---

## Phase 3 — `DomOSToolBtn`

### `src/components/tool/DomOSToolBtn.tsx`

**Architecture :**

1. `buildDescription` — même fonction extraite dans un fichier utils interne `src/components/tool/utils.ts` partagé avec `DomOSTool`
2. `useAgentTool` avec `handler` wrappé dans un `callbackRef` (déjà géré par `useAgentTool` en interne)
3. Render :
   ```tsx
   <button
     className={className}
     disabled={disabled}
     onClick={() => { handler(); }}
   >
     {children}
   </button>
   ```
4. **Important :** `disabled` ne bloque pas l'agent. Le handler est enregistré via `useAgentTool` séparément du `onClick`. L'agent peut appeler l'action même si le bouton est `disabled` visuellement.

**JSDoc :**
```
@example — bouton "Vider le panier"
<DomOSToolBtn
  name="clear_cart"
  description="Vider complètement le panier. Action irréversible."
  risk="high"
  className="text-sm text-red-500 hover:text-red-700"
  handler={clearCart}
>
  Vider le panier
</DomOSToolBtn>
```

---

## Phase 4 — Barrel et exports

### `src/components/tool/index.ts`

```typescript
export { DomOSTool } from './DomOSTool.js';
export { DomOSToolBtn } from './DomOSToolBtn.js';
export type { DomOSToolProps, DomOSToolBtnProps } from './types.js';
```

### Modification `src/index.ts`

Ajouter après le bloc `// --- Components (Agentic UI) ---` :

```typescript
// --- Agentic UI: Co-located tools ---
export { DomOSTool, DomOSToolBtn } from './components/tool/index.js';
export type { DomOSToolProps, DomOSToolBtnProps } from './components/tool/index.js';
```

---

## Phase 5 — Tests

### `tests/DomOSTool.test.tsx`

Pattern à suivre : mocks `DomOSContext` + `registerTool` / `unregisterTool` (même style que les autres tests du package).

**Tests requis :**

| # | Description | Vérification |
|---|---|---|
| 1 | `DomOSTool action="click"` | `.click()` appelé sur `firstElementChild` au déclenchement agent |
| 2 | `DomOSTool action="focus"` | `.focus()` appelé sur `firstElementChild` |
| 3 | `DomOSTool handler` | handler appelé directement (pas de DOM) |
| 4 | `DomOSTool` avec `context` | La description enregistrée contient `"Context: {"productId":"42"}"` |
| 5 | `DomOSTool action + handler` | `Error` levée au render |
| 6 | `DomOSTool` sans action ni handler | `Error` levée au render |
| 7 | `DomOSTool` unmount | `ctx.unregisterTool` appelé avec le bon name |
| 8 | `DomOSToolBtn` — clic humain | handler appelé via `onClick` |
| 9 | `DomOSToolBtn` — appel agent | handler appelé via `useAgentTool` callback |
| 10 | `DomOSToolBtn disabled` | `handler` agent fonctionne, bouton a `disabled` attribute |
| 11 | `display: contents` | Le wrapper `<span>` a bien `style="display: contents"` |

---

## Vérification finale

```bash
# Build
pnpm --filter @domos/react build       # exit 0, pas d'erreurs TS

# Tests
pnpm --filter @domos/react test        # 11 tests verts

# Demo
pnpm --filter demo dev                 # CartPage fonctionne
```

Vérifier dans les devtools : `<span style="display: contents">` n'ajoute aucun layout visible.

---

## Exemple d'usage final — CartPage refactorisée

```tsx
// Avant — useAgentTool pour clear_cart (niveau page)
useAgentTool({ name: "clear_cart", description: "...", risk: "high" }, async () => {
  clearCart();
  return "Panier vide.";
});

// Après — DomOSToolBtn co-localisé avec le bouton
<DomOSToolBtn
  name="clear_cart"
  description="Vider complètement le panier. Action irréversible."
  risk="high"
  className="w-full mt-3 text-sm text-red-500 hover:text-red-700 transition-colors"
  handler={() => { clearCart(); }}
>
  Vider le panier
</DomOSToolBtn>

// Avant — useAgentTool start_checkout (niveau page)
useAgentTool({ name: "start_checkout", description: "..." }, async () => {
  navigate("/checkout");
});

// Après — DomOSTool action="click" sur le Link existant
<DomOSTool
  name="start_checkout"
  description="Démarrer le checkout — adresse → livraison → paiement → confirmation."
  risk="none"
  action="click"
>
  <Link to="/checkout" className="btn-primary w-full mt-6 py-3 text-center block">
    Commander →
  </Link>
</DomOSTool>

// remove_from_cart, update_quantity — restent useAgentTool niveau page (liste d'items)
```
