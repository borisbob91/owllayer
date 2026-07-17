# Sprint DG-01 - Adapter STT Deepgram

Statut : **Planifié après DG-00**

## Objectif

Implémenter un `STTService` Deepgram robuste pour les scénarios validés :
transcription ponctuelle et/ou streaming selon le contrat DG-00.

## Fichiers cibles proposés

- `packages/adapter-deepgram/package.json`
- `packages/adapter-deepgram/src/DeepgramSTT.ts`
- `packages/adapter-deepgram/src/index.ts`
- `packages/adapter-deepgram/tests/DeepgramSTT.test.ts`
- fixtures audio minimales dans le même package

## Definition of Done

- [ ] Formats et sample rates invalides sont rejetés avant envoi.
- [ ] Résultats finaux et intérimaires sont mappés sans fuite de types provider.
- [ ] Timeout, fermeture distante et annulation sont testés.
- [ ] Flux et Nova utilisent leurs endpoints et capacités corrects.
- [ ] Les ressources réseau sont libérées.
- [ ] Guide et exemple serveur passent.

## Hors scope

- TTS, Voice Agent et dashboard.

## Commit recommandé

`feat(deepgram): add provider-neutral STT service`
