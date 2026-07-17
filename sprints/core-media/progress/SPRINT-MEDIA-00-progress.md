# Progression MEDIA-00

Dernière mise à jour : 2026-07-17

## État

Phase actuelle : **architecture rédigée, implémentation non commencée**.

## Décisions acquises

- [x] Core Media reste limité aux primitives directement utiles.
- [x] Seuls l'encodage et le décodage PCM16 base64 entrent dans MEDIA-00.
- [x] Angular est l'unique consommateur migré dans ce sprint.
- [x] Les implémentations React, Vue, Svelte et Browser servent de références de compatibilité.
- [x] WAV, Opus, détection de format et LiveKit sont exclus.
- [x] `packages/audio` n'est pas supprimé dans MEDIA-00.
- [x] L'export public est isolé sous `@domos/core/media/audio`.

## Preuves consultées

- `packages/audio/src/index.ts` et ses implémentations PCM/WAV/Opus ;
- `packages/audio/test/pcm.test.ts` ;
- `packages/angular/src/lib/services/voice/DomOSVoiceService.ts` ;
- les chemins d'encodage et de playback React, Vue, Svelte et Browser ;
- `packages/adapter-livekit/src/live/audioMapping.ts` ;
- les manifests et scripts de build des packages concernés.

## Checklist d'exécution

- [ ] Tâche 1 - Figer les tests de compatibilité.
- [ ] Tâche 2 - Implémenter les deux primitives PCM.
- [ ] Tâche 3 - Publier le sous-chemin Core Media.
- [ ] Tâche 4 - Migrer uniquement le service Angular.
- [ ] Tâche 5 - Vérifier les builds et la frontière de périmètre.
- [ ] Revue d'intégrité indépendante.
- [ ] Validation du Product Owner.

## Prochaine étape persistée

Faire valider le périmètre MEDIA-00, puis commencer exclusivement par la tâche
1. Aucun déplacement de codec et aucune suppression de package ne doit précéder
les tests de compatibilité.
