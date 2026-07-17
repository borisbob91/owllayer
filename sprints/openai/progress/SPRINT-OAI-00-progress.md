# Progression OAI-00

Dernière mise à jour : 2026-07-17

Phase : **architecture rédigée, implémentation non commencée**.

## Décisions acquises

- [x] Responses API pour le texte.
- [x] Realtime GA WebSocket par défaut.
- [x] WebRTC explicite et `auto` opt-in avec fallback.
- [x] Sideband serveur pour tools, HITL et contrôle.
- [x] Pas d'Agents SDK comme runtime concurrent.
- [x] Aucun type provider dans core ou les SDK.

## Exécution

- [ ] Cartographie détaillée du package et des consommateurs.
- [ ] Tests de caractérisation texte et live.
- [ ] Matrice d'événements persistée.
- [ ] Audit des dépendances ADTP/server/client.
- [ ] Revue et clôture OAI-00.

## Prochaine étape

Exécuter uniquement OAI-00, puis autoriser OAI-01 si les contrats et tests de
caractérisation sont validés.
