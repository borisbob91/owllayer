# Sprint: `DomOSTool` + `DomOSToolBtn` — @domos/vue

## Objectif

Même objectif que le sprint React — co-localisation des tools IA directement dans les templates Vue, sur des éléments UI isolés.

**Idiome Vue :** composants SFC avec `<script setup>`, `useAgentTool` en interne, `<slot>` pour les enfants. Pas de directive (`v-domos-tool`) pour cette itération — composant SFC suffisant et plus simple à tester.

---

## Règle d'usage (identique React)

| Situation | Pattern |
|---|---|
| Action sur une **liste** `v-for` (N articles...) | `useAgentTool` niveau composant — 1 tool, description liste tous les items |
| Action sur un **élément unique** | `<DomOSTool>` / `<DomOSToolBtn>` — co-localisation propre |

---

## Différences vs React

| Point | React | Vue |
|---|---|---|
| Wrapper enfants | `<span ref={wrapperRef}>` | `<span ref="wrapperEl">` + `templateRef` |
| Cycle de vie | `useEffect` + `useRef` | `onMounted` + `ref<HTMLElement>` |
| Slot | `{children}` | `<slot />` |
| Props | interface props types | `defineProps<...>()` |
| Description réactive | `useEffect` deps array | `watch(fullDescription, ...)` re-enregistre si context change |
| Handler tool | `useAgentTool` directement | `useAgentTool` directement |

### Point critique — réactivité description

`useAgentTool` Vue enregistre le tool dans `onMounted` une seule fois. Si `context` change après le mount, la description ne se met pas à jour automatiquement.

**Solution dans `DomOSTool.vue` :** utiliser `watch` sur `fullDescription` (computed) pour re-enregistrer manuellement via le client injecté :

```typescript
watch(fullDescription, () => {
  // Re-register: unregister old, register new
  client.unregisterTool(props.name);
  client.registerTool({ declaration: newDeclaration, handler: toolHandler, componentId });
});
```

Ceci n'est important que si `context` est dynamique (ex: quantités en temps réel). Pour un `context` statique (id de produit), `onMounted` suffit.

---

## Fichiers à créer / modifier

| Fichier | Action |
|---|---|
| `src/components/tool/types.ts` | CRÉER |
| `src/components/tool/DomOSTool.vue` | CRÉER |
| `src/components/tool/DomOSToolBtn.vue` | CRÉER |
| `src/index.ts` | MODIFIER (ajouter exports) |

---

## Phase 1 — Types

### `src/components/tool/types.ts`

```typescript
import type { RiskLevel } from '../../composables/types/resolver.js';

export interface DomOSToolBaseProps {
  name: string;
  description: string;
  risk?: RiskLevel;
  context?: Record<string, unknown>;
}

export interface DomOSToolProps extends DomOSToolBaseProps {
  action?: 'click' | 'focus' | 'scrollIntoView' | 'show' | 'hide';
  handler?: () => unknown | Promise<unknown>;
}

export interface DomOSToolBtnProps extends DomOSToolBaseProps {
  handler: () => unknown | Promise<unknown>;
  class?: string;      // Vue utilise `class` pas `className`
  disabled?: boolean;
}
```

---

## Phase 2 — `DomOSTool.vue`

### `src/components/tool/DomOSTool.vue`

```vue
<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted, watch, getCurrentInstance } from 'vue';
import { zodToToolParameters, type ToolDeclaration } from '@domos/core';
import { DOMOS_CLIENT_KEY } from '../../plugin/DomOSPlugin.js';

// --- Props ---
const props = defineProps<{
  name: string;
  description: string;
  risk?: 'none' | 'low' | 'high' | 'critical';
  context?: Record<string, unknown>;
  action?: 'click' | 'focus' | 'scrollIntoView' | 'show' | 'hide';
  handler?: () => unknown | Promise<unknown>;
}>();

// Validation runtime
if (props.action && props.handler) {
  throw new Error(`DomOSTool "${props.name}": utilisez action OU handler, pas les deux.`);
}
if (!props.action && !props.handler) {
  throw new Error(`DomOSTool "${props.name}": action ou handler requis.`);
}

// --- Refs ---
const wrapperEl = ref<HTMLElement | null>(null);
const client = inject(DOMOS_CLIENT_KEY);
const componentId = getCurrentInstance()?.uid?.toString() ?? Math.random().toString(36).slice(2);

if (!client) {
  throw new Error('DomOSTool: DomOSPlugin non installé.');
}

// --- Description avec context sérialisé ---
const fullDescription = computed(() =>
  props.context
    ? `${props.description}. Context: ${JSON.stringify(props.context)}`
    : props.description
);

// --- Handler interne ---
function toolHandler() {
  if (props.handler) return props.handler();
  const child = wrapperEl.value?.firstElementChild as HTMLElement | null;
  if (!child) return;
  switch (props.action) {
    case 'click':          child.click(); break;
    case 'focus':          child.focus(); break;
    case 'scrollIntoView': child.scrollIntoView({ behavior: 'smooth' }); break;
    case 'show':           child.style.display = ''; break;
    case 'hide':           child.style.display = 'none'; break;
  }
}

// --- Enregistrement ---
function buildDeclaration(): ToolDeclaration {
  return {
    name: props.name,
    description: fullDescription.value,
    risk: props.risk ?? 'none',
  };
}

onMounted(() => {
  client!.registerTool({
    declaration: buildDeclaration(),
    handler: toolHandler,
    componentId,
  });
});

onUnmounted(() => {
  client!.unregisterTool(props.name);
});

// Re-enregistre si context change dynamiquement
watch(fullDescription, () => {
  client!.unregisterTool(props.name);
  client!.registerTool({
    declaration: buildDeclaration(),
    handler: toolHandler,
    componentId,
  });
});
</script>

<template>
  <!-- display:contents = transparent pour le layout -->
  <span ref="wrapperEl" style="display:contents">
    <slot />
  </span>
</template>
```

---

## Phase 3 — `DomOSToolBtn.vue`

### `src/components/tool/DomOSToolBtn.vue`

```vue
<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, getCurrentInstance } from 'vue';
import { DOMOS_CLIENT_KEY } from '../../plugin/DomOSPlugin.js';

const props = defineProps<{
  name: string;
  description: string;
  risk?: 'none' | 'low' | 'high' | 'critical';
  context?: Record<string, unknown>;
  handler: () => unknown | Promise<unknown>;
  class?: string;
  disabled?: boolean;
}>();

const client = inject(DOMOS_CLIENT_KEY);
const componentId = getCurrentInstance()?.uid?.toString() ?? Math.random().toString(36).slice(2);

if (!client) {
  throw new Error('DomOSToolBtn: DomOSPlugin non installé.');
}

const fullDescription = computed(() =>
  props.context
    ? `${props.description}. Context: ${JSON.stringify(props.context)}`
    : props.description
);

onMounted(() => {
  client!.registerTool({
    declaration: { name: props.name, description: fullDescription.value, risk: props.risk ?? 'none' },
    handler: props.handler,
    componentId,
  });
});

onUnmounted(() => {
  client!.unregisterTool(props.name);
});
</script>

<template>
  <!--
    disabled bloque le clic humain uniquement.
    L'agent appelle le handler via registerTool — indépendant du bouton.
  -->
  <button :class="props.class" :disabled="disabled" @click="handler">
    <slot />
  </button>
</template>
```

---

## Phase 4 — Exports

### Modification `src/index.ts`

Ajouter après `// --- Components ---` :

```typescript
// --- Agentic UI: Co-located tools ---
export { default as DomOSTool } from './components/tool/DomOSTool.vue';
export { default as DomOSToolBtn } from './components/tool/DomOSToolBtn.vue';
export type { DomOSToolProps, DomOSToolBtnProps } from './components/tool/types.js';
```

---

## Vérification

```bash
pnpm --filter @domos/vue build       # exit 0, pas d'erreurs TS
pnpm --filter demo-vue dev           # DomOSToolBtn "Vider" cliquable agent + humain
```

---

## Exemple d'usage — page panier Vue

```vue
<script setup>
import { useAgentTool } from '@domos/vue';
import { DomOSTool, DomOSToolBtn } from '@domos/vue';
import { useCart } from '../data/cart';
import { useRouter } from 'vue-router';

const { items, removeFromCart, clearCart, total } = useCart();
const router = useRouter();

// ✅ useAgentTool — liste d'items, 1 seul tool pour le LLM
useAgentTool({
  name: 'remove_from_cart',
  description: computed(() =>
    `Retirer un produit. Produits: ${items.value.map(i => `${i.name} (id:${i.id})`).join(', ')}`
  ),
  schema: z.object({ productId: z.string() }),
  risk: 'low',
}, ({ productId }) => removeFromCart(productId));
</script>

<template>
  <!-- ✅ DomOSToolBtn — bouton standalone hors liste -->
  <DomOSToolBtn
    name="clear_cart"
    description="Vider complètement le panier."
    risk="high"
    class="text-sm text-red-500"
    :handler="clearCart"
  >
    Vider le panier
  </DomOSToolBtn>

  <!-- ✅ DomOSTool + action="click" — lien RouterLink -->
  <DomOSTool
    name="start_checkout"
    description="Démarrer le checkout."
    risk="none"
    action="click"
  >
    <RouterLink to="/checkout">Commander →</RouterLink>
  </DomOSTool>
</template>
```
