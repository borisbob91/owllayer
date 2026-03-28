# DomOS Server — Architecture Fastify Unifié

> **Serveur unique · Self-Hosting & Cloud Pro · Plugin System · Standalone**  
> Document d'architecture et de setup complet  
> Version 1.0 — Mars 2026 — Futur4Tech

---

## Table des matières

1. [Pourquoi Fastify — Justification du choix](#1-pourquoi-fastify--justification-du-choix)
2. [Architecture du serveur unique](#2-architecture-du-serveur-unique)
3. [Structure complète du projet](#3-structure-complète-du-projet)
4. [Plugin System Fastify](#4-plugin-system-fastify)
5. [Feature Flags — Self-Hosting vs Cloud Pro](#5-feature-flags--self-hosting-vs-cloud-pro)
6. [Mode Standalone — Cloner et déployer](#6-mode-standalone--cloner-et-déployer)
7. [Intégration dans le monorepo DomOS](#7-intégration-dans-le-monorepo-domos)
8. [Configuration complète](#8-configuration-complète)
9. [Prérequis et setup](#9-prérequis-et-setup)
10. [Sécurité](#10-sécurité)
11. [Roadmap vers Rust](#11-roadmap-vers-rust)

---

## 1. Pourquoi Fastify — Justification du choix

### 1.1 Analyse comparative

| Critère | Express | NestJS | Deno+Hono | **Fastify** | TypeScript+Rust |
|---------|---------|--------|-----------|-------------|-----------------|
| Performance (req/sec) | ~16k | ~15-45k | ~60k | **~77k** | >100k |
| Maturité production | ✅ | ✅ | ⚠️ | ✅ | ⚠️ |
| Plugin system natif | ❌ | Modules | ❌ | ✅ **natif** | N/A |
| TypeScript natif | Partiel | Oui | Oui | **Oui** | Oui |
| WebSocket natif | Partiel | Partiel | Partiel | **✅** | N/A |
| Courbe d'apprentissage | Faible | Élevée | Moyenne | **Faible** | Très élevée |
| Écosystème npm | ✅ | ✅ | Partiel | **✅** | Partiel |
| Standalone deployable | ✅ | Complexe | ✅ | **✅** | Complexe |
| Maintenabilité | Moyenne | Élevée | Moyenne | **Excellente** | Très complexe |

### 1.2 Pourquoi pas Rust maintenant

Le vrai bottleneck de DomOS est l'**appel LLM** — pas le serveur :

```
Anatomie d'une requête DomOS :
  Parsing message ADTP        →    < 1ms   ← Rust économiserait ~0.5ms ici
  Validation Zod              →    < 2ms
  Session lookup Redis        →   ~2-5ms
  ─────────────────────────────────────
  Appel LLM (Gemini/GPT/...)  → 500-2000ms  ← VRAI bottleneck (x1000)
  Exécution tool client       →  50-500ms
  ─────────────────────────────────────
  Total perçu par l'utilisateur → 1-3 secondes
```

Rust sur le parsing ADTP économiserait **0.5ms sur 2000ms** — soit 0.025% de gain.
L'investissement (courbe d'apprentissage, double toolchain, CI/CD complexe) ne se justifie
pas avant d'atteindre **>50 000 connexions WebSocket simultanées**. L'architecture Fastify
est conçue pour permettre cette migration progressive sans réécriture.

### 1.3 Pourquoi pas Deno

- Écosystème encore fragmenté pour des libs critiques (Prisma, Redis, WebRTC)
- Friction réelle avec certains packages npm en 2026
- Rupture d'équipe — tout le tooling DomOS est Node.js/npm
- Pas de gain de productivité significatif vs Node.js 22 LTS

### 1.4 Ce que Fastify apporte de décisif pour DomOS

```typescript
// Le plugin system Fastify est exactement le modèle de modules DomOS
fastify.register(domosAdtpPlugin);         // Core — toujours chargé
fastify.register(domosDashboardPlugin);    // Core — toujours chargé
fastify.register(domosCloudPlugin);        // Cloud Pro — conditionnel
fastify.register(domosShopifyPlugin);      // Integration — optionnel
fastify.register(domosWooPlugin);          // Integration — optionnel

// Chaque plugin est isolé, testable indépendamment, versioned séparément
// → Exactement le bounded context qu'on cherche
```

---

## 2. Architecture du serveur unique

### 2.1 Principe — Un serveur, deux modes, N intégrations

```
┌─────────────────────────────────────────────────────────────────┐
│                    domos-server (Fastify)                        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    CORE (toujours actif)                │    │
│  │                                                         │    │
│  │  ADTPGateway   SessionManager   LLMOrchestrator         │    │
│  │  HITLEngine    PluginLoader     AudioHandler            │    │
│  │  ClientAuth    Dashboard (/_domos/panel)                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────┐  ┌──────────────────────┐    │
│  │   MODULE CLOUD PRO           │  │  MODULE SELF-HOSTING  │    │
│  │   (si DOMOS_MODE=cloud)      │  │  (si DOMOS_MODE=self) │    │
│  │                              │  │                       │    │
│  │  MultiTenant  Billing        │  │  Config locale        │    │
│  │  RBAC         StoreConnect   │  │  Single tenant        │    │
│  │  Analytics    AuditLogs      │  │  Clés API simples     │    │
│  │  Webhooks     Operator       │  │                       │    │
│  └──────────────────────────────┘  └──────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              INTÉGRATIONS (optionnelles)                 │    │
│  │                                                         │    │
│  │   ShopifyModule    WooCommerceModule    [custom...]      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Flux des requêtes

```
Client SDK (React/Vue/Svelte/Flutter/Browser)
    │
    │  WebSocket (ADTP) — ws://host/domos
    │
    ▼
ADTPGateway (Fastify WebSocket Plugin)
    │
    ├── HANDSHAKE_INIT  → ClientAuth → SessionManager → HANDSHAKE_ACK
    ├── CONTEXT_UPDATE  → SessionManager (update tools + context)
    ├── USER_INPUT      → LLMOrchestrator
    │       │
    │       ├── HITLEngine (évalue risque)
    │       ├── PluginRunner (onBeforeLLMCall hooks)
    │       ├── Adapter LLM (Google/OpenAI/Anthropic)
    │       ├── ToolRouter (server tools + client tools)
    │       └── PluginRunner (onAfterLLMCall hooks)
    └── TOOL_RESULT     → LLMOrchestrator (continue boucle)

HTTP REST — http://host/_domos/api/*
    │
    ├── Dashboard API  → DashboardAuth → Controllers
    ├── Cloud API      → JWTAuth → RBACGuard → Cloud Controllers
    └── Integration API → OAuth/wc-auth callbacks
```

---

## 3. Structure complète du projet

```
domos-server/
│
├── src/
│   │
│   ├── main.ts                        # Entrypoint — bootstrap serveur
│   ├── server.ts                      # createServer() — factory Fastify
│   │
│   ├── config/
│   │   ├── index.ts                   # Config loader — env + fichier YAML/JSON
│   │   ├── schema.ts                  # Schéma Zod de validation config
│   │   ├── defaults.ts                # Valeurs par défaut
│   │   └── types.ts                   # DomOSConfig interface complète
│   │
│   ├── core/                          # ── Modules Core (toujours chargés) ──
│   │   │
│   │   ├── adtp/
│   │   │   ├── adtp.plugin.ts         # Plugin Fastify WebSocket ADTP
│   │   │   ├── adtp.gateway.ts        # Connexions WS, routing messages
│   │   │   ├── adtp.handlers.ts       # Handlers par type de message
│   │   │   └── adtp.types.ts          # Types ADTP internes
│   │   │
│   │   ├── session/
│   │   │   ├── session.plugin.ts      # Plugin Fastify Session
│   │   │   ├── session.service.ts     # CRUD sessions, lifecycle
│   │   │   ├── session.store.ts       # Interface SessionStore
│   │   │   ├── stores/
│   │   │   │   ├── memory.store.ts    # In-memory (self-hosting sans Redis)
│   │   │   │   └── redis.store.ts     # Redis (Cloud Pro + self-hosting avancé)
│   │   │   └── session.types.ts
│   │   │
│   │   ├── llm/
│   │   │   ├── llm.plugin.ts          # Plugin Fastify LLM
│   │   │   ├── orchestrator.ts        # Boucle USER_INPUT → LLM → RESULT
│   │   │   ├── adapter-registry.ts    # Registre adaptateurs LLM
│   │   │   ├── context-builder.ts     # LLMRequest construction
│   │   │   └── tool-router.ts         # Route tool calls server vs client
│   │   │
│   │   ├── hitl/
│   │   │   ├── hitl.plugin.ts
│   │   │   ├── hitl.engine.ts         # Évaluation risque + blocage
│   │   │   └── hitl.types.ts
│   │   │
│   │   ├── auth/
│   │   │   ├── client-auth.plugin.ts  # Auth clés API WebSocket
│   │   │   ├── client-auth.service.ts
│   │   │   └── api-key.store.ts       # Memory | Redis
│   │   │
│   │   ├── audio/
│   │   │   ├── audio.plugin.ts
│   │   │   ├── websocket-audio.ts     # Transport audio WebSocket PCM
│   │   │   └── webrtc-audio.ts        # Transport audio WebRTC (optionnel)
│   │   │
│   │   └── plugins/
│   │       ├── plugin-loader.ts       # Chargement + validation plugins tiers
│   │       ├── plugin-runner.ts       # Exécution hooks dans l'ordre
│   │       └── plugin.types.ts        # DomOSPlugin interface publique
│   │
│   ├── dashboard/                     # ── Dashboard Embarqué ──
│   │   ├── dashboard.plugin.ts        # Plugin Fastify — routes /_domos/*
│   │   ├── dashboard.auth.ts          # Auth bcrypt + sessions + CSRF
│   │   ├── dashboard.api.ts           # Controllers API REST dashboard
│   │   ├── dashboard.ws.ts            # WebSocket logs temps réel
│   │   └── panel/                     # Bundle Preact compilé (statique)
│   │       ├── index.html
│   │       ├── assets/
│   │       └── [fichiers compilés Vite]
│   │
│   ├── modules/                       # ── Modules Feature-Flagged ──
│   │   │
│   │   ├── cloud/                     # Module Cloud Pro
│   │   │   ├── cloud.plugin.ts        # Plugin Fastify Cloud
│   │   │   ├── tenant/                # Multi-tenant isolation
│   │   │   ├── rbac/                  # Owner/Admin/Developer/Viewer
│   │   │   ├── billing/               # Quotas, facturation hybride
│   │   │   ├── analytics/             # Tokens, coûts, latences
│   │   │   ├── webhooks/              # Webhooks sortants
│   │   │   ├── audit/                 # Audit logs immuables
│   │   │   ├── operator/              # Conversations live + Human Takeover
│   │   │   └── store-connect/         # OAuth Shopify + wc-auth WooCommerce
│   │   │
│   │   └── self-hosting/              # Module Self-Hosting
│   │       ├── self-hosting.plugin.ts
│   │       ├── local-config.ts        # Config depuis fichier local
│   │       └── single-tenant.ts       # Mode single tenant simplifié
│   │
│   └── integrations/                  # ── Intégrations E-Commerce ──
│       ├── shopify/
│       │   ├── shopify.plugin.ts      # Plugin Fastify Shopify
│       │   ├── shopify.oauth.ts       # OAuth flow
│       │   ├── shopify.tools.ts       # Tool providers Shopify
│       │   ├── shopify.context.ts     # Context builder Shopify
│       │   ├── shopify.webhooks.ts    # Webhooks Shopify (app/uninstalled)
│       │   └── shopify.payments.ts    # In-Chat Payments
│       │
│       └── woocommerce/
│           ├── woocommerce.plugin.ts
│           ├── woo.auth.ts            # wc-auth flow
│           ├── woo.tools.ts           # Tool providers WooCommerce
│           ├── woo.context.ts
│           └── woo.payments.ts        # Stripe + PayPal in-chat
│
├── dashboard-ui/                      # ── Source Dashboard Preact ──
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── auth/
│   │   ├── pages/
│   │   └── components/
│   ├── vite.config.ts                 # Compile vers src/dashboard/panel/
│   └── package.json
│
├── prisma/                            # ── ORM PostgreSQL ──
│   ├── schema.prisma                  # Schéma complet (cloud + self-hosting)
│   └── migrations/                    # Migrations versionnées
│
├── adapters/                          # ── Adaptateurs LLM ──
│   ├── google/
│   │   ├── google.adapter.ts
│   │   └── gemini-live.ts             # Gemini Live API audio
│   ├── openai/
│   │   └── openai.adapter.ts
│   └── anthropic/
│       └── anthropic.adapter.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docker/
│   ├── Dockerfile                     # Image production optimisée
│   ├── Dockerfile.dev                 # Image développement avec hot-reload
│   └── docker-compose.yml            # Stack complète (server + Redis + PostgreSQL)
│
├── scripts/
│   ├── build.ts                       # Build serveur + dashboard UI
│   ├── build-dashboard.ts             # Build uniquement le dashboard Preact
│   └── setup.ts                       # Setup initial (hash password admin, etc.)
│
├── domos.config.example.yml           # Config exemple complète commentée
├── .env.example                       # Variables d'environnement commentées
├── package.json
├── tsconfig.json
├── tsconfig.build.json
└── README.md
```

---

## 4. Plugin System Fastify

### 4.1 Pourquoi le plugin system Fastify est parfait pour DomOS

Fastify a un plugin system natif basé sur `fastify-plugin` et l'encapsulation automatique. Chaque plugin :
- A son propre scope (routes, decorators, hooks)
- Peut être enregistré conditionnellement
- Peut déclarer ses dépendances
- Est testable isolément

C'est exactement le modèle de modules DomOS.

### 4.2 Convention de création d'un module DomOS

```typescript
// src/modules/cloud/cloud.plugin.ts
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { CloudModuleOptions } from './cloud.types';

// fp() rend le plugin non-encapsulé — ses decorators sont visibles
// par le reste du serveur (nécessaire pour les modules core)
const cloudPlugin: FastifyPluginAsync<CloudModuleOptions> = async (
  fastify,
  options
) => {
  // Vérification des dépendances
  if (!fastify.hasDecorator('domosSession')) {
    throw new Error('cloudPlugin requires sessionPlugin to be registered first');
  }

  // Enregistrement des sous-modules
  await fastify.register(import('./tenant/tenant.plugin'), options);
  await fastify.register(import('./rbac/rbac.plugin'), options);
  await fastify.register(import('./billing/billing.plugin'), options);
  await fastify.register(import('./analytics/analytics.plugin'), options);
  await fastify.register(import('./store-connect/store-connect.plugin'), options);

  // Routes Cloud API
  await fastify.register(import('./cloud.routes'), { prefix: '/api/cloud' });

  fastify.log.info('[DomOS Cloud] Module loaded');
};

export default fp(cloudPlugin, {
  name: 'domos-cloud',
  dependencies: ['domos-session', 'domos-auth-client'],
});
```

### 4.3 Ordre de chargement des plugins

```typescript
// src/server.ts — Ordre strict de chargement

export async function createServer(config: DomOSConfig) {
  const fastify = Fastify({
    logger: {
      level: config.log?.level ?? 'info',
      transport: config.log?.pretty
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    // WebSocket support
    ...
  });

  // ─── 1. Plugins Fastify natifs ───────────────────────────────
  await fastify.register(import('@fastify/helmet'), {
    contentSecurityPolicy: buildCSP(config),
  });
  await fastify.register(import('@fastify/cors'), {
    origin: config.cors?.origins ?? false,
    credentials: true,
  });
  await fastify.register(import('@fastify/cookie'), {
    secret: config.cookieSecret,
  });
  await fastify.register(import('@fastify/rate-limit'), {
    global: false, // Rate limiting par route — pas global
  });
  await fastify.register(import('@fastify/websocket'));
  await fastify.register(import('@fastify/sensible'));

  // ─── 2. Core DomOS — obligatoires ───────────────────────────
  await fastify.register(import('./core/session/session.plugin'), {
    store: config.redis ? 'redis' : 'memory',
    redisUrl: config.redis?.url,
  });
  await fastify.register(import('./core/auth/client-auth.plugin'), config.client);
  await fastify.register(import('./core/llm/llm.plugin'), { config });
  await fastify.register(import('./core/hitl/hitl.plugin'));
  await fastify.register(import('./core/audio/audio.plugin'), config.audio);
  await fastify.register(import('./core/plugins/plugin-loader'), {
    plugins: config.plugins ?? [],
  });

  // ─── 3. Dashboard embarqué ──────────────────────────────────
  if (config.dashboard?.enabled !== false) {
    await fastify.register(import('./dashboard/dashboard.plugin'), {
      ...config.dashboard,
      prefix: config.dashboard?.path ?? '/_domos',
    });
  }

  // ─── 4. ADTP Gateway WebSocket ──────────────────────────────
  // Chargé en dernier — dépend de tous les services core
  await fastify.register(import('./core/adtp/adtp.plugin'), {
    path: config.path ?? '/domos',
  });

  // ─── 5. Modules feature-flagged ─────────────────────────────
  const mode = config.mode ?? detectMode();

  if (mode === 'cloud') {
    await fastify.register(import('./modules/cloud/cloud.plugin'), config.cloud);
  } else {
    await fastify.register(
      import('./modules/self-hosting/self-hosting.plugin'),
      config.selfHosting
    );
  }

  // ─── 6. Intégrations optionnelles ───────────────────────────
  if (config.integrations?.shopify?.enabled) {
    await fastify.register(
      import('./integrations/shopify/shopify.plugin'),
      config.integrations.shopify
    );
  }

  if (config.integrations?.woocommerce?.enabled) {
    await fastify.register(
      import('./integrations/woocommerce/woocommerce.plugin'),
      config.integrations.woocommerce
    );
  }

  // ─── 7. Intégrations custom (communauté) ─────────────────────
  for (const integration of config.integrations?.custom ?? []) {
    await fastify.register(integration.plugin, integration.options);
  }

  return fastify;
}
```

### 4.4 Interface DomOSPlugin tiers

```typescript
// src/core/plugins/plugin.types.ts

export interface DomOSPlugin {
  name: string;
  version: string;
  description?: string;

  // Lifecycle
  onInit?: (ctx: PluginContext) => Promise<void> | void;
  onDestroy?: () => Promise<void> | void;

  // Hooks ADTP (middleware — appelé dans l'ordre d'enregistrement)
  onMessage?: (
    msg: ADTPMessage,
    session: Session,
    next: () => void
  ) => ADTPMessage | void | Promise<ADTPMessage | void>;

  // Hooks LLM
  onBeforeLLMCall?: (req: LLMRequest, session: Session) => LLMRequest;
  onAfterLLMCall?: (res: LLMResponse, session: Session) => LLMResponse;

  // Hooks Tool
  onToolCall?: (call: ToolCall, session: Session) => void;
  onToolResult?: (result: ToolResult, session: Session) => void;

  // Hooks Session
  onSessionStart?: (session: Session) => void;
  onSessionEnd?: (session: Session, reason: DisconnectReason) => void;

  // Tool providers — enregistre des tools serveur automatiquement
  toolProviders?: ToolProvider[];

  // Routes Fastify custom (pour dashboards plugins)
  registerRoutes?: (fastify: FastifyInstance) => Promise<void>;
}

export interface ToolProvider {
  name: string;
  getTools(session: Session): ToolDeclaration[] | Promise<ToolDeclaration[]>;
  execute(call: ToolCall, session: Session): unknown | Promise<unknown>;
  shouldActivate?: (session: Session) => boolean;
}

export interface PluginContext {
  server: DomOSServerContext;  // API publique du serveur (pas les internals)
  logger: Logger;
  config: DomOSConfig;
}
```

---

## 5. Feature Flags — Self-Hosting vs Cloud Pro

### 5.1 Détection automatique du mode

```typescript
// src/config/index.ts

function detectMode(): 'self' | 'cloud' {
  // 1. Variable d'environnement explicite
  if (process.env.DOMOS_MODE) {
    return process.env.DOMOS_MODE as 'self' | 'cloud';
  }

  // 2. Détection par présence de variables Cloud Pro
  const hasCloudVars = !!(
    process.env.DATABASE_URL &&
    process.env.REDIS_URL &&
    process.env.JWT_SECRET
  );

  return hasCloudVars ? 'cloud' : 'self';
}
```

### 5.2 Ce que chaque mode active

```typescript
// Matrice des fonctionnalités par mode

const FEATURES = {
  // ── Toujours actif ───────────────────────────────────────
  always: [
    'adtp-gateway',        // WebSocket ADTP
    'session-manager',     // Gestion sessions
    'llm-orchestrator',    // Appels LLM
    'hitl-engine',         // Sécurité HITL
    'client-auth',         // Auth clés API
    'audio-handler',       // Audio WS + WebRTC
    'dashboard',           // Dashboard embarqué
    'plugin-system',       // Plugins tiers
  ],

  // ── Mode self-hosting ────────────────────────────────────
  self: [
    'memory-session-store',  // Sessions en mémoire (pas de Redis requis)
    'local-api-key-store',   // Clés API en mémoire
    'single-tenant',         // 1 instance = 1 projet
    'local-config',          // Config depuis fichier .yml ou env
    // PAS de :
    // - multi-tenant
    // - billing
    // - analytics avancées
    // - store-connect OAuth
    // - RBAC complexe
    // - audit logs
  ],

  // ── Mode cloud ───────────────────────────────────────────
  cloud: [
    'redis-session-store',   // Sessions Redis persistantes
    'prisma-orm',            // PostgreSQL pour toutes les données
    'multi-tenant',          // Isolation par organizationId
    'rbac',                  // Owner/Admin/Developer/Viewer
    'billing',               // Quotas + facturation hybride
    'analytics',             // Tokens, coûts, latences
    'store-connect',         // OAuth Shopify + wc-auth WooCommerce
    'webhooks',              // Webhooks sortants
    'audit-logs',            // Audit trail immuable
    'operator-dashboard',    // Conversations live + Human Takeover
    'sso',                   // SAML/SSO Enterprise
    'jwt-auth-cloud',        // JWT pour l'API Cloud Pro
  ],
} as const;
```

### 5.3 Config fichier — domos.config.yml

```yaml
# domos.config.yml — Configuration complète commentée

# Mode : 'self' (self-hosting) ou 'cloud' (Cloud Pro)
# Si non défini : auto-détecté selon les variables d'environnement
mode: self

# ── Réseau ─────────────────────────────────────────────────
port: 3000
host: "0.0.0.0"
path: "/domos"           # Endpoint WebSocket ADTP

# ── LLM ────────────────────────────────────────────────────
llm:
  provider: google        # google | openai | anthropic
  model: gemini-2.0-flash
  # apiKey: depuis GOOGLE_API_KEY env (ne jamais mettre en clair ici)

# ── Auth client WebSocket ──────────────────────────────────
client:
  requireApiKey: true
  maxConnectionsPerKey: 10

# ── Dashboard Embarqué ─────────────────────────────────────
dashboard:
  enabled: true
  path: /_domos
  # username/password depuis ADMIN_USERNAME / ADMIN_PASSWORD env
  sessionDuration: 28800000     # 8h en ms
  rateLimitWindowMs: 900000     # 15min en ms
  rateLimitMaxAttempts: 5
  requireHttps: false           # true en production
  csrfProtection: true
  # allowedOrigins: []          # [] = localhost seulement
  # ipWhitelist: []             # [] = pas de restriction

# ── Audio ──────────────────────────────────────────────────
audio:
  transport: websocket          # websocket | webrtc
  # webrtc:
  #   iceServers:
  #     - urls: stun:stun.l.google.com:19302
  #   turnServerUrl: ${TURN_URL}
  #   turnUsername: ${TURN_USERNAME}
  #   turnPassword: ${TURN_PASSWORD}

# ── Redis (optionnel en self-hosting, requis en cloud) ─────
# redis:
#   url: ${REDIS_URL}

# ── Plugins ────────────────────────────────────────────────
plugins:
  - package: "@domos/plugin-logger"
    options:
      level: info
      format: pretty
  - package: "@domos/plugin-ratelimit"
    options:
      global:
        windowMs: 60000
        max: 100

# ── Intégrations (optionnelles) ────────────────────────────
# integrations:
#   shopify:
#     enabled: true
#     # clientId/clientSecret depuis env
#   woocommerce:
#     enabled: true
#     # webhookSecret depuis env

# ── Cloud Pro (si mode: cloud) ─────────────────────────────
# cloud:
#   multiTenant: true
#   billing:
#     enabled: true
#   analytics:
#     retentionDays: 90
```

---

## 6. Mode Standalone — Cloner et déployer

### 6.1 Le concept Standalone

Le mode **Standalone** permet de cloner uniquement le dossier `domos-server` et de le déployer de manière totalement indépendante du monorepo DomOS. Utile pour :

- Déployer le serveur sur un VPS sans cloner tout le monorepo
- Utiliser DomOS comme backend dans un projet existant (Laravel, Rails, etc.)
- Distribuer une version pre-built aux clients Cloud Pro
- Avoir un serveur de démo rapidement opérationnel

### 6.2 Utilisation standalone — 5 commandes

```bash
# 1. Cloner uniquement le dossier server (sparse checkout)
git clone --filter=blob:none --sparse https://github.com/futur4tech/domos.git
cd domos
git sparse-checkout set packages/server

# Ou directement depuis le dossier server si distribué séparément :
git clone https://github.com/futur4tech/domos-server.git
cd domos-server

# 2. Installer les dépendances
pnpm install

# 3. Copier et configurer
cp .env.example .env
cp domos.config.example.yml domos.config.yml
# → Éditer .env avec vos clés API

# 4. Setup initial (hash du mot de passe admin, init DB si cloud)
pnpm run setup

# 5. Démarrer
pnpm run start
# → DomOS Server    : ws://localhost:3000/domos
# → Admin Dashboard : http://localhost:3000/_domos/panel
```

### 6.3 Utilisation dans un projet existant

```bash
# Dans votre projet Laravel, Rails, ou autre backend
# Cloner le dossier server dans votre projet

cd votre-projet
git clone https://github.com/futur4tech/domos-server.git domos-server
cd domos-server

cp .env.example .env
# Configurer .env

pnpm install
pnpm run build

# Démarrer en arrière-plan
pnpm run start &

# Votre frontend peut maintenant se connecter à :
# ws://localhost:3000/domos
```

### 6.4 Déploiement Docker standalone

```bash
# Option 1 — Docker Compose (recommandé — inclut Redis + PostgreSQL)
cd domos-server
cp .env.example .env
# Éditer .env
docker compose up -d

# Option 2 — Docker seul (self-hosting minimal sans base de données)
docker run -d \
  --name domos-server \
  -p 3000:3000 \
  -e GOOGLE_API_KEY=AIza... \
  -e ADMIN_PASSWORD=votre-password-securise \
  -e DOMOS_MODE=self \
  ghcr.io/futur4tech/domos-server:latest

# Dashboard accessible sur http://localhost:3000/_domos/panel
```

### 6.5 docker-compose.yml — Stack complète

```yaml
# docker/docker-compose.yml

version: "3.9"

services:
  domos-server:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DOMOS_MODE: ${DOMOS_MODE:-self}          # self | cloud
      GOOGLE_API_KEY: ${GOOGLE_API_KEY}
      OPENAI_API_KEY: ${OPENAI_API_KEY:-}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
      ADMIN_USERNAME: ${ADMIN_USERNAME:-admin}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      PORT: 3000
      # Cloud Pro seulement :
      DATABASE_URL: postgresql://domos:${DB_PASSWORD}@postgres:5432/domos
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/_domos/api/status"]
      interval: 30s
      timeout: 10s
      retries: 3
    volumes:
      - ./domos.config.yml:/app/domos.config.yml:ro
      - domos_logs:/app/logs

  postgres:
    image: timescale/timescaledb:latest-pg16   # PostgreSQL + TimescaleDB
    environment:
      POSTGRES_DB: domos
      POSTGRES_USER: domos
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U domos"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --save 60 1
      --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  domos_logs:
```

### 6.6 Dockerfile production optimisé

```dockerfile
# docker/Dockerfile

# ── Stage 1 : Build dashboard UI ──────────────────────────
FROM node:22-alpine AS dashboard-builder
WORKDIR /build
COPY dashboard-ui/package.json dashboard-ui/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY dashboard-ui/ ./
RUN pnpm run build
# Output → /build/dist (copié dans src/dashboard/panel/)

# ── Stage 2 : Build serveur TypeScript ───────────────────
FROM node:22-alpine AS server-builder
WORKDIR /build
COPY package.json pnpm-lock.yaml tsconfig*.json ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY src/ ./src/
COPY prisma/ ./prisma/
# Copie du dashboard compilé
COPY --from=dashboard-builder /build/dist ./src/dashboard/panel/
# Build TypeScript
RUN pnpm run build
# Prisma client
RUN pnpm exec prisma generate

# ── Stage 3 : Image production minimale ──────────────────
FROM node:22-alpine AS production
WORKDIR /app

# Dépendances production uniquement
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

# Binaires compilés
COPY --from=server-builder /build/dist ./dist
COPY --from=server-builder /build/node_modules/.prisma ./node_modules/.prisma

# Prisma schema pour les migrations
COPY prisma/ ./prisma/

# Script de démarrage
COPY docker/entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S domos && adduser -S domos -G domos
USER domos

EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "dist/main.js"]
```

### 6.7 Entrypoint — Migrations automatiques

```bash
#!/bin/sh
# docker/entrypoint.sh

set -e

echo "🚀 DomOS Server starting..."

# Appliquer les migrations Prisma en mode cloud
if [ "$DOMOS_MODE" = "cloud" ]; then
  echo "📦 Running database migrations..."
  node_modules/.bin/prisma migrate deploy
  echo "✅ Migrations applied"
fi

# Hash du mot de passe admin si premier démarrage
if [ -n "$ADMIN_PASSWORD" ] && [ ! -f "/app/.admin_initialized" ]; then
  echo "🔐 Initializing admin credentials..."
  node dist/scripts/setup.js --hash-admin-password
  touch /app/.admin_initialized
fi

echo "✅ DomOS Server ready"
exec "$@"
```

---

## 7. Intégration dans le monorepo DomOS

### 7.1 Position dans le monorepo

```
domos/
├── packages/
│   ├── core/
│   ├── ui/
│   ├── react/
│   ├── vue/
│   └── ...
│
├── apps/
│   ├── demo/
│   ├── docs/
│   ├── cloud-dashboard/          # Nuxt 4 — Dashboard Cloud Pro
│   └── server/                   # ← Le serveur Fastify unifié (ici)
│       ├── src/
│       ├── dashboard-ui/
│       ├── prisma/
│       ├── docker/
│       └── package.json
│
└── pnpm-workspace.yaml
```

### 7.2 Package.json du serveur

```json
{
  "name": "@domos/server",
  "version": "0.3.0",
  "description": "DomOS Unified Server — Self-Hosting & Cloud Pro",
  "main": "dist/main.js",
  "types": "dist/main.d.ts",
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "pnpm run build:dashboard && tsc -p tsconfig.build.json",
    "build:dashboard": "cd dashboard-ui && vite build --outDir ../src/dashboard/panel",
    "start": "node dist/main.js",
    "setup": "tsx scripts/setup.ts",
    "db:migrate": "prisma migrate deploy",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src --ext .ts",
    "docker:build": "docker build -f docker/Dockerfile -t domos-server .",
    "docker:up": "docker compose -f docker/docker-compose.yml up -d",
    "docker:down": "docker compose -f docker/docker-compose.yml down"
  },
  "dependencies": {
    "@domos/core": "workspace:*",
    "@domos/ui": "workspace:*",
    "fastify": "^5.x",
    "@fastify/websocket": "^11.x",
    "@fastify/rate-limit": "^10.x",
    "@fastify/cors": "^10.x",
    "@fastify/helmet": "^12.x",
    "@fastify/cookie": "^10.x",
    "@fastify/jwt": "^9.x",
    "@fastify/static": "^8.x",
    "@fastify/sensible": "^6.x",
    "@fastify/autoload": "^6.x",
    "fastify-plugin": "^5.x",
    "@prisma/client": "^6.x",
    "ioredis": "^5.x",
    "zod": "^3.x",
    "bcrypt": "^5.x",
    "pino": "^9.x",
    "pino-pretty": "^13.x",
    "dotenv": "^16.x",
    "js-yaml": "^4.x",
    "@google/generative-ai": "^0.x",
    "openai": "^4.x",
    "@anthropic-ai/sdk": "^0.x"
  },
  "devDependencies": {
    "@types/node": "^22.x",
    "@types/bcrypt": "^5.x",
    "typescript": "^5.x",
    "tsx": "^4.x",
    "vitest": "^2.x",
    "prisma": "^6.x",
    "vite": "^6.x",
    "preact": "^10.x",
    "@preact/preset-vite": "^2.x",
    "pino-pretty": "^13.x"
  }
}
```

---

## 8. Configuration complète

### 8.1 Interface TypeScript de configuration

```typescript
// src/config/types.ts

export interface DomOSConfig {
  // Mode — détecté automatiquement si non défini
  mode?: 'self' | 'cloud';

  // Réseau
  port?: number;                 // Défaut: 3000
  host?: string;                 // Défaut: '0.0.0.0'
  path?: string;                 // Défaut: '/domos'
  cors?: { origins: string[] };

  // LLM
  llm: LLMAdapterConfig;

  // Auth client WebSocket
  client?: {
    requireApiKey?: boolean;     // Défaut: true
    maxConnectionsPerKey?: number; // Défaut: 10
    enableApiKeyManagement?: boolean; // Défaut: true
  };

  // Dashboard embarqué
  dashboard?: {
    enabled?: boolean;           // Défaut: true
    path?: string;               // Défaut: '/_domos'
    username?: string;           // Défaut: 'admin'
    password: string;            // REQUIS si enabled
    sessionDuration?: number;    // Défaut: 8h
    rateLimitWindowMs?: number;  // Défaut: 15min
    rateLimitMaxAttempts?: number; // Défaut: 5
    requireHttps?: boolean;      // Défaut: false (true auto en production)
    csrfProtection?: boolean;    // Défaut: true
    allowedOrigins?: string[];   // Défaut: []
    ipWhitelist?: string[];      // Défaut: [] (pas de restriction)
  };

  // Redis
  redis?: { url: string };

  // Audio
  audio?: {
    transport?: 'websocket' | 'webrtc'; // Défaut: 'websocket'
    webrtc?: WebRTCConfig;
  };

  // Logging
  log?: {
    level?: 'debug' | 'info' | 'warn' | 'error'; // Défaut: 'info'
    pretty?: boolean;            // Défaut: true en dev, false en prod
    redactFields?: string[];     // Champs masqués dans les logs
  };

  // Plugins tiers
  plugins?: DomOSPluginConfig[];

  // Intégrations
  integrations?: {
    shopify?: ShopifyIntegrationConfig;
    woocommerce?: WooCommerceIntegrationConfig;
    custom?: { plugin: FastifyPlugin; options: unknown }[];
  };

  // Config Cloud Pro (si mode: 'cloud')
  cloud?: CloudConfig;
}
```

### 8.2 .env.example complet

```bash
# ════════════════════════════════════════════════════════════
# DomOS Server — Variables d'environnement
# ════════════════════════════════════════════════════════════

# ── Mode ─────────────────────────────────────────────────
# 'self' = self-hosting communautaire
# 'cloud' = Cloud Pro (nécessite PostgreSQL + Redis + JWT_SECRET)
DOMOS_MODE=self

# ── Serveur ──────────────────────────────────────────────
PORT=3000
NODE_ENV=development    # development | production

# ── LLM Adapters ─────────────────────────────────────────
GOOGLE_API_KEY=AIza...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# ── Admin Dashboard ───────────────────────────────────────
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changez-moi-imperativement   # Min 16 chars en prod

# ── PostgreSQL (requis si DOMOS_MODE=cloud) ───────────────
# DATABASE_URL=postgresql://domos:password@localhost:5432/domos

# ── Redis (optionnel en self, requis en cloud) ────────────
# REDIS_URL=redis://:password@localhost:6379

# ── JWT (requis si DOMOS_MODE=cloud) ─────────────────────
# JWT_SECRET=generate-with-openssl-rand-hex-32
# JWT_EXPIRES_IN=3600
# REFRESH_TOKEN_SECRET=another-openssl-rand-hex-32
# REFRESH_TOKEN_EXPIRES_IN=604800

# ── Chiffrement credentials (requis si DOMOS_MODE=cloud) ─
# ENCRYPTION_KEY=64-hex-chars-openssl-rand-hex-32

# ── Cookies ──────────────────────────────────────────────
# COOKIE_SECRET=openssl-rand-hex-32

# ── WebRTC (optionnel) ────────────────────────────────────
# TURN_URL=turn:turn.example.com:3478
# TURN_USERNAME=domos
# TURN_PASSWORD=...

# ── Intégrations Shopify (optionnel) ─────────────────────
# SHOPIFY_CLIENT_ID=...
# SHOPIFY_CLIENT_SECRET=...
# SHOPIFY_WEBHOOK_SECRET=...

# ── Intégrations WooCommerce (optionnel) ─────────────────
# WOO_WEBHOOK_SECRET=...

# ── Webhooks DomOS (optionnel) ────────────────────────────
# WEBHOOK_SECRET=...
```

---

## 9. Prérequis et Setup

### 9.1 Prérequis système

```
Node.js   >= 22.0.0 LTS
pnpm      >= 9.0.0
Docker    >= 24.0    (pour le déploiement containerisé)
Git       >= 2.x

PostgreSQL >= 16 + TimescaleDB  (DOMOS_MODE=cloud uniquement)
Redis      >= 7.x               (recommandé, optionnel en self)
```

### 9.2 Setup développement

```bash
# 1. Cloner
git clone https://github.com/futur4tech/domos.git
cd domos/apps/server   # Ou domos-server si standalone

# 2. Installer les dépendances
pnpm install

# 3. Config
cp .env.example .env
cp domos.config.example.yml domos.config.yml

# 4. Éditer .env — minimum requis en self-hosting :
#    GOOGLE_API_KEY=...
#    ADMIN_PASSWORD=votre-password

# 5. Setup initial (hash admin password)
pnpm run setup

# 6. [Cloud uniquement] Lancer la base de données
docker compose -f docker/docker-compose.dev.yml up -d postgres redis

# 7. [Cloud uniquement] Appliquer les migrations
pnpm run db:migrate
pnpm run db:generate

# 8. Build du dashboard Preact
pnpm run build:dashboard

# 9. Démarrer en mode développement (hot-reload)
pnpm run dev

# → DomOS Server    : ws://localhost:3000/domos
# → Admin Dashboard : http://localhost:3000/_domos/panel
# → [Cloud] API     : http://localhost:3000/api/*
```

### 9.3 Scripts disponibles

```bash
pnpm run dev               # Dev avec hot-reload (tsx watch)
pnpm run build             # Build production (dashboard + TypeScript)
pnpm run build:dashboard   # Build uniquement le dashboard Preact
pnpm run start             # Démarrer le serveur buildé
pnpm run setup             # Setup initial (hash passwords, check config)
pnpm run db:migrate        # Appliquer migrations Prisma
pnpm run db:generate       # Regénérer le client Prisma
pnpm run db:studio         # Ouvrir Prisma Studio (UI base de données)
pnpm run test              # Tests unitaires + intégration (Vitest)
pnpm run test:watch        # Tests en watch mode
pnpm run lint              # Lint TypeScript
pnpm run docker:build      # Build image Docker
pnpm run docker:up         # Démarrer la stack Docker complète
pnpm run docker:down       # Arrêter la stack Docker
```

### 9.4 Schéma Prisma — Extrait principal

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── Organisations (Cloud Pro multi-tenant) ──────────────
model Organization {
  id          String    @id @default(uuid())
  name        String
  slug        String    @unique
  plan        Plan      @default(STARTER)
  ownerId     String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  members     OrgMember[]
  projects    Project[]
  stores      Store[]
  billing     BillingRecord[]

  @@map("organizations")
}

// ── Projets ─────────────────────────────────────────────
model Project {
  id              String    @id @default(uuid())
  organizationId  String
  name            String
  slug            String
  status          ProjectStatus @default(ACTIVE)
  activeProviderId String?
  metadata        Json?
  createdAt       DateTime  @default(now())

  organization    Organization @relation(fields: [organizationId], references: [id])
  providers       LLMProvider[]
  apiKeys         ApiKey[]
  sessions        SessionArchive[]

  @@index([organizationId])
  @@map("projects")
}

// ── Providers LLM ────────────────────────────────────────
model LLMProvider {
  id              String   @id @default(uuid())
  projectId       String
  name            String
  providerType    LLMProviderType
  modelId         String
  isActive        Boolean  @default(false)
  useOwnApiKey    Boolean  @default(false)
  encryptedApiKey String?
  iv              String?
  authTag         String?
  temperature     Decimal  @default(0.7)
  maxTokens       Int      @default(4096)
  systemPrompt    String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  project         Project  @relation(fields: [projectId], references: [id])

  @@index([projectId])
  @@map("llm_providers")
}

// ── Clés API client ──────────────────────────────────────
model ApiKey {
  id          String   @id @default(uuid())
  projectId   String
  name        String
  keyHash     String   @unique
  prefix      String
  platform    KeyPlatform @default(GENERIC)
  environment KeyEnvironment @default(LIVE)
  isActive    Boolean  @default(true)
  lastUsedAt  DateTime?
  usageCount  BigInt   @default(0)
  revokedAt   DateTime?
  createdAt   DateTime @default(now())

  project     Project  @relation(fields: [projectId], references: [id])

  @@index([projectId, isActive])
  @@map("api_keys")
}

// ── Sessions archivées ───────────────────────────────────
model SessionArchive {
  id                  String   @id @default(uuid())
  projectId           String
  startedAt           DateTime
  endedAt             DateTime
  durationMs          Int
  messageCount        Int      @default(0)
  tokenInputTotal     Int      @default(0)
  tokenOutputTotal    Int      @default(0)
  voiceDurationMs     Int      @default(0)
  toolCallCount       Int      @default(0)
  toolCallSuccessCount Int     @default(0)
  toolCallRefusedCount Int     @default(0)
  costEstimatedUsd    Decimal  @default(0)
  endReason           EndReason @default(CLIENT_DISCONNECT)

  project             Project  @relation(fields: [projectId], references: [id])

  @@index([projectId, startedAt])
  @@map("sessions_archive")
}

// ── Boutiques connectées ─────────────────────────────────
model Store {
  id              String   @id @default(uuid())
  organizationId  String
  platform        StorePlatform
  shopIdentifier  String   @unique
  shopName        String
  connectionMode  ConnectionMode
  status          StoreStatus @default(ACTIVE)
  v3Ready         Boolean  @default(true)
  metadata        Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  organization    Organization @relation(fields: [organizationId], references: [id])
  credentials     StoreCredential[]
  apiKeys         ApiKey[]

  @@index([organizationId, platform])
  @@map("stores")
}

// Enums
enum Plan              { FREE STARTER PRO ENTERPRISE }
enum ProjectStatus     { ACTIVE SUSPENDED DELETED }
enum LLMProviderType   { GOOGLE OPENAI ANTHROPIC CUSTOM }
enum KeyPlatform       { GENERIC SHOPIFY WOOCOMMERCE }
enum KeyEnvironment    { LIVE DEV }
enum EndReason         { CLIENT_DISCONNECT SERVER_TIMEOUT ERROR ADMIN_TERMINATE }
enum StorePlatform     { SHOPIFY WOOCOMMERCE }
enum ConnectionMode    { OAUTH WC_AUTH MANUAL }
enum StoreStatus       { ACTIVE DISCONNECTED SUSPENDED PENDING }
```

---

## 10. Sécurité

### 10.1 Couches de sécurité du serveur

```
┌─────────────────────────────────────────────────────────────────┐
│                    Internet / Client                             │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS / WSS (TLS 1.3)
┌─────────────────────────▼───────────────────────────────────────┐
│               Reverse Proxy (Nginx / Caddy)                      │
│   TLS termination · Rate limiting global · DDoS protection       │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                   Fastify Server                                 │
│                                                                  │
│  @fastify/helmet    → Content-Security-Policy, HSTS, noSniff    │
│  @fastify/cors      → Origins whitelistés                       │
│  @fastify/rate-limit → Rate limiting par route                   │
│                                                                  │
│  WebSocket Auth     → Clé API validée à la connexion             │
│  Dashboard Auth     → bcrypt + sessions + CSRF double-cookie     │
│  API Auth (Cloud)   → JWT RS256 + Refresh tokens httpOnly        │
│                                                                  │
│  Zod Validation     → Tous les messages ADTP et DTOs validés     │
│  HITL Engine        → Actions critiques bloquées jusqu'approbation│
│  Input Sanitization → Pas d'exécution de contenu non validé     │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 Ce qui n'est jamais exposé

```typescript
// Règle absolue — ces données ne transitent JAMAIS dans les réponses API

const NEVER_EXPOSE = [
  'llm.apiKey',               // Clés API LLM (Google, OpenAI, Anthropic)
  'dashboard.password',       // Mot de passe admin en clair
  'dashboard.passwordHash',   // Hash bcrypt du mot de passe admin
  'redis.url',                // URL Redis avec credentials
  'cloud.jwtSecret',          // Secret JWT
  'cloud.encryptionKey',      // Clé AES-256
  'stores[].credentials',     // Tokens OAuth chiffrés
  'apiKeys[].keyRaw',         // Clés API en clair (seulement le préfixe)
  'env.*',                    // Variables d'environnement
] as const;
```

### 10.3 Checklist sécurité production

```bash
# Avant tout déploiement en production :

✅ NODE_ENV=production défini
✅ ADMIN_PASSWORD fort (openssl rand -base64 32)
✅ JWT_SECRET généré (openssl rand -hex 32)
✅ ENCRYPTION_KEY généré (openssl rand -hex 32)
✅ COOKIE_SECRET généré (openssl rand -hex 32)
✅ HTTPS/WSS configuré (Caddy recommandé — auto-TLS)
✅ dashboard.requireHttps: true
✅ dashboard.allowedOrigins configuré
✅ Firewall — ports 80/443 uniquement publics
✅ Redis avec mot de passe (requirepass)
✅ PostgreSQL avec utilisateur dédié (pas postgres)
✅ Logs en JSON (pas pretty) vers un système de log
✅ @domos/plugin-audit activé
✅ @domos/plugin-ratelimit activé
✅ Backup automatique PostgreSQL configuré
✅ Monitoring uptime sur /_domos/api/status
✅ Rotation des secrets planifiée (tous les 90 jours)
```

---

## 11. Roadmap vers Rust

Si DomOS atteint des volumes nécessitant Rust, la migration est progressive grâce à `napi-rs` :

### 11.1 Quand migrer vers Rust

```
Indicateurs de migration :
- > 50 000 connexions WebSocket simultanées
- Latence parsing ADTP > 5ms de façon récurrente
- CPU > 80% sur le parsing/validation seul
- Besoins de chiffrement AES haute fréquence (>100k ops/sec)
```

### 11.2 Modules candidats Rust

```rust
// Ordre de priorité de migration

// 1. domos_adtp_parser — Parsing + validation ADTP
//    Impact : -0.5ms/message sur 100k+ messages/sec
//    Bibliothèques : serde_json, zod-équivalent en Rust

// 2. domos_crypto — Chiffrement AES-256-GCM credentials
//    Impact : chiffrement 10x plus rapide pour Cloud Pro haute charge
//    Bibliothèques : ring, aes-gcm

// 3. domos_ws_engine — WebSocket engine haute concurrence
//    Impact : > 100k connexions simultanées sur même machine
//    Bibliothèques : tokio, tungstenite, axum

// 4. domos_audio_codec — Encode/décode PCM ↔ Opus
//    Impact : latence audio réduite de ~50ms
//    Bibliothèques : opus, rubato (resampling)
```

### 11.3 Pattern d'intégration napi-rs

```typescript
// Quand un module Rust est prêt, le remplacement est transparent

// Avant (TypeScript)
import { validateADTPMessage } from './core/adtp/validator';

// Après (Rust via napi-rs — même interface)
import { validateADTPMessage } from '@domos/native';
// Le reste du code ne change pas
```

---

*Document d'architecture — Futur4Tech © 2026 — DomOS Server*  
*Version 1.0 — Mars 2026 — Confidentiel*
