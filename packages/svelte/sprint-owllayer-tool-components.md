# Sprint: `OwlLayerTool` + `OwlLayerToolBtn` — @owllayer/svelte

## Objectif

Même objectif — co-localisation des tools IA dans les templates Svelte 5, sur des éléments UI isolés.

**Bonne nouvelle :** pas de prerequisite `createAgentTool`. L'action `agentTool` existante (`use:agentTool`) gère déjà le cycle de vie DOM (mount/destroy via l'API Svelte actions). Les nouveaux composants l'utilisent directement en interne.

---

## Règle d'usage (identique React/Vue)

| Situation | Pattern |
|---|---|
| Action sur une **liste** `{#each}` (N articles...) | `agentTool` action niveau composant — 1 tool, description liste tous les items |
| Action sur un **élément unique** | `<OwlLayerTool>` / `<OwlLayerToolBtn>` — co-localisation propre |

---

## Différences vs React/Vue

| Point | React | Vue | Svelte |
|---|---|---|---|
| Wrapper enfants | `<span ref={ref}>` | `<span ref="el">` | `<span bind:this={el}>` |
| Cycle de vie tool | `useEffect` | `onMounted` + `watch` | **`use:agentTool` action** (auto) |
| Slot/children | `{children}` | `<slot />` | `{@render children()}` |
| Props | interface + destructuring | `defineProps<>()` | `$props()` Svelte 5 runes |
| Re-registration context | `useEffect` deps | `watch(fullDescription)` | **`use:agentTool` update** (auto via action lifecycle) |
| Classes CSS | `className` | `class` | `class` |

### Avantage Svelte — réactivité automatique

L'API Svelte actions supporte `update(newParams)` — quand les paramètres de `use:agentTool` changent, Svelte appelle automatiquement `update`. Le `OwlLayerTool.svelte` ne gère pas manuellement la re-registration : il suffit que `fullDescription` (snippet) soit réactif via `$derived`.

---

## Fichiers à créer / modifier

| Fichier | Action |
|---|---|
| `src/components/tool/OwlLayerTool.svelte` | CRÉER |
| `src/components/tool/OwlLayerToolBtn.svelte` | CRÉER |
| `src/index.ts` | MODIFIER (ajouter exports) |

Pas de `types.ts` séparé — Svelte 5 utilise les types inline dans `$props()` ou des interfaces locales.

---

## Phase 1 — `OwlLayerTool.svelte`

### `src/components/tool/OwlLayerTool.svelte`

```svelte
<script lang="ts">
  import { agentTool } from '../../actions/useAgentTool.js';
  import type { Snippet } from 'svelte';

  interface Props {
    name: string;
    description: string;
    risk?: 'none' | 'low' | 'high' | 'critical';
    context?: Record<string, unknown>;
    /** Action DOM déclenchée sur le premier enfant. Mutuellement exclusif avec handler. */
    action?: 'click' | 'focus' | 'scrollIntoView' | 'show' | 'hide';
    /** Handler direct appelé par l'agent. Mutuellement exclusif avec action. */
    handler?: () => unknown | Promise<unknown>;
    children: Snippet;
  }

  let { name, description, risk = 'none', context, action, handler, children }: Props = $props();

  // Validation runtime
  if (action && handler) {
    throw new Error(`OwlLayerTool "${name}": utilisez action OU handler, pas les deux.`);
  }
  if (!action && !handler) {
    throw new Error(`OwlLayerTool "${name}": action ou handler requis.`);
  }

  // Référence sur le wrapper — pour accéder au premier enfant DOM
  let wrapperEl: HTMLElement | undefined = $state();

  // Description avec context auto-sérialisé — $derived pour réactivité
  const fullDescription = $derived(
    context
      ? `${description}. Context: ${JSON.stringify(context)}`
      : description
  );

  // Handler interne transmis à agentTool action
  function toolHandler() {
    if (handler) return handler();
    const child = wrapperEl?.firstElementChild as HTMLElement | null;
    if (!child) return;
    switch (action) {
      case 'click':          child.click(); break;
      case 'focus':          child.focus(); break;
      case 'scrollIntoView': child.scrollIntoView({ behavior: 'smooth' }); break;
      case 'show':           child.style.display = ''; break;
      case 'hide':           child.style.display = 'none'; break;
    }
  }
</script>

<!--
  use:agentTool gère mount/destroy automatiquement (API actions Svelte).
  Quand fullDescription ou risk change, Svelte appelle agentTool.update() — re-registration auto.
  display:contents = transparent pour le layout.
-->
<span
  bind:this={wrapperEl}
  style="display:contents"
  use:agentTool={{ name, description: fullDescription, risk, handler: toolHandler }}
>
  {@render children()}
</span>
```

### Point clé — `use:agentTool` + `update`

L'action `agentTool` existante (`src/actions/useAgentTool.ts`) doit supporter `update` pour que la re-registration fonctionne. Vérifier que l'implémentation retourne bien `{ destroy, update }` :

```typescript
// À vérifier dans src/actions/useAgentTool.ts
export function agentTool(node: HTMLElement, options: AgentToolOptions) {
  // ... register initial

  return {
    update(newOptions: AgentToolOptions) {
      // Re-register si description change
      client.unregisterTool(newOptions.name);
      client.registerTool({ ... });
    },
    destroy() {
      client.unregisterTool(options.name);
    }
  };
}
```

Si `update` n'est pas implémenté dans `agentTool`, l'ajouter est **une modification mineure** dans `src/actions/useAgentTool.ts`.

---

## Phase 2 — `OwlLayerToolBtn.svelte`

### `src/components/tool/OwlLayerToolBtn.svelte`

```svelte
<script lang="ts">
  import { agentTool } from '../../actions/useAgentTool.js';
  import type { Snippet } from 'svelte';

  interface Props {
    name: string;
    description: string;
    risk?: 'none' | 'low' | 'high' | 'critical';
    context?: Record<string, unknown>;
    handler: () => unknown | Promise<unknown>;
    class?: string;
    disabled?: boolean;
    children: Snippet;
  }

  let { name, description, risk = 'none', context, handler, class: className, disabled, children }: Props = $props();

  const fullDescription = $derived(
    context
      ? `${description}. Context: ${JSON.stringify(context)}`
      : description
  );
</script>

<!--
  use:agentTool directement sur le <button> — pas de wrapper span.
  disabled bloque le clic humain, pas l'appel agent via use:agentTool.
-->
<button
  class={className}
  {disabled}
  onclick={handler}
  use:agentTool={{ name, description: fullDescription, risk, handler }}
>
  {@render children()}
</button>
```

---

## Phase 3 — Vérification `agentTool` action

Lire `src/actions/useAgentTool.ts` et vérifier la présence de `update()`. Si absent :

```typescript
// Ajouter dans le return de agentTool()
update(newOptions: AgentToolOptions) {
  const client = get(owllayerClient);
  if (!client) return;
  client.unregisterTool(newOptions.name);
  const newDeclaration: ToolDeclaration = {
    name: newOptions.name,
    description: newOptions.description,
    parameters: newOptions.schema ? zodToToolParameters(newOptions.schema) : undefined,
    risk: newOptions.risk ?? 'none',
  };
  client.registerTool({ declaration: newDeclaration, handler: newOptions.handler, componentId });
},
```

---

## Phase 4 — Exports

### Modification `src/index.ts`

Ajouter après `// --- Components ---` :

```typescript
// --- Agentic UI: Co-located tools ---
export { default as OwlLayerTool } from './components/tool/OwlLayerTool.svelte';
export { default as OwlLayerToolBtn } from './components/tool/OwlLayerToolBtn.svelte';
```

---

## Vérification

```bash
pnpm --filter @owllayer/svelte build       # exit 0, pas d'erreurs TS/Svelte
pnpm --filter demo-svelte dev           # OwlLayerToolBtn "Vider" cliquable agent + humain
```

Vérifier dans devtools : le `<span style="display: contents">` dans `OwlLayerTool` n'ajoute aucun layout visible.

---

## Exemple d'usage — page panier Svelte

```svelte
<script lang="ts">
  import { agentTool } from '@owllayer/svelte';
  import { OwlLayerTool, OwlLayerToolBtn } from '@owllayer/svelte';
  import { useCart } from '../data/cart';

  const { items, removeFromCart, clearCart, total } = useCart();

  // ✅ agentTool sur un wrapper — liste d'items, 1 seul tool pour le LLM
  const removeToolOptions = $derived({
    name: 'remove_from_cart',
    description: `Retirer un produit. Produits: ${items.map(i => `${i.name} (id:${i.id})`).join(', ')}`,
    risk: 'low' as const,
    handler: ({ productId }: { productId: string }) => removeFromCart(productId),
  });
</script>

<div use:agentTool={removeToolOptions}><!-- invisible wrapper pour le tool liste --></div>

<!-- ✅ OwlLayerToolBtn — bouton standalone hors liste -->
<OwlLayerToolBtn
  name="clear_cart"
  description="Vider complètement le panier."
  risk="high"
  class="text-sm text-red-500"
  handler={clearCart}
>
  Vider le panier
</OwlLayerToolBtn>

<!-- ✅ OwlLayerTool + action="click" — lien SvelteKit -->
<OwlLayerTool
  name="start_checkout"
  description="Démarrer le checkout."
  risk="none"
  action="click"
>
  <a href="/checkout">Commander →</a>
</OwlLayerTool>
```

---

## Différence clé vs React/Vue pour les listes

En Svelte, le tool liste peut s'écrire avec `use:agentTool` sur un `<div>` invisible (0 taille) — plus idiomatique que d'appeler un composable depuis `<script>`. Les deux approches fonctionnent.
