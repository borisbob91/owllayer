---
mode: agent
description: >
  Sprint 13 - Ajouter a @domos/angular une surface widget par defaut avec un
  DomOSWidget autonome et une modal HITL officielle, en restant strictement
  dans packages/angular et sans ouvrir core, ui ni la demo Angular.
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

# Sprint 13 - Angular Default Widget Surface

**Base :** Sprints 10, 11 et 12 livres, `@domos/angular` expose deja la facade service, les helpers Angular, la directive tool, le bouton tool et le plugin outlet, mais aucune surface widget par defaut n'est encore livree  
**Perimetre :** `domos/packages/angular/` uniquement  
**Reference CDC :** `domos/features/feature_28_angular_default_widget_surface.md` - CDC manquant a ecrire plus tard, non cree dans ce sprint

---

## Phases

- **Phase 1 - Surface widget Angular par defaut** : ajouter le composant standalone `DomOSWidgetComponent` dans le package Angular
- **Phase 2 - Surface HITL officielle du widget** : ajouter `DomOSApprovalModalComponent` pour fermer le flux d'approbation sans sortir du package
- **Phase 3 - Alignement de l'API publique Angular** : exposer la nouvelle surface widget via `public-api.ts`
- **Phase 4 - Gate package et contrat public** : verrouiller le contrat via `public-api.test.ts` et fermer le sprint sans ouvrir `core`, `ui` ou `apps/demo-angular`

---

## Objectif

Livrer dans `@domos/angular` la meme porte d'entree widget par defaut que les SDK React, Vue et Svelte portent deja dans le repo reel : un composant widget autonome, directement injectable dans une application Angular, sans obliger l'integrateur a reconstruire le chat UI, le wiring audio/texte ni la boucle HITL a la main.

Le livrable de Sprint 13 n'est pas une nouvelle demo et n'est pas un chantier cross-domaines. Le livrable est un package `@domos/angular` qui expose enfin une surface widget officielle, minimale et autonome, en reutilisant les contrats `WidgetConfig`, `generateWidgetStyles`, `ApprovalRequest` et les primitives client deja presentes dans `@domos/core`.

---

## Diagnostic actuel

L'etat reel du repo au 7 avril 2026 montre un manque net et confirme cote Angular :

- `packages/angular/src/public-api.ts` exporte la facade service, les helpers Angular, `DomOSToolDirective`, `DomOSToolButtonComponent` et le plugin outlet, mais aucun `DomOSWidget` ni composant HITL associe.
- `packages/angular/src/lib/components/` ne contient aujourd'hui que `tool/` ; il n'existe ni dossier `widget/` ni dossier `hitl/`.
- `docs/WIDGET.md` documente explicitement un widget injectable en React, Vue et Svelte, mais pas en Angular.
- `packages/react/src/components/widget/DomOSWidget.tsx`, `packages/vue/src/components/widget/DomOSWidget.vue` et `packages/svelte/src/components/widget/DomOSWidget.svelte` existent deja et prouvent que la surface widget est une expectation de SDK, pas un detail de demo.
- `@domos/core` expose deja `WidgetConfig`, `DEFAULT_WIDGET_CONFIG`, `DEFAULT_THEME`, `DEFAULT_LABELS`, `generateWidgetStyles`, `ApprovalRequest` et les evenements `approval.requested`, ce qui borne bien le manque a `packages/angular/**` tant qu'aucun nouveau contrat n'est requis.

Conclusion de diagnostic : le manque principal cote Angular n'est plus le bootstrap, la navigation ou le resolver. Le manque principal est l'absence d'une surface widget par defaut dans `@domos/angular`, alors que cette surface existe deja dans les autres SDK et dans la documentation widget du repo.

---

## AVANT

- `@domos/angular` ne permet pas de monter un widget DomOS par simple composant autonome.
- un integrateur Angular devrait reconstruire lui-meme le shell widget, l'etat conversationnel et la UI d'approbation HITL.
- la documentation widget du repo ne peut pas raisonnablement citer Angular comme SDK paritaire sur cette surface.

## APRES

- `@domos/angular` expose un composant standalone `DomOSWidgetComponent` comme surface widget par defaut.
- `@domos/angular` expose un composant standalone `DomOSApprovalModalComponent` pour le flux HITL du widget.
- `packages/angular/src/public-api.ts` et `packages/angular/src/public-api.test.ts` ferment explicitement le contrat public de cette nouvelle surface.

## POURQUOI

- sans widget par defaut, la parite Angular reste incomplete sur la surface la plus visible du produit DomOS.
- si la UI widget est reconstruite dans une app Angular ou une demo, le manque SDK resterait masque au lieu d'etre corrige a la source.
- le package Angular doit porter lui-meme la surface widget officielle avant toute extension produit ou docs Angular de parite complete.

---

## Perimetre strict

### Ce que Sprint 13 fait

- ajoute le composant standalone `DomOSWidgetComponent` dans `packages/angular/src/lib/components/widget/`
- ajoute le composant standalone `DomOSApprovalModalComponent` dans `packages/angular/src/lib/components/hitl/`
- met a jour `packages/angular/src/public-api.ts` pour exporter la surface widget Angular officielle
- met a jour `packages/angular/src/public-api.test.ts` pour verrouiller le contrat public et la presence des nouveaux exports

### Ce que Sprint 13 ne fait pas

- ne touche pas `apps/demo-angular/**`
- ne touche pas `packages/core/**`
- ne touche pas `packages/ui/**`
- ne cree pas le CDC `domos/features/feature_28_angular_default_widget_surface.md` dans ce sprint
- ne livre pas d'auto-mount widget via configuration provider ou plugin global
- ne revoit pas la surface plugin outlet, la directive tool ou les helpers navigation/resolver deja livres

---

## Regles de design

- La surface widget Angular doit rester Angular-native : composant standalone, `input()`, `output()`, `signal()`, `computed()`, `effect()` et templates Angular, pas une transposition litterale des SDK React ou Vue.
- Le sprint doit reutiliser les briques widget deja publiees par `@domos/core` : `WidgetConfig`, `DEFAULT_WIDGET_CONFIG`, `DEFAULT_THEME`, `DEFAULT_LABELS` et `generateWidgetStyles`.
- Le sprint doit reutiliser les contrats HITL existants : `ApprovalRequest`, `approval.requested` et les capacites deja presentes de `DomOSClient`. Aucun nouveau contrat `core` n'est autorise.
- La parite visee est une parite de resultat. Le naming public Angular reste `DomOSWidgetComponent` et `DomOSApprovalModalComponent`, pas une copie mecanique des fichiers Vue ou Svelte.
- Si l'implementation du widget Angular revele un manque dans `@domos/core` ou `@domos/ui`, le sprint s'arrete avant toute modification cross-domaines et sort ce besoin vers un document separe.
- Le widget Angular doit etre une surface explicite par composant. Aucun auto-mount implicite ne doit etre glisse dans `provideDomOS()` ou dans une config provider pendant ce sprint.

---

## Codes stables de validation

| Code | Declencheur | Decision attendue |
| --- | --- | --- |
| `ANGULAR-S13-001` | `@domos/angular` ne publie toujours aucun composant widget autonome apres le sprint | Refus du sprint tant que `DomOSWidgetComponent` n'existe pas dans le package |
| `ANGULAR-S13-002` | la surface widget est codee dans une demo ou une app au lieu de `packages/angular/**` | Refus du sprint tant que le manque SDK n'est pas corrige a la source |
| `ANGULAR-S13-003` | le sprint modifie `packages/core/**`, `packages/ui/**` ou `apps/demo-angular/**` | Refus du sprint tant que le perimetre n'est pas re-borne |
| `ANGULAR-S13-004` | le widget Angular recopie des styles ou contrats widget au lieu de reutiliser `@domos/core` | Refus du sprint tant que le package ne consomme pas les primitives widget officielles |
| `ANGULAR-S13-005` | le flux HITL du widget n'est pas ferme par une modal officielle Angular ou contourne `ApprovalRequest` | Refus du sprint tant que la surface approval n'est pas explicite |
| `ANGULAR-S13-006` | `packages/angular/src/public-api.ts` n'exporte pas la nouvelle surface widget | Refus du sprint tant que l'API publique n'est pas alignee |
| `ANGULAR-S13-007` | `pnpm --filter @domos/angular build` ou `pnpm --filter @domos/angular test` echoue apres ajout de la surface widget | Refus du sprint tant que le contrat package n'est pas vert |

---

## Phase 1 - Surface widget Angular par defaut

**startIndex recommande :** 1

**AVANT**

- aucun composant widget n'existe dans `packages/angular/src/lib/components/`
- `@domos/angular` n'offre aucune entree widget prete a l'emploi comparable aux SDK React, Vue et Svelte

**APRES**

- `packages/angular/src/lib/components/widget/DomOSWidgetComponent.ts` existe et porte la surface widget Angular par defaut

**POURQUOI**

- il faut fermer le manque package principal sans attendre une app de validation ou une doc future

### Service interface methods et surface visees

- `apiKey?: string`
- `endpoint?: string`
- `client?: DomOSClient`
- `config?: WidgetConfig`
- `showApprovalModal?: boolean`
- gestion interne du cycle widget : connexion, etat agent, messages, audio, texte, toggle mode, fermeture du client possede localement

### Boilerplate libs a reutiliser

- `@angular/core`
- `@angular/common`
- `@domos/core`

## Phase 2 - Surface HITL officielle du widget

**startIndex recommande :** 2

**AVANT**

- Angular ne porte aucun composant officiel pour rendre et resoudre une demande d'approbation `ApprovalRequest`

**APRES**

- `packages/angular/src/lib/components/hitl/DomOSApprovalModalComponent.ts` existe et sert de surface officielle d'approbation pour le widget Angular

**POURQUOI**

- un widget DomOS complet doit couvrir la boucle HITL a risque sans imposer une UI d'approbation externe a l'integrateur

### Service interface methods et surface visees

- `request: ApprovalRequest | null`
- `open: boolean`
- `approve(): void`
- `deny(): void`
- integration simple avec le resolver d'approbation porte par le widget parent

### Boilerplate libs a reutiliser

- `@angular/core`
- `@angular/common`
- `@domos/core`

## Phase 3 - Alignement de l'API publique Angular

**startIndex recommande :** 3

**AVANT**

- `packages/angular/src/public-api.ts` n'expose aujourd'hui que la facade service, les helpers Angular, les primitives tools et le plugin outlet

**APRES**

- `packages/angular/src/public-api.ts` exporte explicitement `DomOSWidgetComponent` et `DomOSApprovalModalComponent`

**POURQUOI**

- une surface package non exportee reste un detail interne inutilisable par une application Angular

### Service interface methods et surface visees

- export public de `DomOSWidgetComponent`
- export public de `DomOSApprovalModalComponent`
- re-export des types widget utiles deja portes par `@domos/core` uniquement si necessaire pour garder la facade Angular lisible, sans re-creer de types locaux redondants

### Boilerplate libs a reutiliser

- ESM public surface deja en place dans `packages/angular/src/public-api.ts`

## Phase 4 - Gate package et contrat public

**startIndex recommande :** 4

**AVANT**

- `packages/angular/src/public-api.test.ts` verrouille la facade service et les helpers Angular, mais pas encore la surface widget par defaut

**APRES**

- `packages/angular/src/public-api.test.ts` couvre la presence de la nouvelle surface widget publique et ferme le gate package

**POURQUOI**

- le sprint doit se fermer sur un contrat public teste, pas sur une presence de fichier non verifiee

### Service interface methods et surfaces visees

- verification des exports `DomOSWidgetComponent` et `DomOSApprovalModalComponent`
- smoke coverage minimale sur l'import public Angular de la surface widget
- gate explicite sur build et test du package `@domos/angular`

### Clause STOP explicite

- Si `DomOSWidgetComponent` ou `DomOSApprovalModalComponent` exigent un nouveau contrat `@domos/core` ou une adaptation de `@domos/ui`, le sprint s'arrete immediatement.
- Le seul livrable autorise dans ce cas est l'ouverture d'un document distinct dans le bon domaine ; aucun patch cross-domaines n'est absorbe ici.

### Boilerplate libs a reutiliser

- `vitest`
- scripts `pnpm --filter`

---

## Organisation cible des fichiers

La cible du sprint doit rester minimale et lisible. Aucun reshaping large du package Angular n'est attendu ; seul l'ajout de la surface widget officielle est vise.

```text
packages/angular/src/
  public-api.ts
  public-api.test.ts
  lib/
    components/
      widget/
        DomOSWidgetComponent.ts
      hitl/
        DomOSApprovalModalComponent.ts
```

- `components/widget/` porte la surface widget Angular par defaut.
- `components/hitl/` porte la modal d'approbation officielle du widget.
- `public-api.ts` reste la facade publique unique du package.
- `public-api.test.ts` reste le verrou du contrat public package.

---

## Fichiers cibles

| Fichier | AVANT | APRES | POURQUOI |
| --- | --- | --- | --- |
| `packages/angular/src/lib/components/widget/DomOSWidgetComponent.ts` | absent | composant standalone widget Angular autonome | fermer le manque `DomOSWidget` a la source dans le package |
| `packages/angular/src/lib/components/hitl/DomOSApprovalModalComponent.ts` | absent | composant standalone modal HITL officiel pour Angular | fermer la boucle d'approbation du widget sans UI externe |
| `packages/angular/src/public-api.ts` | exports service, helpers, directive tool, bouton tool et plugin outlet, mais aucun widget | exports publics de `DomOSWidgetComponent` et `DomOSApprovalModalComponent` | rendre la surface widget consommable depuis `@domos/angular` |
| `packages/angular/src/public-api.test.ts` | couverture du contrat public hors surface widget | couverture du contrat public incluant la surface widget Angular | verrouiller le gate package sur le nouveau contrat |

---

## Gate fin de sprint

Sprint 13 est termine uniquement si :

- [ ] `packages/angular/src/lib/components/widget/DomOSWidgetComponent.ts` existe et porte la surface widget Angular par defaut
- [ ] `packages/angular/src/lib/components/hitl/DomOSApprovalModalComponent.ts` existe et ferme la surface HITL officielle du widget
- [ ] `packages/angular/src/public-api.ts` exporte explicitement la nouvelle surface widget
- [ ] `packages/angular/src/public-api.test.ts` couvre la presence du contrat public widget
- [ ] aucun fichier hors `packages/angular/**` n'a ete touche dans le cadre de ce sprint
- [ ] aucun nouveau contrat `core` ou `ui` n'a ete absorbe implicitement
- [ ] `pnpm --filter @domos/angular build` et `pnpm --filter @domos/angular test` passent

---

## Ce qu'on ne fait pas

- pas de creation du CDC `domos/features/feature_28_angular_default_widget_surface.md` dans ce sprint
- pas de modification `packages/core/**`
- pas de modification `packages/ui/**`
- pas de modification `apps/demo-angular/**`
- pas d'auto-mount widget via provider, plugin ou config globale
- pas de nouvelle surface plugin, resolver, navigation ou tool hors besoin strict du widget
- pas de refactor global du package Angular