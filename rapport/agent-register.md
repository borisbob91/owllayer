# Agent Register - DomOS SDK Review

Date: 2026-07-04

Ce registre trace les agents mobilises ou reutilisables pour les revues DomOS.

| Agent | Role | Scope de mission | Statut | Reutilisation |
|---|---|---|---|---|
| `security_reviewer_54` (`SecReview`, id `019f2a91-ff5e-7442-b187-5c6c1b7c6191`) | Revue securite | `packages/server`, HITL, tools serveur, auth, HTTP embedding, suppression Redis/runtime rate limiter | Lance puis ferme apres delais, pas de retour exploitable | A reutiliser avant publication npm, avant merge de tout endpoint public ou changement auth/HITL |
| `code_reviewer_54` (`Audit`, id `019f2a92-3eb1-77b3-92f7-8212d094fdba`) | Revue code/coherence | API publique serveur, packaging, tests, suppression standalone/docker/cloud, docs | Termine, constats integres | A reutiliser avant commit final serveur ou avant changement d'exports publics |
| `long_explorer_spark` | Exploration longue | Non lance sur cette passe: l'exploration locale etait suffisante pour finir les corrections serveur | Disponible | A reutiliser pour cartographier `packages/ui` / AI Studio ou les SDK Angular/React |

## Mission core/client - 2026-07-04

- Agent principal: revue locale de `packages/core` et `DomOSClient`, sans creation de nouvel agent.
- `code_reviewer_54`: a reutiliser avant correction des contrats ADTP/plugin/client.
- `security_reviewer_54`: a reutiliser avant correction auth WebRTC, virtual lines ou tout nouveau flux sensible.
- `long_explorer_spark`: a reutiliser si la prochaine passe inclut `packages/ui` / AI Studio ou tous les SDK frameworks.

## Regles de coordination

- Les agents de review sont read-only sur le code applicatif.
- Les constats bloquants doivent etre classes `Critical` ou `High`.
- Les corrections restent integrees par l'agent principal pour garder une seule ligne de commit.
- Aucun nouvel agent n'est cree si un agent existant couvre deja le role.

## Retours integres

- Collision tool client/serveur: le tool serveur est maintenant prioritaire dans la declaration exposee au LLM et dans l'execution.
- Approbation live des tools serveur: les appels en attente sont maintenant stockes dans `pendingServerApprovals` et reprennent apres `APPROVAL_RESPONSE`.
- WebRTC: les handlers HTTP embarques sont transmis au transport WebRTC.
- `configureLines()`: l'AdminAPI est resynchronisee quand les lignes sont configurees apres construction.

## Retours integres - passe client/core

- `APPROVAL_REQUEST` serveur -> client couvert dans `@domos/core`.
- Erreur async `TOOL_CALL` couverte par `TOOL_RESULT error`.
- Surface effective `tools_effective` ajoutee au protocole ADTP et exposee dans `DomOSClient`.
- Collisions tools serveur/client remontees aux SDK et DevTools.
- Lifecycle mount/unmount des tools verifie cote session serveur.
- Widget Angular raccorde a `approval.requested` sans ecraser les handlers applicatifs.
- WebRTC virtual lines durci: token encode et nettoyage du `lineToken` refuse par le signaling.
