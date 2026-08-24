# Feature #07 — Plugin UI Capabilities

**Statut** : 🔵 Proposition  
**Domaine** : core + react + vue + svelte (voir note chevauchement §Analyse d'impact)  
**Porteur** : @BorisBob  
**Validé par** : @BorisBob    
**Date** : 2026-03-26  
**Statut** : implementé

---

## Besoin

Le système de plugins actuel (Feature #05) permet uniquement d'enregistrer des **tools** via `setup(ctx, config)`. Pour qu'un plugin UI soit autonome et adoptable, il doit aussi pouvoir déclarer ses **composants visuels**. Aujourd'hui, rien ne lie un composant `<BarChart />` à son plugin — l'utilisateur doit importer le composant séparément, gérer le wiring manuellement, et n'a aucune garantie que le plugin est installé avant le montage.

### User story

> En tant que développeur utilisant OwlLayer, je veux installer un plugin `@owllayer-plugins/bar-chart` et avoir accès à `BarChart` (composant) et `render_chart` (tool LLM) en un seul import, afin que la bibliothèque UI et l'IA soient automatiquement synchronisées dès `installPlugin()`.

---

## Périmètre strict

### Ce que cette feature fait

- Ajouter un champ `ui?: { components?: Record<string, unknown> }` **optionnel** sur `OwlLayerClientPlugin` (core, framework-agnostic)
- Fournir `usePluginComponents<T>(plugin)` dans React et Vue, et `getPluginComponent()` dans Svelte
- Fournir `<PluginRenderer plugin={p} component="Name" props={...} />` en React (raccourci déclaratif)
- Fournir `<PluginDevPanel plugins={entries} />` en React — panel dev-only : listes plugins/tools, simulation d'appel tool, uninstall/reinstall à chaud
- Créer `plugins/bar-chart/` — plugin de démonstration avec composant React qui enregistre son propre tool `render_chart` via `useAgentTool` au montage
- Câbler le plugin bar-chart dans `apps/demo`

### Ce que cette feature ne fait PAS (hors scope)

- Pas de sandboxing (WASM, iframe) — hors scope Feature #07
- Pas de lazy-loading / CDN de composants — prévu Phase 4 du proposal, non traité ici
- Pas de support Vue SFC ou Svelte SFC dans la déclaration `ui.components` — les composants Vue/Svelte restent dans leurs propres packages
- Pas de modification du comportement de `installPlugin()` existant — ajout uniquement
- Pas de Vue 2 / Svelte 4 — target: Vue 3 + Svelte 5
- Pas de `PluginDevPanel` pour Vue/Svelte — React uniquement dans cette itération
- Pas de modification du `OwlLayerPlugin` Vue (c'est le plugin Vue.js app, pas un plugin OwlLayer)

---

## Analyse d'impact

> **⚠️ Chevauchement de domaines** : Cette feature touche core + react + vue + svelte simultanément. Conformément au §4 du CONTRIBUTING.md, les modifications core doivent être séquentiellement antérieures aux modifications SDK. Toutes les modifications sont listées ici avec approbation explicite du porteur de projet.

### Fonctionnalités existantes pouvant être affectées

| Fonctionnalité | Impact | Mitigation |
|---|---|---|
| `OwlLayerClientPlugin<C>` | Ajout champ `ui?` optionnel | ✅ Rétro-compatible — champ optionnel, plugins existants non modifiés |
| `installPlugin()` | Aucun changement comportemental | — |
| `PluginEntry` tuple | Aucun | — |
| `useAgentTool` React/Vue/Svelte | Aucun — BarChart l'utilise en interne comme n'importe quel composant | — |
| `OwlLayerProvider` React | Aucun — `plugins` prop existante non modifiée | — |
| `OwlLayerPlugin` Vue (app plugin) | Aucun — fichier non touché | — |
| Tests existants `plugins.test.ts` | Aucun — `setup()` non modifié | — |

### Packages touchés

| Package | Modification | Rétro-compatibilité |
|---|---|---|
| `@owllayer/core` | Nouveau fichier `ui.types.ts` + champ optionnel dans `plugin.types.ts` + export `index.ts` | ✅ Oui |
| `@owllayer/react` | Nouveaux fichiers dans `src/plugins/` + export `index.ts` | ✅ Oui |
| `@owllayer/vue` | Nouveau fichier `src/plugins/usePluginComponents.ts` + export `index.ts` | ✅ Oui |
| `@owllayer/svelte` | Nouveau fichier `src/plugins/pluginComponents.ts` + export `index.ts` | ✅ Oui |
| `@owllayer-plugins/bar-chart` | Nouveau package | N/A |
| `apps/demo` | `App.tsx` câblage bar-chart + `package.json` dep + `vite.config.ts` alias | ✅ Oui |

### Fichiers qui seront modifiés ou créés

| Fichier | Nature |
|---|---|
| `packages/core/src/plugins/ui.types.ts` | **CREATE** — `PluginUIDeclaration`, `PluginComponentMap` |
| `packages/core/src/plugins/plugin.types.ts` | **MODIFY** — ajout `ui?: PluginUIDeclaration` sur `OwlLayerClientPlugin` |
| `packages/core/src/index.ts` | **MODIFY** — export `PluginUIDeclaration`, `PluginComponentMap` |
| `packages/react/src/plugins/usePluginComponents.ts` | **CREATE** — hook `usePluginComponents<T>()` |
| `packages/react/src/plugins/PluginRenderer.tsx` | **CREATE** — `<PluginRenderer />` |
| `packages/react/src/plugins/PluginDevPanel.tsx` | **CREATE** — `<PluginDevPanel />` |
| `packages/react/src/index.ts` | **MODIFY** — export 3 nouveaux symboles |
| `packages/vue/src/plugins/usePluginComponents.ts` | **CREATE** — composable Vue `usePluginComponents<T>()` |
| `packages/vue/src/index.ts` | **MODIFY** — export |
| `packages/svelte/src/plugins/pluginComponents.ts` | **CREATE** — helper `getPluginComponent()` |
| `packages/svelte/src/index.ts` | **MODIFY** — export |
| `plugins/bar-chart/package.json` | **CREATE** |
| `plugins/bar-chart/tsconfig.json` | **CREATE** |
| `plugins/bar-chart/src/index.ts` | **CREATE** — `BarChartPlugin` definition |
| `plugins/bar-chart/src/react/BarChart.tsx` | **CREATE** — composant React |
| `plugins/bar-chart/src/react/index.ts` | **CREATE** — export React-flavored plugin |
| `apps/demo/package.json` | **MODIFY** — dep `@owllayer-plugins/bar-chart` |
| `apps/demo/vite.config.ts` | **MODIFY** — alias `@owllayer-plugins/bar-chart` |
| `apps/demo/src/App.tsx` | **MODIFY** — câblage BarChartPlugin + usage composant |

### Fichiers qui ne seront PAS modifiés

- `packages/core/src/plugins/installPlugin.ts` — aucun changement comportemental requis
- `packages/react/src/provider/OwlLayerProvider.tsx` — la prop `plugins` existante suffit
- `packages/vue/src/plugin/OwlLayerPlugin.ts` — c'est le Vue app plugin, périmètre différent
- `packages/svelte/src/stores/owllayer.store.ts` — non concerné
- `plugins/demo-crm/` — plugin existant, non touché
- Tous les tests existants — `installPlugin` non modifié, aucune régression attendue

---

## Implémentation

### Étapes séquentielles

**Étape 1 — Core : types UI (framework-agnostic)**  
Fichier : `packages/core/src/plugins/ui.types.ts`

```ts
/**
 * Carte de composants déclarée par un plugin.
 * Le type de chaque composant est opaque ici (framework-specific).
 * Les SDK React/Vue/Svelte fournissent des accesseurs typés.
 */
export type PluginComponentMap = Record<string, unknown>;

/**
 * Déclaration UI optionnelle d'un plugin.
 * Permet aux frameworks de résoudre les composants via usePluginComponents().
 */
export interface PluginUIDeclaration {
  components?: PluginComponentMap;
}
```

**Étape 2 — Core : étendre `OwlLayerClientPlugin`**  
Fichier : `packages/core/src/plugins/plugin.types.ts`  
Ajout du champ `ui?` optionnel — aucune modification du reste.

```ts
// Avant
export interface OwlLayerClientPlugin<C = void> {
  meta: { name: string; version: string; description?: string };
  setup(ctx: PluginClientContext, config: C): void | Promise<void>;
}

// Après
export interface OwlLayerClientPlugin<C = void> {
  meta: { name: string; version: string; description?: string };
  setup(ctx: PluginClientContext, config: C): void | Promise<void>;
  /** Composants UI optionnels exposés par ce plugin (framework-specific). */
  ui?: PluginUIDeclaration;
}
```

**Étape 3 — Core : export `index.ts`**  
Ajouter dans la section `// --- Plugins ---` de `packages/core/src/index.ts` :
```ts
export type { PluginUIDeclaration, PluginComponentMap } from './plugins/ui.types.js';
```

**Étape 4 — React : `usePluginComponents`**  
Fichier : `packages/react/src/plugins/usePluginComponents.ts`

```ts
// Typage strict côté React : T = { BarChart: FC<BarChartProps>, ... }
export function usePluginComponents<T extends Record<string, ComponentType<any>>>(
  plugin: OwlLayerClientPlugin<any>
): Partial<T>
```

Lit `plugin.ui?.components`, retourne l'objet casté en `Partial<T>`.  
Ne déclenche aucun effet de bord — accès en lecture pure, pas de `useEffect`.

**Étape 5 — React : `PluginRenderer`**  
Fichier : `packages/react/src/plugins/PluginRenderer.tsx`

```tsx
// Raccourci déclaratif
<PluginRenderer plugin={BarChartPlugin} component="BarChart" props={{ data, title }} />
```

Implémentation : appelle `usePluginComponents` en interne, rend le composant demandé ou `null` si absent.

**Étape 6 — React : `PluginDevPanel`**  
Fichier : `packages/react/src/plugins/PluginDevPanel.tsx`

Props : `plugins: PluginEntry[]` — la même liste que celle passée à `OwlLayerProvider`.

Affiche pour chaque plugin :
- Nom + version + description
- Liste des composants UI déclarés (`plugin.ui?.components`)
- Liste des tools enregistrés (lus via `useAgentContext()` ou snapshot du registry)
- Bouton "Simulate" → appelle le tool avec des args JSON editables inline
- Dev-only : pas de styles lourds, CSS inline minimaliste

**Étape 7 — React : export `index.ts`**  
Ajouter section `// --- Plugin UI ---` :
```ts
export { usePluginComponents } from './plugins/usePluginComponents.js';
export { PluginRenderer } from './plugins/PluginRenderer.js';
export { PluginDevPanel } from './plugins/PluginDevPanel.js';
```

**Étape 8 — Vue : `usePluginComponents` composable**  
Fichier : `packages/vue/src/plugins/usePluginComponents.ts`

```ts
export function usePluginComponents<T extends Record<string, Component>>(
  plugin: OwlLayerClientPlugin<any>
): Partial<T>
```

Même logique que React : lecture pure de `plugin.ui?.components`.

**Étape 9 — Vue : export `index.ts`**

**Étape 10 — Svelte : `getPluginComponent` helper**  
Fichier : `packages/svelte/src/plugins/pluginComponents.ts`  
En Svelte, pas de hook — fonction pure :

```ts
export function getPluginComponent<T>(
  plugin: OwlLayerClientPlugin<any>,
  name: string
): T | undefined
```

**Étape 11 — Svelte : export `index.ts`**

**Étape 12 — Plugin `bar-chart` (démo)**  
Package : `@owllayer-plugins/bar-chart`

- `src/index.ts` : `BarChartPlugin` — `setup()` appelle `ctx.updateContext({ chart: { theme } })`, pas de tool ici
- `src/react/BarChart.tsx` : composant React qui appelle `useAgentTool('render_chart', ...)` au montage — enregistre le tool pendant sa vie, le dépublie au démontage nat
- `src/react/index.ts` : exporte `BarChartReactPlugin` = `{ ...BarChartPlugin, ui: { components: { BarChart } } }`

Structure :
```
plugins/bar-chart/
  package.json          → name: @owllayer-plugins/bar-chart, deps: @owllayer/core, @owllayer/react
  tsconfig.json
  src/
    index.ts            → BarChartPlugin (framework-agnostic, pas de ui)
    react/
      BarChart.tsx      → composant + useAgentTool interne
      index.ts          → BarChartReactPlugin avec ui.components
```

**Étape 13 — Demo app**  
Fichiers : `apps/demo/package.json`, `apps/demo/vite.config.ts`, `apps/demo/src/App.tsx`

- Ajouter `@owllayer-plugins/bar-chart` dans `DEMO_PLUGINS`
- Monter `<BarChart data={mockData} />` dans la page demo
- Monter `<PluginDevPanel plugins={DEMO_PLUGINS} />` (visible uniquement en dev)

**Étape 14 — Build, tests, commit**

---

## API publique

### Core

```ts
// NOUVEAU dans @owllayer/core
export type PluginComponentMap = Record<string, unknown>;
export interface PluginUIDeclaration { components?: PluginComponentMap; }

// MODIFIÉ dans @owllayer/core (ajout champ optionnel)
export interface OwlLayerClientPlugin<C = void> {
  meta: { name: string; version: string; description?: string };
  setup(ctx: PluginClientContext, config: C): void | Promise<void>;
  ui?: PluginUIDeclaration;   // ← nouveau, optionnel
}
```

### React

```ts
// Accès typé aux composants d'un plugin
function usePluginComponents<T extends Record<string, ComponentType<any>>>(
  plugin: OwlLayerClientPlugin<any>
): Partial<T>

// Rendu déclaratif
function PluginRenderer(props: {
  plugin: OwlLayerClientPlugin<any>;
  component: string;
  props?: Record<string, unknown>;
}): JSX.Element | null

// Panel développeur
function PluginDevPanel(props: {
  plugins: PluginEntry[];
}): JSX.Element
```

### Vue

```ts
function usePluginComponents<T extends Record<string, Component>>(
  plugin: OwlLayerClientPlugin<any>
): Partial<T>
```

### Svelte

```ts
function getPluginComponent<T>(
  plugin: OwlLayerClientPlugin<any>,
  name: string
): T | undefined
```

### Usage côté plugin auteur

```ts
// plugins/my-lib/src/react/index.ts
import { MyChart } from './MyChart.js';

export const MyChartReactPlugin: OwlLayerClientPlugin<MyConfig> = {
  meta: { name: '@acme/my-chart', version: '1.0.0' },
  setup(ctx, config) {
    ctx.updateContext({ chart: { theme: config.theme } });
    // tools enregistrés par le composant lui-même via useAgentTool
  },
  ui: {
    components: { MyChart }
  }
};

// Côté app
import { usePluginComponents } from '@owllayer/react';
const { MyChart } = usePluginComponents<{ MyChart: typeof MyChart }>(MyChartReactPlugin);
```

---

## Tests

- [ ] `packages/core/tests/plugins.test.ts` — ajouter 2 cas : plugin avec `ui` valide, plugin sans `ui` (rétro-compat)
- [ ] `plugins/bar-chart/src/__tests__/BarChartPlugin.test.ts` — tester `setup()` + présence des composants dans `ui.components`
- [ ] `pnpm build` passe sur `@owllayer/core`, `@owllayer/react`, `@owllayer/vue`, `@owllayer/svelte`, `@owllayer-plugins/bar-chart`
- [ ] `pnpm test` ne régresse pas (127 tests existants maintenu)
- [ ] Validation manuelle dans `apps/demo` : BarChart visible + tool `render_chart` actif + PluginDevPanel fonctionnel

---

## Critères d'acceptation

- [ ] Un plugin existant (`demo-crm`) sans champ `ui` continue de fonctionner sans modification
- [ ] `usePluginComponents(BarChartReactPlugin).BarChart` retourne le composant React
- [ ] `<PluginRenderer plugin={BarChartReactPlugin} component="BarChart" props={{...}} />` rend correctement
- [ ] `<PluginDevPanel plugins={DEMO_PLUGINS} />` affiche les 2 plugins (crm + bar-chart) avec leurs tools
- [ ] Le tool `render_chart` est actif quand `<BarChart />` est monté, inactif quand démonté
- [ ] Build TypeScript sans erreur sur les 5 packages concernés
- [ ] La PR référence ce document : `feat: plugin UI capabilities (ref feature_07)`
