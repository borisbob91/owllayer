# Sprint DG-03 - Pipeline vocal streaming Deepgram

Statut : **Planifié après MEDIA-00, DG-01 et DG-02**

## Objectif

Composer STT Deepgram, un `LLMAdapter` configurable et TTS Deepgram dans une
session vocale DomOS, sans créer un second orchestrateur concurrent du serveur.

## Scénarios

- capture, transcription, décision LLM, tool call et réponse audio ;
- interruption utilisateur pendant la synthèse ;
- tool UI démonté pendant une conversation ;
- échec STT ou TTS avec état de session cohérent ;
- texte toujours disponible comme fallback.

## Fichiers cibles à confirmer

- orchestration vocale existante dans `packages/server/src/core/DomOSServer.ts`
- runtime de session livré par SRV-01
- adapter Deepgram livré par DG-01 et DG-02
- tests d'intégration dans le package serveur

## Definition of Done

- [ ] La `VoiceStateMachine` pilote les transitions.
- [ ] Le Neural-DOM Binding reste effectif pendant le flux vocal.
- [ ] Les buffers audio sont bornés et nettoyés.
- [ ] Les interruptions n'exécutent pas deux tours concurrents.
- [ ] Les tests d'intégration couvrent le cycle complet.

## Hors scope

- Voice Agent Deepgram natif.
- WebRTC navigateur.
- Dashboard.

## Commit recommandé

`feat(server): compose Deepgram streaming voice pipeline`
