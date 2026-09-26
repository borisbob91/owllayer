# Feature #39 : Libelles HITL personnalisables (Svelte)

**Statut** : Jaune - Validee
**Domaine** : svelte (`packages/svelte`)
**Porteur** : @BorisBob
**Valide par** : @BorisBob
**Date** : 2026-09-26
**GitHub issue** : https://github.com/borisbob91/owllayer/issues/92

---

## Besoin

`hitl.ApprovalModal.svelte` et `hitl.ApprovalBanner.svelte` affichent des textes francais codes en dur ("Approbation requise", "Confirmation requise", "Refuser", "Approuver"…) et le nom technique du tool (`confirm_checkout` dans le banner). Comme pour React (#84) et Vue (#91), une application dans une autre langue, ou qui veut des noms d'actions lisibles, doit reconstruire toute l'UI a la main.

### User story

> En tant qu'integrateur Svelte, je veux traduire et renommer les textes de la confirmation HITL par configuration, sans reecrire la modale ou le banner.

---

## Perimetre strict

### Ce que cette feature fait

- Ajoute `hitl.labels` (tous les champs optionnels, type `HitlLabels` partage via `@owllayer/core`) a `OwlLayerInitOptions` (`initOwlLayer`).
- Nouveau store exporte `hitlLabels` (initialise a `{}`, mis a jour par `initOwlLayer`).
- `hitl.ApprovalModal.svelte` recoit un nouveau prop optionnel `labels` et l'applique au titre, au message et aux boutons.
- `hitl.ApprovalBanner.svelte` lit le store `hitlLabels` et l'applique au titre, au message, au nom du tool affiche (`toolLabels`) et aux boutons.
- Garde les textes actuels comme valeurs par defaut : aucun changement visuel sans configuration.
- Affiche par defaut le message de la politique HITL ; `message` ne le remplace que s'il est fourni.
- Le store `hitlLabels` est exporte publiquement pour les UI d'approbation personnalisees.

### Ce que cette feature ne fait pas

- Ne change pas les textes par defaut ni le flux d'approbation HITL.
- N'ajoute pas de libelles specifiques a une demo dans le SDK.
- Ne modifie pas `apps/demo-svelte`.
- Ne traite pas la modale d'approbation embarquee dans `OwlLayerWidget.svelte` (widget autonome avec son propre client, sans lien avec `hitl.labels` de `initOwlLayer`, hors perimetre de l'issue #92) : voir question ouverte dans le rapport de livraison.
- `deniedMessage` n'a pas d'affichage dedie dans le banner Svelte (qui n'a pas de systeme de notification, contrairement au banner React) ; il reste expose via le store `hitlLabels` pour les UI personnalisees.

---

## Validation

- Tests (`packages/svelte/tests/hitlLabels.test.ts`) : rendu par defaut inchange (modal + banner), surcharge de chaque libelle, `toolLabels`, message de politique conserve, export du store `hitlLabels`.
- `@owllayer/svelte` build, lint et tests.
