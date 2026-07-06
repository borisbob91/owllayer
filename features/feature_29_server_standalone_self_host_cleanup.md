# Feature #29 : Nettoyage self-host only du standalone server

**Statut** : 🟡 Validée  
**Domaine** : server  
**Porteur** : @BorisBob  
**Validé par** : @BorisBob  
**Date** : 2026-04-07

---

## Objectif

Retirer du chemin principal `packages/server/src/standalone` toute logique plateforme cloud/SaaS, sans perdre les capacités utiles du serveur standalone pour un usage personnel self-host et open source.

Le livrable attendu n'est pas une cohabitation cloud derrière un flag. Le livrable attendu est un standalone qui ne raconte plus qu'une seule histoire produit : serveur DomOS local, auto-hébergeable, documenté et maintenable.

---

## Diagnostic actuel

Le repo réel montre aujourd'hui un mélange explicite entre un produit self-host utile et une couche cloud qui a colonisé le même point d'entrée runtime.

- `packages/server/src/standalone/createDomOSServer.ts` charge correctement la config, les adapters, les plugins, les API keys locales et le health check, mais initialise aussi conditionnellement Prisma, Postgres, Redis, JWT, quotas, Stripe, analytics, audit et store connectors.
- `packages/server/src/standalone/createDomOSServer.ts` route aujourd'hui `/health` et `/api/*` dans le même `extraHttpHandler`, ce qui mélange serveur local et REST SaaS multi-tenant dans la même surface standalone.
- `packages/server/src/standalone/config/schema.ts` et `packages/server/src/standalone/config/types.ts` portent encore `mode: 'self' | 'cloud'` et une section `cloud`, ce qui rend la configuration officielle ambiguë.
- `packages/server/package.json` expose encore des dépendances et externals cloud (`@prisma/client`, `@prisma/adapter-pg`, `pg`, `redis`, `stripe`, `jsonwebtoken`) alors que la cible retenue n'est plus une plateforme SaaS.
- `packages/server/CLOUD-PRO.md`, `packages/server/docker/docker-compose.cloud.yml`, `packages/server/docker/config/domos.cloud.yml`, `packages/server/prisma/schema.prisma` et le bloc cloud de `packages/server/domos.config.example.yml` maintiennent une documentation et une distribution cloud actives au même niveau que le self-host.
- Les capacités réellement utiles du standalone existent déjà et sont identifiables, mais elles sont entremêlées avec la couche cloud, ce qui augmente fortement le risque de supprimer trop large lors du nettoyage.

Conclusion de diagnostic : le problème n'est pas que le standalone manque de valeur. Le problème est qu'il mélange deux produits incompatibles. La cible validée impose de garder le standalone utile et de sortir franchement le cloud du chemin principal.

---

## Cible produit retenue

Une seule stratégie est retenue : `@domos/server/standalone` devient un produit **self-host only**.

Après nettoyage, le standalone doit couvrir exactement ce socle :

- bootstrap local du serveur DomOS
- configuration self-host YAML + variables d'environnement
- adapters LLM, live audio, STT et TTS utiles au self-host
- admin local session-based
- API keys locales et overrides de prompt
- health check local
- plugins serveur chargés depuis la config
- virtual lines locales
- UI locale embarquée si activée

Le standalone ne doit plus embarquer, documenter ni distribuer comme surface active : orgs, projects, auth JWT cloud, billing Stripe, quotas, analytics, audit, store-connect cloud, Prisma/Redis cloud, routes `/api/*` SaaS ni configuration cloud active.

---

## Besoin

Le mainteneur veut pouvoir supprimer lui-même le dossier cloud ensuite, sans casser le standalone réellement utile.

### User story

> En tant que mainteneur DomOS orienté self-host, je veux un standalone recentré sur les usages locaux réellement utiles, afin de supprimer la couche cloud sans perdre le bootstrap, l'admin local, les adapters, les API keys, les plugins, les virtual lines ni la UI locale.

---

## Périmètre strict

Inclus dans cette feature :

- `packages/server/src/standalone/**`
- les groupes de fichiers `packages/server/src/admin/**`, `packages/server/src/lines/**` et `packages/server/src/plugins/**` uniquement dans leur relation directe avec le standalone self-host
- `packages/server/package.json`
- `packages/server/SELF-HOSTING.md`
- `packages/server/CLOUD-PRO.md`
- `packages/server/domos.config.example.yml`
- `packages/server/docker/docker-compose.yml`
- `packages/server/docker/docker-compose.cloud.yml`
- `packages/server/docker/config/**`
- `packages/server/prisma/**`

Hors périmètre :

- refactor de `packages/server/src/core/**` sans nécessité directe pour le cleanup standalone
- refonte des adapters `@domos/adapter-google`, `@domos/adapter-openai`, `@domos/adapter-anthropic`
- nouveau produit cloud hors standalone
- migration vers une architecture hybride cloud derrière feature flag

---

## Ce qu'on garde absolument

Les éléments suivants restent canonique dans le repo et dans le chemin principal standalone :

- `packages/server/src/standalone/main.ts`, `createDomOSServer.ts`, `index.ts` comme bootstrap self-host unique
- `packages/server/src/standalone/config/loader.ts`, `schema.ts`, `types.ts` comme surface de configuration self-host unique
- `packages/server/src/standalone/adapters/factory.ts` comme point de composition LLM/live/STT/TTS pour le standalone
- `packages/server/src/admin/AdminAPI.ts` et `packages/server/src/admin/DashboardUIHandler.ts` comme administration locale et UI locale
- `config.apiKeys`, `client.requireApiKey`, `client.enableApiKeyManagement`, `server.addApiKey()` et `server.setPromptOverride()` comme gestion locale des clés et prompts
- `packages/server/src/standalone/health.ts` et la route `/health`
- `packages/server/src/standalone/plugins/pluginLoader.ts` et le système de plugins serveur
- `packages/server/src/lines/VirtualLineManager.ts` et le handling local des virtual lines
- `packages/server/SELF-HOSTING.md`, `packages/server/docker/docker-compose.yml`, `packages/server/docker/config/domos.config.yml`, `packages/server/.env.example`, `packages/server/Dockerfile` comme documentation et packaging self-host actifs

---

## Ce qu'on supprime absolument

Les éléments suivants sortent du chemin principal standalone et ne doivent plus être présentés comme partie du produit standalone :

- `packages/server/src/standalone/cloud/**`
- toute branche `config.mode === 'cloud'` dans `packages/server/src/standalone/createDomOSServer.ts`
- toute section `cloud` et toute valeur `mode: cloud` dans `packages/server/src/standalone/config/schema.ts`, `types.ts` et les exemples YAML actifs
- toute route `/api/*` SaaS branchée depuis le standalone
- les groupes métier cloud : orgs, projects, auth JWT/RBAC cloud, billing Stripe, quotas, analytics, audit, store-connect Shopify/WooCommerce cloud
- `packages/server/CLOUD-PRO.md`
- `packages/server/docker/docker-compose.cloud.yml`
- `packages/server/docker/config/domos.cloud.yml`
- `packages/server/prisma/schema.prisma`
- les dépendances runtime et build cloud encore déclarées uniquement pour ce chemin

---

## Règles de design

1. `@domos/server/standalone` ne supporte plus qu'un seul produit : self-host local.
2. Aucun compromis `cloud` derrière flag, variable d'environnement ou branche conditionnelle n'est autorisé.
3. Le bootstrap standalone garde sa surface publique utile actuelle : `createDomOSServer()`, `loadConfig()`, `DomOSConfigSchema`, `DomOSConfig`.
4. L'admin standalone reste local et session-based. Il ne bascule pas vers JWT ni vers une base de données cloud.
5. Les API keys du standalone restent locales, déclaratives et compatibles avec les overrides de prompt.
6. Les adapters LLM/live/STT/TTS utiles au self-host restent branchés depuis le standalone via les adapters existants ou, pour `ElevenLabsTTS`, via le provider local tant qu'aucun package dédié n'existe.
7. Les plugins serveur et les virtual lines restent des capacités de premier rang du standalone, pas des options secondaires.
8. La UI locale embarquée reste autorisée si elle repose uniquement sur l'admin local et le runtime local.
9. La documentation active du package serveur doit parler uniquement du self-host une fois la purge terminée.
10. Aucun nouveau package npm n'est ajouté pour réaliser ce cleanup.

---

## Codes stables

| Code | Déclencheur | Décision attendue |
| --- | --- | --- |
| `STANDALONE-SH-001` | `packages/server/src/standalone/createDomOSServer.ts` importe encore `./cloud/**` | Refus de clôture tant que le bootstrap standalone dépend du cloud |
| `STANDALONE-SH-002` | `packages/server/src/standalone/config/schema.ts` ou `types.ts` acceptent encore `mode: cloud` ou `cloud:` | Refus de clôture tant que la config officielle reste ambigüe |
| `STANDALONE-SH-003` | Le standalone route encore `/api/*` | Refus de clôture tant que la surface SaaS reste active |
| `STANDALONE-SH-004` | Une capacité utile self-host disparaît pendant le cleanup | Refus de clôture tant que le standalone n'a pas retrouvé bootstrap, admin, API keys, plugins, virtual lines, health et UI locale utile |
| `STANDALONE-SH-005` | `packages/server/CLOUD-PRO.md` ou un équivalent cloud actif reste distribué avec le package serveur | Refus de clôture tant que la documentation produit raconte encore deux directions |
| `STANDALONE-SH-006` | `packages/server/package.json` garde des dépendances cloud-only non justifiées | Refus de clôture tant que le graphe de dépendances ne reflète pas la cible self-host |
| `STANDALONE-SH-007` | `docker-compose.cloud.yml`, `domos.cloud.yml` ou `prisma/schema.prisma` restent dans la distribution standalone active | Refus de clôture tant que le packaging cloud reste embarqué |
| `STANDALONE-SH-008` | L'admin local, la UI locale ou les virtual lines changent de contrat sans décision écrite | Refus de clôture tant que la régression n'est pas explicitement corrigée |

---

## Découpage par phases / blocs

### Bloc 1 — Désenchevêtrer le bootstrap standalone

**startIndex recommandé** : 1

#### Bloc 1 — AVANT

- `createDomOSServer(configPath?)` charge le socle self-host utile, puis ouvre aussi une branche cloud qui instancie Prisma, Postgres, Redis, JWT, quotas, Stripe, analytics, audit et store connectors.
- `extraHttpHandler` sert à la fois `/health` et `/api/*`.
- `StandaloneServer.close()` porte encore le nettoyage de connexions Postgres/Redis liées au cloud.

#### Bloc 1 — APRÈS

- `createDomOSServer(configPath?)` ne construit plus que le runtime self-host : config, adapters, serveur, API keys locales, plugins, health.
- `extraHttpHandler` ne gère plus que les besoins HTTP locaux utiles au standalone.
- `StandaloneServer.close()` n'a plus aucune responsabilité liée à Prisma, Redis ou au router cloud.

#### Bloc 1 — POURQUOI

- Tant que le bootstrap officiel mélange self-host et cloud, supprimer `cloud/` reste risqué et le standalone reste trompeur.

#### Bloc 1 — Service interface methods concernés

- `createDomOSServer(configPath?)`
- `loadConfig(configPath?)`
- `buildAdapters(config)`
- `getHealthStatus(server)`
- `StandaloneServer.listen(callback?)`
- `StandaloneServer.close()`

#### Bloc 1 — Boilerplate libs à réutiliser

- `@domos/core`
- `@domos/adapter-google`
- `@domos/adapter-openai`
- `@domos/adapter-anthropic`
- `dotenv`
- `yaml`
- `zod`

### Bloc 2 — Verrouiller la configuration self-host canonique

**startIndex recommandé** : 2

#### Bloc 2 — AVANT

- `DomOSConfigSchema` et `DomOSConfig` décrivent deux produits incompatibles dans le même contrat.
- `domos.config.example.yml` et `docker/config/domos.config.yml` gardent une trace active du cloud.
- Le lecteur de config continue à porter une logique de merge environnement orientée cloud.

#### Bloc 2 — APRÈS

- La config officielle ne décrit plus que le self-host : réseau, LLM/live/STT/TTS, admin local, auth client locale, rate limit, UI locale, API keys, plugins, virtual lines.
- `mode` ne transporte plus de dualité produit dans le standalone.
- Les exemples YAML actifs deviennent une source de vérité self-host unique.

#### Bloc 2 — POURQUOI

- La documentation de configuration est le premier contrat lu par un utilisateur. Si elle reste mixte, le produit reste mixte même après suppression de code.

#### Bloc 2 — Service interface methods concernés

- `loadConfig(configPath?)`
- `DomOSConfigSchema`
- `buildLLMAdapter(config)`
- `buildLiveAdapter(config)`
- `buildSTT(config)`
- `buildTTS(config)`

#### Bloc 2 — Boilerplate libs à réutiliser

- `yaml`
- `zod`
- types existants de `@domos/core`

### Bloc 3 — Sanctuariser les capacités standalone à conserver

**startIndex recommandé** : 3

#### Bloc 3 — AVANT

- Les capacités utiles du standalone existent, mais elles ne sont pas traitées comme des invariants de cleanup.
- Un nettoyage trop large peut supprimer par accident l'admin local, les prompts locaux, la UI embarquée, les plugins ou les virtual lines en même temps que le cloud.

#### Bloc 3 — APRÈS

- Les capacités self-host à garder deviennent explicites et intouchables pendant la purge : admin local, UI locale, API keys locales, overrides de prompt, plugins, virtual lines, health, adapters, bootstrap.
- Le standalone garde une valeur produit complète pour un usage personnel et open source, sans dépendre d'aucun backend SaaS.

#### Bloc 3 — POURQUOI

- L'objectif du cleanup n'est pas de réduire le standalone à un noyau minimal. L'objectif est de conserver tout ce qui sert réellement au self-host et uniquement cela.

#### Bloc 3 — Service interface methods concernés

- `AdminAPI.handleRequest(req, res)`
- `VirtualLineManager.hasPool(apiKey)`
- `VirtualLineManager.ensurePool(apiKey)`
- `VirtualLineManager.acquire(apiKey)`
- `VirtualLineManager.bindSession(token, sessionId)`
- `VirtualLineManager.release(token)`
- `loadPluginsFromConfig(server, plugins?)`
- `server.addApiKey(key)`
- `server.setPromptOverride(key, prompt)`

#### Bloc 3 — Boilerplate libs à réutiliser

- `@domos/ui`
- `@domos/core`
- runtime plugins déjà présents dans `packages/server/src/plugins/**`
- aucun nouvel outillage de persistence ou d'auth cloud

### Bloc 4 — Purger la surface SaaS et la distribution cloud

**startIndex recommandé** : 4

#### Bloc 4 — AVANT

- `packages/server/src/standalone/cloud/**` expose encore auth, orgs, projects, agents, lines, analytics, billing, audit et stores.
- `createCloudRouter(deps)` branche encore ces routes sous `/api/*`.
- Le package serveur distribue encore une doc cloud, un compose cloud, une config cloud et un schéma Prisma cloud.

#### Bloc 4 — APRÈS

- Le dossier `packages/server/src/standalone/cloud/**` sort du chemin principal standalone et peut être supprimé sans ambiguïté.
- `/api/*` n'est plus une surface officielle du standalone.
- Le package serveur ne distribue plus de doc ni de config cloud actives.

#### Bloc 4 — POURQUOI

- Le nettoyage n'est crédible que si le cloud disparaît du runtime, du packaging et de la documentation en même temps.

#### Bloc 4 — Service interface methods concernés

- `createCloudRouter(deps)`
- `handleAuth(req, res, segments, deps)`
- `handleOrgs(req, res, segments, deps)`
- `handleProjects(req, res, segments, deps)`
- `handleAgents(req, res, segments, deps)`
- `handleLines(req, res, segments, deps)`
- `handleAnalytics(req, res, segments, deps)`
- `handleBilling(req, res, segments, deps)`
- `handleAudit(req, res, segments, deps)`
- `handleStores(req, res, segments, deps)`

#### Bloc 4 — Boilerplate libs à réutiliser

- aucun

### Bloc 5 — Nettoyer les dépendances et fermer le gate produit

**startIndex recommandé** : 5

#### Bloc 5 — AVANT

- `packages/server/package.json` porte encore des dépendances cloud-only et des externals build associés.
- La matrice de distribution du package serveur raconte encore deux produits.

#### Bloc 5 — APRÈS

- `packages/server/package.json` ne garde que les dépendances utiles au standalone self-host.
- Les scripts, externals et assets distribués reflètent un unique produit self-host.
- Le cleanup se ferme avec un gate binaire : standalone self-host cohérent, ou feature non terminée.

#### Bloc 5 — POURQUOI

- Tant que le graphe de dépendances et le packaging racontent encore le cloud, le cleanup reste incomplet même si le code principal a été purgé.

#### Bloc 5 — Service interface methods concernés

- aucun nouveau service métier
- validation ciblée de `createDomOSServer(configPath?)`, `loadConfig(configPath?)`, `AdminAPI.handleRequest(req, res)` et `VirtualLineManager.acquire(apiKey)` dans le produit final

#### Bloc 5 — Boilerplate libs à réutiliser

- scripts `build`, `lint`, `test` existants
- `pnpm --filter @domos/server`

---

## Fichiers ou groupes de fichiers clés concernés

### À conserver comme canon self-host

| Fichier ou groupe | AVANT | APRÈS | POURQUOI |
| --- | --- | --- | --- |
| `packages/server/src/standalone/createDomOSServer.ts` | Bootstrap mixte self-host + cloud | Bootstrap self-host unique | En faire le point d'entrée produit clair |
| `packages/server/src/standalone/config/loader.ts` | Charge une config encore ambigüe | Charge uniquement la config self-host canonique | Réduire l'ambiguïté produit |
| `packages/server/src/standalone/config/schema.ts` | Schéma dual self/cloud | Schéma self-host uniquement | Rendre le contrat de config net |
| `packages/server/src/standalone/config/types.ts` | Types dual self/cloud | Types self-host uniquement | Aligner types et produit réel |
| `packages/server/src/standalone/adapters/factory.ts` | Compose déjà les adapters utiles | Reste le point de composition LLM/live/STT/TTS du standalone | Préserver la valeur runtime réelle |
| `packages/server/src/standalone/health.ts` | Health check local déjà utile | Reste exposé comme surface standard | Garder l'observabilité minimale attendue |
| `packages/server/src/standalone/plugins/pluginLoader.ts` | Charge les plugins depuis la config | Reste canonique dans le standalone | Préserver l'extensibilité open source |
| `packages/server/src/admin/**` | Admin local et UI locale déjà branchés côté serveur | Restent des capacités self-host officielles | Garder l'administration locale utile |
| `packages/server/src/lines/**` | Virtual lines locales opérationnelles | Restent supportées et documentées | Garder une capacité utile différenciante du standalone |
| `packages/server/SELF-HOSTING.md` | Guide self-host déjà présent | Devient la doc serveur principale | Aligner la doc avec la cible retenue |
| `packages/server/docker/docker-compose.yml` | Compose self-host présent | Reste le compose officiel du package serveur | Garder un packaging simple pour l'auto-hébergement |
| `packages/server/docker/config/domos.config.yml` | Exemple self-host déjà présent | Devient l'unique config Docker officielle | Éviter toute confusion de déploiement |
| `packages/server/.env.example` | Variables locales déjà utiles | Reste l'exemple d'environnement officiel | Guider le setup self-host |
| `packages/server/Dockerfile` | Image serveur unique mais encore entourée d'artefacts cloud | Reste la distribution container officielle self-host | Conserver le packaging utile |

### À sortir du chemin principal standalone

| Fichier ou groupe | AVANT | APRÈS | POURQUOI |
| --- | --- | --- | --- |
| `packages/server/src/standalone/cloud/**` | Domaine SaaS embarqué dans le standalone | Supprimé du chemin principal | Supprimer le second produit |
| `packages/server/src/standalone/cloud/routes/index.ts` et `routes/*.ts` | Router `/api/*` et handlers SaaS actifs | Retirés du standalone | Couper la surface REST cloud |
| `packages/server/CLOUD-PRO.md` | Documentation cloud distribuée comme doc produit active | Retirée | Ne plus documenter une direction abandonnée |
| `packages/server/docker/docker-compose.cloud.yml` | Compose cloud actif | Retiré | Ne plus distribuer de stack cloud |
| `packages/server/docker/config/domos.cloud.yml` | Config cloud active | Retirée | Ne plus exposer de config produit concurrente |
| `packages/server/prisma/schema.prisma` | Schéma de données cloud | Retiré du package serveur standalone | Prisma ne fait pas partie du produit self-host retenu |
| `packages/server/domos.config.example.yml` bloc cloud | Exemple mixte | Exemple self-host pur | Le fichier d'exemple doit être sans ambiguïté |
| `packages/server/package.json` dépendances cloud-only | Dépendances encore présentes | Dépendances cloud-only retirées | Aligner runtime et graphe npm |

---

## Dépendances npm à retirer à terme

| Package | Statut cible | Pourquoi |
| --- | --- | --- |
| `@prisma/client` | retirer | Utilisé par `createDomOSServer.ts` cloud et `src/standalone/cloud/**` |
| `@prisma/adapter-pg` | retirer | Utilisé uniquement pour la branche Postgres cloud |
| `pg` | retirer | Utilisé uniquement pour la branche Postgres cloud |
| `redis` | retirer | Utilisé uniquement pour la branche Redis cloud |
| `stripe` | retirer | Utilisé uniquement par `StripeService` cloud |
| `jsonwebtoken` | retirer | Utilisé uniquement par `JWTAuthService` cloud |
| `prisma` | retirer | Outil de schéma/migration cloud |
| `@types/pg` | retirer | Lié à `pg` cloud |
| `@types/jsonwebtoken` | retirer | Lié à `jsonwebtoken` cloud |

`bcrypt` et `@types/bcrypt` restent en place : ils servent aussi l'auth admin locale et ne font pas partie du nettoyage cloud.

---

## Risques / breaking changes assumés

- Toute config qui utilise encore `mode: cloud` ou un bloc `cloud:` devient invalide.
- Toute consommation de routes `/api/*` depuis le standalone cesse d'être supportée.
- Toute dépendance implicite à Prisma, Redis, Stripe, JWT cloud, orgs, projects, analytics, audit ou store-connect cloud devient hors support dans `@domos/server` standalone.
- Les guides, scripts ou déploiements internes qui reposaient sur `docker-compose.cloud.yml`, `domos.cloud.yml` ou `CLOUD-PRO.md` cassent volontairement.
- La suppression du cloud n'est pas considérée comme une régression produit. C'est la décision produit.

---

## Gate final

La feature est terminée uniquement si :

1. `packages/server/src/standalone/createDomOSServer.ts` n'importe plus aucun module `./cloud/**`.
2. `packages/server/src/standalone/config/schema.ts` et `types.ts` ne décrivent plus aucune surface cloud.
3. Le standalone continue de fournir bootstrap local, adapters, admin local, API keys locales, health, plugins, virtual lines et UI locale utile.
4. Aucune route `/api/*` SaaS ne reste servie par le standalone.
5. `packages/server/CLOUD-PRO.md`, `docker-compose.cloud.yml`, `docker/config/domos.cloud.yml` et `prisma/schema.prisma` sont retirés du chemin principal serveur.
6. `packages/server/package.json` ne dépend plus de `@prisma/client`, `@prisma/adapter-pg`, `pg`, `redis`, `stripe`, `jsonwebtoken`, `prisma`, `@types/pg`, `@types/jsonwebtoken`.
7. `packages/server/SELF-HOSTING.md`, `packages/server/domos.config.example.yml` et `packages/server/docker/config/domos.config.yml` décrivent uniquement le self-host.
8. `pnpm --filter @domos/server build`, `pnpm --filter @domos/server lint` et les tests ciblés du package serveur passent après la purge.

---

## Ce qu'on ne fait pas

- On ne garde pas un mode cloud caché derrière un flag.
- On ne remplace pas le cloud supprimé par une nouvelle architecture intermédiaire.
- On ne refactorise pas `packages/server/src/core/**` au-delà de ce que le cleanup standalone impose strictement.
- On ne modifie pas les adapters externes autrement que pour préserver leur branchement self-host existant.
- On ne requalifie pas le standalone en plateforme multi-tenant.
