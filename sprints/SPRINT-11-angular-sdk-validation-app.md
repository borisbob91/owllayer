---
mode: agent
description: >
  Sprint 11 - Valider la feature 26 dans le domaine Angular en ajoutant le
  bridge DevTools si le contrat ui existant suffit et en refondant
  apps/demo-angular comme app de validation SDK, sans ouvrir la demo produit
  marketplace.
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

# Sprint 11 - Angular SDK Validation App

**Base :** Sprint 10 livre, package `@domos/angular` etendu, domaine Angular toujours strictement mono-domaine  
**Perimetre :** `domos/packages/angular/` + `domos/apps/demo-angular/`  
**Reference CDC :** `domos/features/feature_26_angular_sdk_pattern_parity.md`

Sprint 11 est le dernier sprint SDK obligatoire avant la feature 27. Il ferme la feature 26 et ne doit pas etre prolonge en sprint produit.

Le bridge DevTools Angular doit reutiliser `@domos/ui/devtools` existant tel quel. Aucun runtime DevTools local ou parallele ne doit etre recree dans le domaine Angular.

---

## Phases

- **Phase 1 - Bridge DevTools Angular avec clause STOP** : monter `@domos/ui/devtools` sans toucher `packages/ui/**`
- **Phase 2 - Refactor de `apps/demo-angular` en app de validation SDK** : sortir de la page unique `demo_echo` et faire vivre la surface template Angular
- **Phase 3 - Validation des patterns Angular reels** : navigation, contexte, resolver, tools co-localises, evenements et consommation exclusive de `@domos/angular`
- **Phase 4 - Gate finale feature 26** : fermer la parite Angular sans ouvrir la feature 27

---

## Objectif

Livrer le consommateur Angular reel de la feature 26 : une app de validation SDK qui prouve la surface Angular livree en Sprint 10 et qui reste encore hors produit marketplace.

Le livrable de Sprint 11 n'est pas une demo Leboncoin. Le livrable est une application Angular de validation qui prouve, dans le repo reel, que le package sait porter :

- navigation Angular
- contexte de page
- resolver officiel
- surface composant ou directive Angular-native pour co-localiser un tool a un element ou a un template
- abonnement evenementiel canonique
- bridge DevTools si le perimetre Angular suffit deja

## Sequence d'execution

1. finir le package Sprint 10 si un reste mineur bloque encore la validation SDK
2. implementer le bridge DevTools Angular en reutilisant `@domos/ui/devtools`
3. refondre `apps/demo-angular` en app de validation SDK
4. gate feature 26 et la fermer explicitement
5. seulement ensuite ouvrir Sprint 12

---

## Diagnostic actuel

L'etat reel du repo avant Sprint 11 montre que `apps/demo-angular` reste encore une page de gate :

- `apps/demo-angular/src/app/app.component.ts` affiche encore un ecran unique centre sur `connect()`, `disconnect()` et `demo_echo`.
- `apps/demo-angular/src/app/register-demo-tools.ts` ne prouve qu'un seul tool de smoke test.
- `packages/react/src/index.ts` et `packages/vue/src/index.ts` exposent deja `DomOSTool` et `DomOSToolBtn`, alors qu'Angular ne prouve encore aucune surface publique equivalente de co-localisation template.
- `packages/ui/src/devtools/index.ts` expose deja `mountDevTools(el, config)` et `unmountDevTools(el)`.
- `packages/core/src/client/DomOSClient.ts` expose deja `toolsInfo`, `registeredPlugins`, `callTool()`, `state`, `sessionId`, `onEvent()` et `onAnyEvent()` ; un bridge Angular est donc tentable sans chantier `ui` ni `core` supplementaire.

Conclusion de diagnostic : il ne faut pas un sprint produit. Il faut un sprint de validation SDK qui consume reellement le package Angular, y compris sa surface de tools co-localises, et qui s'arrete net si le bridge DevTools depasse le perimetre Angular.

---

## AVANT

- la demo Angular reste une preuve de gate, pas une app de validation SDK
- `demo_echo` masque encore l'absence de navigation, contexte, resolver, tools co-localises et evenements dans l'app
- aucun bridge DevTools Angular n'est disponible

## APRES

- `apps/demo-angular` devient une app Angular de validation des patterns SDK
- la validation couvre aussi une primitive Angular-native de co-localisation template, equivalente en resultat a `DomOSTool` / `DomOSToolBtn`
- le bridge DevTools Angular est livre si les contrats `core/ui` existants suffisent deja
- la demo consomme uniquement l'API publique de `@domos/angular`

## POURQUOI

- la parite package seule resterait theorique
- la validation reelle doit se faire dans une app Angular, pas dans un commentaire de feature
- ouvrir la demo produit maintenant brouillerait la frontiere avec la feature 27

---

## Perimetre strict

### Ce que Sprint 11 fait

- ajoute le bridge DevTools Angular si `@domos/ui/devtools` suffit deja
- refond `apps/demo-angular` en app de validation SDK multi-routes
- remplace `demo_echo` par une validation reelle des patterns navigation, contexte, resolver, tools co-localises et evenements
- fait entrer dans le sprint la surface publique Angular permettant de co-localiser un tool a un element ou a un template, sous forme de directive standalone, composant standalone, ou combinaison equivalente
- ferme la feature 26 sans ouvrir de scenario marketplace

### Ce que Sprint 11 ne fait pas

- ne modifie pas `packages/ui/**`
- ne modifie pas `packages/core/**`
- ne transforme pas `apps/demo-angular` en marketplace petites annonces
- ne cree pas de store produit, de fiche annonce, de depot d'annonce ou de favoris produit
- n'absorbe pas la feature 27 sous couvert d'ameliorer la demo Angular

---

## Regles de design

- `apps/demo-angular` doit consommer uniquement l'API publique de `@domos/angular`.
- Le bridge DevTools Angular doit reuser `mountDevTools()` et `unmountDevTools()` existants via chargement dynamique ; aucune modification `ui` n'est autorisee.
- La demo doit rester une app de validation SDK, pas une UI produit. Les routes et pages servent a prouver les patterns package, pas a simuler un marketplace.
- La surface Angular de tools co-localises peut prendre la forme d'une directive standalone, d'un composant standalone, ou des deux ; le sprint valide la parite de resultat, pas une copie mecanique de `DomOSTool` / `DomOSToolBtn`.
- Si un manque reel apparait dans `DevToolsConfig` ou dans `DomOSClient`, le sprint s'arrete et sort cette evolution vers le bon domaine.
- La demo doit montrer la valeur du package, pas la contourner par des helpers locaux.

---

## Codes stables de validation

| Code | Declencheur | Decision attendue |
| --- | --- | --- |
| `ANGULAR-S11-001` | `apps/demo-angular` reste une page unique centree sur `demo_echo` | Refus du sprint tant que la demo ne valide pas les patterns SDK reels |
| `ANGULAR-S11-002` | la demo reimplemente navigation, contexte, resolver ou evenements dans `apps/demo-angular` au lieu de consommer `@domos/angular` | Refus du sprint tant que le package n'est pas la surface officielle |
| `ANGULAR-S11-003` | le bridge DevTools exige une modification `packages/ui/**` ou un nouveau contrat `packages/core/**` | **STOP**. Ouvrir un document `ui` ou `core` distinct et sortir ce besoin du sprint Angular |
| `ANGULAR-S11-004` | le sprint introduit pages produit marketplace, annonces, depot, favoris ou tout autre perimetre de la feature 27 | Refus pour absorption hors scope |
| `ANGULAR-S11-005` | la demo importe des fichiers internes de `packages/angular/src/**` ou branche directement `@domos/core` pour l'integration principale | Refus tant que la validation ne passe pas par l'API publique |
| `ANGULAR-S11-006` | `pnpm --filter @domos/angular build`, `pnpm --filter @domos/demo-angular build` ou les tests associes echouent | Refus du sprint tant que la validation SDK n'est pas verte |
| `ANGULAR-S11-007` | la demo ne valide aucune surface publique Angular de tool co-localise sur element ou template | Refus tant que la feature 26 n'est pas prouvee aussi sur la parite composant ou directive |

---

## Phase 1 - Bridge DevTools Angular avec clause STOP

**startIndex recommande :** 1

**AVANT**

- Angular ne propose aucun bridge DevTools equivalent a `useDevTools` React ou Vue.

**APRES**

- `@domos/angular` expose un bridge de dev optionnel vers `@domos/ui/devtools`, borne au domaine Angular.

**POURQUOI**

- le debug cross-framework existe deja ; le refaire seulement dans la demo serait une dette immediate.

### Service interface methods et bridge vises

- `mountDevTools(options?: DomOSAngularDevToolsOptions): VoidFunction`
- `getRegisteredTools(): Array<ToolDeclaration & { source?: string; global?: boolean }>`
- `callTool(name: string, args: Record<string, unknown>): Promise<unknown>`
- `getAgentState(): string`
- `getSessionId(): string | null`
- `subscribeEvent<TType>(type: TType, listener: DomOSClientEventListener<TType>): VoidFunction`
- `subscribeAnyEvent(listener: DomOSClientAnyEventListener): VoidFunction`

### Clause STOP explicite

- Si le bridge ne peut pas etre ecrit avec `packages/ui/src/devtools/index.ts` et les getters existants de `DomOSClient`, le sprint s'arrete avant toute modification `packages/ui/**` ou `packages/core/**`.
- Le seul livrable autorise dans ce cas est l'ouverture d'un document de manque structurel dans le domaine concerne.

### Boilerplate libs a reutiliser

- `@angular/core`
- `@domos/ui/devtools`
- `@domos/core`

## Phase 2 - Refactor de `apps/demo-angular` en app de validation SDK

**startIndex recommande :** 2

**AVANT**

- `apps/demo-angular` reste une page de gate avec un seul tool `demo_echo`.

**APRES**

- la demo devient une petite app Angular technique a plusieurs routes, dediee a la validation des primitives du package, y compris la surface template pour tools co-localises.

**POURQUOI**

- il faut prouver la surface package dans une vraie app, sans encore entrer dans un scenario produit.

### Service interface methods visees cote demo

- consommation exclusive des primitives Sprint 10 et du bridge DevTools si livre

### Boilerplate libs a reutiliser

- Angular standalone bootstrap
- `@angular/router`
- `@domos/angular`

## Phase 3 - Validation des patterns Angular reels

**startIndex recommande :** 3

**AVANT**

- la demo ne prouve ni navigation, ni contexte, ni resolver, ni surface template co-localisee, ni evenements.

**APRES**

- la demo valide au minimum :
  - navigation Angular
  - contexte de page
  - resolver global
  - tool co-localise a un element ou a un template via une primitive Angular-native publique
  - abonnement evenementiel
  - bridge DevTools en environnement de dev si livre

**POURQUOI**

- sans ces points, la feature 26 resterait seulement package-centric et donc inachevee.

### Service interface methods et surface publique visees cote demo

- `registerNavigationTool(...)`
- `registerContext(...)`
- `registerToolResolver(...)`
- `subscribeEvent(...)`
- `subscribeAnyEvent(...)`
- surface publique de co-localisation template, portee par une directive standalone, un composant standalone, ou une combinaison equivalente

### Boilerplate libs a reutiliser

- `@angular/router`
- `@domos/angular`

## Phase 4 - Gate finale feature 26

**startIndex recommande :** 4

**AVANT**

- la feature 26 validee n'a pas encore de preuve applicative Angular complete.

**APRES**

- la parite Angular est fermee au niveau SDK sans ouvrir la suite produit.

**POURQUOI**

- il faut un verdict binaire avant toute suite type feature 27.

### Boilerplate libs a reutiliser

- scripts `pnpm --filter`
- `vitest`
- `vite`

---

## Organisation cible des fichiers

Le package Angular ne doit plus rester plat dans `src/lib/`. La cible du sprint est une structure par responsabilite, alignee sur Angular et lisible comme les autres SDK du repo.

### Package `@domos/angular`

```text
packages/angular/src/
  public-api.ts
  lib/
    services/
      DomOSAngularService.ts
    providers/
      provideDomOS.ts
    context/
      registerAgentContext.ts
    navigation/
      registerNavigationTool.ts
      registerViewStateTool.ts
    resolver/
      registerToolResolver.ts
      resolverHelpers.ts
    devtools/
      mountDevTools.ts
    directives/
      DomOSToolDirective.ts
    components/
      tool/
        DomOSToolButtonComponent.ts
    types/
      types.ts
```

- `services/` pour la facade runtime Angular.
- `providers/` pour l'entree DI et le bootstrap Angular.
- `context/`, `navigation/` et `resolver/` pour separer les primitives SDK par responsabilite.
- `devtools/` pour isoler le bridge vers `@domos/ui/devtools`.
- `directives/` et `components/` pour la surface template Angular-native.
- `types/` pour garder l'API de typage isolee.
- `public-api.ts` reste l'unique facade publique du package.

### Demo de validation `apps/demo-angular`

```text
apps/demo-angular/src/app/
  app.component.ts
  app.config.ts
  app.routes.ts
  core/
    register-demo-tools.ts
  pages/
    HomePageComponent.ts
    ContextPageComponent.ts
    EventsPageComponent.ts
    ToolsPageComponent.ts
  components/
    AppShellComponent.ts
    DemoStatusCardComponent.ts
    ToolActionCardComponent.ts
```

- `core/` pour le wiring DomOS transverse a l'application.
- `pages/` pour prouver navigation, contexte, evenements et tools.
- `components/` pour les briques UI reutilisables de la demo.
- la racine `app/` reste lisible, sans noyer la demo dans trop de sous-dossiers.

---

## Fichiers cibles

| Fichier | AVANT | APRES | POURQUOI |
| --- | --- | --- | --- |
| `packages/angular/package.json` | build package centre sur le bootstrap | configuration package alignee sur le bridge DevTools Angular si livre | declarer proprement les externals et dependances du bridge |
| `packages/angular/src/public-api.ts` | surface publique reactive et helpers Sprint 10 seulement | export public du bridge DevTools Angular si le perimetre suffit | rendre la facade complete pour la validation SDK |
| `packages/angular/src/public-api.test.ts` | tests limites a la surface package Sprint 10 | tests couvrant l'export public du bridge et sa presence conditionnee | verrouiller le contrat package final |
| `packages/angular/src/lib/services/DomOSAngularService.ts` | facade reactive et helpers Sprint 10 dans un `lib/` plat | facade runtime rangee dans `services/`, avec l'acces DevTools aux tools, plugins, session et etat | aligner le coeur runtime Angular sur une structure lisible |
| `packages/angular/src/lib/providers/provideDomOS.ts` | provider plat dans `lib/` | entree DI isolee dans `providers/` | garder le bootstrap Angular separe des primitives runtime |
| `packages/angular/src/lib/context/registerAgentContext.ts` | helper plat dans `lib/` | primitive contexte rangee dans `context/` | expliciter la responsabilite sans melanger navigation et resolver |
| `packages/angular/src/lib/navigation/registerNavigationTool.ts` | helper plat dans `lib/` | primitive navigation rangee dans `navigation/` | cadrer le tool standard de navigation dans un dossier dedie |
| `packages/angular/src/lib/navigation/registerViewStateTool.ts` | helper plat dans `lib/` | primitive d'etat UI rangee dans `navigation/` | garder les primitives de navigation et etat de vue ensemble |
| `packages/angular/src/lib/resolver/registerToolResolver.ts` | helper plat dans `lib/` | resolver officiel range dans `resolver/` | clarifier la zone SDK dediee a la resolution |
| `packages/angular/src/lib/resolver/resolverHelpers.ts` | absent | helpers internes du resolver co-localises dans `resolver/` | eviter de disperser la logique de resolution dans tout `lib/` |
| `packages/angular/src/lib/devtools/mountDevTools.ts` | absent | bridge Angular vers `@domos/ui/devtools` | reuser le runtime DevTools existant |
| `packages/angular/src/lib/directives/DomOSToolDirective.ts` | absent ou non valide en app | directive standalone de co-localisation template dans `directives/` | porter une surface template Angular-native explicite |
| `packages/angular/src/lib/components/tool/DomOSToolButtonComponent.ts` | absent ou non valide en app | composant bouton standalone dans `components/tool/` | couvrir pragmatiquement le cas bouton sans melanger les composants |
| `packages/angular/src/lib/types/types.ts` | types reactifs et helpers de base dans un fichier plat | types du bridge DevTools Angular et options eventuelles dans `types/` | isoler clairement l'API de typage |
| `apps/demo-angular/src/app/app.config.ts` | config minimale de gate | bootstrap aligne sur routes, helpers package et DevTools de dev si livre | faire vivre la nouvelle surface publique |
| `apps/demo-angular/src/app/app.component.ts` | shell unique de gate | shell multi-routes de validation SDK incluant la surface template co-localisee | sortir du smoke test |
| `apps/demo-angular/src/app/app.routes.ts` | absent | routes minimales de validation SDK | prouver le tool navigation |
| `apps/demo-angular/src/app/core/register-demo-tools.ts` | seul `demo_echo` a la racine `app/` | resolver global et tools de validation ranges dans `core/` | garder le wiring DomOS a part des pages et composants |
| `apps/demo-angular/src/app/pages/HomePageComponent.ts` | absent | page d'entree de validation SDK | porter une route lisible pour la demo |
| `apps/demo-angular/src/app/pages/ContextPageComponent.ts` | absent | page dediee a la preuve du contexte Angular | valider le pattern contexte sans le noyer dans un composant fourre-tout |
| `apps/demo-angular/src/app/pages/EventsPageComponent.ts` | absent | page dediee aux evenements client | objectiver le pattern evenementiel |
| `apps/demo-angular/src/app/pages/ToolsPageComponent.ts` | absent | page dediee aux tools co-localises et au resolver | prouver la surface template et les tools publics |
| `apps/demo-angular/src/app/components/AppShellComponent.ts` | absent | shell reutilisable pour la navigation de demo | separer la structure UI de la logique de pages |
| `apps/demo-angular/src/app/components/DemoStatusCardComponent.ts` | absent | carte reutilisable d'etat SDK | afficher proprement l'etat de connexion et de session |
| `apps/demo-angular/src/app/components/ToolActionCardComponent.ts` | absent | carte reutilisable pour les actions tools | factoriser l'UI de validation sans disperser le wiring |
| `apps/demo-angular/src/app/**/*.test.ts` | tests centres sur le gate minimal | tests de validation SDK Angular | objectiver la fermeture de la feature 26 |

---

## Gate fin de sprint

Sprint 11 est termine uniquement si :

1. `apps/demo-angular` consomme exclusivement l'API publique de `@domos/angular`.
2. la demo valide navigation, contexte, resolver, co-localisation template et evenements dans une app Angular multi-routes.
3. le bridge DevTools Angular est livre sans modifier `packages/ui/**` si les contrats existants suffisent deja.
4. si le bridge ne suffit pas dans le perimetre Angular, le sprint s'est arrete avant tout changement `ui` ou `core` et un document distinct a ete ouvert.
5. aucun element de la feature 27 n'entre dans l'implementation.
6. au moins une primitive publique Angular-native permet de co-localiser un tool a un element ou a un template avec un resultat equivalent a `DomOSTool` / `DomOSToolBtn`.
7. les commandes suivantes existent et passent :

```bash
pnpm --filter @domos/angular build
pnpm --filter @domos/angular test
pnpm --filter @domos/demo-angular build
pnpm --filter @domos/demo-angular test
```

---

## Ce qu'on ne fait pas

- pas de marketplace type Leboncoin
- pas de modele d'annonces
- pas de depot d'annonce
- pas de favoris produit
- pas de backend ni d'auth
- pas de modification `packages/ui/**`
- pas de modification `packages/core/**`
