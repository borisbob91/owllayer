# Issue #14 : Validation finale Angular invalidee par contournement de resolution package workspace

**Statut** : 🔴 Ouvert  
**Priorite** : 🟡 Majeur  
**Domaine** : angular  
**Porteur** : @BorisBob  
**Date** : 2026-04-06  

---

## Resume

La demo Angular n'est pas totalement resolue contre le package workspace normal. Elle contourne encore la resolution package de `@owllayer/angular` et `@owllayer/core` via des alias source-locaux dans [owllayer/apps/demo-angular/tsconfig.json](owllayer/apps/demo-angular/tsconfig.json#L14-L17) et [owllayer/apps/demo-angular/vite.config.ts](owllayer/apps/demo-angular/vite.config.ts#L8-L13).

Le gate final du domaine Angular reste donc incomplet : la demo peut rester verte tout en important directement les sources du monorepo, au lieu de valider la resolution normale d'un consommateur workspace.

---

## Reproduction

### Conditions

- Version affectee : etat courant post Sprint 9 au 2026-04-06
- Environnement : Windows, monorepo pnpm, domaine `angular`
- Configuration : `@owllayer/angular` declare en dependance workspace de `@owllayer/demo-angular`

### Scenario pas-a-pas

1. Ouvrir [owllayer/apps/demo-angular/tsconfig.json](owllayer/apps/demo-angular/tsconfig.json#L14-L17).
2. Constater que `compilerOptions.paths` redirige `@owllayer/angular` et `@owllayer/core` vers `../../packages/*/src/*`.
3. Ouvrir [owllayer/apps/demo-angular/vite.config.ts](owllayer/apps/demo-angular/vite.config.ts#L8-L13).
4. Constater que `resolve.alias` redirige les memes packages vers les sources locales du monorepo.
5. Comparer cet etat au contrat du Sprint 9 : la demo doit valider la surface publique et la resolution package normales, sans contournement local.
6. → Bug observe : le domaine Angular peut passer son gate final alors que la demo ne prouve pas la consommation reelle du package workspace normal.

---

## Analyse technique

### Cause racine

Le probleme n'est pas dans les composants Angular de la demo. Le probleme est dans la couche de resolution locale qui court-circuite le contrat package.

Fichier : [owllayer/apps/demo-angular/tsconfig.json](owllayer/apps/demo-angular/tsconfig.json#L14-L17)

```json
"paths": {
  "@owllayer/angular": ["../../packages/angular/src/public-api.ts"],
  "@owllayer/core": ["../../packages/core/src/index.ts"]
}
```

Fichier : [owllayer/apps/demo-angular/vite.config.ts](owllayer/apps/demo-angular/vite.config.ts#L8-L13)

```ts
resolve: {
  alias: {
    '@owllayer/angular': resolve(rootDir, '../../packages/angular/src/public-api.ts'),
    '@owllayer/core': resolve(rootDir, '../../packages/core/src/index.ts'),
  },
},
```

Ce contournement masque exactement ce que le gate final doit verifier :

- la resolution du package `@owllayer/angular` via son contrat workspace normal
- la validite de ses exports publics reels
- la chaine de dependances normale entre `@owllayer/demo-angular`, `@owllayer/angular` et `@owllayer/core`

### Pourquoi c'est un bug (et pas un comportement attendu)

Sprint 9 pose explicitement que la demo Angular doit servir de preuve finale du domaine, c'est-a-dire consommer la surface publique gelee sans import interne ni contournement de resolution.

Ici, la demo ne valide pas le package comme le ferait un consommateur normal. Elle valide seulement qu'un alias local vers `src/` fonctionne encore dans ce repo. C'est un defaut de validation finale, pas une optimisation de developpement acceptable pour le gate.

Cette issue reste strictement mono-domaine `angular`. Aucun changement `core`, `ui`, `infra` ou multi-domaines n'est necessaire pour corriger ce point.

---

## Solution

### Approche retenue

**AVANT**

La demo Angular force TypeScript et Vite a resoudre `@owllayer/angular` et `@owllayer/core` vers les fichiers `src/` du monorepo.

**APRES**

La demo Angular ne doit plus redefinir cette resolution. `tsconfig.json` et `vite.config.ts` doivent laisser fonctionner la resolution package workspace normale, afin que la demo consomme le package `@owllayer/angular` tel qu'il est expose et relie dans le workspace.

**POURQUOI**

Le gate final n'a de valeur que s'il valide le contrat public reel du package Angular. Tant que la demo contourne ce contrat via des alias source-locaux, Sprint 9 n'est pas totalement ferme.

### Codes stables

Aucun nouveau code d'erreur stable n'est introduit. Cette issue materialise un reliquat du gate final Angular deja couvert par l'intention de validation de Sprint 9 : la demo doit cesser tout contournement local de la surface package.

### Fichiers qui seront modifies

| Fichier | AVANT | APRES | POURQUOI | Risque |
| --- | --- | --- | --- | --- |
| [owllayer/apps/demo-angular/tsconfig.json](owllayer/apps/demo-angular/tsconfig.json) | `compilerOptions.paths` force `@owllayer/angular` et `@owllayer/core` vers `packages/*/src/*` | suppression des alias source-locaux pour revenir a la resolution workspace normale | retablir une validation TypeScript basee sur le package reel | Faible |
| [owllayer/apps/demo-angular/vite.config.ts](owllayer/apps/demo-angular/vite.config.ts) | `resolve.alias` force `@owllayer/angular` et `@owllayer/core` vers `packages/*/src/*` | suppression des alias source-locaux et nettoyage local associe si devenu inutile | retablir une validation bundler basee sur le package reel | Faible |

> ⚠️ Tout fichier modifie en PR qui ne figure pas dans ce tableau est un motif de refus.

### Ce qui NE sera PAS modifie

- [owllayer/apps/demo-angular/package.json](owllayer/apps/demo-angular/package.json) : hors scope tant qu'aucun import direct a `@owllayer/core` n'est requis par la demo ; le scan actuel montre uniquement des imports `@owllayer/angular` dans `src/`
- `packages/angular/**`
- `packages/core/**`
- `packages/ui/**`
- `turbo.json`
- `pnpm-workspace.yaml`
- tout autre fichier sous `apps/demo-angular/src/**`

---

## Tests

- [ ] `pnpm --filter @owllayer/angular build` passe
- [ ] `pnpm --filter @owllayer/demo-angular build` passe sans alias source-local dans la demo
- [ ] `pnpm --filter @owllayer/demo-angular test` passe
- [ ] verification manuelle : [owllayer/apps/demo-angular/tsconfig.json](owllayer/apps/demo-angular/tsconfig.json) ne contient plus de `paths` vers `../../packages/angular/src/` ni `../../packages/core/src/`
- [ ] verification manuelle : [owllayer/apps/demo-angular/vite.config.ts](owllayer/apps/demo-angular/vite.config.ts) ne contient plus de `resolve.alias` vers `../../packages/angular/src/` ni `../../packages/core/src/`
- [ ] verification manuelle : la demo continue d'importer `@owllayer/angular` via son API publique uniquement