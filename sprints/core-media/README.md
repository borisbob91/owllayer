# Core Media - Plan de sprint

## Finalité du domaine

`Core Media` contient uniquement les primitives média génériques dont les SDK
DomOS ont un usage immédiat. Il ne devient ni un moteur audio, ni un catalogue
de codecs, ni une abstraction de transport ou de provider.

## Décision de périmètre

Le premier sprint extrait seulement les conversions PCM déjà exécutées dans
les clients :

- `Float32Array` vers PCM16 encodé en base64 pour l'envoi ADTP ;
- PCM16 base64 vers `Float32Array` pour la lecture des réponses audio.

Ces fonctions seront exposées par `@domos/core/media/audio`. Elles ne seront
pas réexportées depuis `@domos/core` afin de préserver l'entrée principale.

## Ce qui ne sera pas migré

- les décodeurs WAV et Opus de `packages/audio` ;
- `wav-decoder`, `opusscript` et la détection automatique de format ;
- l'intégration LiveKit, actuellement en backlog ;
- la capture micro, la lecture Web Audio et les machines d'état des SDK ;
- les fonctions qui ne possèdent aucun consommateur actif.

`packages/audio` n'est donc pas supprimé dans ce sprint. Son sort sera décidé
quand ses consommateurs restants seront réellement pris en charge.

## Sprint actif

1. [`SPRINT-MEDIA-00-audio-consolidation.md`](./SPRINT-MEDIA-00-audio-consolidation.md) - extraire les deux primitives PCM et migrer leur consommateur Angular actif.

Le suivi d'exécution est conservé dans
[`progress/SPRINT-MEDIA-00-progress.md`](./progress/SPRINT-MEDIA-00-progress.md).
