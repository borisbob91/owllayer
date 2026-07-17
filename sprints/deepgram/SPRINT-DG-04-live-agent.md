# Sprint DG-04 - Voice Agent Deepgram

Statut : **Backlog après SRV-01**

## Objectif

Évaluer puis intégrer le Voice Agent Deepgram comme `LiveAdapter` uniquement si
le contrat fournisseur-neutre couvre réellement son lifecycle.

## Ordre protocolaire obligatoire

```txt
socket ouverte
  -> attendre Welcome
  -> envoyer Settings
  -> attendre SettingsApplied
  -> envoyer l'audio
```

## Fichiers cibles proposés

- `packages/adapter-deepgram/src/DeepgramLiveAdapter.ts`
- `packages/adapter-deepgram/src/events.ts`
- `packages/adapter-deepgram/src/index.ts`
- `packages/adapter-deepgram/tests/DeepgramLiveAdapter.test.ts`

## Definition of Done

- [ ] L'ordre `Welcome/Settings/SettingsApplied` est testé.
- [ ] KeepAlive, interruption, tools et fermeture sont couverts.
- [ ] Aucun événement Deepgram ne traverse l'API publique DomOS.
- [ ] L'intégration réutilise le registry runtime.
- [ ] Le chemin pipeline DG-03 reste indépendant.

## Hors scope

- LiveKit et téléphonie.

## Commit recommandé

`feat(deepgram): add Voice Agent live adapter`
