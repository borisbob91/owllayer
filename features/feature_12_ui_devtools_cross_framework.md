# Feature #12 : DevTools Cross-Framework — `@owllayer/ui/devtools`

**Statut** : 🔵 Proposition  
**Domaine** : ui (nouveau domaine)  
**Porteur** : @BorisBob  
**Validé par** : —  
**Date** : 2026-03-28  

---

## Besoin

Le `PluginDevPanel` existe aujourd'hui uniquement dans `@owllayer/react`. Les développeurs utilisant Vue, Svelte ou le SDK browser n'ont aucun outil de debug pour inspecter leurs plugins, simuler des appels tools, ou monitorer l'état de l'agent en temps réel. Reproduire ce composant dans chaque SDK serait une duplication coûteuse et incohérente.

### User story

> En tant que développeur intégrant OwlLayer — peu importe le framework utilisé — je veux un panneau de debug embarqué qui me permette d'inspecter mes plugins, simuler des appels tools et monitorer l'état de l'agent, sans avoir à coder quoi que ce soit de spécifique à mon framework.

---

## Périmètre strict

### Ce que cette feature fait

- Crée `packages/ui/src/devtools/` dans le package `@owllayer/ui` (créé par feature_11)
- Expose un composant Preact `DevToolsPanel` — panneau flottant, overlay, activable en DEV uniquement
- Expose une API impérative `mountDevTools(el, config)` / `unmountDevTools(el)` — framework-agnostic
- **Fonctionnalités DevTools :**
  - Inspection des plugins enregistrés (nom, version, description, tools déclarés, composants UI)
  - Simulation d'appel tool : sélection du tool, édition des arguments JSON, déclenchement, affichage de la réponse
  - Monitor d'état agent : affichage en temps réel de `agentState`, `sessionId`, messages ADTP reçus
  - Vue des tools enregistrés globalement avec leur niveau de risque (`none / low / high / critical`)
- Amélioration visuelle et fonctionnelle par rapport à l'actuel `PluginDevPanel` de `@owllayer/react`
- **Intégration dans les 4 SDKs via un pont minimal** (voir section intégration ci-dessous)

### Ce que cette feature ne fait PAS (hors scope)

- Ne modifie pas `PluginDevPanel.tsx` dans `@owllayer/react` (code existant, hors scope)
- Ne crée pas de système de logging persistant ou d'export
- N'enregistre pas de métriques de performance
- Ne remplace pas les DevTools navigateur
- Ne fonctionne pas en production (guard `import.meta.env.DEV` laissé à l'intégrateur)
- N'implémente pas de réseau ou de communication entre onglets

---

## Analyse d'impact

### Packages touchés — Phase 1 (ce document)

| Package | Modification | Rétro-compatibilité |
|---|---|---|
| `packages/ui` (feature_11) | Ajout dossier `src/devtools/` | ✅ Oui |

### Packages touchés — Phase 2 (hors scope de ce document, features séparées)

L'intégration dans chaque SDK est **hors scope** de ce document. Elle fera l'objet de features séparées par domaine (react, vue, svelte, browser). Le contrat attendu est documenté ci-dessous pour préparer ces features.

| SDK | Ce qui sera ajouté (phase 2) | Fichier concerné |
|---|---|---|
| `@owllayer/react` | Export `<DevTools />` wrappant `mountDevTools` | `packages/react/src/index.ts` + nouveau composant |
| `@owllayer/vue` | Export composant Vue wrappant `mountDevTools` | `packages/vue/src/index.ts` + nouveau composant |
| `@owllayer/svelte` | Export composant Svelte wrappant `mountDevTools` | `packages/svelte/src/index.ts` + nouveau composant |
| `@owllayer/browser` | Export `mountDevTools` direct (déjà impératif) | `packages/browser/src/index.ts` |

### Fichiers qui seront créés (phase 1 — ce document)

| Fichier | Nature |
|---|---|
| `packages/ui/src/devtools/index.ts` | Export + `mountDevTools` / `unmountDevTools` |
| `packages/ui/src/devtools/DevToolsPanel.tsx` | Composant racine Preact — panneau flottant draggable |
| `packages/ui/src/devtools/PluginInspector.tsx` | Liste des plugins avec détail expandable |
| `packages/ui/src/devtools/ToolCallSimulator.tsx` | Formulaire JSON + bouton simulate + affichage réponse |
| `packages/ui/src/devtools/StateMonitor.tsx` | Monitoring temps réel : state agent, sessionId, messages ADTP |
| `packages/ui/src/devtools/RiskBadge.tsx` | Badge coloré pour niveau de risque d'un tool |

### Fichiers modifiés dans `packages/ui`

| Fichier | Modification |
|---|---|
| `packages/ui/src/index.ts` | Ajout export `devtools` |

### Fichiers qui ne seront PAS modifiés

- `packages/react/src/plugins/PluginDevPanel.tsx` — hors scope
- `packages/react/src/index.ts` — phase 2 uniquement
- `packages/vue/src/**`
- `packages/svelte/src/**`
- `packages/browser/src/**`
- `packages/core/src/**`
- `apps/dashboard/**`

---

## Implémentation

### Décisions techniques

| Décision | Choix | Raison |
|---|---|---|
| Runtime UI | Preact (même que feature_11) | Cohérence `@owllayer/ui`, zéro dépendance supplémentaire |
| Position | Panneau flottant fixe en bas à droite | Pattern standard DevTools (Vue DevTools, React DevTools browser ext) |
| Drag | CSS `draggable` natif ou position absolue avec mouse events | Pas de lib externe |
| Styles | CSS inline + CSS custom properties | Isolation totale du CSS hôte |
| Communication avec le SDK | Contrat via `DevToolsConfig` — le SDK passe ses callbacks | `@owllayer/ui` ne dépend d'aucun SDK |

### API publique

```typescript
// packages/ui/src/devtools/index.ts

import type { PluginEntry, ToolDeclaration } from '@owllayer/core';

export interface DevToolsConfig {
  /** Tableau de plugins enregistrés (identique à celui passé au provider du SDK) */
  plugins: readonly PluginEntry[];
  /** Fonction qui retourne les tools actuellement enregistrés — injectée par le SDK */
  getRegisteredTools: () => ToolDeclaration[];
  /** Fonction pour simuler un appel tool — injectée par le SDK */
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  /** Getter d'état agent courant */
  getAgentState: () => string;
  /** Getter sessionId courant */
  getSessionId: () => string | null;
}

/** Monte les DevTools dans l'élément fourni */
export function mountDevTools(el: HTMLElement, config: DevToolsConfig): void

/** Démonte proprement les DevTools */
export function unmountDevTools(el: HTMLElement): void
```

### Contrat d'intégration SDK (pour les features phase 2)

Chaque SDK doit fournir un pont qui expose les 5 propriétés de `DevToolsConfig`.  
Exemple pour React (phase 2) :

```tsx
// Futur packages/react/src/components/DevTools.tsx (phase 2, hors scope)
import { useContext, useEffect, useRef } from 'react';
import { mountDevTools, unmountDevTools } from '@owllayer/ui/devtools';
import { OwlLayerContext } from '../provider/OwlLayerContext.js';

export function DevTools({ plugins }) {
  const ctx = useContext(OwlLayerContext);
  const ref = useRef(null);
  useEffect(() => {
    mountDevTools(ref.current, {
      plugins,
      getRegisteredTools: () => ctx.getRegisteredTools(),
      callTool: ctx.callTool,
      getAgentState: () => ctx.agentState,
      getSessionId: () => ctx.sessionId,
    });
    return () => unmountDevTools(ref.current);
  }, []);
  return <div ref={ref} />;
}
```

Le même pattern s'applique à Vue (composant + `onMounted`/`onUnmounted`), Svelte (`onMount`/`onDestroy`), et browser (appel direct).

### Améliorations par rapport à l'actuel `PluginDevPanel`

| Aspect | PluginDevPanel (actuel) | DevToolsPanel (feature_12) |
|---|---|---|
| Frameworks | React uniquement | React, Vue, Svelte, Browser |
| Simulation tool | Formulaire JSON basique | JSON editor avec validation schema Zod |
| Monitor état | Absent | Affichage `agentState` + `sessionId` en temps réel |
| Messages ADTP | Absent | Log des derniers messages ADTP (buffer circulaire 50 messages) |
| Risque tool | Badge inline simple | `RiskBadge` avec couleur + tooltip description |
| Position | Fixe absolue | Flottant déplaçable |
| Dépendances | `@owllayer/react` (couplé) | `@owllayer/core` uniquement |

### Étapes séquentielles

1. **Étape 1** — `DevToolsConfig` types + `index.ts` — contrat API publique
2. **Étape 2** — `StateMonitor.tsx` — polling `getAgentState` + `getSessionId` toutes les 500ms
3. **Étape 3** — `RiskBadge.tsx` — composant simple coloré
4. **Étape 4** — `PluginInspector.tsx` — liste plugins expandable + tools avec `RiskBadge`
5. **Étape 5** — `ToolCallSimulator.tsx` — sélection tool, textarea JSON, bouton simulate, affichage résultat
6. **Étape 6** — `DevToolsPanel.tsx` — assemblage, panneau flottant avec tabs (Plugins / Simulator / Monitor)
7. **Étape 7** — `mountDevTools` / `unmountDevTools` via `preact/render`
8. **Étape 8** — Export dans `packages/ui/src/index.ts`
9. **Étape 9** — `pnpm build` sur `packages/ui`

---

## Tests

- [ ] `pnpm build` passe sur `packages/ui` sans erreur
- [ ] `mountDevTools` monte et démonte sans memory leak (vérif manuelle)
- [ ] Simulation d'un tool retourne la réponse dans le panneau
- [ ] `StateMonitor` se met à jour quand `getAgentState` change
- [ ] Testé manuellement via intégration dans `apps/demo` (React) via le pont décrit ci-dessus

---

## Critères d'acceptation

- [ ] `import { mountDevTools } from '@owllayer/ui/devtools'` fonctionne sans config framework
- [ ] Aucune dépendance React, Vue, Svelte dans `@owllayer/ui`
- [ ] `DevToolsConfig` ne dépend que de `@owllayer/core` pour ses types
- [ ] `pnpm build` passe en CI sur `packages/ui`
- [ ] La PR référence ce document : `feat: @owllayer/ui devtools cross-framework (ref feature_12)`
