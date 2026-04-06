# Feature #26 : Parite de patterns Angular SDK avec React et Vue

**Statut** : 🟡 Validée  
**Domaine** : angular  
**Porteur** : @BorisBob  
**Valide par** : @BorisBob  
**Date** : 2026-04-06

---

## Positionnement MVP

Cette feature ouvre la phase reelle post-bootstrap du domaine Angular.

Elle vient apres :

- feature_25 : cadrage du domaine Angular
- Sprint 8 : bootstrap reel du package et de la demo Angular
- Sprint 9 : gate finale minimale du domaine Angular
- issue_14 : suppression du bypass de resolution workspace

Elle ne lance pas encore la demo produit type Leboncoin.

Son role est plus strict : sortir Angular du statut de facade minimale et lui donner les patterns d'integration necessaires pour obtenir le meme resultat de developpement que React et Vue, sans copier leurs APIs au mot pres et sans ouvrir un faux chantier `ui` ou `core`.

## Decision de livraison retenue

La validation utilisateur fige un decoupage minimal en 2 sprints Angular :

- Sprint 10 : surface reactive Angular-native et helpers officiels tools / contexte / navigation / resolver dans `packages/angular/`
- Sprint 11 : bridge DevTools Angular si `@domos/ui/devtools` suffit deja, puis refactor de `apps/demo-angular` comme app de validation SDK

Pourquoi 2 sprints suffisent :

- le delta structurel reel est concentre en deux blocs, d'abord le package SDK, ensuite son consommateur de validation
- le bridge DevTools peut rester dans le domaine Angular tant qu'il reuse les contrats deja exposes par `@domos/ui` et `@domos/core`
- un troisieme sprint ouvrirait soit un faux sprint `ui` ou `core`, soit un faux sprint produit qui absorberait la feature 27

---

## Diagnostic actuel

L'etat reel du repo montre un delta net entre Angular et les domaines React/Vue.

### 1. Surface publique package

**AVANT**

- `packages/angular/src/public-api.ts` exporte seulement `DomOSAngularService`, `provideDomOS`, `injectDomOS` et trois types.
- `packages/react/src/index.ts` expose provider, hooks, resolver, events, voice, approval, widget, bridge DevTools et les tool components co-localises `DomOSTool` / `DomOSToolBtn`.
- `packages/vue/src/index.ts` expose plugin, composables, resolver, events, approval, widget, bridge DevTools et les tool components co-localises `DomOSTool` / `DomOSToolBtn`.
- `packages/angular/src/**` n'expose encore aucune surface publique composant ou directive equivalente pour co-localiser un tool a un element ou a un template.

**APRES vise**

- `@domos/angular` doit exposer une surface Angular-native suffisante pour construire une vraie application DomOS sans rebrancher manuellement tools, contexte, navigation et events dans chaque composant.

**POURQUOI**

- Tant que la surface Angular reste limitee a `connect()` et `registerTool()`, toute app Angular reimplemente le glue code que React et Vue portent deja comme pattern SDK.

### 2. Patterns de developpement

**AVANT**

- React dispose de `useAgentTool`, `useAgentToolResolver`, `useNavigationTool`, `useViewStateTool`, `useAgentContext`, `useDomOSEvent`, `useApproval`, `useVoiceMode`, `useDevTools`.
- Vue dispose des equivalents `useAgentTool`, `useAgentToolResolver`, `useNavigationTool`, `useViewStateTool`, `useAgentContext`, `useDomOSEvent`, `useApproval`, `useVoiceMode`, `useDevTools`.
- React et Vue exposent aussi une surface template co-localisee via `DomOSTool` et `DomOSToolBtn` pour attacher un tool directement a un noeud UI.
- Angular n'a aujourd'hui aucun helper equivalent dans `packages/angular/src/**`.

**APRES vise**

- Angular doit fournir des primitives adaptees a Angular pour :
  - enregistrer des tools declaratifs
  - co-localiser un tool a un element ou a un template via une primitive composant ou directive Angular-native equivalente en resultat a `DomOSTool` / `DomOSToolBtn`
  - injecter du contexte passif
  - declarer un tool de navigation standard
  - declarer un tool d'etat UI local
  - grouper des tools via un resolver
  - s'abonner aux evenements client DomOS
  - monter les DevTools existants si le besoin est conditionne au dev

**POURQUOI**

- La parite attendue est une parite de resultat et de workflow, pas une parite cosmetique de noms de symboles.

### 3. Demo Angular

**AVANT**

- `apps/demo-angular/src/app/app.component.ts` est une page de gate unique avec `connect()`, `disconnect()` et un seul tool `demo_echo`.
- `apps/demo/src/App.tsx` prouve une app React multi-routes avec contexte, navigation, resolver et UI agentique.
- `apps/demo-vue/src/App.vue` prouve une app Vue multi-routes avec catalogue admin, resolver global, approval banner et panel agent.

**APRES vise**

- `apps/demo-angular` doit cesser d'etre une page de gate et devenir une app de validation de patterns Angular, sans encore entrer dans le scenario Leboncoin.

**POURQUOI**

- Une parite package sans consommateur Angular reel resterait theorique.

---

## Besoin

En tant qu'integrateur DomOS sur Angular, je veux disposer d'un SDK Angular avec des patterns equivalents en resultat a React et Vue, afin de construire une vraie application Angular DomOS sans recoder manuellement l'integration agentique dans chaque composant.

### User story

> En tant que developpeur Angular DomOS, je veux enregistrer des tools, propager du contexte, naviguer, ecouter les evenements et brancher les DevTools via des primitives Angular dediees, afin d'obtenir la meme capacite d'integration que les SDK React et Vue.

---

## Perimetre strict

### Ce que cette feature fait

- Etend `@domos/angular` du simple bootstrap vers une couche d'integration Angular exploitable.
- Aligne Angular sur les patterns React/Vue qui relevent clairement du domaine SDK Angular.
- Ajoute la parite minimale de co-localisation template Angular via une primitive composant ou directive equivalente en resultat a `DomOSTool` / `DomOSToolBtn`, sans copie mecanique des APIs React/Vue.
- Refond `apps/demo-angular` pour valider ces patterns dans une app Angular reelle, mais encore technique.
- Reutilise `@domos/ui/devtools` tel qu'il existe deja si un bridge Angular suffit sans modification `ui`.

### Ce que cette feature ne fait PAS

- Ne transforme pas encore `apps/demo-angular` en application Leboncoin.
- Ne touche pas `packages/ui/**` tant que `mountDevTools` et `unmountDevTools` suffisent deja.
- Ne touche pas `packages/core/**` tant que les contrats evenements, contexte et tools existants suffisent deja.
- Ne promet pas une parite totale de widget, approval modal ou voice UI si cela impose un chantier `ui` ou `core` distinct.
- Ne modifie ni `apps/demo/` ni `apps/demo-vue/`.

> Toute derive produit ou cross-domaines ouvre un nouveau document separe.

---

## Regles de design

- Angular doit adopter des primitives Angular-native : `provide*`, `inject*`, services, signals, `DestroyRef`, `effect`, `@angular/router`.
- La parite visee est une parite de resultat, pas une copie des noms React `use*` ou Vue `use*`.
- La surface de co-localisation template peut prendre la forme d'une directive standalone, d'un composant standalone, ou des deux ; le gate juge le resultat obtenu, pas une copie mecanique de `DomOSTool` / `DomOSToolBtn`.
- `apps/demo-angular` doit consommer uniquement l'API publique de `@domos/angular`.
- Si un besoin impose une evolution du protocole evenements, de `DomOSClient` ou de `@domos/ui`, la feature s'arrete et un document `core` ou `ui` distinct doit etre ouvert.
- Aucun code de demo ne doit reconstituer localement un resolver ou un bridge DevTools qui devrait vivre dans `packages/angular/`.

---

## Codes stables

| Code | Declencheur | Decision attendue |
| --- | --- | --- |
| `ANGULAR-PARITY-001` | `@domos/angular` reste limite a `provideDomOS`, `injectDomOS` et `registerTool` | Refus de la feature tant que les patterns SDK minimaux ne sont pas exposes |
| `ANGULAR-PARITY-002` | `apps/demo-angular` continue de brancher ses tools manuellement composant par composant sans helper Angular dedie | Refus tant que le pattern SDK n'est pas reellement porte par le package |
| `ANGULAR-PARITY-003` | Aucun equivalent Angular au tool standard `navigate` ou `ui_state` n'est documente | Refus tant que la demo Angular ne peut pas suivre les patterns React/Vue de navigation et d'etat local |
| `ANGULAR-PARITY-004` | Le bridge DevTools Angular tente de modifier `packages/ui/**` alors que `mountDevTools` et `unmountDevTools` suffisent deja | Refus tant que le perimetre n'est pas rebore au domaine Angular |
| `ANGULAR-PARITY-005` | La feature absorbe la transformation Leboncoin ou une UI produit complete | Refus car fourre-tout |
| `ANGULAR-PARITY-006` | Un manque reel est detecte dans `@domos/core` ou `@domos/ui` | Stop de la feature Angular et ouverture d'un document separe dans le bon domaine |
| `ANGULAR-PARITY-007` | `@domos/angular` ne livre aucune surface publique composant ou directive permettant la co-localisation template d'un tool | Refus tant que la parite minimale de resultat avec `DomOSTool` / `DomOSToolBtn` n'est pas couverte |

---

## Decoupage interne

## Phase 1 - Surface agent reactive Angular-native

**startIndex recommande** : 1

**AVANT**

- `DomOSAngularService` sait connecter, deconnecter et enregistrer un tool.
- L'etat agent, le contexte LLM, l'envoi de texte et les abonnements evenements ne sont pas exposes comme primitives SDK Angular.

**APRES**

- Le service Angular expose la couche agent minimale necessaire a une app reelle.

**POURQUOI**

- React et Vue ne demandent pas a l'app de reconstruire cette couche de base.

### Service interface methods et signals vises

- `readonly state: Signal<ClientState>`
- `readonly sessionId: Signal<string | null>`
- `readonly isConnected: Signal<boolean>`
- `connect(): Promise<void>`
- `disconnect(): Promise<void>`
- `sendText(text: string): void`
- `updateContext(data: Record<string, unknown>): void`
- `subscribeEvent<TType>(type: TType, listener: DomOSClientEventListener<TType>): VoidFunction`
- `subscribeAnyEvent(listener: DomOSClientAnyEventListener): VoidFunction`

### Boilerplate libs a reutiliser

- `@angular/core`
- `rxjs` uniquement si necessaire pour interop Angular
- `@domos/core`

## Phase 2 - Helpers Angular pour tools, contexte, navigation et co-localisation template

**startIndex recommande** : 2

**AVANT**

- Angular ne propose aucun equivalent package aux patterns `useAgentTool`, `useAgentToolResolver`, `useNavigationTool`, `useViewStateTool`, `useAgentContext`, ni a la surface co-localisee `DomOSTool` / `DomOSToolBtn`.

**APRES**

- `@domos/angular` expose des helpers Angular dedies pour les cas standards de l'app et une primitive Angular-native permettant de co-localiser un tool a un element ou a un template.

**POURQUOI**

- Sans couche helper officielle, chaque demo Angular ecrira ses propres conventions et cassera la parite de resultat.
- La parite minimale attendue couvre aussi les cas ou un tool doit vivre au plus pres d'un bouton ou d'un fragment de template, sans glue imperative dispersee dans le composant.

### Service interface methods et helpers vises

- `registerTool(definition: DomOSToolDefinition, handler: DomOSToolHandler): VoidFunction`
- `registerNavigationTool(handler: DomOSNavigationHandler, options?: DomOSNavigationOptions): VoidFunction`
- `registerViewStateTool(handler: DomOSViewStateHandler): VoidFunction`
- `registerToolResolver(config: DomOSResolverConfig, options?: DomOSResolverOptions): DomOSResolverHandle`
- `registerContext(dataOrGetter: Record<string, unknown> | (() => Record<string, unknown>)): VoidFunction`
- surface publique de co-localisation template, portee par une directive standalone de type `DomOSToolDirective` et/ou un composant bouton standalone de type `DomOSToolButtonComponent`

### Boilerplate libs a reutiliser

- `@angular/router`
- `zod`
- `@domos/core` via `zodToToolParameters` et types publics existants

## Phase 3 - Bridge DevTools Angular sans chantier ui

**startIndex recommande** : 3

**AVANT**

- React et Vue savent deja monter `@domos/ui/devtools` sans modifier `ui`.
- Angular ne propose aucun bridge DevTools equivalent.

**APRES**

- Angular dispose d'un bridge de dev optionnel pour monter les DevTools existants a partir de la facade Angular.

**POURQUOI**

- Le besoin de debug cross-framework existe deja. Le refaire dans `apps/demo-angular` serait une dette directe.

### Service interface methods visees pour le bridge

- `getRegisteredTools(): ToolDeclaration[]`
- `callTool(name: string, args: Record<string, unknown>): Promise<unknown>`
- `getAgentState(): ClientState`
- `getSessionId(): string | null`
- `subscribeEvent<TType>(type: TType, listener: DomOSClientEventListener<TType>): VoidFunction`
- `subscribeAnyEvent(listener: DomOSClientAnyEventListener): VoidFunction`

### Boilerplate libs a reutiliser

- `@domos/ui/devtools`
- `@angular/core`

## Phase 4 - Refactor de `apps/demo-angular` comme app de validation SDK

**startIndex recommande** : 4

**AVANT**

- `apps/demo-angular` ne valide qu'un gate minimal et un tool `demo_echo`.

**APRES**

- `apps/demo-angular` valide au moins :
  - navigation Angular
  - contexte de page
  - resolver global
  - tool co-localise a un element ou a un template via la surface publique Angular dediee
  - abonnement evenementiel
  - DevTools en environnement de dev si le bridge est livre

**POURQUOI**

- Le package ne doit pas livrer une parite seulement theorique.

### Service interface methods visees cote demo

- Consommation exclusive des primitives de Phases 1 a 3

### Boilerplate libs a reutiliser

- Angular standalone bootstrap
- `@angular/router`
- `@domos/angular`

---

## Fichiers impactes

| Fichier | AVANT | APRES | POURQUOI |
| --- | --- | --- | --- |
| `packages/angular/package.json` | package minimal de bootstrap | dependances et scripts alignes sur la nouvelle surface Angular | porter la parite SDK au package |
| `packages/angular/src/public-api.ts` | facade minimale | exports publics des helpers Angular valides | rendre la surface publique lisible |
| `packages/angular/src/lib/DomOSAngularService.ts` | facade `connect` / `disconnect` / `registerTool` | facade reactive exposant etat, contexte, events et appels utiles au bridge | sortir du simple smoke layer |
| `packages/angular/src/lib/types.ts` | types minimum de bootstrap | types des helpers navigation, resolver, contexte et bridge | eviter une API implicite |
| `packages/angular/src/lib/DomOSToolDirective.ts` | absent | directive standalone pour co-localiser un tool a un element ou un fragment de template | couvrir la parite de resultat avec `DomOSTool` |
| `packages/angular/src/lib/DomOSToolButtonComponent.ts` | absent | composant bouton standalone pour le cas d'usage bouton co-localise | couvrir pragmatiquement l'equivalent de `DomOSToolBtn` |
| `packages/angular/src/lib/registerAgentContext.ts` | absent | helper Angular pour propager le contexte passif | aligner Angular sur React/Vue |
| `packages/angular/src/lib/registerNavigationTool.ts` | absent | helper Angular pour le tool standard `navigate` | aligner le pattern navigation |
| `packages/angular/src/lib/registerViewStateTool.ts` | absent | helper Angular pour le tool standard `ui_state` | aligner le pattern d'etat local |
| `packages/angular/src/lib/registerToolResolver.ts` | absent | resolver centralise Angular officiel | eviter la reimplementation dans la demo |
| `packages/angular/src/lib/mountDevTools.ts` | absent | bridge Angular vers `@domos/ui/devtools` | reutiliser le runtime `ui` sans le modifier |
| `packages/angular/src/public-api.test.ts` | test de gate minimal | tests sur la nouvelle surface publique Angular | verrouiller la parite SDK minimale |
| `apps/demo-angular/src/app/app.config.ts` | provider minimal | bootstrap demo aligne sur la nouvelle surface Angular | valider l'integration reelle |
| `apps/demo-angular/src/app/app.component.ts` | page unique de gate | shell Angular de validation des patterns, incluant la surface template co-localisee | faire vivre la surface publique |
| `apps/demo-angular/src/app/register-demo-tools.ts` | `demo_echo` unique | resolver et helpers de validation des patterns Angular, sans contourner la surface composant ou directive publique | remplacer le smoke test par un usage reel |
| `apps/demo-angular/src/app/app.routes.ts` | absent | routes Angular minimales de validation | prouver le tool navigation |
| `apps/demo-angular/src/app/pages/**` | absent | pages de validation SDK Angular | prouver contexte, routing, events et co-localisation template |

---

## Ce qui ne sera pas modifie

- `packages/ui/**` tant que les APIs `mountDevTools` et `unmountDevTools` existantes suffisent.
- `packages/core/**` tant qu'aucun manque contractuel n'est constate.
- `apps/demo/**`.
- `apps/demo-vue/**`.
- Le scenario Leboncoin / petites annonces.
- Toute promesse de widget Angular complet si cela reouvre `ui`.

---

## Gate de fin

- [ ] `@domos/angular` expose une surface publique Angular-native pour etat, contexte, tools, navigation, resolver et events.
- [ ] `@domos/angular` expose une surface publique composant ou directive permettant de co-localiser un tool a un element ou a un template, avec un resultat equivalent a `DomOSTool` / `DomOSToolBtn`.
- [ ] `apps/demo-angular` consomme seulement l'API publique de `@domos/angular`.
- [ ] Le bridge DevTools Angular reuse `@domos/ui/devtools` sans modifier `packages/ui/**`.
- [ ] Aucun changement `core` ou `ui` n'a ete absorbe implicitement.
- [ ] La demo Angular valide au moins navigation, contexte, resolver, co-localisation template et events.
- [ ] Le perimetre reste un perimetre SDK Angular, pas un produit Leboncoin.

---

## Ce qu'on ne fait pas

- Pas de marketplace type Leboncoin dans cette feature.
- Pas de back-office Angular.
- Pas de backend, pas d'upload media, pas d'authentification, pas de messagerie temps reel.
- Pas de reouverture du chantier bootstrap Sprint 8 / gate Sprint 9.
- Pas de refonte `ui` ou `core` par commodite.

---

## Hypotheses ouvertes

- Hypothese verifiee : `@domos/ui/devtools` expose deja `mountDevTools` et `unmountDevTools`, donc un bridge Angular peut etre tente sans chantier `ui`.
- Hypothese a verifier en implementation : les contrats client existants de `@domos/core` suffisent pour `sendText`, `updateContext` et les subscriptions evenements sans ouvrir un document `core` distinct.
- Hypothese a verifier en implementation : `zod` est la meilleure option pour la parite resolver Angular, car React l'utilise deja et `@domos/core` expose deja `zodToToolParameters`.
