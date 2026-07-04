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
- [ ] Creer les commits cibles.
- [x] Documenter l'absence de retour exploitable de `security_reviewer_54` apres delais.

## Hors scope de cette passe serveur

- [ ] Finaliser l'analyse complete `packages/ui` / AI Studio integre.
- [ ] Corriger le build global `pnpm build` cote `apps/demo-angular` si l'import `zod` reste absent.
- [ ] Produire une passe dediee sur SDK Angular/React apres stabilisation serveur.
