# Deepgram dans DomOS - Plan de sprints

## Finalité

Offrir Deepgram comme fournisseur vocal interchangeable : STT, TTS, streaming
pipeline et, plus tard, agent vocal natif, sans imposer Deepgram au runtime.

## Ordre

1. `SPRINT-DG-00-provider-contract.md`
2. `SPRINT-DG-01-stt.md`
3. `SPRINT-DG-02-tts.md`
4. `SPRINT-DG-03-streaming-pipeline.md`
5. `SPRINT-DG-04-live-agent.md`
6. `SPRINT-DG-05-admin-config-docs.md`

Les sprints DG-01 et DG-02 utilisent les interfaces STT/TTS existantes. DG-03
ne commence qu'après `../core-media/SPRINT-MEDIA-00-audio-consolidation.md`.
DG-04 ne commence qu'après le runtime de session fournisseur-neutre.

## Correction de la spécification source

Pour le Voice Agent Deepgram, le serveur attend `Welcome`, envoie `Settings`,
puis attend `SettingsApplied` avant l'audio. Le plan ne reprend pas l'ordre
incorrect « Settings immédiatement après ouverture » de la spécification guide.

Flux et Nova ne sont pas traités comme un seul endpoint : Flux vise le streaming
conversationnel `/v2/listen`, Nova utilise `/v1/listen` et couvre aussi le
prerecorded selon les capacités officielles validées pendant DG-00.

## Références officielles à revérifier pendant DG-00

- Voice Agent message flow : https://developers.deepgram.com/docs/voice-agent-message-flow
- Comparaison Flux/Nova : https://developers.deepgram.com/docs/flux/flux-nova-3-comparison

Les modèles, endpoints et événements sont temporellement instables. DG-00 doit
dater sa matrice et relire les sources officielles avant toute implémentation.
