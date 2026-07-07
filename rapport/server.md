# Rapport serveur - @domos/server

Date: 2026-07-04

## Verdict

🟠 Version corrigée et testée localement côté serveur. Les bloqueurs remontés par la revue code ont été corrigés et couverts par tests.

## Points corrigés

- 🟠 `server.tool()` accepte maintenant une declaration exploitable par le LLM: description, schema de parametres, niveau de risque et handler.
- 🟠 Les tools serveur sont fusionnes avec les tools actifs du client avant `llm.chat()` et avant les sessions live.
- 🟠 En cas de collision de nom, le tool serveur est prioritaire pour eviter qu'un composant client modifie le contrat ou le risque d'un handler serveur.
- 🟠 HITL sait evaluer un tool serveur declare, meme s'il n'existe pas dans le registre client de la session.
- 🟠 Les tools serveur en live audio peuvent maintenant attendre une approbation puis reprendre correctement apres `APPROVAL_RESPONSE`.
- 🟠 Le compteur de connexions client est libere si l'auth passe mais que le `lineToken` est absent ou invalide.
- 🟠 `configureLines()` cree aussi le handler HTTP `/lines`, meme si les virtual lines n'etaient pas configurees au constructeur.
- 🟠 `shutdown()` attend le flush agent, la fermeture memoire, les sessions live et `transport.stop()`.
- 🟠 L'embedding dans un serveur HTTP existant ne force plus un 404 DomOS sur les routes de l'application hote.
- 🟠 Le transport WebRTC recoit aussi les handlers HTTP embarques.
- 🟠 L'AdminAPI reste synchronisee si `configureLines()` est appele apres construction.
- 🟠 `RateLimitMiddleware`, `RedisRateLimiter`, la dependance directe `redis`, Docker standalone et Cloud Pro ont ete retires de la surface serveur.

## Risques et gaps

- 🔴 Le build global `pnpm build` reste hors validation serveur: il echouait auparavant cote `apps/demo-angular` sur un import `zod`.
- 🟠 L'adapter Express est volontairement minimal: il attache DomOS au `HttpServer` fourni, mais ne fournit pas encore de middleware Express complet.
- 🟠 Les limites fines par nombre de messages ou par nombre d'appels tool ne sont pas implementees dans `VirtualLineManager`; aujourd'hui la protection serveur repose sur lignes virtuelles, TTL, limites de connexions et HITL.
- 🟠 Les docs UI / AI Studio integre doivent avoir une passe dediee: ce rapport couvre le serveur.

## Validations

- `pnpm --filter @domos/server lint` - OK.
- `pnpm --filter @domos/server build` - OK.
- `pnpm --filter @domos/server test` - OK, 18 fichiers de tests, 174 tests.

## Fichiers principaux

- `packages/server/src/core/DomOSServer.ts`
- `packages/server/src/core/ToolRouter.ts`
- `packages/server/src/middleware/hitl.security.ts`
- `packages/server/src/transport/adtp.transport.ts`
- `packages/server/src/transport/WebRTCTransport.ts`
- `packages/server/src/adapters/express.ts`
- `packages/server/tests/DomOSServer.server-tools.test.ts`
- `packages/server/tests/DomOSServer.lifecycle.test.ts`
- `DomOS_Server_Architecture.md`
