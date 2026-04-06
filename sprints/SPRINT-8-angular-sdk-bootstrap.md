---
mode: agent
description: >
  Sprint 8 — Bootstrap réel du domaine Angular avec création du package
  @domos/angular, de l'application @domos/demo-angular et de la validation
  build/test minimale, sans chantier ui ni infra.
tools:
  - read_file
  - replace_string_in_file
  - multi_replace_string_in_file
  - create_file
  - run_in_terminal
  - grep_search
  - file_search
  - get_errors
---

# Sprint 8 — Angular SDK Bootstrap

**Base :** Feature 25 validée, aucun package Angular présent dans le repo réel  
**Périmètre :** Monorepo `domos/` — `packages/angular/` + `apps/demo-angular/`  
**Référence CDC :** `domos/features/feature_25_angular_sdk_domain_bootstrap.md`

---

## Phases

- **Phase 1 — Package `@domos/angular`** : créer le domaine SDK Angular minimal et buildable
- **Phase 2 — Bridge Angular vers `@domos/core`** : brancher l'intégration Angular sans dépendance à `ui`
- **Phase 3 — App `@domos/demo-angular`** : créer une démo Angular minimale branchée sur le package
- **Phase 4 — Gate build/test minimale** : prouver le bootstrap réel du domaine Angular

---

## Objectif

Livrer le premier bootstrap réel du domaine Angular dans DomOS, en restant strictement dans le domaine Angular.

Le livrable de Sprint 8 n'est pas une UI Angular riche. Le livrable est un domaine concret, visible et testable dans le monorepo réel :

- un package `@domos/angular`
- une application `@domos/demo-angular`
- une surface d'intégration minimale avec `@domos/core`
- une validation build/test minimale exécutable par `pnpm --filter`

---

## Diagnostic actuel

Au 6 avril 2026, le repo réel montre une structure SDK claire pour React, Vue, Svelte et Browser, mais aucun domaine Angular n'existe encore :

- `packages/react`, `packages/vue`, `packages/svelte` et `packages/browser` existent déjà ; `packages/angular` est absent.
- `apps/demo`, `apps/demo-vue`, `apps/demo-svelte` et `apps/demo-browser` existent déjà ; `apps/demo-angular` est absent.
- `pnpm-workspace.yaml` couvre déjà `packages/*` et `apps/*`, ce qui permet d'ajouter le domaine Angular sans ouvrir un sprint infra séparé.
- `package.json` racine expose déjà `build`, `test`, `lint`, `dev` via `turbo run`, ce qui permet un bootstrap Angular borné au package et à la démo.
- la feature 25 cadre Angular comme domaine distinct de `ui`, ce qui interdit d'utiliser Sprint 8 pour ouvrir un chantier `@domos/ui` ou un sprint infra.

Conclusion de diagnostic : le manque n'est pas documentaire. Le manque est structurel et concret. Sprint 8 doit donc créer le domaine Angular minimal, mais rien de plus.

---

## AVANT

- aucun package `@domos/angular`
- aucune app `@domos/demo-angular`
- aucune commande `pnpm --filter @domos/angular ...`
- aucune validation build/test Angular dans le monorepo
- aucun droit d'entrer par `ui` pour compenser l'absence du domaine Angular

## APRÈS

- `packages/angular/` existe comme domaine SDK Angular minimal et buildable
- `apps/demo-angular/` existe comme démo Angular minimale et buildable
- la démo consomme `@domos/angular` au lieu de contourner le package
- les commandes `pnpm --filter @domos/angular build`, `pnpm --filter @domos/angular test`, `pnpm --filter @domos/demo-angular build` et `pnpm --filter @domos/demo-angular test` existent et font partie du gate
- aucun fichier `ui` ou infra n'est requis pour déclarer Sprint 8 réussi

## POURQUOI

- un domaine Angular inexistant ne peut pas être gelé ni validé en Sprint 9
- un bootstrap réel doit être prouvé dans le repo, pas déduit depuis un cadrage
- la séparation Angular != `ui` n'a de valeur que si Angular sait démarrer sans ouvrir un faux chantier `ui`
- la démo Angular doit exister dès Sprint 8 pour éviter de geler une API sans consommateur réel

---

## Périmètre strict

### Ce que Sprint 8 fait

- crée `packages/angular/` avec une surface publique minimale
- crée `apps/demo-angular/` avec un bootstrap Angular minimal
- relie Angular à `@domos/core` sans réécrire le runtime DomOS
- ajoute les scripts build/test minimaux nécessaires au package et à la démo Angular
- prouve que la démo compile contre le package Angular et non contre des imports contournés

### Ce que Sprint 8 ne fait pas

- ne touche pas `packages/ui/**`
- ne touche pas `turbo.json`, `pnpm-workspace.yaml` ou `tsconfig.base.json`
- ne crée aucun sprint UI
- ne crée aucun sprint infra
- ne gèle pas encore la surface publique finale Angular
- ne produit pas une bibliothèque de composants Angular riche
- ne modifie pas `domos/README.md` ni `domos/docs/GETTING_STARTED.md`

---

## Règles de design

- Angular est traité comme un domaine SDK autonome.
- `@domos/angular` dépend de `@domos/core` pour les contrats et le runtime client partagé ; il ne duplique pas la logique DomOS.
- aucune dépendance à `@domos/ui` n'est autorisée dans Sprint 8.
- l'app `@domos/demo-angular` doit consommer la surface publique de `@domos/angular`, pas ses fichiers internes.
- le bootstrap Angular doit rester minimal : provider, service d'accès client, enregistrement tool minimal, smoke demo.
- aucun chantier cross-domaines implicite n'est autorisé sous prétexte de faire fonctionner Angular plus vite.
- les validations build/test doivent être locales au package et à la démo Angular.

---

## Codes stables de validation

| Code | Déclencheur | Décision attendue |
| --- | --- | --- |
| `ANGULAR-BOOT-001` | `packages/angular/` n'existe pas ou ne publie pas un point d'entrée public clair | Refus du sprint tant que `@domos/angular` n'est pas buildable |
| `ANGULAR-BOOT-002` | `@domos/angular` importe `@domos/ui` ou ouvre un chantier UI pour compenser le bootstrap | Refus du sprint tant que le domaine Angular n'est pas autonome |
| `ANGULAR-BOOT-003` | `apps/demo-angular/` n'existe pas ou ne consomme pas `@domos/angular` | Refus du sprint tant que la démo ne valide pas le package réel |
| `ANGULAR-BOOT-004` | Les commandes `pnpm --filter @domos/angular build` ou `pnpm --filter @domos/demo-angular build` échouent | Refus du sprint tant que le bootstrap n'est pas compilable |
| `ANGULAR-BOOT-005` | Les commandes `pnpm --filter @domos/angular test` ou `pnpm --filter @domos/demo-angular test` manquent ou échouent | Refus du sprint tant que la validation minimale n'existe pas |
| `ANGULAR-BOOT-006` | La démo Angular contourne `@domos/angular` via des imports directs vers `@domos/core` pour l'intégration principale | Refus du sprint tant que la démo ne prouve pas la surface Angular |
| `ANGULAR-BOOT-007` | Le sprint force une modification infra ou monorepo racine non strictement nécessaire | Refus du sprint tant que le bootstrap n'est pas borné au domaine Angular |

---

## Phase 1 — Package `@domos/angular`

**startIndex recommandé** : 1

Avant :

- aucun package Angular n'existe dans `packages/`
- aucune entrée publique `@domos/angular` n'existe pour les intégrateurs

Après :

- `packages/angular/` existe avec `package.json`, `tsconfig.json`, point d'entrée public et structure source minimale
- le package expose une intégration Angular bornée au bootstrap du domaine

Pourquoi :

- Sprint 9 ne peut pas geler une surface publique qui n'existe pas encore

Service interface methods visées :

- `provideDomOS(config: DomOSAngularConfig): EnvironmentProviders`
- `injectDomOS(): DomOSAngularService`
- `DomOSAngularService.connect(): Promise<void>`
- `DomOSAngularService.disconnect(): Promise<void>`
- `DomOSAngularService.registerTool(definition: DomOSToolDefinition, handler: DomOSToolHandler): VoidFunction`

Boilerplate libs à réutiliser :

- `@angular/core`
- `@angular/common`
- `rxjs`
- `@domos/core`

## Phase 2 — Bridge Angular vers `@domos/core` sans `ui`

**startIndex recommandé** : 2

Avant :

- Angular n'a aucun point d'accroche vers le runtime client DomOS
- le repo ne prouve pas encore qu'Angular peut vivre sans détour par `ui`

Après :

- le package Angular encapsule le branchement minimal vers `@domos/core`
- l'injection et le cycle de vie Angular restent localisés au domaine `packages/angular/`

Pourquoi :

- il faut prouver la séparation de domaine dès le bootstrap, pas en review finale

Service interface methods visées :

- `provideDomOS(config: DomOSAngularConfig): EnvironmentProviders`
- `injectDomOS(): DomOSAngularService`
- `DomOSAngularService.client(): DomOSClient`
- `DomOSAngularService.registerTool(definition: DomOSToolDefinition, handler: DomOSToolHandler): VoidFunction`

Boilerplate libs à réutiliser :

- Angular standalone providers officiels
- `@domos/core`
- types partagés DomOS existants

## Phase 3 — App `@domos/demo-angular`

**startIndex recommandé** : 3

Avant :

- aucune démo Angular n'existe dans `apps/`
- aucune validation d'usage réel du package Angular n'est possible

Après :

- `apps/demo-angular/` existe avec un bootstrap minimal
- l'app démarre via `@domos/angular` et déclare au moins un scénario de smoke demo

Pourquoi :

- une surface SDK sans consommateur réel est trop facile à sur-spécifier

Service interface methods visées :

- `provideDomOS(config: DomOSAngularConfig): EnvironmentProviders`
- `injectDomOS(): DomOSAngularService`
- `DomOSAngularService.connect(): Promise<void>`
- `DomOSAngularService.registerTool(definition: DomOSToolDefinition, handler: DomOSToolHandler): VoidFunction`

Boilerplate libs à réutiliser :

- Angular standalone bootstrap officiel
- `@domos/angular`
- `@angular/platform-browser`

## Phase 4 — Gate build/test minimale

**startIndex recommandé** : 4

Avant :

- aucune commande Angular ciblée n'existe dans le monorepo
- aucun verdict binaire de bootstrap Angular n'est possible

Après :

- package et démo Angular ont des scripts `build` et `test` minimaux
- le sprint se ferme avec un verdict objectivable sur les quatre commandes de gate

Pourquoi :

- sans build/test ciblés, Sprint 8 reste une intention de domaine, pas un bootstrap réel

Service interface methods visées :

- aucune nouvelle méthode métier ; phase de validation du bootstrap livré en phases 1 à 3

Boilerplate libs à réutiliser :

- scripts `pnpm`
- `turbo run`
- outillage local aux packages Angular uniquement

---

## Fichiers à créer

### `packages/angular/`

| Fichier | AVANT | APRÈS | POURQUOI |
| --- | --- | --- | --- |
| `packages/angular/package.json` | absent | package nommé `@domos/angular` avec scripts `build` et `test` minimaux | rendre le domaine Angular adressable par `pnpm --filter` |
| `packages/angular/tsconfig.json` | absent | configuration TS locale bornée au package Angular | compiler le package sans ouvrir un chantier infra |
| `packages/angular/src/public-api.ts` | absent | point d'entrée public minimal du SDK Angular | préparer le gel de surface publique du Sprint 9 |
| `packages/angular/src/lib/provideDomOS.ts` | absent | bootstrap Angular minimal vers `@domos/core` | fournir l'entrée Angular officielle |
| `packages/angular/src/lib/DomOSAngularService.ts` | absent | service d'accès au client et au cycle de vie DomOS côté Angular | éviter des imports directs dispersés dans la démo |
| `packages/angular/src/lib/types.ts` | absent | types Angular locaux du domaine | éviter de surcharger le point d'entrée avec des types ad hoc |

### `apps/demo-angular/`

| Fichier | AVANT | APRÈS | POURQUOI |
| --- | --- | --- | --- |
| `apps/demo-angular/package.json` | absent | app nommée `@domos/demo-angular` avec scripts `build` et `test` minimaux | rendre la démo pilotable par `pnpm --filter` |
| `apps/demo-angular/tsconfig.json` | absent | configuration TS locale de la démo Angular | compiler l'app sans dépendre d'un chantier racine |
| `apps/demo-angular/index.html` | absent | shell HTML minimal de la démo Angular | fournir un point d'entrée de rendu réel |
| `apps/demo-angular/src/main.ts` | absent | bootstrap Angular standalone de la démo | démarrer l'application réelle |
| `apps/demo-angular/src/app/app.config.ts` | absent | configuration Angular branchée sur `provideDomOS(...)` | prouver l'intégration via le package Angular |
| `apps/demo-angular/src/app/app.component.ts` | absent | composant principal de smoke demo | valider un usage minimal de `@domos/angular` |
| `apps/demo-angular/src/app/register-demo-tools.ts` | absent | enregistrement du ou des tools de démonstration minimaux | prouver le flux Angular -> DomOS sans UI dédiée |

## Fichiers à modifier

Aucun fichier existant hors `packages/angular/` et `apps/demo-angular/` n'entre dans Sprint 8.

---

## Hors scope

- `packages/ui/**`
- `packages/react/**`
- `packages/vue/**`
- `packages/svelte/**`
- `packages/browser/**`
- `packages/server/**`
- `turbo.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `domos/README.md`
- `domos/docs/GETTING_STARTED.md`

---

## Dépendances

- `domos/features/feature_25_angular_sdk_domain_bootstrap.md` validée
- conventions monorepo déjà en place dans `pnpm-workspace.yaml`
- scripts racine déjà présents dans `domos/package.json`
- disponibilité des dépendances Angular officielles et de `@domos/core`

---

## Gate fin de sprint

Sprint 8 est terminé uniquement si :

1. `packages/angular/` existe et publie `@domos/angular`.
2. `apps/demo-angular/` existe et publie `@domos/demo-angular`.
3. la démo consomme `@domos/angular` comme entrée principale d'intégration.
4. aucune dépendance à `@domos/ui` n'est introduite.
5. aucune modification infra n'est requise pour faire passer le bootstrap.
6. les commandes suivantes existent et sont exécutables :

```bash
pnpm --filter @domos/angular build
pnpm --filter @domos/angular test
pnpm --filter @domos/demo-angular build
pnpm --filter @domos/demo-angular test
```

---

## Ce qu'on ne fait pas

- pas de sprint UI
- pas de sprint infra
- pas de composants Angular avancés
- pas de bridge `ui` implicite
- pas de gel final de la surface publique
- pas de documentation produit dans `domos/README.md`
- pas de documentation onboarding dans `domos/docs/GETTING_STARTED.md`
