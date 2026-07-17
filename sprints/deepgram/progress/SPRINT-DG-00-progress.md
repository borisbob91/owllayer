# Progression DG-00

Dernière mise à jour : 2026-07-17

## Statut

En attente de SRV-00.

## Décisions acquises

- [x] Deepgram est un provider optionnel, pas une dépendance du core.
- [x] STT, TTS, pipeline et Voice Agent sont des sprints distincts.
- [x] Le Voice Agent attend `Welcome`, puis `SettingsApplied`, avant l'audio.
- [x] Flux et Nova ne sont pas fusionnés artificiellement.

## Prochaine étape

Après SRV-00, exécuter DG-00 sur la documentation officielle actuelle et
produire la matrice endpoints, formats, événements et capacités. Aucun package
Deepgram ne doit être créé avant cette validation.

