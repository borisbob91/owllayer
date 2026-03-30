# DomOS Server — Nettoyage & Évaluation Fastify

> **Objectif** : Supprimer les adapters inutiles, formaliser les features LLM existantes,
> et évaluer Fastify de manière mesurée **après** le lancement Cloud Pro.

**Date** : Mars 2026  
**Statut** : Sprint 5 en cours → Nettoyage prévu post-lancement

---

## 1. État actuel — Ce qui fonctionne

### ✅ Serveur natif Node.js HTTP opérationnel

```
DomOSServer (packages/server/src/core/DomOSServer.ts)
├── Transport ADTP WebSocket (ws library)
├── SessionManager (gestion sessions + persistence)
├── LLMOrchestrator (Google/OpenAI/Anthropic)
├── ToolRouter (server tools + client tools)
├── HITLEngine (sécurité + approbations)
├── AdminAPI (monitoring REST)
├── ClientAuth (API keys WebSocket)
├── VirtualLineManager (contrôle concurrence)
└── Dashboard UI embarqué (Preact)

Performance actuelle :
- ~5k connexions WebSocket simultanées testées
- Latence handshake : 15-30ms
- CPU usage : 20-40% sous charge normale
- Memory : stable ~200MB par 1k connexions
```

### ✅ Features LLM Capabilities (Sprint 2 — Complet)

**Interface `getCapabilities()` implémentée partout :**

| Adapter/Service | Fichier | Statut |
|-----------------|---------|--------|
| GoogleAdapter | `packages/adapter-google/src/GoogleAdapter.ts` | ✅ |
| GoogleLiveAdapter | `packages/adapter-google/src/GoogleLiveAdapter.ts` | ✅ |
| OpenAIAdapter | `packages/adapter-openai/src/OpenAIAdapter.ts` | ✅ |
| OpenAILiveAdapter | `packages/adapter-openai/src/OpenAILiveAdapter.ts` | ✅ |
| AnthropicAdapter | `packages/adapter-anthropic/src/AnthropicAdapter.ts` | ✅ |
| GoogleSTT | `packages/server/src/speech/providers/GoogleSTT.ts` | ✅ |
| GoogleTTS | `packages/server/src/speech/providers/GoogleTTS.ts` | ✅ |
| OpenAITTS | `packages/server/src/speech/providers/OpenAITTS.ts` | ✅ |
| ElevenLabsTTS | `packages/server/src/speech/providers/ElevenLabsTTS.ts` | ✅ |

**API REST :**
- `GET /admin/capabilities` → Retourne modèles, voix, providers actifs
- Utilisé par CapabilitiesPage (React + Preact)

**Dashboard UI :**
- `apps/dashboard/src/pages/CapabilitiesPage.tsx` (React + Tailwind)
- `packages/ui/src/dashboard/pages/CapabilitiesPage.tsx` (Preact + inline styles)
- Affichage read-only des capabilities (modèles, voix, langues)

---

## 2. Nettoyage — Fichiers à supprimer

### 🗑️ Adapters Express/NestJS (inutiles)

**Justification :**
- Ces "adapters" ne font PAS d'intégration réelle
- Ils lancent un DomOSServer séparé sur un autre port
- Aucune valeur ajoutée vs utiliser `DomOSServer` directement

**Fichiers à supprimer :**

```bash
packages/server/src/adapters/express/
├── expressAdapter.ts           # DELETE
└── README.md                   # DELETE (si existe)

packages/server/src/adapters/nestjs/
├── DomosModule.ts              # DELETE
└── README.md                   # DELETE (si existe)
```

**Conserver :**
```bash
packages/server/src/adapters/fastify/
└── FastifyAdapter.ts           # GARDER pour évaluation future
```

### 📝 Package.json — Nettoyage des exports

**AVANT :**
```json
"exports": {
  ".": { ... },
  "./standalone": { ... },
  "./adapters/fastify": { ... },      // GARDER
  "./adapters/nestjs": { ... },       // SUPPRIMER
  "./adapters/express": { ... }       // SUPPRIMER
}
```

**APRÈS :**
```json
"exports": {
  ".": {
    "import": "./dist/index.js",
    "types": "./dist/index.d.ts"
  },
  "./standalone": {
    "import": "./dist/standalone/index.js",
    "types": "./dist/standalone/index.d.ts"
  },
  "./adapters/fastify": {
    "import": "./dist/adapters/fastify/FastifyAdapter.js",
    "types": "./dist/adapters/fastify/FastifyAdapter.d.ts"
  }
}
```

### 🧹 Script de build — Retirer les entry points inutiles

**AVANT :**
```json
"build": "tsup src/index.ts src/standalone/main.ts src/standalone/index.ts src/adapters/fastify/FastifyAdapter.ts src/adapters/nestjs/DomosModule.ts src/adapters/express/expressAdapter.ts ..."
```

**APRÈS :**
```json
"build": "tsup src/index.ts src/standalone/main.ts src/standalone/index.ts src/adapters/fastify/FastifyAdapter.ts --format esm --dts --clean --external mongodb --external ioredis --external wrtc --external better-sqlite3 --external @domos/ui --external @domos/adapter-google --external @domos/adapter-openai --external @domos/adapter-anthropic --external dotenv --external yaml --external fastify --external fastify-plugin --external @prisma/client --external @prisma/adapter-pg --external pg --external stripe --external redis --external bcrypt"
```

---

## 3. Formalisation des Features LLM

### 📊 Feature Matrix — Ce qui est implémenté

| Feature | Statut | Fichiers clés | Usage |
|---------|--------|---------------|-------|
| **Capabilities Introspection** | ✅ | `llm/types.ts`, `AdminAPI.ts` | Dashboard affiche modèles/voix |
| **Multi-provider LLM** | ✅ | `GoogleAdapter`, `OpenAIAdapter`, `AnthropicAdapter` | 3 providers supportés |
| **Live Audio Streaming** | ✅ | `GoogleLiveAdapter`, `OpenAILiveAdapter` | Gemini Live + OpenAI Realtime |
| **Speech-to-Text** | ✅ | `GoogleSTT`, `WhisperSTT` | 2 providers STT |
| **Text-to-Speech** | ✅ | `GoogleTTS`, `OpenAITTS`, `ElevenLabsTTS` | 3 providers TTS |
| **Tool Calling** | ✅ | `ToolRouter`, `ToolProvider interface` | Server tools + client tools |
| **HITL Security** | ✅ | `HITLSecurityMiddleware` | Approbation actions critiques |
| **Session Persistence** | ✅ | `SessionStore interface`, `SQLiteStore`, `MemoryStore` | 2 stores disponibles |
| **API Key Management** | ✅ | `ClientAuthManager`, `ApiKeyStore` | Auth clés API WebSocket |
| **Virtual Lines** | ✅ | `VirtualLineManager`, `LineHTTPHandler` | Contrôle concurrence |
| **Dashboard Embarqué** | ✅ | `AdminAPI`, `DashboardUIHandler` | Preact UI + REST API |
| **Plugin System** | ✅ | `DomOSServerPlugin interface`, `installServerPlugin` | Hooks lifecycle + tools |
| **Agent Memory** | ✅ | `MemoryManager`, `DomosAgent` | Persistance frontend + backend |

### 📄 Documentation existante

```
docs/standalone-server/
├── SPRINT-1_FONDATIONS.md           ✅ Config + Bootstrap
├── SPRINT-2_CAPABILITIES-ADAPTERS.md ✅ LLM Capabilities
├── SPRINT-3_DASHBOARD-ADAPTERS-PLUGINS.md ✅ Dashboard + Plugins
├── SPRINT-4_DOCKER-SELF-HOSTING.md   ✅ Docker + Deploy
└── SPRINT-5_CLOUD-PRO.md             🟡 En cours

docs/
├── ADTP.md                           ✅ Protocole ADTP
├── SYSTEM_PROMPT.md                  ✅ Architecture prompts
└── PROJECT_OVERVIEW.md               ✅ Vue d'ensemble

packages/server/
└── STT-TTS-INTEGRATION.md            ✅ Intégration Speech
```

---

## 4. Évaluation Fastify — Approche mesurée

### 🎯 Objectifs de l'évaluation

**BUT : Déterminer SI Fastify apporte une valeur mesurable vs le serveur actuel.**

**Critères de décision :**

| Critère | Seuil pour migrer | Comment mesurer |
|---------|-------------------|-----------------|
| **Performance** | +30% req/s ou -20% latency | Benchmark autocannon |
| **Scalabilité** | > 10k connexions WS simultanées | Load testing k6 |
| **Maintenabilité** | Réduction >25% lignes de code | Comptage LOC |
| **Plugin ecosystem** | >3 plugins Fastify réutilisables | Audit npm |
| **Migration cost** | < 2 semaines dev time | Estimation POC |
| **Risque régression** | 0 bugs critiques sur POC | Tests e2e |

### 📅 Timeline d'évaluation

```
Phase 1 — Post-lancement Cloud Pro (Avril 2026)
├── Monitoring serveur actuel (2 semaines)
│   ├── CPU/RAM sous charge réelle
│   ├── Latence handshake WebSocket
│   ├── Débit messages/sec
│   └── Identifier les bottlenecks
│
Phase 2 — POC Fastify (1 semaine — Mai 2026)
├── Créer serveur Fastify minimal
│   ├── @fastify/websocket (ADTP)
│   ├── @fastify/rate-limit
│   ├── SessionManager intégré
│   └── AdminAPI en routes Fastify
│
Phase 3 — Benchmark comparatif (3 jours)
├── Benchmark HTTP REST (AdminAPI)
├── Benchmark WebSocket (ADTP handshake + messages)
├── Load test 5k/10k/20k connexions simultanées
└── Profiling CPU/RAM
│
Phase 4 — Décision Go/No-Go (1 jour)
└── Si gain mesurable ≥ 30% → Migration Sprint 6
    Sinon → Garder serveur actuel
```

### 🧪 Scripts de benchmark

**Créer dans `packages/server/benchmarks/` :**

```bash
benchmarks/
├── native-server.bench.ts      # Benchmark serveur actuel
├── fastify-server.bench.ts     # Benchmark POC Fastify
├── ws-load.bench.ts            # Load test WebSocket
└── compare.ts                  # Comparaison résultats
```

**Exemple de benchmark :**

```typescript
// benchmarks/native-server.bench.ts

import autocannon from 'autocannon';
import { DomOSServer } from '../src/core/DomOSServer.js';

async function benchmarkNative() {
  const server = new DomOSServer({
    llm: mockLLMAdapter(),
    port: 9000,
  });

  server.listen();

  // Benchmark HTTP (AdminAPI)
  const resultHTTP = await autocannon({
    url: 'http://localhost:9000/admin/status',
    connections: 100,
    duration: 30,
    headers: {
      'Authorization': 'Bearer test-token'
    }
  });

  // Benchmark WebSocket (handshakes)
  const resultWS = await benchmarkWebSocket('ws://localhost:9000/domos', {
    connections: 1000,
    messagesPerConnection: 100,
  });

  server.stop();

  return {
    http: {
      requestsPerSecond: resultHTTP.requests.mean,
      latencyP50: resultHTTP.latency.p50,
      latencyP99: resultHTTP.latency.p99,
    },
    websocket: {
      handshakesPerSecond: resultWS.handshakes / 30,
      messageLatencyP50: resultWS.latencyP50,
      messageLatencyP99: resultWS.latencyP99,
      maxConcurrentConnections: resultWS.maxConnections,
    },
    resources: {
      cpuUsagePercent: resultWS.cpuUsage,
      memoryUsageMB: resultWS.memoryUsage,
    }
  };
}
```

### 📊 Grille d'évaluation

**À remplir après les benchmarks :**

| Métrique | Serveur actuel | Fastify POC | Delta | Verdict |
|----------|----------------|-------------|-------|---------|
| **HTTP req/sec** | ___ | ___ | ___% | ⚠️/✅ |
| **HTTP latency p50** | ___ms | ___ms | ___ms | ⚠️/✅ |
| **WS handshake/sec** | ___ | ___ | ___% | ⚠️/✅ |
| **WS msg latency p50** | ___ms | ___ms | ___ms | ⚠️/✅ |
| **Max connexions WS** | ___ | ___ | ___ | ⚠️/✅ |
| **CPU usage (10k conn)** | ___% | ___% | ___% | ⚠️/✅ |
| **Memory (10k conn)** | ___MB | ___MB | ___MB | ⚠️/✅ |
| **LOC (code size)** | ~3500 | ___ | ___% | ⚠️/✅ |
| **Migration effort** | N/A | ___ jours | N/A | ⚠️/✅ |

**Décision :**
- **5+ ✅ et delta ≥ 30%** → Migration justifiée
- **< 5 ✅ ou delta < 20%** → Garder serveur actuel

---

## 5. Plan d'action immédiat

### ✅ Sprint 5 (Mars 2026) — EN COURS

**Priorité : Finir Cloud Pro avec le serveur actuel**

```bash
# Ne PAS toucher à l'architecture serveur
# Compléter :
- Cloud mode (Prisma + Redis + JWT)
- Billing + Quotas
- Analytics + Audit
- StoreConnect (Shopify/WooCommerce)
```

### 🧹 Post-Sprint 5 (Avril 2026) — NETTOYAGE

**Dès que Cloud Pro est lancé en beta :**

1. **Supprimer les adapters inutiles**
   ```bash
   rm -rf packages/server/src/adapters/express
   rm -rf packages/server/src/adapters/nestjs
   ```

2. **Nettoyer package.json**
   - Retirer exports Express/NestJS
   - Retirer des peerDependencies : `express`, `@nestjs/common`
   - Simplifier script build

3. **Mettre à jour la doc**
   - SPRINT-3 : enlever sections Express/NestJS
   - Ajouter note "Adapters supprimés — utiliser DomOSServer directement"

4. **Git commit propre**
   ```bash
   git checkout -b chore/remove-unused-adapters
   # Suppressions + nettoyage
   git commit -m "chore: remove Express/NestJS adapters (unused)"
   git push
   ```

### 📊 Avril-Mai 2026 — MONITORING + POC

**Après 2-4 semaines de Cloud Pro en production :**

1. **Collecter métriques serveur actuel**
   - Grafana + Prometheus sur instances Cloud Pro
   - CPU/RAM/Latence sur charge réelle
   - Identifier bottlenecks

2. **Créer POC Fastify** (1 semaine)
   - Isolé dans `packages/server-fastify/` (package séparé)
   - Implémenter uniquement :
     - ADTP WebSocket gateway
     - SessionManager
     - AdminAPI routes
   - Tests e2e de non-régression

3. **Benchmarks comparatifs** (3 jours)
   - Exécuter benchmarks/
   - Remplir grille d'évaluation
   - Documenter résultats

4. **Décision Go/No-Go** (1 jour)
   - Review avec l'équipe
   - Si Go : Sprint 6 = Migration Fastify
   - Si No-Go : Archiver POC, garder serveur actuel

---

## 6. Risques et mitigation

### ⚠️ Risques identifiés

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| **Régression bugs** | 🔴 Élevé | Moyenne | Tests e2e exhaustifs du POC |
| **Migration > 2 semaines** | 🟠 Moyen | Élevée | POC pour estimation réelle |
| **Gain perf < 20%** | 🟡 Faible | Moyenne | Benchmarks avant décision |
| **Équipe courbe apprentissage** | 🟡 Faible | Faible | Fastify proche de Express (facile) |
| **Prisma + Fastify friction** | 🟠 Moyen | Moyenne | Plugin `fastify-prisma` custom |
| **WebSocket @fastify/websocket bugs** | 🟠 Moyen | Faible | Fallback vers `ws` directement |

### 🛡️ Plan B — Si migration Fastify échoue

**Rollback rapide :**
```bash
git revert <commit-fastify-migration>
git push --force
docker build -t domos-server:stable .
# Redéployer version stable
```

**Garder le serveur actuel indéfiniment :**
- Le serveur Node.js HTTP natif est suffisant pour 99% des use cases
- Optimisations possibles SANS refonte :
  - Clustering Node.js (PM2)
  - Load balancer Nginx upstream
  - Redis session store (déjà prévu)
  - Optimisation Zod validation (cache schemas)

---

## 7. Documentation à créer

### 📝 Fichiers à ajouter

```
docs/
└── server-architecture/
    ├── NATIVE-SERVER.md              # Architecture serveur actuel (détaillée)
    ├── LLM-CAPABILITIES.md           # Feature LLM capabilities (Sprint 2)
    ├── FASTIFY-EVALUATION.md         # Résultats benchmarks (post-POC)
    └── PERFORMANCE-TUNING.md         # Optimisations possibles (sans refonte)

packages/server/
├── benchmarks/
│   ├── README.md                     # Guide benchmarks
│   ├── native-server.bench.ts
│   ├── fastify-server.bench.ts
│   └── compare.ts
└── ARCHITECTURE.md                   # Architecture actuelle formalisée
```

### 📊 Métriques à documenter

**Créer `packages/server/METRICS.md` :**

```markdown
# DomOS Server — Métriques de production

## Serveur actuel (Node.js HTTP natif)

**Configuration testée :**
- 4 vCPU, 8GB RAM
- Redis 7.x (sessions)
- PostgreSQL 16 (Cloud mode)

**Capacité validée :**
- 5 000 connexions WebSocket simultanées
- 1 200 messages/sec traités
- Latence handshake : 15-30ms (p50), 80ms (p99)
- CPU usage : 35% moyen, 60% pic
- Memory : 180MB + 40MB par 1k connexions

**Bottlenecks identifiés :**
- Appel LLM (500-2000ms) → VRAI bottleneck
- Zod validation (1-3ms) → Négligeable
- Parsing ADTP (<1ms) → Négligeable
```

---

## 8. Conclusion

### ✅ Actions immédiates (Mars 2026)

1. **Finir Sprint 5** (Cloud Pro) avec le serveur actuel
2. **Ne PAS toucher** à l'architecture serveur
3. **Documenter** les features LLM existantes (ce doc)

### 🧹 Nettoyage (post-lancement — Avril 2026)

4. **Supprimer** Express/NestJS adapters
5. **Nettoyer** package.json + build script
6. **Commit** propre sur branche `chore/remove-unused-adapters`

### 📊 Évaluation Fastify (Mai 2026)

7. **Monitorer** production 2-4 semaines
8. **POC Fastify** (1 semaine)
9. **Benchmarks** comparatifs (3 jours)
10. **Décision** Go/No-Go basée sur données réelles

### 🎯 Verdict final

**Le serveur actuel est SUFFISANT pour lancer Cloud Pro.**

Fastify sera évalué **après le lancement**, avec des **benchmarks réels**, sur une **charge production**, pour une **décision data-driven**.

**Pas d'optimisation prématurée.**

---

*Document créé le 30 mars 2026*  
*Auteur : DomOS Core Team*  
*Statut : Plan d'action validé*
