# Feature #41 : Libelles HITL personnalisables (Browser)

**Statut** : Jaune - Validee
**Domaine** : browser (`packages/browser`)
**Porteur** : @BorisBob
**Valide par** : @BorisBob
**Date** : 2026-09-26
**GitHub issue** : https://github.com/borisbob91/owllayer/issues/94

---

## Besoin

`HitlOverlay` (Shadow DOM ferme) affiche des textes francais codes en dur ("Confirmation requise", "Refuser", "Approuver"…) et le nom technique du tool. Comme pour React (#84), Vue (#91), Svelte (#92) et Angular (#93), une integration vanilla JS (ou les plugins Shopify/WooCommerce construits sur `@owllayer/browser`) dans une autre langue, ou qui veut des noms d'actions lisibles, ne peut pas traduire l'overlay sans le reconstruire.

### User story

> En tant qu'integrateur vanilla JS, je veux traduire et renommer les textes de la confirmation HITL par configuration, sans reconstruire l'overlay.

---

## Perimetre strict

### Ce que cette feature fait

- Ajoute `hitl.labels` (tous les champs optionnels, type `HitlLabels` partage via `@owllayer/core`) a `OwlLayerBrowserConfig` (`OwlLayer.init()` / `BrowserOwlLayer.init()`).
- `HitlOverlay` recoit les libelles au constructeur et les applique au titre, au message, au nom du tool affiche (`toolLabels`) et aux boutons.
- Garde les textes actuels comme valeurs par defaut : aucun changement visuel sans configuration.
- Affiche par defaut le message de la politique HITL ; `message` ne le remplace que s'il est fourni.
- Nouvelle methode `getHitlLabels()` sur `BrowserOwlLayer` et sur l'objet global `OwlLayer` (bundle CDN), pour une UI d'approbation personnalisee.
- L'overlay reste dans le Shadow DOM ferme (aucun changement d'isolation).

### Ce que cette feature ne fait pas

- Ne change pas les textes par defaut ni le flux d'approbation HITL.
- N'ajoute pas de libelles specifiques a une demo dans le SDK.
- Ne modifie pas `apps/demo-browser` ni les surfaces de configuration Shopify/WooCommerce.
- `BrowserOwlLayerCore` (runtime sans widget/HITL, `hitl.enabled` force a `false`) reste inchange : aucun overlay n'y est jamais monte.

---

## Validation

- Tests (`packages/browser/tests/hitlLabels.test.ts`) : rendu par defaut inchange, surcharge de chaque libelle, `toolLabels`, message de politique conserve — lus directement dans le shadow root interne de `HitlOverlay` (mode `closed`, non accessible depuis l'exterieur), comme le fait `tests/shadowDom.test.ts` existant.
- `@owllayer/browser` build, lint et tests.
- `dist/owllayer.min.js` regenere par le build local n'est pas commit (fichier genere).
