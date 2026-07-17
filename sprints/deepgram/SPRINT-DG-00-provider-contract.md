# Sprint DG-00 - Contrat fournisseur Deepgram

Statut : **En attente de SRV-00 et MEDIA-00**

## Objectif

Mapper les capacités Deepgram aux interfaces DomOS existantes et distinguer les
quatre produits : STT, TTS, streaming pipeline et Voice Agent.

## Tâches

- vérifier endpoints, événements, formats et lifecycle dans les docs officielles ;
- définir la matrice Flux/Nova et streaming/prerecorded ;
- définir les options publiques minimales sans recopier toute l'API Deepgram ;
- établir les scénarios d'interruption, fermeture et reprise ;
- décider si le Voice Agent satisfait `LiveAdapter` ou nécessite une extension
  fournisseur-neutre du contrat après preuve.

## Invariants

- Aucun type Deepgram dans core.
- Aucun audio envoyé avant l'état prêt du fournisseur.
- Les tools restent des tools DomOS.
- La clé Deepgram reste côté serveur.
- Les options du dashboard restent sérialisables et validées.

## Fichiers cibles de planification

- `packages/core/src/voice/contracts.ts` en lecture, modification seulement si un
  scénario fournisseur-neutre prouve un manque
- nouveau package proposé `packages/adapter-deepgram/`
- interfaces d'orchestration dans `packages/server/src/`
- futur dossier docs `apps/docs-site/src/content/docs/deepgram/`

## Definition of Done

- [ ] Matrice des capacités et endpoints validée sur sources officielles.
- [ ] Contrats STT, TTS et Live distingués.
- [ ] Formats audio reliés à `@domos/core/media/audio` sans dépendance circulaire.
- [ ] Jeux de tests et fixtures définis.
- [ ] Aucun changement de core n'est prescrit sans scénario concret.

## Hors scope

- Implémenter le package adapter.
- Modifier ADTP.
- Construire le dashboard.

## Commit recommandé

`docs(deepgram): lock provider adapter contracts`
