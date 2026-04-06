---
mode: agent
description: >
  Sprint 10 - Etendre @domos/angular au-dela du bootstrap final gate avec une
  surface reactive Angular-native et des helpers officiels tools, contexte,
  navigation et resolver, sans ouvrir ui, core ou la demo produit.
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

# Sprint 10 - Angular SDK Pattern Surface

**Base :** Feature 26 validee, Sprints 8 et 9 livres, domaine Angular bootstrappe et gate minimalement  
**Perimetre :** `domos/packages/angular/` uniquement  
**Reference CDC :** `domos/features/feature_26_angular_sdk_pattern_parity.md`

---

## Phases

- **Phase 1 - Surface agent reactive Angular-native** : sortir `DomOSAngularService` du simple trio `connect / disconnect / registerTool`
- **Phase 2 - Helpers contexte et evenements** : porter le contexte passif et les abonnements evenements dans le package Angular
- **Phase 3 - Helpers navigation, UI state et resolver** : rendre les patterns standards disponibles sans glue locale dans l'app
- **Phase 4 - Gate package et clause STOP** : fermer le sprint sans toucher `packages/core/**`, `packages/ui/**` ni `apps/demo-angular/**`

---

## Objectif

Livrer la surface SDK Angular necessaire pour qu'une application Angular DomOS puisse suivre les memes patterns d'integration que React et Vue, sans encore transformer `apps/demo-angular` en vraie app de validation multi-pages.

Le livrable de Sprint 10 n'est pas une demo riche. Le livrable est un package `@domos/angular` capable de porter lui-meme les primitives Angular-native attendues pour :

- exposer un etat agent reactive
- envoyer texte et contexte sans contour local
- enregistrer navigation, UI state et resolver via des helpers officiels
- rester strictement mono-domaine `angular`

---

## Diagnostic actuel

L'etat reel du repo au 6 avril 2026 montre un delta net entre Angular et les SDK deja matures :

- `packages/angular/src/public-api.ts` n'exporte que `DomOSAngularService`, `provideDomOS`, `injectDomOS` et trois types minimums.
- `packages/angular/src/lib/DomOSAngularService.ts` expose seulement `connect()`, `disconnect()` et `registerTool(...)` autour de `DomOSClient`.
- `packages/react/src/index.ts` et `packages/vue/src/index.ts` exposent deja navigation, resolver, contexte, evenements et bridge DevTools.
- `packages/core/src/client/DomOSClient.ts` expose deja les contrats dont Angular a besoin pour ce sprint : `state`, `sessionId`, `isConnected`, `registeredTools`, `toolsInfo`, `registeredPlugins`, `sendText()`, `updateContext()`, `onEvent()`, `onAnyEvent()` et `callTool()`.

Conclusion de diagnostic : le manque principal n'est plus un bootstrap de domaine. Le manque principal est une surface SDK Angular trop courte pour supporter une vraie integration d'application.

---

## AVANT

- `@domos/angular` reste une facade de gate minimal.
- les patterns tools / contexte / navigation / resolver n'existent pas dans le domaine Angular.
- toute app Angular devrait reconstituer sa propre convention locale pour ces patterns.

## APRES

- `@domos/angular` expose une surface Angular-native reactive exploitable.
- le package porte officiellement les helpers de contexte, navigation, UI state et resolver.
- l'implementation reste bornee a `packages/angular/`.

## POURQUOI

- tant que le package n'absorbe pas ces patterns, la parite Angular reste cosmetique
- la demo de validation ne doit pas inventer son propre mini-SDK
- le domaine Angular doit d'abord devenir un vrai SDK avant de rejouer la validation applicative en Sprint 11

---

## Perimetre strict

### Ce que Sprint 10 fait

- etend `DomOSAngularService` avec la surface reactive minimale attendue
- ajoute les helpers Angular officiels pour contexte, navigation, UI state et resolver
- aligne `public-api.ts` et les types publics sur cette surface
- ajoute la couverture de test package necessaire au nouveau contrat

### Ce que Sprint 10 ne fait pas

- ne touche pas `apps/demo-angular/**`
- ne touche pas `packages/ui/**`
- ne touche pas `packages/core/**`
- ne livre pas encore le bridge DevTools Angular
- ne livre pas une app produit et n'ouvre pas la feature 27

---

## Regles de design

- Angular doit rester Angular-native : `provide*`, `inject*`, `Signal`, `DestroyRef`, `effect`, `@angular/router`.
- La parite visee est une parite de resultat, pas une copie litterale des hooks React ou composables Vue.
- Le package Angular peut reuser `zodToToolParameters` et les types publics de `@domos/core`, mais ne doit pas reimplementer ces briques.
- Aucun helper ne doit etre d'abord code dans `apps/demo-angular/` avec l'idee de le remonter plus tard dans le package.
- Si un helper requiert une evolution de `DomOSClient` ou du contrat `@domos/core`, le sprint s'arrete avant tout changement cross-domaines.

---

## Codes stables de validation

| Code | Declencheur | Decision attendue |
| --- | --- | --- |
| `ANGULAR-S10-001` | `@domos/angular` reste limite au bootstrap `provideDomOS / injectDomOS / registerTool` | Refus du sprint tant que la surface SDK n'est pas etendue |
| `ANGULAR-S10-002` | les helpers `contexte`, `navigation`, `ui_state` ou `resolver` sont codes dans la demo au lieu du package | Refus du sprint tant que le pattern officiel n'est pas dans `packages/angular/` |
| `ANGULAR-S10-003` | le sprint modifie `packages/ui/**` ou `apps/demo-angular/**` | Refus du sprint tant que le perimetre n'est pas re-borne |
| `ANGULAR-S10-004` | un helper Angular exige une nouvelle methode ou un nouveau contrat dans `packages/core/**` | **STOP**. Ouvrir un document `core` distinct et sortir cette evolution du sprint Angular |
| `ANGULAR-S10-005` | `pnpm --filter @domos/angular build` ou `pnpm --filter @domos/angular test` echoue | Refus du sprint tant que la nouvelle surface publique n'est pas verte |

---

## Phase 1 - Surface agent reactive Angular-native

**startIndex recommande :** 1

**AVANT**

- `DomOSAngularService` ne renvoie ni signaux de lecture, ni facade d'etat, ni methodes de texte et contexte.

**APRES**

- `DomOSAngularService` expose la lecture reactive minimale necessaire a une vraie app Angular DomOS.

**POURQUOI**

- React et Vue n'imposent pas a l'app de reconstruire l'etat agent de base.

### Service interface methods et signals vises

- `readonly state: Signal<ClientState>`
- `readonly sessionId: Signal<string | null>`
- `readonly isConnected: Signal<boolean>`
- `connect(): Promise<void>`
- `disconnect(): Promise<void>`
- `sendText(text: string): void`
- `updateContext(data: Record<string, unknown>): void`

### Boilerplate libs a reutiliser

- `@angular/core`
- `@domos/core`

## Phase 2 - Helpers contexte et evenements

**startIndex recommande :** 2

**AVANT**

- aucun helper Angular officiel ne pousse du contexte passif ou ne s'abonne aux evenements canoniques DomOS.

**APRES**

- le package Angular porte ces patterns via sa facade officielle et des helpers dedies.

**POURQUOI**

- sans couche officielle, chaque app Angular recode sa propre lecture des evenements et du contexte.

### Service interface methods et helpers vises

- `subscribeEvent<TType>(type: TType, listener: DomOSClientEventListener<TType>): VoidFunction`
- `subscribeAnyEvent(listener: DomOSClientAnyEventListener): VoidFunction`
- `registerContext(dataOrGetter: Record<string, unknown> | (() => Record<string, unknown>)): VoidFunction`

### Boilerplate libs a reutiliser

- `@angular/core`
- `@domos/core`

## Phase 3 - Helpers navigation, UI state et resolver

**startIndex recommande :** 3

**AVANT**

- Angular n'a aucun equivalent package aux patterns `useNavigationTool`, `useViewStateTool` et `useAgentToolResolver` deja livres en React/Vue.

**APRES**

- `@domos/angular` expose ses propres primitives Angular pour enregistrer ces patterns standards.

**POURQUOI**

- sans cela, `apps/demo-angular` ne ferait que masquer l'absence du SDK.

### Service interface methods et helpers vises

- `registerTool(definition: DomOSToolDefinition, handler: DomOSToolHandler): VoidFunction`
- `registerNavigationTool(handler: DomOSNavigationHandler, options?: DomOSNavigationOptions): VoidFunction`
- `registerViewStateTool(handler: DomOSViewStateHandler): VoidFunction`
- `registerToolResolver(config: DomOSResolverConfig, options?: DomOSResolverOptions): DomOSResolverHandle`

### Boilerplate libs a reutiliser

- `@angular/router`
- `zod`
- `@domos/core`

## Phase 4 - Gate package et clause STOP

**startIndex recommande :** 4

**AVANT**

- la feature 26 validee n'a pas encore de package Angular capable de porter ses propres patterns SDK.

**APRES**

- le sprint se ferme avec un package Angular etendu, teste et encore strictement mono-domaine.

**POURQUOI**

- si le package n'est pas ferme maintenant, Sprint 11 absorbbera de la dette structurelle au lieu de valider l'app.

### Clause STOP explicite

- Si la mise en oeuvre d'un helper exige une evolution de `packages/core/src/client/DomOSClient.ts` ou d'un autre contrat `@domos/core`, le sprint s'arrete immediatement.
- Le seul livrable autorise dans ce cas est l'ouverture d'un document `core` distinct ; aucun changement `core` ne doit etre absorbe dans ce sprint.

### Boilerplate libs a reutiliser

- scripts `pnpm --filter`
- `vitest`

---

## Fichiers cibles

| Fichier | AVANT | APRES | POURQUOI |
| --- | --- | --- | --- |
| `packages/angular/package.json` | package de bootstrap minimal | dependances et scripts alignes sur la nouvelle surface Angular et le resolver | porter la parite SDK au niveau package |
| `packages/angular/src/public-api.ts` | exports minimalistes de gate | exports publics des nouvelles primitives Angular | rendre la surface package lisible |
| `packages/angular/src/public-api.test.ts` | tests de gate minimale | tests sur la nouvelle surface reactive et les helpers exposes | verrouiller le contrat public |
| `packages/angular/src/lib/types.ts` | types de bootstrap uniquement | types publics pour contexte, navigation, UI state et resolver | eviter une API implicite |
| `packages/angular/src/lib/DomOSAngularService.ts` | facade `connect / disconnect / registerTool` | facade reactive exposant etat, texte, contexte et abonnements evenements | sortir du simple smoke layer |
| `packages/angular/src/lib/registerAgentContext.ts` | absent | helper Angular pour propager le contexte passif | aligner Angular sur React/Vue |
| `packages/angular/src/lib/registerNavigationTool.ts` | absent | helper Angular pour le tool standard `navigate` | porter le pattern navigation dans le package |
| `packages/angular/src/lib/registerViewStateTool.ts` | absent | helper Angular pour le tool standard `ui_state` | porter le pattern etat local dans le package |
| `packages/angular/src/lib/registerToolResolver.ts` | absent | resolver centralise Angular officiel | eviter la reimplementation dans l'app |

---

## Gate fin de sprint

Sprint 10 est termine uniquement si :

1. `@domos/angular` expose une surface reactive Angular-native pour etat, session, connexion, texte, contexte et evenements.
2. `@domos/angular` expose les helpers officiels `registerContext`, `registerNavigationTool`, `registerViewStateTool` et `registerToolResolver`.
3. aucun fichier hors `packages/angular/**` n'est touche.
4. aucune evolution `core` ou `ui` n'est absorbee implicitement.
5. les commandes suivantes existent et passent :

```bash
pnpm --filter @domos/angular build
pnpm --filter @domos/angular test
```

---

## Ce qu'on ne fait pas

- pas de bridge DevTools dans ce sprint
- pas de refactor de `apps/demo-angular`
- pas de scenario produit
- pas de chantier `ui`
- pas de chantier `core`
- pas de preparation implicite de la feature 27