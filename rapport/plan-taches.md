# Plan de taches - Revue serveur DomOS

Date: 2026-07-04

## Terminé

- [x] Aligner `DomOS_Server_Architecture.md` sur la surface publique reelle de `@domos/server`.
- [x] Retirer la surface `standalone/**`, `@domos/server/standalone`, Cloud Pro et Docker standalone du package serveur.
- [x] Supprimer `RateLimitMiddleware`, `RedisRateLimiter`, le test dedie et la dependance directe `redis`.
- [x] Conserver la protection brute-force admin, qui est separee du rate limiting runtime supprime.
- [x] Ajouter les declarations completes des tools serveur: `name`, `description`, `parameters`, `risk`, `handler`.
- [x] Fusionner les declarations tools serveur + tools client avant les appels LLM texte/live.
- [x] Adapter HITL pour evaluer aussi le risque des tools declares cote serveur.
- [x] Corriger le leak de compteur de connexion quand les virtual lines refusent une connexion.
- [x] Rendre `configureLines()` utilisable apres construction pour exposer les routes `/lines`.
- [x] Eviter qu'un serveur HTTP embarque recoive un 404 DomOS sur ses propres routes.
- [x] Ajouter `shutdown()` waitable et garder `stop()` retrocompatible.
- [x] Ajouter un adapter minimal `@domos/server/adapters/express`.
- [x] Ajouter des tests serveur pour tools serveur, HITL, lifecycle, lignes dynamiques, HTTP embedding, WebRTC HTTP, AdminAPI dynamique et shutdown.
- [x] Executer `pnpm --filter @domos/server lint`.
- [x] Executer `pnpm --filter @domos/server build`.
- [x] Executer `pnpm --filter @domos/server test`.

## En validation finale

- [x] Integrer les retours `code_reviewer_54`.
- [x] Rejouer lint/build/test serveur apres les derniers ajustements docs/rapports.
- [x] Creer les commits cibles.
- [x] Documenter l'absence de retour exploitable de `security_reviewer_54` apres delais.

## Nouvelle passe core/client

- [x] Auditer `packages/core` apres les changements serveur.
- [x] Auditer `DomOSClient` et les consommateurs React/Angular/UI autour de HITL, tools et lignes virtuelles.
- [x] Creer `rapport/core.md`.
- [x] Creer `rapport/client.md`.
- [x] Supprimer le module proprietaire `packages/core/src/license/DomOSLicense.ts` et ses tests.
- [x] Corriger le contrat `installPlugin()` / `trackPlugin` pour rendre `pnpm --filter @domos/core test` vert.
- [x] Aligner `ToolParameterProperty.items`, `zodToToolParameters()` et `adtp.validator.ts`.
- [x] Clarifier `TOOL_RESULT` pour `success`, `error` et `pending_approval`.
- [x] Retirer le legacy `rate_limit` de `@domos/core`.
- [x] Nettoyer les dependances publish `crypto` / `webrtc` de `@domos/core`.
- [x] Executer `pnpm --filter @domos/core lint`.
- [x] Executer `pnpm --filter @domos/core test`.
- [x] Executer `pnpm --filter @domos/core build`.
- [x] Executer `pnpm --filter @domos/server lint` apres le changement de contrat core.
- [x] Ajouter les tests client pour `APPROVAL_REQUEST` serveur, erreur async `TOOL_CALL`, lifecycle mount/unmount, virtual lines et WebRTC.
- [x] Ajouter la surface effective `tools_effective` serveur -> client avec collisions.
- [x] Exposer `toolSurface`, `effectiveTools` et `ignoredClientTools` dans `DomOSClient`.
- [x] Brancher React, Angular, DevTools, Browser, Vue et Svelte sur la surface effective.
- [x] Corriger le handshake React pour transmettre `ADTP_VERSION`.
- [x] Executer `pnpm --filter @domos/server test` complet apres les changements serveur/client.
- [x] Executer les builds des packages touches: core, server, ui, react, angular, browser, vue, svelte.

## Backlog avant publication SDK

- [ ] Clarifier le comportement de `DomOSClient.send()` quand aucun transport n'est ouvert.
- [ ] Ajouter un test WebRTC end-to-end complet `DataChannel.open` -> `HANDSHAKE_INIT` -> `HANDSHAKE_ACK`.
- [ ] Ajouter une vue DevTools/AI Studio dediee a la comparaison tools locaux vs surface serveur effective.

## Hors scope de cette passe serveur

- [ ] Finaliser l'analyse complete `packages/ui` / AI Studio integre.
- [ ] Corriger le build global `pnpm build` cote `apps/demo-angular` si l'import `zod` reste absent.
- [ ] Produire une passe dediee sur SDK Angular/React apres stabilisation serveur.
