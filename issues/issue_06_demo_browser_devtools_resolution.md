# Issue #06 : Build global cassé dans `demo-browser` sur `@domos/ui/devtools`

**Statut** : 🟢 Corrigé  
**Priorité** : 🟡 Majeur  
**Domaine** : browser  
**Porteur** : @BorisBob  
**Date** : 2026-03-31

---

## Résumé

Le build global `turbo run build` échoue sur `apps/demo-browser` alors que les builds ciblés `core`, `server`, `adapter-google` et `adapter-openai` passent.

L'échec ne vient pas du Sprint 1 server. Il vient du domaine `browser` : `demo-browser` consomme `@domos/browser` via alias source, mais ne résout pas `@domos/ui/devtools`, utilisé dynamiquement par `BrowserDomOS`.

---

## Reproduction

### Conditions

- Version affectée : état courant du repo au 2026-03-31
- Environnement : Windows, pnpm workspace, Turborepo
- Configuration : build global depuis `domos/`

### Scénario pas-à-pas

1. Lancer `turbo run build` depuis `domos/`
2. Attendre l'étape `@domos/demo-browser#build`
3. Observer l'erreur Rollup/Vite

→ Bug observé :

```txt
[vite]: Rollup failed to resolve import "@domos/ui/devtools"
from "packages/browser/src/runtime/BrowserDomOS.ts"
```

---

## Analyse technique

### Cause racine

`demo-browser` aligne `@domos/browser` et `@domos/core` sur leurs sources via alias Vite, mais ne fait rien pour `@domos/ui`.

Fichier : `apps/demo-browser/vite.config.ts`  
Code :

```ts
resolve: {
  alias: {
    '@domos/browser': resolve(rootDir, '../../packages/browser/src'),
    '@domos/core': resolve(rootDir, '../../packages/core/src'),
  },
},
```

Dans le même temps, `BrowserDomOS` charge dynamiquement le sous-chemin `@domos/ui/devtools`.

Fichier : `packages/browser/src/runtime/BrowserDomOS.ts`  
Code :

```ts
const { mountDevTools } = await (import('@domos/ui/devtools') as Promise<any>);
```

Enfin, `apps/demo-browser/package.json` ne déclare aucune dépendance workspace vers `@domos/browser`, `@domos/core` ou `@domos/ui`, donc Turbo et Vite n'ont pas de graphe de dépendances explicite pour cette app.

### Pourquoi c'est un bug

Le build de `demo-browser` dépend implicitement d'un sous-module UI, sans lui donner ni résolution Vite, ni dépendance workspace déclarée.

Le comportement attendu existe déjà ailleurs dans le repo, notamment dans `apps/demo-vue`, qui :

- déclare `@domos/ui` comme dépendance workspace ;
- mappe `@domos/ui`, `@domos/ui/devtools` et `@domos/ui/dashboard` dans son `vite.config.ts`.

---

## Solution

### Approche retenue

Appliquer à `demo-browser` le même pattern minimal que `demo-vue` :

- déclarer les dépendances workspace nécessaires dans `apps/demo-browser/package.json` ;
- ajouter les aliases Vite pour `@domos/ui`, `@domos/ui/devtools` et `@domos/ui/dashboard` ;
- exclure ces modules UI de l'optimisation Vite pour garder une résolution stable en workspace.

### Fichiers qui seront modifiés

| Fichier | Type de modification | Risque |
| --- | --- | --- |
| `apps/demo-browser/package.json` | Ajout des dépendances workspace minimales | Faible |
| `apps/demo-browser/vite.config.ts` | Ajout des aliases Vite et de l'exclusion `optimizeDeps` pour `@domos/ui` | Faible |

> ⚠️ Tout fichier modifié qui ne figure pas dans ce tableau sort du scope de cette issue.

### Ce qui NE sera PAS modifié

- `packages/browser/src/runtime/BrowserDomOS.ts`
- `packages/ui/package.json`
- `turbo.json`
- les packages `core`, `server` et `adapter-*`

---

## Tests

- [x] `pnpm --filter @domos/ui build`
- [x] `pnpm --filter @domos/demo-browser build`
- [x] `turbo run build --filter=@domos/demo-browser...`
- [ ] Vérification qu'aucune autre app Vite n'est régressée
