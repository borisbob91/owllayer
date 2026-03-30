# Tester le serveur DomOS avec Fastify

Ce guide montre comment tester et évaluer l'intégration Fastify avec DomOS.

> **Note:** Les exemples et tests Fastify sont maintenant dans `apps/demo-fastify/`

## 📋 Installation

```bash
cd apps/demo-fastify
pnpm install
```

## 🚀 Exemples d'utilisation

### 1. Exemple basique

```bash
cd apps/demo-fastify
pnpm basic
```

Code dans [apps/demo-fastify/src/fastify-basic.ts](../../apps/demo-fastify/src/fastify-basic.ts) :
- Fastify avec le plugin DomOS
- Routes custom `/api/health` et `/api/ping`
- WebSocket ADTP sur `/domos`
- Dashboard sur `/_domos/panel`

**Tester :**
```bash
# HTTP
curl http://localhost:3000/api/health
curl http://localhost:3000/api/ping

# WebSocket ADTP (avec client SDK)
# ws://localhost:3000/domos

# Dashboard
open http://localhost:3000/_domos/panel
```

### 2. Exemple avancé (production-ready)

```bash
cd apps/demo-fastify
pnpm advanced
```

Code dans [apps/demo-fastify/src/fastify-advanced.ts](../../apps/demo-fastify/src/fastify-advanced.ts) :
- Sécurité : `@fastify/helmet`, `@fastify/cors`
- Rate limiting : `@fastify/rate-limit`
- Middleware custom
- Routes analytics

## ✅ Tests unitaires

```bash
cd apps/demo-fastify
pnpm test
```

Tests dans [apps/demo-fastify/src/fastify.test.ts](../../apps/demo-fastify/src/fastify.test.ts) :
- ✅ Enregistrement du plugin
- ✅ Décorateur `fastify.domos`
- ✅ Lifecycle hooks (onReady, onClose)
- ✅ Routes custom
- ✅ Options passées au DomOSServer

## 📊 Benchmark Fastify vs Natif

```bash
cd apps/demo-fastify
pnpm benchmark
```

**Ce que ça mesure :**
- Requests/sec (HTTP REST)
- Latence P50/P99
- Throughput

**Output attendu :**
```
📊 Résultats :

┌─────────┬──────────────────┬────────────────────┬────────────┬────────────┐
│ (index) │      name        │ requestsPerSecond  │ latencyP50 │ latencyP99 │
├─────────┼──────────────────┼────────────────────┼────────────┼────────────┤
│    0    │ 'Native Server'  │       15234        │    6.2     │    18.5    │
│    1    │ 'Fastify + DomOS'│       16821        │    5.8     │    16.2    │
└─────────┴──────────────────┴────────────────────┴────────────┴────────────┘

📈 Delta Performance :

Requests/sec : +10.42%
Latence P50  : -6.45%
Latence P99  : -12.43%

⚠️  Fastify est plus rapide mais gain < 30%
```

**Interprétation :**
- **≥ +30%** → Migration Fastify justifiée
- **+10 à +29%** → Gain marginal, pas urgent
- **< +10%** → Serveur natif suffisant

## 🧪 Tests de charge WebSocket

Pour tester les connexions WebSocket simultanées :

```bash
# Installer k6
# https://k6.io/docs/getting-started/installation/

# Créer un script de test k6
cat > ws-load-test.js << 'EOF'
import ws from 'k6/ws';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 1000 },   // Monter à 1000 connexions
    { duration: '1m', target: 1000 },    // Maintenir 1000 connexions
    { duration: '30s', target: 5000 },   // Monter à 5000 connexions
    { duration: '2m', target: 5000 },    // Maintenir 5000 connexions
    { duration: '30s', target: 0 },      // Descendre à 0
  ],
};

export default function () {
  const url = 'ws://localhost:3000/domos';
  const res = ws.connect(url, function (socket) {
    socket.on('open', () => {
      // Envoyer HANDSHAKE_INIT
      socket.send(JSON.stringify({
        type: 'HANDSHAKE_INIT',
        apiKey: 'test-key',
        clientInfo: { platform: 'loadtest' }
      }));
    });

    socket.on('message', (data) => {
      const msg = JSON.parse(data);
      check(msg, { 'handshake ack': (m) => m.type === 'HANDSHAKE_ACK' });
      socket.close();
    });

    socket.setTimeout(() => {
      socket.close();
    }, 10000);
  });

  check(res, { 'connected': (r) => r && r.status === 101 });
}
EOF

# Lancer le test
k6 run ws-load-test.js
```

## 📈 Métriques à collecter

Pour l'évaluation Fastify (mai 2026), documenter :

| Métrique | Serveur Natif | Fastify | Delta | OK ? |
|----------|---------------|---------|-------|------|
| **HTTP req/sec** | ___ | ___ | ___% | ⚠️/✅ |
| **HTTP latency p50** | ___ms | ___ms | ___ms | ⚠️/✅ |
| **WS handshake/sec** | ___ | ___ | ___% | ⚠️/✅ |
| **WS msg latency p50** | ___ms | ___ms | ___ms | ⚠️/✅ |
| **Max connexions WS** | ___ | ___ | ___ | ⚠️/✅ |
| **CPU usage (10k conn)** | ___% | ___% | ___% | ⚠️/✅ |
| **Memory (10k conn)** | ___MB | ___MB | ___MB | ⚠️/✅ |

## 🎯 Décision d'adoption

**Critères pour migrer vers Fastify :**
- ✅ Gain performance ≥ 30% requests/sec OU latence
- ✅ Support > 10k connexions WS simultanées
- ✅ Pas de régression (bugs, compatibilité)
- ✅ Migration < 2 semaines effort

**Si ces critères ne sont PAS atteints → garder serveur natif.**

## 🔗 Voir aussi

- [apps/demo-fastify](../../apps/demo-fastify/) — Tous les exemples et tests Fastify
- [CLEANUP-AND-FASTIFY-EVAL.md](../../docs/standalone-server/CLEANUP-AND-FASTIFY-EVAL.md) — Plan d'évaluation complet
- [FastifyAdapter.ts](./src/adapters/fastify/FastifyAdapter.ts) — Code source du plugin
- [DomOSServer.ts](./src/core/DomOSServer.ts) — Serveur natif actuel
