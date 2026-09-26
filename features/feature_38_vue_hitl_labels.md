# Feature #38 : Libelles HITL personnalisables (Vue)

**Statut** : Jaune - Validee
**Domaine** : vue (`packages/vue`)
**Porteur** : @BorisBob
**Valide par** : @BorisBob
**Date** : 2026-09-26
**GitHub issue** : https://github.com/borisbob91/owllayer/issues/91

---

## Besoin

`hitl.ApprovalModal.vue` et `hitl.ApprovalBanner.vue` affichent des textes francais codes en dur ("Approbation requise", "Confirmation requise", "Refuser", "Approuver"…) et le nom technique du tool (`confirm_checkout` dans le banner). Comme pour React (#84), une application dans une autre langue, ou qui veut des noms d'actions lisibles, doit reconstruire toute l'UI avec `useApproval`.

### User story

> En tant qu'integrateur Vue, je veux traduire et renommer les textes de la confirmation HITL par configuration, sans reecrire la modale ou le banner.

---

## Perimetre strict

### Ce que cette feature fait

- Ajoute `hitl.labels` (tous les champs optionnels, type `HitlLabels` partage via `@owllayer/core`) a `OwlLayerPluginOptions`.
- `hitl.ApprovalModal.vue` recoit un nouveau prop optionnel `labels` et l'applique au titre, au message et aux boutons.
- `hitl.ApprovalBanner.vue` lit les libelles via `useApproval()` et les applique au titre, au message, au nom du tool affiche (`toolLabels`) et aux boutons.
- Garde les textes actuels comme valeurs par defaut : aucun changement visuel sans configuration.
- Affiche par defaut le message de la politique HITL ; `message` ne le remplace que s'il est fourni.
- `useApproval()` expose `labels` pour les UI d'approbation personnalisees.

### Ce que cette feature ne fait pas

- Ne change pas les textes par defaut ni le flux d'approbation HITL.
- N'ajoute pas de libelles specifiques a une demo dans le SDK.
- Ne modifie pas `apps/demo-vue`.
- Ne traite pas la modale d'approbation embarquee dans `OwlLayerWidget.vue` (widget autonome sans lien avec `hitl.labels` du plugin, hors perimetre de l'issue #91) : voir question ouverte dans le rapport de livraison.
- `deniedMessage` n'a pas d'affichage dedie dans le banner Vue (qui n'a pas de systeme de notification, contrairement au banner React) ; il reste expose via `useApproval().labels` pour les UI personnalisees.

---

## Validation

- Tests (`packages/vue/tests/hitlLabels.test.ts`) : rendu par defaut inchange (modal + banner), surcharge de chaque libelle, `toolLabels`, message de politique conserve, `useApproval().labels`.
- `@owllayer/vue` build, lint et tests.
