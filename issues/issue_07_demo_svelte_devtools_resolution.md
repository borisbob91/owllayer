# Issue #07 : Build global cassé dans `demo-svelte` sur `@owllayer/ui/devtools`

**Statut** : 🟢 Résolu  
**Priorité** : 🔴 Bloquant  
**Domaine** : svelte  
**Porteur** : @BorisBob  
**Date** : 2026-03-31

---

## Résumé

Le build global du monorepo casse dans `apps/demo-svelte` pendant `vite build`.

L'échec ne vient pas du Sprint 1 server. Il vient du domaine `svelte` : `demo-svelte` consomme `@owllayer/svelte` via alias source, mais ne résout pas `@owllayer/ui/devtools`, utilisé dynamiquement par `createDevTools`.

---

## Reproduction

### Conditions

- Version affectée : état courant du monorepo au 2026-03-31
- Environnement : Windows, pnpm workspace, Turborepo
- Configuration : build global lancé depuis `owllayer/`

### Scénario pas-à-pas

1. Exécuter `pnpm build` depuis `owllayer/`
2. Laisser Turbo lancer `@owllayer/demo-svelte`
3. Observer l'échec Vite
4. → Bug observé :

```text
[vite]: Rollup failed to resolve import "@owllayer/ui/devtools"
from ".../packages/svelte/src/composables/createDevTools.ts"
```

---

## Analyse technique

### Cause racine

`apps/demo-svelte/vite.config.ts` alias uniquement `@owllayer/svelte` et `@owllayer/core`, sans exposer `@owllayer/ui`, `@owllayer/ui/devtools` ni `@owllayer/ui/dashboard`.

Dans le même temps, `packages/svelte/src/composables/createDevTools.ts` charge dynamiquement `@owllayer/ui/devtools`.

```
Fichier : apps/demo-svelte/vite.config.ts
Code    : alias limité à @owllayer/svelte et @owllayer/core

Fichier : packages/svelte/src/composables/createDevTools.ts
Ligne   : 40
Code    : import('@owllayer/ui/devtools')
```

### Pourquoi c'est un bug (et pas un comportement attendu)

Le package `demo-svelte` consomme les sources workspace en développement. Dès lors, Vite doit savoir résoudre tous les sous-chemins utilisés par `@owllayer/svelte`, y compris `@owllayer/ui/devtools`.

Le pattern existe déjà dans `demo-vue` et `demo-browser`, qui déclarent `@owllayer/ui` comme dépendance workspace et mappent `@owllayer/ui`, `@owllayer/ui/devtools` et `@owllayer/ui/dashboard` dans leur configuration Vite.

---

## Solution

### Approche retenue

Aligner `demo-svelte` sur le pattern déjà validé par `demo-vue` :

- ajouter `@owllayer/ui` dans les dépendances workspace de `apps/demo-svelte/package.json` ;
- ajouter les aliases Vite pour `@owllayer/ui`, `@owllayer/ui/devtools` et `@owllayer/ui/dashboard` ;
- exclure ces modules de `optimizeDeps` pour éviter une résolution incohérente en build dev/prod.

### Fichiers qui seront modifiés

| Fichier | Type de modification | Risque |
|---|---|---|
| `apps/demo-svelte/package.json` | Ajout de la dépendance workspace `@owllayer/ui` | Faible |
| `apps/demo-svelte/vite.config.ts` | Ajout des aliases Vite et `optimizeDeps.exclude` | Faible |

> ⚠️ Tout fichier modifié en PR qui ne figure pas dans ce tableau est un motif de refus.

### Ce qui NE sera PAS modifié

- `packages/svelte/src/composables/createDevTools.ts`
- `packages/ui/*`
- `packages/server/*`
- les autres apps de démo

---

## Tests

- [x] `pnpm --filter @owllayer/demo-svelte build` passe
- [x] `pnpm build` ne casse plus sur `@owllayer/demo-svelte`
