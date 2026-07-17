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

## Mission architecture providers et media - 2026-07-17

- Agent principal : cartographie locale de `packages/core`, `packages/server`,
  `packages/audio`, `packages/adapter-openai`, Angular et `adapter-livekit`.
- Sources externes : specifications guide sous `Downloads/dmos_roadmap`, puis
  verification sur les documentations officielles OpenAI et Deepgram.
- `code_reviewer_54` : a reutiliser a la fin de chaque sprint implemente pour
  verifier le contrat, le diff, les tests et les exports publics.
- `security_reviewer_54` : a reutiliser avant les sprints credentials, WebRTC,
  sideband, tokens temporaires et endpoints publics.
- `long_explorer_spark` : a reutiliser si un sprint exige une nouvelle
  cartographie transversale du dashboard ou de tous les SDK.
- Aucun nouvel agent cree : les roles existants couvrent les futures revues.

## Mission sprints executables providers/media - 2026-07-17

| Agent | Type | Mission | Scope autorise | Scope interdit | Statut | Cree le | Sortie attendue |
|---|---|---|---|---|---|---|---|
| `019f6ec0-5556-7a12-a2ec-6baa0bdce14c` (`Trace`) | `long_explorer_spark` | Cartographier les exigences ADTP, media, providers, lifecycle tools, SDK et dashboard vers les symboles et tests reels du depot | Lecture seule de `packages/core`, `packages/server`, `packages/adapter-openai`, `packages/adapter-livekit`, `packages/audio`, `packages/react`, `packages/angular`, `packages/vue`, `packages/svelte`, `packages/browser`, `packages/ui`, `apps/demo`, `apps/demo-server`, `apps/demo-server-livekit`, `sprints/**` | Modifier des fichiers, choisir la direction produit, rediger les sprints, commiter | Echec avant execution : modele non disponible avec ce compte | 2026-07-17 | Aucun resultat exploitable |
| `019f6ec1-bbe1-7281-93f0-838bcc0c6c7e` (`Dirac`) | `explorer` | Reprendre la cartographie exhaustive apres indisponibilite de `long_explorer_spark` | Meme scope de lecture seule que `Trace` | Modifier des fichiers, choisir la direction produit, rediger les sprints, commiter | En cours | 2026-07-17 | Matrice exigence -> symbole actuel -> fichier cible -> tests/gaps, avec preuves de lignes |

### Contrat de la mission

- L'agent principal reste responsable de l'architecture et de la redaction finale.
- Le draft sous `Downloads/dmos_roadmap` fournit l'intention et les exigences ; le code du depot fournit les chemins, symboles et contraintes d'integration.
- Aucun sprint ne doit obliger le developpeur a relire les fichiers `Downloads` pour comprendre le besoin final.
- Les domaines restent sequentiels conformement a `AGENTS.md` et `CONTRIBUTING.md`.
- `code_reviewer_54` relira les documents seulement apres la premiere redaction complete.
