# Progression CMEDIA-00

Dernière mise à jour : 2026-07-17

## Décisions acquises

- [x] WebSocket est le transport média par défaut.
- [x] WebRTC est activable explicitement.
- [x] `auto` préfère WebRTC uniquement après négociation des capacités.
- [x] Le choix média reste distinct du transport ADTP.
- [x] Tous les SDK UI doivent être raccordés séquentiellement.

## Dépendances

- [ ] ADTP-01 validé et implémenté.
- [ ] OAI-02 WebSocket validé.
- [ ] Contrat du bridge WebRTC OAI-03 stabilisé.

## Prochaine étape

Implémenter CMEDIA-00 seul, puis faire vérifier la non-régression de
`DomOSClient` avant de commencer React.

