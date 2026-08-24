# Feature #30 : Analytics local self-host dans le server principal

**Statut** : 🟡 Validée  
**Domaine** : server  
**Porteur** : @BorisBob  
**Validé par** : @BorisBob  
**Date** : 2026-04-07

---

## Objectif

Ajouter dans `packages/server` une capacité d'analytics historique locale, self-host et single-tenant, capable de résumer l'usage du serveur dans le temps sans réutiliser le design `standalone/cloud`.

Le sprint doit produire une seule histoire technique cohérente :

- les métriques live restent dans `AdminAPI` via `/admin/metrics`
- les analytics historiques et agrégés sont ajoutés dans le server principal
- la persistance est locale et alignée avec les patterns de stores déjà présents
- aucun composant cloud n'est migré ou conservé comme dépendance conceptuelle

---

## Diagnostic actuel

Le repo réel montre déjà les briques utiles, mais pas encore l'assemblage historique local dont on a besoin.

- `packages/server/src/admin/AdminAPI.ts` expose déjà `GET /admin/metrics` et sait calculer des métriques temps réel sur les sessions actives. Cette route ne couvre pas l'historique et ne doit pas être détournée pour cela.
- `packages/server/src/memory/SessionGraph.ts` est déjà la source de vérité session-level pour `totalMessages`, `totalToolCalls`, `totalTokensIn`, `totalTokensOut` et `errors`.
- `packages/server/src/core/OwlLayerServer.ts` dispose déjà du hook `onBeforeSessionDestroy`, exactement au bon endroit pour transformer une session vivante en résumé persistant.
- `packages/server/src/core/SessionManager.ts` porte déjà `apiKey`, `createdAt`, `lastActivityAt` et `graph` sur chaque session. Les données minimales pour calculer `durationMs` et agréger par clé locale existent donc déjà.
- `packages/server/src/persistence/types.ts` montre déjà le pattern officiel du repo pour la persistance: interface abstraite, implémentations mémoire / SQLite / Mongo quand c'est justifié.
- `packages/server` embarque déjà `better-sqlite3` et des stores SQLite (`SQLiteApiKeyStore`, `SQLiteAgentStore`, `SQLiteStore`). Le repo a donc déjà choisi SQLite comme brique self-host locale acceptable.

En parallèle, le draft `standalone/cloud` contient une intuition métier utile mais un design cible faux.

- `packages/server/src/standalone/cloud/analytics/AnalyticsService.ts` montre la bonne idée fonctionnelle: sessions, tokens in/out, tool calls, coût estimé, durée moyenne.
- Le même draft dépend de `PrismaClient`, `orgId`, `projectId` et de `usageRecord` multi-tenant. Cette forme est incompatible avec la cible validée.
- `packages/server/src/standalone/cloud/routes/analytics.ts` expose un contrat `/api/orgs/:orgId/analytics` propre à une surface SaaS multi-tenant qui doit disparaître avec `standalone/cloud`.

Conclusion de diagnostic : on ne doit pas migrer `standalone/cloud/analytics`. On doit réimplémenter proprement une analytics locale du server principal, branchée au cycle de vie réel des sessions et persistée avec une brique locale déjà légitime dans le repo.

---

## Besoin

Le mainteneur veut conserver la capacité métier utile du draft analytics sans conserver son design cloud.

### User story

> En tant qu'opérateur d'un serveur OwlLayer self-host local, je veux consulter un résumé historique de l'usage du serveur dans le temps, afin de comprendre le volume de sessions, de tokens, de tool calls, le coût estimé et la durée moyenne sans dépendre d'un backend cloud ou multi-tenant.

---

## Positionnement MVP du sprint

Une seule stratégie est recommandée et autorisée pour ce sprint :

**persister localement un résumé immuable de chaque session fermée dans le server principal, puis exposer une lecture agrégée par jour et optionnellement par `apiKey` locale via l'Admin API.**

Le MVP ne repose pas sur une agrégation cloud, pas sur Prisma, pas sur une table `usageRecord` multi-tenant, pas sur des orgs, pas sur des projects, et pas sur un simple écran temps réel.

Le MVP retient exactement ces métriques historiques:

- `totalSessions`
- `totalTokensIn`
- `totalTokensOut`
- `totalToolCalls`
- `estimatedCostUsd`
- `averageDurationMs`

Le MVP peut en plus transporter `errors` comme métrique secondaire d'exploitation, mais ce n'est pas l'axe principal du sprint.

Le regroupement recommandé pour le MVP est :

- regroupement principal par jour
- filtre optionnel par `apiKey` locale
- période bornée via `start` et `end`

---

## Règles de design

1. Domaine unique : `server`.
2. Une seule stratégie produit : analytics locale self-host branchée au server principal.
3. `GET /admin/metrics` reste une surface live sur les sessions actives. Il ne devient pas une API historique.
4. La source de vérité des compteurs d'usage reste `SessionGraph` tant que la session est vivante.
5. La capture historique se fait au moment de la fermeture de session via `onBeforeSessionDestroy` dans `OwlLayerServer`.
6. La persistance doit suivre le style du repo : interface de store dédiée + implémentation locale cohérente, pas de backend exotique.
7. L'implémentation concrète recommandée pour le MVP est SQLite locale via `better-sqlite3`, déjà présente dans `@owllayer/server`.
8. Le coût stocké est un `estimatedCostUsd` informatif, jamais un signal de billing ou de quota.
9. Aucun identifiant `orgId`, `projectId`, `usageRecord` SaaS, quota, billing, Stripe, Redis, JWT ou Prisma n'entre dans le contrat cible.
10. On ne migre pas `standalone/cloud`; on le laisse mourir et on réimplémente dans le server principal.
11. L'activation self-host doit rester locale et single-tenant. Aucune sémantique multi-tenant n'est tolérée dans l'API ni dans la persistance.
12. Le sprint ne crée pas une plateforme BI. Il crée une analytics historique d'usage du serveur.

---

## Ce qu'on garde du draft standalone

On garde uniquement l'intuition métier du draft analytics cloud :

- résumer l'usage du serveur dans le temps
- compter sessions, tokens in/out, tool calls
- estimer un coût serveur indicatif
- calculer une durée moyenne de session

---

## Ce qu'on ne garde PAS du draft standalone

- `PrismaClient`
- `orgId`
- `projectId`
- `usageRecord` SaaS
- route `/api/orgs/:orgId/analytics`
- auth JWT / RBAC
- quotas
- billing
- Stripe
- Redis
- Prisma
- logique multi-tenant
- analytics cloud par organisation / projet

---

## Codes stables

### Error codes stables

| Code | Cas | Réponse attendue |
| --- | --- | --- |
| `ANALYTICS-LCL-001` | `start` ou `end` invalide | `400` avec message de plage invalide |
| `ANALYTICS-LCL-002` | `groupBy` différent de `day` dans le MVP | `400` avec rappel du contrat MVP |
| `ANALYTICS-LCL-003` | analytics historique non configurée côté serveur | `503` sur la route historique admin |
| `ANALYTICS-LCL-004` | échec d'écriture du résumé de session dans le store local | erreur loggée + signal serveur stable, sans fallback cloud |
| `ANALYTICS-LCL-005` | `apiKey` de filtre vide ou invalide | `400` |

### Gate codes

| Code | Gate |
| --- | --- |
| `ANALYTICS-GATE-001` | `/admin/metrics` reste live-only et n'est pas détourné en endpoint historique |
| `ANALYTICS-GATE-002` | une session fermée écrit bien un résumé local contenant `apiKey`, tokens, tool calls, coût estimé et durée |
| `ANALYTICS-GATE-003` | `GET /admin/analytics/summary` retourne une agrégation par jour correcte sur une plage donnée |
| `ANALYTICS-GATE-004` | le filtre optionnel par `apiKey` locale fonctionne sans introduire de notion multi-tenant |
| `ANALYTICS-GATE-005` | aucun import ni contrat ne dépend de `standalone/cloud`, `PrismaClient`, `orgId` ou `projectId` |
| `ANALYTICS-GATE-006` | l'activation self-host officielle repose sur la même persistance locale, pas sur une seconde implémentation |

---

## Découpage par blocs / phases

### Bloc 1 — Poser le contrat analytics historique du server principal

**startIndex recommandé** : 1

#### AVANT

- Le server principal n'a pas de contrat explicite pour l'analytics historique.
- `AdminAPI` ne distingue aujourd'hui que du monitoring live.
- Le pattern de store existe, mais aucun store analytics n'est défini.

#### APRÈS

- Le server principal dispose d'un contrat clair pour l'analytics historique locale.
- Une interface `AnalyticsStore` existe dans le style des stores existants.
- Un service dédié orchestre l'écriture des résumés de session fermée et la lecture agrégée.

#### POURQUOI

- Sans contrat dédié, l'analytics historique risque soit d'être recollée à `AdminAPI` de façon ad hoc, soit d'être rebranchée sur le mauvais modèle cloud.

#### Service interface methods à introduire

- `AnalyticsStore.saveSession(record)`
- `AnalyticsStore.getSummary(query)`
- `LocalAnalyticsService.recordClosedSession(input)`
- `LocalAnalyticsService.getSummary(query)`

#### Boilerplate libs / briques existantes à réutiliser

- `packages/server/src/persistence/types.ts`
- `packages/server/src/persistence/SQLiteApiKeyStore.ts`
- `packages/server/src/persistence/SQLiteAgentStore.ts`
- `better-sqlite3`

### Bloc 2 — Capturer un résumé immuable à la fermeture de session

**startIndex recommandé** : 2

#### AVANT

- Les compteurs existent dans `SessionGraph`, mais ils meurent avec la session.
- `OwlLayerServer` sait quand une session s'arrête, mais rien d'historique n'est persisté.

#### APRÈS

- Chaque session fermée produit un résumé local immuable comprenant au minimum :
  - `sessionId`
  - `apiKey`
  - `startedAt`
  - `endedAt`
  - `durationMs`
  - `totalMessages`
  - `totalToolCalls`
  - `totalTokensIn`
  - `totalTokensOut`
  - `errors`
  - `estimatedCostUsd`
- L'écriture est déclenchée depuis `OwlLayerServer` à l'endroit canonique de fin de vie de session.

#### POURQUOI

- Persister un résumé de session fermée est le plus petit objet historique utile.
- Cette approche garde la vérité métier là où elle existe déjà et évite toute dépendance à une surface cloud.

#### Service interface methods à introduire

- `LocalAnalyticsService.buildSessionRecord(session)`
- `LocalAnalyticsService.estimateCostUsd(tokensIn, tokensOut)`
- `LocalAnalyticsService.recordClosedSession(input)`

#### Boilerplate libs / briques existantes à réutiliser

- `packages/server/src/core/OwlLayerServer.ts`
- `packages/server/src/core/SessionManager.ts`
- `packages/server/src/memory/SessionGraph.ts`

### Bloc 3 — Exposer une lecture historique agrégée sans casser l'admin live

**startIndex recommandé** : 3

#### AVANT

- `GET /admin/metrics` additionne uniquement les sessions actives en mémoire.
- Il n'existe pas d'endpoint admin pour l'historique agrégé.

#### APRÈS

- `GET /admin/metrics` reste inchangé et garde sa sémantique live.
- Un endpoint historique dédié est ajouté, recommandé sous la forme :
  - `GET /admin/analytics/summary?start=YYYY-MM-DD&end=YYYY-MM-DD&groupBy=day&apiKey=...`
- La réponse historique retourne des buckets journaliers avec :
  - `period`
  - `apiKey` si filtre demandé
  - `totalSessions`
  - `totalTokensIn`
  - `totalTokensOut`
  - `totalToolCalls`
  - `estimatedCostUsd`
  - `averageDurationMs`

#### POURQUOI

- Le besoin confirmé n'est pas le live-only. Il est de résumer l'usage du serveur dans le temps.
- Mélanger historique et live dans une même route rendrait le contrat d'admin ambigu et fragile.

#### Service interface methods à introduire

- `LocalAnalyticsService.getSummary(query)`
- `AdminAPI.getHistoricalAnalytics(query)`

#### Boilerplate libs / briques existantes à réutiliser

- `packages/server/src/admin/AdminAPI.ts`
- `packages/server/src/admin/AdminAuthManager.ts`

### Bloc 4 — Brancher l'analytics locale sur le self-host officiel sans réintroduire le cloud

**startIndex recommandé** : 4

#### AVANT

- Le server principal peut gagner une analytics historique, mais le self-host officiel ne la branche pas encore automatiquement.
- `standalone/cloud` portait un mauvais design et va être supprimé.

#### APRÈS

- Le self-host officiel active la même analytics locale via la même implémentation server-side.
- La configuration recommandée reste locale et simple, par exemple via une section `analytics` pointant vers le fichier SQLite self-host.
- Aucun fichier `standalone/cloud` n'est importé, copié ni adapté.

#### POURQUOI

- Le produit ciblé est self-host local. Il faut donc que l'entrée self-host officielle puisse brancher la même capacité sans recréer une seconde architecture.

#### Service interface methods à introduire

- `buildAnalyticsStore(config)`
- `createOwlLayerServer(configPath?)` branche `analyticsStore` sur `OwlLayerServer`

#### Boilerplate libs / briques existantes à réutiliser

- `packages/server/src/standalone/createOwlLayerServer.ts`
- `packages/server/src/standalone/config/schema.ts`
- `packages/server/src/standalone/config/types.ts`
- le même fichier SQLite local déjà utilisé par les autres stores self-host quand c'est pertinent

### Bloc 5 — Fermer le sprint avec un gate de compatibilité net

**startIndex recommandé** : 5

#### AVANT

- Le repo a encore une tentation de confusion entre analytics live, analytics historique et analytics cloud.

#### APRÈS

- Le server principal expose un contrat stable, testable et local.
- Le self-host officiel consomme ce contrat.
- `standalone/cloud` n'est plus une dépendance conceptuelle de l'analytics.

#### POURQUOI

- Sans gate final explicite, le sprint peut dériver vers une pseudo-migration du cloud ou vers un simple doublon de `/admin/metrics`.

#### Service interface methods à introduire

- aucune nouvelle au-delà des blocs précédents

#### Boilerplate libs / briques existantes à réutiliser

- suite de tests server existante
- `pnpm --filter @owllayer/server build`

---

## Service interface methods à introduire

### Contrat store

```ts
export interface AnalyticsSessionRecord {
  sessionId: string;
  apiKey: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  totalMessages: number;
  totalToolCalls: number;
  totalTokensIn: number;
  totalTokensOut: number;
  errors: number;
  estimatedCostUsd: number;
}

export interface AnalyticsSummaryQuery {
  start: number;
  end: number;
  groupBy: 'day';
  apiKey?: string;
}

export interface AnalyticsSummaryBucket {
  period: string;
  apiKey?: string;
  totalSessions: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalToolCalls: number;
  estimatedCostUsd: number;
  averageDurationMs: number;
}

export interface AnalyticsStore {
  readonly name: string;
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
  saveSession(record: AnalyticsSessionRecord): Promise<void>;
  getSummary(query: AnalyticsSummaryQuery): Promise<AnalyticsSummaryBucket[]>;
}
```

### Contrat service recommandé

```ts
export class LocalAnalyticsService {
  constructor(store: AnalyticsStore) {}

  buildSessionRecord(session: Session): AnalyticsSessionRecord {}
  estimateCostUsd(tokensIn: number, tokensOut: number): number {}
  recordClosedSession(session: Session): Promise<void> {}
  getSummary(query: AnalyticsSummaryQuery): Promise<AnalyticsSummaryBucket[]> {}
}
```

### Contrat d'exposition admin recommandé

```ts
GET /admin/analytics/summary?start=2026-04-01&end=2026-04-30&groupBy=day
GET /admin/analytics/summary?start=2026-04-01&end=2026-04-30&groupBy=day&apiKey=pk_local_xxx
```

---

## Boilerplate libs / briques existantes à réutiliser

- `packages/server/src/admin/AdminAPI.ts` pour l'exposition admin locale
- `packages/server/src/memory/SessionGraph.ts` pour les compteurs session-level
- `packages/server/src/core/OwlLayerServer.ts` pour le hook `onBeforeSessionDestroy`
- `packages/server/src/core/SessionManager.ts` pour `apiKey`, `createdAt`, `lastActivityAt`, `graph`
- `packages/server/src/persistence/types.ts` pour le pattern contractuel des stores
- `packages/server/src/persistence/SQLiteApiKeyStore.ts` et `SQLiteAgentStore.ts` comme référence d'implémentation SQLite locale
- `better-sqlite3`, déjà présent dans `@owllayer/server`

---

## Fichiers ou groupes de fichiers à modifier plus tard

| Fichier ou groupe | AVANT | APRÈS | POURQUOI |
| --- | --- | --- | --- |
| `packages/server/src/persistence/types.ts` | aucun contrat analytics | ajout de `AnalyticsStore` et des types associés | rester aligné avec le pattern officiel de persistance |
| `packages/server/src/analytics/LocalAnalyticsService.ts` | n'existe pas | nouveau service analytics historique locale | séparer la logique métier du transport admin et du store |
| `packages/server/src/persistence/SQLiteAnalyticsStore.ts` | n'existe pas | nouveau store SQLite local pour résumés de session | réutiliser la brique self-host déjà légitime dans le repo |
| `packages/server/src/core/OwlLayerServer.ts` | hook de destruction déjà présent mais non exploité pour analytics | branchement de l'écriture historique à la fermeture de session | capter la donnée au bon endroit, sans cloud |
| `packages/server/src/admin/AdminAPI.ts` | live metrics seulement | nouvel endpoint admin historique dédié | distinguer monitoring live et analytics historique |
| `packages/server/src/index.ts` | aucune export analytics | export des types / service / store analytics | rendre la capacité utilisable depuis le server principal |
| `packages/server/src/standalone/config/schema.ts` | pas de config analytics self-host officielle | section `analytics` locale minimale | activer la capacité dans le self-host officiel sans cloud |
| `packages/server/src/standalone/config/types.ts` | pas de type analytics self-host officiel | type analytics local | garder la config cohérente avec le schema |
| `packages/server/src/standalone/createOwlLayerServer.ts` | ne branche pas d'analytics historique locale | branche `SQLiteAnalyticsStore` sur `OwlLayerServer` | rendre la feature disponible dans l'entrée self-host officielle |
| `packages/server/owllayer.config.example.yml` | pas de bloc analytics historique local | exemple de config self-host locale | documenter une seule histoire produit |

---

## Risques et compatibilité

### Risques

- Si l'écriture analytics bloque la destruction de session trop longtemps, le shutdown ou la fermeture de connexion peut devenir plus lente. Le store doit donc rester léger et local.
- `estimatedCostUsd` reste une approximation. Il ne faut pas le confondre avec un relevé fournisseur ni avec un module de billing.
- Le MVP démarre sans backfill. L'historique commence à partir du déploiement de la feature.
- La présence d'un filtre `apiKey` locale peut être mal comprise comme une notion multi-tenant. Le document et l'API doivent rappeler qu'il s'agit uniquement d'un regroupement single-server par clé locale.

### Compatibilité

- `GET /admin/metrics` reste compatible et inchangé dans sa sémantique.
- L'ajout côté `OwlLayerServerOptions` doit rester optionnel pour ne pas casser les intégrations existantes.
- Le self-host officiel doit réutiliser la même implémentation locale, pas créer un second chemin analytics.
- Aucune compatibilité ascendante n'est due au dossier `standalone/cloud`. Il est explicitement hors cible et destiné à la suppression.

---

## Gate final

Le sprint est considéré terminé uniquement si toutes les conditions suivantes sont vraies :

- `ANALYTICS-GATE-001` validé : `/admin/metrics` reste une vue live des sessions actives.
- `ANALYTICS-GATE-002` validé : chaque session fermée persistée contient les métriques clés et une durée exploitable.
- `ANALYTICS-GATE-003` validé : l'agrégation par jour sur une plage donnée retourne `totalSessions`, `totalTokensIn`, `totalTokensOut`, `totalToolCalls`, `estimatedCostUsd` et `averageDurationMs`.
- `ANALYTICS-GATE-004` validé : le filtre optionnel par `apiKey` locale fonctionne sans org, projet ni multi-tenant.
- `ANALYTICS-GATE-005` validé : aucun import ni contrat analytics ne dépend de `standalone/cloud`, Prisma, Stripe, Redis ou JWT.
- `ANALYTICS-GATE-006` validé : le self-host officiel branche la même analytics locale sans créer de design parallèle.
- `pnpm --filter @owllayer/server build` passe.

---

## Ce qu'on ne fait pas

- on ne migre pas `packages/server/src/standalone/cloud/**`
- on ne garde pas `orgId`, `projectId` ou `usageRecord`
- on ne crée pas de quota, billing ou logique Stripe
- on ne crée pas de mode cloud caché derrière une option
- on ne transforme pas `/admin/metrics` en pseudo historique
- on ne crée pas d'analytics temps réel avancée supplémentaire dans ce sprint
- on ne crée pas d'exports BI, de CSV, ni de dashboards multi-vues
- on ne crée pas plusieurs backends de persistance pour l'analytics dans ce sprint
- on ne touche pas aux domaines `orgs/projects`, Prisma, Stripe, Redis ou JWT

---

## Ordre de livraison recommandé

1. Contrat store + service analytics historique dans `packages/server`
2. Capture de session fermée dans `OwlLayerServer`
3. Endpoint admin historique dédié
4. Wiring self-host local officiel
5. Gate de validation finale et tests