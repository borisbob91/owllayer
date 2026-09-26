# Feature #40 : Libelles HITL personnalisables (Angular)

**Statut** : Jaune - Validee
**Domaine** : angular (`packages/angular`)
**Porteur** : @BorisBob
**Valide par** : @BorisBob
**Date** : 2026-09-26
**GitHub issue** : https://github.com/borisbob91/owllayer/issues/93

---

## Besoin

`OwlLayerApprovalModalComponent` (`owllayer-approval-modal`) affiche des textes francais codes en dur ("Approbation requise", "Refuser", "Approuver"…). Comme pour React (#84), Vue (#91) et Svelte (#92), une application dans une autre langue, ou qui veut des noms d'actions lisibles, doit reconstruire la modale.

### User story

> En tant qu'integrateur Angular, je veux traduire les textes de la confirmation HITL par configuration, sans reecrire la modale.

---

## Perimetre strict

### Ce que cette feature fait

- Ajoute `hitl.labels` (tous les champs optionnels, type `HitlLabels` partage via `@owllayer/core`) a `OwlLayerAngularConfig` (`provideOwlLayer`).
- `OwlLayerAngularService` recoit les libelles au constructeur et les expose via une propriete publique `hitlLabels` (facade/service d'approbation).
- `OwlLayerApprovalModalComponent` recoit un nouveau `@Input() labels` (tous les champs optionnels) et l'applique au titre, au message et aux boutons via des methodes dediees (`titleText()`, `messageText()`, `denyText()`, `approveText()`), suivant le style existant du composant (`formatArgs()`).
- `OwlLayerWidgetComponent` (seule surface qui monte `owllayer-approval-modal` aujourd'hui) transmet `hitlLabels()` du service injecte a la modale.
- Garde les textes actuels comme valeurs par defaut : aucun changement visuel sans configuration.
- Affiche par defaut le message de la politique HITL ; `message` ne le remplace que s'il est fourni.

### Ce que cette feature ne fait pas

- Ne change pas les textes par defaut ni le flux d'approbation HITL.
- N'ajoute pas de libelles specifiques a une demo dans le SDK.
- Ne modifie pas `apps/demo-angular`.
- N'affiche pas le nom du tool dans la modale (elle ne l'a jamais affiche) : `toolLabels` reste sans effet visuel sur `owllayer-approval-modal` mais est expose via `hitl.labels`/`hitlLabels` pour une UI d'approbation personnalisee.
- `deniedMessage` n'a pas d'affichage dedie (la modale Angular n'a pas de systeme de notification de refus) ; il reste expose via `hitlLabels` pour les UI personnalisees.
- Quand `owllayer-widget` cree son propre client autonome (input `client`/`endpoint`/`apiKey` sans `provideOwlLayer` parent), aucune configuration `hitl.labels` n'existe pour cette instance : les defauts s'appliquent, comme avant.

---

## Validation

- Tests (`packages/angular/src/public-api.test.ts`) : `OwlLayerAngularService.hitlLabels` par defaut et configure, propagation via `provideOwlLayer`, textes par defaut et surcharges de `OwlLayerApprovalModalComponent` (titre, message, boutons), message de politique conserve.
- `@owllayer/angular` build et tests (le package n'a pas de script `lint` — `tsc` est couvert par le build `tsup --dts`).
- Les tests Angular s'executent dans un environnement `vitest` sans DOM/TestBed (pas de `jsdom`/`zone.js` dans ce package) ; la verification porte donc sur les methodes du composant (`titleText()`, etc.) plutot que sur le rendu du template, conformement aux tests existants du package.
