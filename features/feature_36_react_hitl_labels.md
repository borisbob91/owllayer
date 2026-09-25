# Feature #36 : Libelles HITL personnalisables (React)

**Statut** : Jaune - Validee  
**Domaine** : react (`packages/react`)  
**Porteur** : @BorisBob  
**Valide par** : @BorisBob  
**Date** : 2026-09-26  
**GitHub issue** : https://github.com/borisbob91/owllayer/issues/84

---

## Besoin

L'UI HITL integree (`ApprovalModal`, `ApprovalBanner`) affiche des textes francais codes en dur et le nom technique du tool (`confirm_checkout`). Une application dans une autre langue, ou qui veut des noms d'actions lisibles, doit reconstruire toute l'UI avec `useApproval`.

### User story

> En tant qu'integrateur, je veux traduire et renommer les textes de la confirmation HITL par configuration, sans reecrire la modale.

---

## Perimetre strict

### Ce que cette feature fait

- Ajoute `config.hitl.labels` (tous les champs optionnels) : `title`, `message`, `approve`, `deny`, `deniedMessage`, `toolLabels`.
- Garde les textes actuels comme valeurs par defaut : aucun changement visuel sans configuration.
- Affiche par defaut le message de la politique HITL (avertissement "action critique") ; `message` ne le remplace que s'il est fourni.
- `toolLabels` associe un nom de tool a un libelle affiche (defini par l'application, pas par le SDK).
- `useApproval()` expose `labels` pour les UI d'approbation personnalisees.

### Ce que cette feature ne fait pas

- Ne change pas les textes par defaut ni le flux d'approbation HITL.
- N'ajoute pas de libelles specifiques a la demo dans le SDK.
- Ne traite pas Vue, Svelte, Angular et Browser (issues separees).

---

## Validation

- Tests : rendu par defaut inchange, surcharge de chaque libelle, `toolLabels`, message de politique conserve, `useApproval().labels`.
- `@owllayer/react` build, lint et tests.
