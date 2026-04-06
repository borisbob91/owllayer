---
mode: agent
description: >
  Sprint 9 — Gate finale du domaine Angular pour geler la surface publique de
  @domos/angular, valider définitivement @domos/demo-angular et préparer les
  cibles documentaires futures sans modifier la documentation maintenant.
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

# Sprint 9 — Angular SDK Final Gate

**Base :** Sprint 8 livré et vert sur package + démo Angular  
**Périmètre :** Monorepo `domos/` — `packages/angular/` + `apps/demo-angular/`  
**Référence CDC :** `domos/features/feature_25_angular_sdk_domain_bootstrap.md`

---

## Phases

- **Phase 1 — Gel de surface publique** : fermer l'API exposée par `@domos/angular`
- **Phase 2 — Validation finale de la démo** : prouver que `@domos/demo-angular` consomme uniquement la surface gelée
- **Phase 3 — Gate build/test finale** : rendre le verdict final du domaine Angular
- **Phase 4 — Cibles documentaires futures** : lister `domos/README.md` et `domos/docs/GETTING_STARTED.md` comme suites possibles, sans modification maintenant

---

## Objectif

Fermer le bootstrap Angular avec un sprint de gate final strict.

Le livrable de Sprint 9 n'est pas une nouvelle capacité UI ni une extension infra. Le livrable est une décision binaire et vérifiable :

- la surface publique `@domos/angular` est figée
- la démo `@domos/demo-angular` valide cette surface sans contournement
- le domaine Angular sort du bootstrap sans ouvrir un nouveau chantier documentaire ou cross-domaines

---

## Diagnostic actuel

Après Sprint 8, le repo réel doit déjà contenir un package Angular et une démo Angular minimaux. Le risque principal change donc de nature :

- si la surface publique du package reste floue, chaque correctif local peut devenir une rupture implicite
- si la démo consomme encore des fichiers internes du package, elle ne valide pas réellement l'API publique
- si Sprint 9 essaie d'ajouter de la doc produit maintenant, il réouvre un périmètre non nécessaire avant le verdict technique final
- si Angular a besoin d'un nouveau chantier `ui` ou infra pour survivre au gate, Sprint 8 n'a pas réellement bootstrapé le domaine

Conclusion de diagnostic : Sprint 9 doit être traité comme un gate final, pas comme un Sprint 8 bis.

---

## AVANT

- `@domos/angular` existe potentiellement, mais sa surface publique peut encore être mouvante
- `@domos/demo-angular` existe potentiellement, mais peut encore valider des chemins internes au package
- aucune décision finale n'est encore prise sur le minimum documentaire post-gate

## APRÈS

- la surface publique Angular est réduite, lisible et gelée
- la démo ne dépend plus que de l'API publique gelée
- le verdict final du domaine Angular repose sur des commandes `pnpm --filter` explicites
- `domos/README.md` et `domos/docs/GETTING_STARTED.md` sont seulement identifiés comme cibles futures possibles, sans modification dans Sprint 9

## POURQUOI

- un SDK sans surface publique gelée reste en état de chantier
- une démo qui contourne le package invalide le sens même du gate
- la documentation ne doit venir qu'après la preuve technique du domaine Angular, pas à la place du gate

---

## Périmètre strict

### Ce que Sprint 9 fait

- gèle la surface publique utile de `@domos/angular`
- vérifie que `@domos/demo-angular` consomme uniquement cette surface
- exécute le gate final build/test du package et de la démo
- prépare les futures cibles documentaires minimales sans les modifier maintenant

### Ce que Sprint 9 ne fait pas

- ne crée pas de sprint UI
- ne crée pas de sprint infra
- ne rouvre pas le périmètre architecture de Sprint 8
- ne modifie pas `domos/README.md`
- ne modifie pas `domos/docs/GETTING_STARTED.md`
- n'ajoute pas de nouvelle surface publique par confort

---

## Règles de design

- Sprint 9 réduit, fige et valide ; il n'étend pas.
- seule l'API publique réellement consommée par la démo Angular doit survivre au gate.
- aucun import interne `packages/angular/src/**` ne doit rester côté `apps/demo-angular/`.
- aucune dépendance à `@domos/ui` n'est autorisée pour faire passer le gate.
- aucune modification infra racine n'est autorisée.
- `domos/README.md` et `domos/docs/GETTING_STARTED.md` restent hors modification dans ce sprint, même si leur besoin futur est documenté.

---

## Codes stables de validation

| Code | Déclencheur | Décision attendue |
| --- | --- | --- |
| `ANGULAR-GATE-001` | `@domos/angular` expose encore des exports transitoires, internes ou redondants | Refus du sprint tant que la surface publique n'est pas gelée |
| `ANGULAR-GATE-002` | `@domos/demo-angular` importe des fichiers internes de `packages/angular/src/**` | Refus du sprint tant que la démo ne consomme pas uniquement l'API publique |
| `ANGULAR-GATE-003` | Les commandes `pnpm --filter @domos/angular build` ou `pnpm --filter @domos/angular test` échouent | Refus du sprint tant que le package n'est pas vert |
| `ANGULAR-GATE-004` | Les commandes `pnpm --filter @domos/demo-angular build` ou `pnpm --filter @domos/demo-angular test` échouent | Refus du sprint tant que la démo n'est pas verte |
| `ANGULAR-GATE-005` | Le sprint touche `ui`, l'infra racine ou une documentation hors cible future | Refus du sprint tant que le gate n'est pas re-borné |
| `ANGULAR-GATE-006` | `domos/README.md` ou `domos/docs/GETTING_STARTED.md` sont modifiés dans Sprint 9 | Refus du sprint ; ces fichiers restent des cibles futures seulement |

---

## Phase 1 — Gel de surface publique `@domos/angular`

**startIndex recommandé** : 1

Avant :

- la surface publique issue de Sprint 8 peut encore mélanger exports utiles, temporaires et internes

Après :

- le barrel public Angular n'expose que l'intégration minimale réellement assumée
- le package devient relisible pour les intégrateurs et pour la démo finale

Pourquoi :

- sans gel d'API, le domaine Angular reste en bootstrap permanent

Service interface methods à geler :

- `provideDomOS(config: DomOSAngularConfig): EnvironmentProviders`
- `injectDomOS(): DomOSAngularService`
- `DomOSAngularService.connect(): Promise<void>`
- `DomOSAngularService.disconnect(): Promise<void>`
- `DomOSAngularService.registerTool(definition: DomOSToolDefinition, handler: DomOSToolHandler): VoidFunction`

Boilerplate libs à réutiliser :

- Angular standalone providers officiels
- `@domos/core`
- types publics déjà créés en Sprint 8

## Phase 2 — Validation finale de `@domos/demo-angular`

**startIndex recommandé** : 2

Avant :

- la démo peut encore être verte tout en contournant le package via des imports internes

Après :

- la démo valide explicitement la surface publique gelée
- tout besoin supplémentaire remonte comme dette ou futur sprint, pas comme extension opportuniste du gate

Pourquoi :

- le seul consommateur réel du domaine Angular au moment du gate doit servir de preuve technique

Service interface methods vérifiées :

- `provideDomOS(config: DomOSAngularConfig): EnvironmentProviders`
- `injectDomOS(): DomOSAngularService`
- `DomOSAngularService.connect(): Promise<void>`
- `DomOSAngularService.registerTool(definition: DomOSToolDefinition, handler: DomOSToolHandler): VoidFunction`

Boilerplate libs à réutiliser :

- `@domos/angular`
- Angular app standalone bootstrap

## Phase 3 — Gate build/test final

**startIndex recommandé** : 3

Avant :

- le domaine Angular peut sembler prêt sans verdict exécutable unique

Après :

- le sprint se clôt sur un verdict binaire porté par les commandes package + démo

Pourquoi :

- le gate final doit être reproductible et non interprétable

Service interface methods vérifiées :

- aucune nouvelle méthode ; phase de validation du package et de la démo gelés

Boilerplate libs à réutiliser :

- `pnpm --filter`
- scripts `build` et `test` déjà posés en Sprint 8

## Phase 4 — Cibles documentaires futures, sans modification maintenant

**startIndex recommandé** : 4

Avant :

- le domaine Angular peut donner envie d'ajouter immédiatement une doc produit minimale

Après :

- `domos/README.md` et `domos/docs/GETTING_STARTED.md` sont seulement marqués comme futures cibles documentaires d'un sprint ultérieur
- aucun changement documentaire n'est absorbé dans le gate technique

Pourquoi :

- il faut d'abord fermer le domaine techniquement, puis seulement ouvrir le minimum documentaire utile

Service interface methods concernées :

- aucune ; phase de ciblage futur uniquement

Boilerplate libs à réutiliser :

- aucun

---

## Fichiers à modifier

### `packages/angular/`

| Fichier | AVANT | APRÈS | POURQUOI |
| --- | --- | --- | --- |
| `packages/angular/src/public-api.ts` | exports potentiellement larges ou transitoires issus du bootstrap | barrel gelé aux seuls exports utiles et assumés | fermer la surface publique |
| `packages/angular/package.json` | scripts et exports potentiellement encore mouvants | package stabilisé sur la surface publique retenue | aligner package et API publique |
| `packages/angular/src/lib/provideDomOS.ts` | contrat encore susceptible de dérive locale | point d'entrée stabilisé | figer l'intégration minimale |
| `packages/angular/src/lib/DomOSAngularService.ts` | service bootstrap encore ajustable | service borné au strict nécessaire | éviter une API service qui gonfle au gate |

### `apps/demo-angular/`

| Fichier | AVANT | APRÈS | POURQUOI |
| --- | --- | --- | --- |
| `apps/demo-angular/src/main.ts` | bootstrap de démo potentiellement encore couplé à des chemins internes | bootstrap dépendant uniquement de `@domos/angular` | valider la surface publique gelée |
| `apps/demo-angular/src/app/app.config.ts` | configuration potentiellement encore permissive | configuration stabilisée sur l'API publique | prouver l'intégration officielle |
| `apps/demo-angular/src/app/app.component.ts` | consommation de bootstrap encore ouverte | consommation finale minimale et lisible | garder une preuve claire du domaine |
| `apps/demo-angular/package.json` | scripts peut-être encore provisoires | scripts build/test finaux du gate | rendre le verdict final reproductible |

## Fichiers à créer

Aucun nouveau fichier structurel n'est attendu par défaut dans Sprint 9. Ce sprint opère en gate sur l'existant livré par Sprint 8.

## Cibles futures hors sprint actuel

| Fichier | AVANT | APRÈS | POURQUOI |
| --- | --- | --- | --- |
| `domos/README.md` | documentation racine sans mention Angular minimale garantie | reste non modifié dans Sprint 9 ; devient une cible documentaire future seulement si le gate est vert | ne pas rouvrir le périmètre maintenant |
| `domos/docs/GETTING_STARTED.md` | onboarding sans branche Angular minimale garantie | reste non modifié dans Sprint 9 ; devient une cible documentaire future seulement si le gate est vert | séparer preuve technique et onboarding |

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
- modification effective de `domos/README.md`
- modification effective de `domos/docs/GETTING_STARTED.md`

---

## Dépendances

- Sprint 8 livré sur `@domos/angular` et `@domos/demo-angular`
- package Angular buildable et testable
- démo Angular buildable et testable
- feature 25 toujours valide sur la séparation Angular != `ui`

---

## Gate fin de sprint

Sprint 9 est terminé uniquement si :

1. la surface publique de `@domos/angular` est gelée et relisible.
2. `@domos/demo-angular` ne dépend plus que de cette surface publique.
3. aucune dépendance à `@domos/ui` n'est introduite.
4. aucune modification infra racine n'est introduite.
5. `domos/README.md` et `domos/docs/GETTING_STARTED.md` ne sont pas modifiés dans ce sprint.
6. les commandes suivantes existent et passent comme verdict final du domaine Angular :

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
- pas d'extension opportuniste de l'API Angular
- pas de nouvelle démo parallèle
- pas de documentation modifiée dans `domos/README.md`
- pas de documentation modifiée dans `domos/docs/GETTING_STARTED.md`
- pas de réouverture du bootstrap Sprint 8 sous couvert de gate final
