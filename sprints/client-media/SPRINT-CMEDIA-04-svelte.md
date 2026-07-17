# Sprint CMEDIA-04 - Raccordement Svelte

Statut : **Planifié après CMEDIA-03**

## Objectif

Raccorder le runtime vocal Svelte au contrôleur média core.

## Fichiers cibles

- composable/runtime vocal sous `packages/svelte/src/`
- widget Svelte et tests associés
- exports publics Svelte si nécessaires

## Definition of Done

- [ ] Les trois politiques média sont supportées.
- [ ] La destruction du composant ferme la session média.
- [ ] Les stores ne conservent aucun état d'une ancienne session.
- [ ] Build et tests Svelte passent.

## Hors scope

- Autres SDK.

## Commit recommandé

`feat(svelte): connect voice runtime to core media runtime`

