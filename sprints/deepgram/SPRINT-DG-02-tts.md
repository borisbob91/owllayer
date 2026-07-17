# Sprint DG-02 - Adapter TTS Deepgram

Statut : **Planifié après DG-00**

## Objectif

Implémenter un `TTSService` Deepgram conforme au contrat audio DomOS et aux
formats réellement supportés.

## Fichiers cibles proposés

- `packages/adapter-deepgram/src/DeepgramTTS.ts`
- `packages/adapter-deepgram/src/index.ts`
- `packages/adapter-deepgram/tests/DeepgramTTS.test.ts`
- manifest du package seulement pour les dépendances validées

## Definition of Done

- [ ] Synthèse simple et streaming décidés en DG-00 sont couverts.
- [ ] Le MIME, le codec et le sample rate produits sont explicites.
- [ ] Annulation, erreur et fermeture sont testées.
- [ ] Aucune conversion audio implicite non documentée n'est ajoutée.
- [ ] Build, tests et exemple serveur passent.

## Hors scope

- STT, Voice Agent et UI dashboard.

## Commit recommandé

`feat(deepgram): add provider-neutral TTS service`
