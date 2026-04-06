# @domos/server — Architecture Serveur Standalone

> **DomOS — DOM Operating System**  
> Serveur autonome Fastify — embarquable dans Fastify, NestJS, Express  
> Un seul package · Un seul codebase · Zéro distinction self-hosting / Cloud  
> Version 1.0 — Mars 2026 — Futur4Tech

---

## Table des matières

1. [Vision et principe](#1-vision-et-principe)
2. [Choix de stack — Justification](#2-choix-de-stack--justification)
3. [Architecture interne](#3-architecture-interne)
4. [Modes d'utilisation](#4-modes-dutilisation)
5. [Plugin System — Tool Providers](#5-plugin-system--tool-providers)
6. [Dashboard Embarqué — Sécurité complète](#6-dashboard-embarqué--sécurité-complète)
7. [Audio — WebSocket PCM + WebRTC](#7-audio--websocket-pcm--webrtc)
8. [Prérequis et Installation](#8-prérequis-et-installation)
9. [Configuration complète](#9-configuration-complète)
10. [Structure du package](#10-structure-du-package)
11. [Roadmap serveur](#11-roadmap-serveur)

---

## 1. Vision et principe

### 1.1 Un seul serveur pour tout

`@domos/server` est **le** serveur DomOS. Il n'existe pas de version "lite" ni de version "cloud" séparée au niveau du serveur. Un seul package, un seul codebase, activé différemment selon la configuration.

Ce qui varie selon l'environnement, c'est la **configuration** — pas le code :

```
Développeur self-hosting :
  → createDomOSServer({ llm, port: 3000 })
  → Tout fonctionne. Dashboard embarqué disponible sur /_domos/panel.

Futur4Tech Cloud Pro :
  → createDomOSServer({ llm, redis, postgres, multiTenant: true, ... })
  → Mêmes fonctionnalités + modules Cloud activés par config.

Développeur avec Fastify existant :
  → app.register(domosPlugin, { llm })
  → DomOS tourne dans l'app Fastify existante.

Développeur avec NestJS existant :
  → DomosModule.forRoot({ llm })
  → DomOS tourne dans l'app NestJS existante.

Développeur avec Express existant :
  → attachDomOS(expressApp, { llm })
  → DomOS tourne dans l'app Express existante.
```

### 1.2 Pourquoi un seul package

- **Maintenance simplifiée** — une seule base de code à tester, documenter, déployer
- **Pas de duplication** — la logique ADTP, le LLM orchestrator, le plugin system — écrits une seule fois
- **Extensibilité naturelle** — les intégrations Shopify, WooCommerce deviennent des plugins du même serveur
- **Pas de surprise** — le développeur self-hosting a exactement les mêmes capacités que le Cloud Pro — seule la persistence change (mémoire vs Redis/PostgreSQL)

### 1.3 Le Core — Framework-Agnostic

Le cœur de `@domos/server` est **indépendant de tout framework HTTP**. Il s'agit de classes TypeScript pures qui ne dépendent ni de Fastify, ni de NestJS, ni d'Express. Les adaptateurs branchent ce core sur le framework HTTP choisi.

```
┌─────────────────────────────────────────────────────┐
│              DomOS Core (framework-agnostic)         │
│                                                     │
│  ADTPEngine · SessionManager · LLMOrchestrator      │
│  PluginRunner · ToolProviderRegistry · AudioHandler │
│  DashboardServer · AuthManager · RateLimiter        │
└─────────────────────────────────────────────────────┘
         ↓              ↓              ↓
   ┌─────────┐   ┌──────────┐   ┌──────────┐
   │Fastify  │   │ NestJS   │   │ Express  │
   │Adapter  │   │ Adapter  │   │ Adapter  │
   └─────────┘   └──────────┘   └──────────┘
```

---

## 2. Choix de stack — Justification

### 2.1 Fastify comme base standalone

**Fastify** a été choisi comme framework HTTP de base pour les raisons suivantes :

| Critère | Express | NestJS | Fastify | Hono |
|---------|---------|--------|---------|------|
| Performance (req/sec) | ~16k | ~45k (Fastify mode) | ~77k | ~100k |
| Plugin system natif | ❌ | ✅ (modules) | ✅ (plugins) | Partiel |
| WebSocket natif | ❌ | Partiel | ✅ @fastify/websocket | ✅ |
| Validation schémas | ❌ | ✅ (class-validator) | ✅ (JSON Schema natif) | Partiel |
| TypeScript first | ❌ | ✅ | ✅ | ✅ |
| Bundle size | Petit | Lourd | Moyen | Très petit |
| Maturité production | Très élevée | Élevée | Élevée | Moyenne |
| Ecosystem npm | Très riche | Riche | Riche | Croissant |

**Fastify gagne** sur la performance, le plugin system natif (idéal pour les intégrations e-commerce) et la validation intégrée.

### 2.2 Pourquoi pas Deno

- Friction sur Prisma + Redis + certaines libs npm en 2026
- Rupture avec l'écosystème Node.js maîtrisé par l'équipe Futur4Tech
- WebSocket + WebRTC — libs moins matures sous Deno
- **Verdict : dans 2 ans peut-être. Pas maintenant.**

### 2.3 Pourquoi pas Rust (maintenant)

Le vrai bottleneck de DomOS est l'appel LLM (500ms-2s), pas le parsing WebSocket (<1ms). Rust sur le parsing ADTP économiserait 1ms sur 2000ms — du bruit. La complexité d'un codebase bilingue TypeScript+Rust n'est pas justifiée pour le niveau de charge actuel.

**La voie Rust reste ouverte** : si dans 18 mois les benchmarks montrent un bottleneck réel sur les connexions WebSocket (>50k simultanées), le WebSocket engine peut être extrait en Rust via `napi-rs` sans réécrire le reste du serveur.

### 2.4 Libs retenues

```bash
# HTTP + WebSocket
fastify                     # Serveur HTTP ultra-rapide
@fastify/websocket          # WebSocket natif (ws library)
@fastify/rate-limit         # Rate limiting par IP/clé
@fastify/cors               # CORS configurable
@fastify/helmet             # Security headers HTTP
@fastify/cookie             # Cookies sécurisés
@fastify/jwt                # JWT access tokens
@fastify/static             # Servir le dashboard Preact statique
@fastify/sensible           # Helpers erreurs HTTP
fastify-plugin              # Helper création plugins réutilisables

# Validation
zod                         # Validation runtime + types TypeScript

# Logging
pino                        # Logger ultra-rapide (intégré Fastify)
pino-pretty                 # Formatage dev (désactivé en production)

# Auth
bcrypt                      # Hash password admin dashboard
@types/bcrypt

# Persistence (optionnel selon config)
ioredis                     # Client Redis — sessions + rate limiting
@prisma/client              # ORM PostgreSQL (Cloud Pro)
prisma                      # CLI migrations

# Audio WebRTC (optionnel)
wrtc                        # WebRTC pour Node.js
```

---

## 3. Architecture interne

### 3.1 Vue d'ensemble des composants

```
@domos/server/src/
│
├── index.ts                    # Exports publics du package
│
├── core/                       # ← Framework-agnostic — le vrai DomOS
│   ├── DomOSCore.ts            # Orchestrateur principal — initialise tout
│   ├── adtp/
│   │   ├── ADTPEngine.ts       # Routing messages ADTP + validation Zod
│   │   ├── MessageValidator.ts # Validation stricte de chaque message entrant
│   │   └── MessageRouter.ts    # Dispatch vers les handlers selon type
│   ├── session/
│   │   ├── SessionManager.ts   # Cycle de vie sessions (create, update, close)
│   │   ├── SessionStore.ts     # Interface stockage (injectable)
│   │   ├── MemoryStore.ts      # Implémentation in-memory (défaut)
│   │   └── RedisStore.ts       # Implémentation Redis (si configuré)
│   ├── llm/
│   │   ├── LLMOrchestrator.ts  # Boucle USER_INPUT → LLM → TOOL_CALL → RESULT
│   │   ├── AdapterRegistry.ts  # Registre des adaptateurs LLM
│   │   ├── ContextBuilder.ts   # Construit LLMRequest (messages+tools+context)
│   │   └── StreamHandler.ts    # Gestion streaming AGENT_RESPONSE
│   ├── hitl/
│   │   ├── HITLMiddleware.ts   # Évaluation risque avant exécution tool
│   │   └── HITLPolicy.ts       # Re-export depuis @domos/core
│   ├── tools/
│   │   ├── ToolProviderRegistry.ts  # Registre des ToolProviders
│   │   ├── ServerToolRegistry.ts    # Tools déclarés via server.tool()
│   │   └── ClientToolBridge.ts      # Sync tools clients via CONTEXT_UPDATE
│   ├── auth/
│   │   ├── ClientAuthManager.ts     # Clés API WebSocket — validation + gestion
│   │   ├── ApiKeyStore.ts           # Stockage clés (Memory | Redis)
│   │   └── ApiKeyGenerator.ts       # Génération clés format pk_live_*
│   ├── plugins/
│   │   ├── PluginLoader.ts          # Validation + chargement plugins
│   │   ├── PluginRunner.ts          # Exécution hooks dans l'ordre
│   │   └── PluginContext.ts         # Context injecté aux plugins
│   └── audio/
│       ├── AudioHandler.ts          # Dispatch selon transport (ws | webrtc)
│       ├── WebSocketAudioHandler.ts # PCM 16kHz streaming via WebSocket
│       └── WebRTCAudioHandler.ts    # WebRTC proxy → Gemini WebSocket
│
├── dashboard/                  # ← Dashboard embarqué Preact
│   ├── DashboardServer.ts      # Fastify router /_domos/*
│   ├── DashboardAuth.ts        # Auth complète — sessions, CSRF, rate limit
│   ├── DashboardAPI.ts         # Endpoints REST du dashboard
│   ├── DashboardWebSocket.ts   # Stream logs temps réel
│   └── panel/                  # ← Bundle Preact compilé (~50KB gzippé)
│       ├── index.html
│       └── assets/
│
├── adapters/                   # ❌ SUPPRIMÉ (31 mars 2026)
│   # Fastify/Express/NestJS adapters retirés après évaluation
│   # Serveur natif Node.js HTTP suffisant pour tous les use cases
│   # Voir docs/standalone-server/CLEANUP-AND-FASTIFY-EVAL.md
│
└── standalone/
    └── createDomOSServer.ts    # Mode standalone — serveur natif Node.js HTTP
```

### 3.2 DomOSCore — Le chef d'orchestre

```typescript
// core/DomOSCore.ts
// C'est la seule classe que les adaptateurs instancient.
// Elle ne dépend d'aucun framework HTTP.

export class DomOSCore {
  private sessionManager: SessionManager;
  private llmOrchestrator: LLMOrchestrator;
  private toolProviderRegistry: ToolProviderRegistry;
  private pluginRunner: PluginRunner;
  private audioHandler: AudioHandler;
  private clientAuthManager: ClientAuthManager;

  constructor(private config: DomOSCoreConfig) {
    // Initialisation dans l'ordre des dépendances
    this.clientAuthManager = new ClientAuthManager(config);
    this.sessionManager = new SessionManager(config);
    this.toolProviderRegistry = new ToolProviderRegistry();
    this.pluginRunner = new PluginRunner(config.plugins ?? []);
    this.audioHandler = new AudioHandler(config.audio);
    this.llmOrchestrator = new LLMOrchestrator({
      adapter: config.llm,
      sessionManager: this.sessionManager,
      toolProviderRegistry: this.toolProviderRegistry,
      pluginRunner: this.pluginRunner,
    });
  }

  // Méthode principale — appelée par chaque adaptateur
  // quand un nouveau message WebSocket arrive
  async handleMessage(
    rawMessage: string | Buffer,
    socket: DomOSSocket,        // Interface socket framework-agnostic
    sessionId: string
  ): Promise<void> {
    // 1. Valider le message ADTP (Zod)
    const msg = this.adtpEngine.validate(rawMessage);

    // 2. Passer par le plugin runner (hooks onMessage)
    const processedMsg = await this.pluginRunner.runMessageHooks(msg, session);

    // 3. Router vers le bon handler
    await this.messageRouter.route(processedMsg, socket, session);
  }

  // Méthode appelée à la connexion d'un nouveau client WebSocket
  async handleConnection(
    socket: DomOSSocket,
    apiKey: string
  ): Promise<Session | null> {
    // Valider la clé API
    const isValid = await this.clientAuthManager.validate(apiKey);
    if (!isValid) return null;

    // Créer la session
    const session = await this.sessionManager.create(socket);
    await this.pluginRunner.runSessionStart(session);
    return session;
  }

  // Méthode appelée à la déconnexion
  async handleDisconnect(sessionId: string, reason: string): Promise<void> {
    const session = await this.sessionManager.get(sessionId);
    if (session) {
      await this.pluginRunner.runSessionEnd(session, reason);
      await this.sessionManager.close(sessionId, reason);
    }
  }

  // API publique pour enregistrer des tool providers
  registerToolProvider(provider: ToolProvider): void {
    this.toolProviderRegistry.register(provider);
  }

  // API publique pour enregistrer des tools serveur simples
  tool(name: string, handler: ToolHandler): void {
    this.toolProviderRegistry.registerSimple(name, handler);
  }

  // API publique pour ajouter des clés API client
  addApiKey(key: string): void {
    this.clientAuthManager.add(key);
  }
}
```

### 3.3 Interface DomOSSocket — Abstraction framework

```typescript
// Le Core ne parle jamais directement à un socket Fastify ou ws.
// Il utilise cette interface que chaque adaptateur implémente.

interface DomOSSocket {
  id: string;                               // Identifiant unique du socket
  send(data: string | Buffer): void;        // Envoyer un message
  close(code?: number, reason?: string): void; // Fermer la connexion
  on(event: 'message', handler: (data: string | Buffer) => void): void;
  on(event: 'close', handler: (code: number, reason: string) => void): void;
  on(event: 'error', handler: (err: Error) => void): void;
  ip: string;                               // IP du client
  isAlive: boolean;                         // Ping/pong keepalive
}
```

---

## 4. Modes d'utilisation

### 4.1 Mode Standalone — Le plus simple

Le développeur n'a aucun serveur existant. Il crée un serveur DomOS from scratch.

```typescript
// server.ts
import 'dotenv/config';
import { createDomOSServer } from '@domos/server';
import { GoogleAdapter } from '@domos/adapter-google';

const server = createDomOSServer({
  // LLM — obligatoire
  llm: new GoogleAdapter({
    apiKey: process.env.GOOGLE_API_KEY!,
    model: 'gemini-2.0-flash',
    systemPrompt: 'Tu es un assistant utile.',
  }),

  // Réseau
  port: 3000,
  host: '0.0.0.0',
  path: '/domos',            // Endpoint WebSocket ADTP

  // Dashboard embarqué
  dashboard: {
    enabled: true,
    username: process.env.ADMIN_USERNAME ?? 'admin',
    password: process.env.ADMIN_PASSWORD!,
  },

  // Auth clients WebSocket
  client: {
    requireApiKey: true,
    maxConnectionsPerKey: 10,
  },

  // Logging
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    prettyPrint: process.env.NODE_ENV !== 'production',
  },
});

// Clés API client
server.addApiKey('pk_live_abc123');

// Tools serveur (optionnel)
server.tool('get_weather', async ({ city }) => {
  const data = await fetchWeather(city);
  return { city, temp: data.temp, condition: data.condition };
});

// Tool Providers (optionnel)
server.registerToolProvider({
  name: 'database-tools',
  getTools: (session) => [/* ... */],
  execute: async (call, session) => {/* ... */},
});

// Démarrage
server.listen(() => {
  console.log(`DomOS WebSocket  → ws://localhost:3000/domos`);
  console.log(`Admin Dashboard  → http://localhost:3000/_domos/panel`);
});

// Arrêt propre
process.on('SIGTERM', () => server.close());
```

### 4.2 Mode Plugin Fastify

Le développeur a déjà une application Fastify. Il y greffe DomOS.

```typescript
// app.ts — Application Fastify existante
import Fastify from 'fastify';
import { domosPlugin } from '@domos/server/adapters/fastify';
import { GoogleAdapter } from '@domos/adapter-google';

const app = Fastify({ logger: true });

// Routes existantes de l'application
app.get('/health', async () => ({ status: 'ok' }));
app.get('/api/products', async () => getProducts());

// Greffe DomOS comme plugin Fastify
await app.register(domosPlugin, {
  prefix: '/domos',          // Préfixe WebSocket + dashboard
  llm: new GoogleAdapter({ apiKey: process.env.GOOGLE_API_KEY! }),
  dashboard: {
    enabled: true,
    username: 'admin',
    password: process.env.ADMIN_PASSWORD!,
  },
  client: { requireApiKey: true },
  plugins: [],
});

// Accéder au core DomOS pour enregistrer des tools
app.after(() => {
  const domos = app.domos;  // Injecté par le plugin
  domos.addApiKey('pk_live_abc123');
  domos.tool('get_product', async ({ id }) => getProduct(id));
});

await app.listen({ port: 3000 });
```

### 4.3 Mode Module NestJS

Le développeur a une application NestJS existante. Il importe DomOS comme un module.

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { DomosModule } from '@domos/server/adapters/nestjs';
import { GoogleAdapter } from '@domos/adapter-google';

@Module({
  imports: [
    // Import DomOS comme module NestJS
    DomosModule.forRoot({
      path: '/domos',
      llm: new GoogleAdapter({ apiKey: process.env.GOOGLE_API_KEY! }),
      dashboard: {
        enabled: true,
        username: 'admin',
        password: process.env.ADMIN_PASSWORD!,
      },
      client: { requireApiKey: true },
    }),

    // Autres modules NestJS existants
    TypeOrmModule.forRoot({ /* ... */ }),
    AuthModule,
    ProductsModule,
  ],
})
export class AppModule {}
```

```typescript
// products.service.ts — Enregistrer des tools depuis un service NestJS
import { Injectable, OnModuleInit } from '@nestjs/common';
import { DomosService } from '@domos/server/adapters/nestjs';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(private domos: DomosService) {}

  onModuleInit() {
    // Enregistrer un tool DomOS depuis le service NestJS
    this.domos.addApiKey('pk_live_abc123');

    this.domos.tool('search_products', async ({ query, category }) => {
      const results = await this.findProducts({ query, category });
      return { products: results, total: results.length };
    });
  }
}
```

### 4.4 Mode Middleware Express

Le développeur a une application Express existante.

```typescript
// app.ts — Application Express existante
import express from 'express';
import { attachDomOS } from '@domos/server/adapters/express';
import { GoogleAdapter } from '@domos/adapter-google';

const app = express();

// Routes Express existantes
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Attacher DomOS à l'app Express
const domos = await attachDomOS(app, {
  path: '/domos',
  llm: new GoogleAdapter({ apiKey: process.env.GOOGLE_API_KEY! }),
  dashboard: {
    enabled: true,
    username: 'admin',
    password: process.env.ADMIN_PASSWORD!,
  },
});

// Enregistrer des tools
domos.addApiKey('pk_live_abc123');
domos.tool('hello', async ({ name }) => ({ message: `Hello ${name}` }));

// Démarrer le serveur HTTP (attachDomOS n'appelle pas listen)
const httpServer = app.listen(3000, () => {
  console.log('Server running on port 3000');
  console.log('DomOS Dashboard → http://localhost:3000/_domos/panel');
});

// attachDomOS a besoin du serveur HTTP pour le WebSocket upgrade
domos.attachToServer(httpServer);
```

---

## 5. Plugin System — Tool Providers

### 5.1 Interface DomOSPlugin

```typescript
// Tout plugin DomOS implémente cette interface.
// Les méthodes sont toutes optionnelles — un plugin n'implémente
// que ce dont il a besoin.

interface DomOSPlugin {
  // Identification
  name: string;
  version: string;
  description?: string;

  // Lifecycle
  onInit?(ctx: PluginContext): Promise<void> | void;
  onDestroy?(): Promise<void> | void;

  // Hooks messages ADTP — pipeline de traitement
  // next() passe au plugin suivant dans la chaîne
  onMessage?(
    msg: ADTPMessage,
    session: Session,
    next: () => Promise<void>
  ): Promise<void> | void;

  // Hooks LLM
  onBeforeLLMCall?(req: LLMRequest, session: Session): LLMRequest | Promise<LLMRequest>;
  onAfterLLMCall?(res: LLMResponse, session: Session): LLMResponse | Promise<LLMResponse>;

  // Hooks tools
  onToolCall?(call: ToolCall, session: Session): void | Promise<void>;
  onToolResult?(result: ToolResult, session: Session): void | Promise<void>;

  // Hooks sessions
  onSessionStart?(session: Session): void | Promise<void>;
  onSessionEnd?(session: Session, reason: string): void | Promise<void>;

  // Tool Providers — enregistre des tools serveur automatiquement
  toolProviders?: ToolProvider[];

  // Routes HTTP custom — montées sous /_domos/plugins/{name}/
  routes?(router: FastifyPluginAsync): FastifyPluginAsync;
}
```

### 5.2 Interface ToolProvider

```typescript
interface ToolProvider {
  name: string;
  description?: string;

  // Retourne les tools disponibles pour cette session
  // Permet des tools dynamiques selon le contexte de la session
  getTools(session: Session): ToolDeclaration[] | Promise<ToolDeclaration[]>;

  // Exécute un tool call
  execute(call: ToolCall, session: Session): unknown | Promise<unknown>;

  // Optionnel — active ce provider seulement pour certaines sessions
  shouldActivate?(session: Session): boolean | Promise<boolean>;
}
```

### 5.3 Exemple — Plugin Shopify (futur module)

Voici comment le futur module Shopify s'intégrera comme plugin DomOS :

```typescript
// @domos/integration-shopify/src/index.ts
import { fastifyPlugin } from 'fastify-plugin';
import type { DomOSPlugin, ToolProvider } from '@domos/server';

interface ShopifyPluginOptions {
  shopifyClientId: string;
  shopifyClientSecret: string;
  storefrontAccessToken?: string;  // Pour les boutiques connectées
}

export function createShopifyPlugin(options: ShopifyPluginOptions): DomOSPlugin {
  const shopifyToolProvider: ToolProvider = {
    name: 'shopify-tools',

    // Active ce provider seulement si la session a un shopDomain
    shouldActivate: (session) => Boolean(session.context?.shopDomain),

    // Tools disponibles sur les pages Shopify
    getTools: (session) => [
      {
        name: 'add_to_cart',
        description: 'Add a product variant to the Shopify cart',
        parameters: {
          type: 'object',
          properties: {
            variantId: { type: 'string', description: 'Shopify variant ID' },
            quantity: { type: 'number', default: 1 },
          },
          required: ['variantId'],
        },
        riskLevel: 'low',
      },
      {
        name: 'search_products',
        description: 'Search products in the Shopify catalog',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            limit: { type: 'number', default: 5 },
          },
          required: ['query'],
        },
        riskLevel: 'none',
      },
      {
        name: 'initiate_checkout',
        description: 'Create a Shopify checkout from current cart',
        parameters: { type: 'object', properties: {} },
        riskLevel: 'high',  // HITL obligatoire
      },
    ],

    // Exécution des tool calls Shopify
    execute: async (call, session) => {
      const shopDomain = session.context?.shopDomain as string;
      const storefrontToken = await getStorefrontToken(shopDomain);
      const storefront = new StorefrontClient(shopDomain, storefrontToken);

      switch (call.name) {
        case 'search_products':
          return storefront.searchProducts(call.args.query, call.args.limit);
        case 'initiate_checkout':
          return storefront.createCheckout(session.context?.cartId);
        default:
          throw new Error(`Unknown Shopify tool: ${call.name}`);
      }
    },
  };

  return {
    name: 'domos-shopify',
    version: '1.0.0',
    description: 'Shopify e-commerce integration for DomOS',

    // Enregistre automatiquement le tool provider
    toolProviders: [shopifyToolProvider],

    // Routes OAuth Shopify montées sous /_domos/plugins/domos-shopify/
    routes: async (router) => {
      router.get('/oauth/init', handleOAuthInit);
      router.get('/oauth/callback', handleOAuthCallback);
      router.post('/webhooks/app-uninstalled', handleWebhookUninstall);
    },

    onSessionStart: async (session) => {
      // Injecter les données Shopify dans le contexte de session
      if (session.context?.shopDomain) {
        const shopInfo = await getShopInfo(session.context.shopDomain);
        session.context.shopName = shopInfo.name;
        session.context.shopCurrency = shopInfo.currency;
      }
    },
  };
}
```

**Usage dans le serveur :**

```typescript
import { createDomOSServer } from '@domos/server';
import { createShopifyPlugin } from '@domos/integration-shopify';

const server = createDomOSServer({
  llm: googleAdapter,
  plugins: [
    createShopifyPlugin({
      shopifyClientId: process.env.SHOPIFY_CLIENT_ID!,
      shopifyClientSecret: process.env.SHOPIFY_CLIENT_SECRET!,
    }),
  ],
});
```

### 5.4 Ordre d'exécution des plugins

```
Message ADTP reçu
    ↓
Plugin 1 → onMessage()  →  next()
    ↓
Plugin 2 → onMessage()  →  next()
    ↓
Plugin N → onMessage()  →  next()
    ↓
ADTPEngine — traitement principal
    ↓
Si USER_INPUT → LLM Pipeline :
    Plugin 1 → onBeforeLLMCall()
    Plugin 2 → onBeforeLLMCall()
    ↓
    LLMOrchestrator.call()
    ↓
    Plugin 1 → onAfterLLMCall()
    Plugin 2 → onAfterLLMCall()
    ↓
Si TOOL_CALL → Tool Execution :
    Plugin 1 → onToolCall()
    Plugin 2 → onToolCall()
    ↓
    ToolProvider.execute()
    ↓
    Plugin 1 → onToolResult()
    Plugin 2 → onToolResult()
```

---

## 6. Dashboard Embarqué — Sécurité complète

### 6.1 Vue d'ensemble

Le dashboard est une interface Preact (~50KB gzippé) compilée dans le bundle de `@domos/server`. Il est accessible sur `/_domos/panel` dès le démarrage du serveur. Aucune installation supplémentaire requise.

```
http://localhost:3000/_domos/panel      → Interface admin Preact
http://localhost:3000/_domos/api/*      → API REST protégée
ws://localhost:3000/_domos/logs         → Stream logs temps réel
http://localhost:3000/_domos/login      → Page de connexion
```

### 6.2 Fonctionnalités du dashboard

| Module | Fonctionnalités |
|--------|----------------|
| **Vue d'ensemble** | Métriques rapides — sessions actives, messages du jour, latence LLM P50 |
| **Sessions** | Liste temps réel, détail (tools actifs, messages, Shadow Context), termination |
| **Tool Registry** | Tools actifs par session (client + serveur), schéma, niveau de risque HITL |
| **Logs** | Stream temps réel via WebSocket, filtres niveau/session, export |
| **Console de test** | Envoyer un message à l'agent, simuler un tool call, voir la réponse |
| **Clés API** | Générer, lister (préfixe uniquement), révoquer |
| **Plugins** | Plugins chargés, version, statut, métriques par plugin |
| **Système** | Version DomOS, uptime, mémoire, config active (secrets masqués) |

### 6.3 Architecture sécurité — Couche par couche

#### Couche 1 — Authentification bcrypt + sessions

```typescript
class DashboardAuth {
  // Sessions stockées en mémoire — Map<sessionToken, DashboardSession>
  private sessions = new Map<string, DashboardSession>();

  // Rate limiter par IP — 5 tentatives / 15 minutes
  private rateLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
  });

  async login(username: string, password: string, ip: string): Promise<LoginResult> {
    // 1. Rate limiting — bloque si trop de tentatives
    const allowed = await this.rateLimiter.check(ip);
    if (!allowed) {
      throw new TooManyAttemptsError('15 minutes');
    }

    // 2. Validation username
    if (username !== this.config.username) {
      await this.rateLimiter.increment(ip);
      await sleep(200); // Délai constant — anti timing attack
      throw new InvalidCredentialsError();
    }

    // 3. Hash bcrypt — comparaison timing-safe
    const passwordValid = await bcrypt.compare(
      password,
      this.config.passwordHash  // Hash pré-calculé au démarrage
    );
    if (!passwordValid) {
      await this.rateLimiter.increment(ip);
      await sleep(200);
      throw new InvalidCredentialsError();
    }

    // 4. Génération session token — cryptographiquement aléatoire
    const sessionToken = crypto.randomBytes(32).toString('hex'); // 256 bits

    // 5. Génération CSRF token — différent du session token
    const csrfToken = crypto.randomBytes(32).toString('hex');

    // 6. Stockage session avec TTL
    this.sessions.set(sessionToken, {
      sessionToken,
      csrfToken,
      ip,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.sessionDuration,
      lastActivityAt: Date.now(),
    });

    return { sessionToken, csrfToken };
  }

  validate(sessionToken: string, csrfToken: string): boolean {
    const session = this.sessions.get(sessionToken);
    if (!session) return false;

    // Vérification expiration
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionToken);
      return false;
    }

    // Vérification CSRF — comparaison constant-time
    const csrfValid = crypto.timingSafeEqual(
      Buffer.from(session.csrfToken),
      Buffer.from(csrfToken)
    );
    if (!csrfValid) return false;

    // Renouvellement activité
    session.lastActivityAt = Date.now();
    return true;
  }

  // Nettoyage périodique des sessions expirées
  startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [token, session] of this.sessions) {
        if (now > session.expiresAt) this.sessions.delete(token);
      }
    }, 60 * 60 * 1000); // Toutes les heures
  }
}
```

#### Couche 2 — Headers de sécurité HTTP (Helmet)

```typescript
// Appliqué sur TOUTES les routes /_domos/*
fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],           // Aucun CDN externe — bundle local
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: [
        "'self'",
        "ws://localhost:*",            // WebSocket logs (dev)
        "wss://localhost:*",
      ],
      frameSrc: ["'none'"],            // Pas d'iframes
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,                  // 1 an
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,                       // X-Content-Type-Options: nosniff
  xssFilter: true,                     // X-XSS-Protection
  referrerPolicy: { policy: 'no-referrer' },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
});
```

#### Couche 3 — Cookies sécurisés (double-cookie CSRF)

```typescript
// Après login réussi — envoi des deux cookies
const sendSecureCookies = (reply: FastifyReply, auth: LoginResult) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Cookie session — httpOnly (inaccessible JS — protège contre XSS)
  reply.setCookie('_domos_session', auth.sessionToken, {
    httpOnly: true,
    secure: isProduction,              // HTTPS only en production
    sameSite: 'strict',               // Protection CSRF supplémentaire
    maxAge: config.sessionDuration / 1000,
    path: '/_domos',                  // Scope au dashboard uniquement
  });

  // Cookie CSRF — lisible par JS (pour l'envoyer en header X-DomOS-CSRF)
  // Technique "double-cookie submit" — standard de sécurité
  reply.setCookie('_domos_csrf', auth.csrfToken, {
    httpOnly: false,                   // Lisible par JS — voulu
    secure: isProduction,
    sameSite: 'strict',
    maxAge: config.sessionDuration / 1000,
    path: '/_domos',
  });
};
```

#### Couche 4 — Middleware d'authentification sur les routes API

```typescript
// Appliqué sur toutes les routes /_domos/api/* sauf /api/auth/login
const dashboardAuthMiddleware = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const sessionToken = request.cookies['_domos_session'];
  const csrfToken = request.headers['x-domos-csrf'] as string;

  if (!sessionToken || !csrfToken) {
    return reply.status(401).send({ error: 'Unauthorized', code: 'NO_TOKEN' });
  }

  const valid = dashAuth.validate(sessionToken, csrfToken);
  if (!valid) {
    // Invalider les cookies
    reply.clearCookie('_domos_session', { path: '/_domos' });
    reply.clearCookie('_domos_csrf', { path: '/_domos' });
    return reply.status(401).send({ error: 'Session expired', code: 'SESSION_EXPIRED' });
  }
};
```

#### Couche 5 — Stream WebSocket logs (token usage unique)

```typescript
class DashboardLogsStream {
  // Tokens à usage unique — valides 30 secondes pour établir la WS
  private streamTokens = new Map<string, { sessionToken: string; expiresAt: number }>();

  // Généré après login — retourné via l'API REST authentifiée
  generateStreamToken(sessionToken: string): string {
    const streamToken = crypto.randomBytes(16).toString('hex');
    this.streamTokens.set(streamToken, {
      sessionToken,
      expiresAt: Date.now() + 30_000,  // 30 secondes max
    });
    return streamToken;
  }

  // Validé au moment de l'upgrade WebSocket — consommé immédiatement
  validateAndConsume(streamToken: string): boolean {
    const entry = this.streamTokens.get(streamToken);
    if (!entry || Date.now() > entry.expiresAt) {
      this.streamTokens.delete(streamToken);
      return false;
    }
    // Usage unique — invalide immédiatement après validation
    this.streamTokens.delete(streamToken);
    return true;
  }
}

// Route WebSocket logs — authentification par token URL
fastify.get('/_domos/logs', { websocket: true }, async (socket, request) => {
  const streamToken = request.query.token as string;

  if (!logsStream.validateAndConsume(streamToken)) {
    socket.close(4001, 'Unauthorized');
    return;
  }

  // Abonnement aux logs via EventEmitter interne
  const unsubscribe = logger.subscribe((log) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(log));
    }
  });

  socket.on('close', () => unsubscribe());
});
```

#### Couche 6 — Protection HTTPS + IP Whitelist (production)

```typescript
// Redirection HTTPS en production
fastify.addHook('onRequest', async (request, reply) => {
  if (
    config.dashboard.requireHttps &&
    process.env.NODE_ENV === 'production' &&
    request.headers['x-forwarded-proto'] !== 'https'
  ) {
    return reply.redirect(301, `https://${request.hostname}${request.url}`);
  }
});

// IP Whitelist — si configurée
fastify.addHook('onRequest', async (request, reply) => {
  const { ipWhitelist } = config.dashboard;
  if (ipWhitelist && ipWhitelist.length > 0) {
    const clientIp = request.ip;
    if (!ipWhitelist.includes(clientIp)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
  }
});
```

#### Ce que le dashboard ne révèle JAMAIS

```typescript
// Sanitization systématique avant toute réponse API

const sanitizeConfig = (config: DomOSConfig) => ({
  port: config.port,
  host: config.host,
  path: config.path,
  version: DOMOS_VERSION,
  nodeVersion: process.version,
  audioTransport: config.audio?.transport ?? 'websocket',
  plugins: config.plugins?.map(p => ({ name: p.name, version: p.version })),
  // ❌ JAMAIS exposés :
  // config.llm.apiKey
  // config.dashboard.password
  // config.dashboard.passwordHash
  // process.env.*
  // Credentials Redis/PostgreSQL
});

const sanitizeApiKey = (key: ApiKey) => ({
  id: key.id,
  prefix: key.raw.slice(0, 18) + '...',  // pk_live_shopify_a3...
  environment: key.environment,
  createdAt: key.createdAt,
  lastUsedAt: key.lastUsedAt,
  usageCount: key.usageCount,
  isActive: key.isActive,
  // ❌ JAMAIS key.raw complet
});
```

### 6.4 Checklist sécurité dashboard en production

```bash
# Variables d'environnement obligatoires
NODE_ENV=production
ADMIN_PASSWORD=...           # Min 16 chars, aléatoire

# Configuration recommandée
dashboard.requireHttps: true
dashboard.allowedOrigins: ['https://mon-domaine.com']
dashboard.ipWhitelist: ['IP_ADMIN_1', 'IP_ADMIN_2']  # Si possible
dashboard.sessionDuration: 8 * 60 * 60 * 1000        # 8h max

# Infrastructure
# → Reverse proxy Nginx ou Caddy devant le serveur (TLS termination)
# → Port 3000 non exposé publiquement — uniquement via le proxy
# → Firewall — seuls 80/443 accessibles depuis l'extérieur
```

---

## 7. Audio — WebSocket PCM + WebRTC

### 7.1 Transport par défaut — WebSocket PCM

Le mode audio par défaut utilise le WebSocket ADTP existant pour streamer du PCM 16kHz. C'est le même canal que le texte — pas de connexion supplémentaire.

```
Client (navigateur)
  → WebAudio API capture PCM 16kHz
  → Chunks base64 dans USER_INPUT (modality: 'audio')
  → WebSocket ADTP (même canal que le texte)

@domos/server
  → Reçoit les chunks audio
  → Les transmet à Gemini Live API via WebSocket
  → Reçoit la réponse audio de Gemini
  → La retourne via AGENT_RESPONSE (audioData: base64)

Client
  → Décode et joue la réponse audio
```

### 7.2 Transport optionnel — WebRTC

WebRTC est activé en tant qu'option 2. Il réduit la latence audio (<100ms vs 300-500ms) grâce à UDP et au codec Opus.

**Important :** Gemini Live API ne supporte pas WebRTC nativement. DomOS fait office de proxy transparent :

```
Client (WebRTC — Opus — UDP)
    ↓
@domos/server (WebRTC → PCM → WebSocket proxy)
    ↓
Gemini Live API (WebSocket PCM — existant)
```

#### Configuration

```typescript
const server = createDomOSServer({
  audio: {
    transport: 'webrtc',               // Activer WebRTC
    webrtc: {
      // STUN — gratuit, découverte IP publique
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
      // TURN — relay pour clients derrière NAT strict (optionnel mais recommandé)
      turn: {
        urls: process.env.TURN_URL!,
        username: process.env.TURN_USERNAME!,
        credential: process.env.TURN_PASSWORD!,
      },
      codec: 'opus',                   // Opus — meilleure compression
      sampleRate: 16000,               // 16kHz pour Gemini
      channels: 1,                     // Mono
    },
  },
});
```

#### Signaling — Via le canal ADTP existant

Le handshake WebRTC (échange SDP + ICE candidates) passe par le WebSocket ADTP. Deux nouveaux types de messages ADTP sont ajoutés :

```typescript
// Client → Serveur
{ type: 'WEBRTC_OFFER', payload: { sdp: string } }

// Serveur → Client
{ type: 'WEBRTC_ANSWER', payload: { sdp: string, iceCandidates: RTCIceCandidate[] } }
```

### 7.3 Fallback automatique

Si WebRTC échoue (NAT trop strict, navigateur non supporté), le serveur bascule automatiquement sur WebSocket PCM :

```typescript
// Le serveur informe le client du fallback
{ type: 'SYSTEM_EVENT', payload: { kind: 'info', message: 'WebRTC unavailable — falling back to WebSocket audio' } }
```

---

## 8. Prérequis et Installation

### 8.1 Environnement requis

```
Node.js  >= 22 LTS   (recommandé — natif fetch, WebCrypto, structured clone)
pnpm     >= 9        (ou npm >= 10)
TypeScript >= 5.5
```

### 8.2 Installation

```bash
# Installation du serveur
pnpm add @domos/server

# Adaptateur LLM (au moins un)
pnpm add @domos/adapter-google
# OU
pnpm add @domos/adapter-openai
# OU
pnpm add @domos/adapter-anthropic

# Variables d'environnement
cp .env.example .env
```

### 8.3 Dépendances du package @domos/server

```json
{
  "dependencies": {
    "fastify": "^5.x",
    "@fastify/websocket": "^11.x",
    "@fastify/rate-limit": "^10.x",
    "@fastify/cors": "^10.x",
    "@fastify/helmet": "^13.x",
    "@fastify/cookie": "^10.x",
    "@fastify/jwt": "^9.x",
    "@fastify/static": "^8.x",
    "@fastify/sensible": "^6.x",
    "fastify-plugin": "^5.x",
    "zod": "^3.x",
    "pino": "^9.x",
    "bcrypt": "^5.x",
    "ioredis": "^5.x"
  },
  "peerDependencies": {
    "@nestjs/core": "^10.x",
    "@nestjs/common": "^10.x",
    "@nestjs/websockets": "^10.x",
    "express": "^4.x"
  },
  "peerDependenciesMeta": {
    "@nestjs/core": { "optional": true },
    "@nestjs/common": { "optional": true },
    "@nestjs/websockets": { "optional": true },
    "express": { "optional": true }
  },
  "optionalDependencies": {
    "wrtc": "^0.4.x",
    "@prisma/client": "^6.x"
  }
}
```

**Note sur les peers :** NestJS et Express sont `peerDependencies` optionnelles — elles ne sont installées que si le développeur utilise l'adaptateur correspondant. Un dev standalone n'installe rien de plus.

### 8.4 Variables d'environnement

```bash
# ── LLM (au moins un) ──────────────────────────────────────
GOOGLE_API_KEY=AIza...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# ── Dashboard admin ─────────────────────────────────────────
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-very-secure-password    # Min 16 chars

# ── Réseau ──────────────────────────────────────────────────
PORT=3000
HOST=0.0.0.0
NODE_ENV=production                         # Active les guards sécurité

# ── Persistence optionnelle ─────────────────────────────────
REDIS_URL=redis://:password@localhost:6379  # Si Redis utilisé
DATABASE_URL=postgresql://user:pass@localhost:5432/domos  # Si PostgreSQL

# ── WebRTC optionnel ────────────────────────────────────────
TURN_URL=turn:turn.example.com:3478
TURN_USERNAME=domos
TURN_PASSWORD=your-turn-password

# ── Plugins e-commerce optionnels ───────────────────────────
SHOPIFY_CLIENT_ID=...
SHOPIFY_CLIENT_SECRET=...
```

---

## 9. Configuration complète

```typescript
interface DomOSConfig {
  // ── LLM — obligatoire ────────────────────────────────────
  llm: LLMAdapter;

  // ── Réseau ───────────────────────────────────────────────
  port?: number;              // Défaut: 3000
  host?: string;              // Défaut: '0.0.0.0'
  path?: string;              // Défaut: '/domos' — endpoint WebSocket

  // ── Auth clients WebSocket ───────────────────────────────
  client?: {
    requireApiKey?: boolean;          // Défaut: true
    maxConnectionsPerKey?: number;    // Défaut: 10
    enableApiKeyManagement?: boolean; // Activer la gestion via dashboard
  };

  // ── Dashboard embarqué ───────────────────────────────────
  dashboard?: {
    enabled?: boolean;                // Défaut: true
    path?: string;                    // Défaut: '/_domos'
    username?: string;                // Défaut: 'admin'
    password: string;                 // Obligatoire si enabled
    sessionDuration?: number;         // Défaut: 8h en ms
    rateLimitWindowMs?: number;       // Défaut: 15min
    rateLimitMaxAttempts?: number;    // Défaut: 5
    allowedOrigins?: string[];        // Défaut: [] (localhost only)
    requireHttps?: boolean;           // Défaut: true si NODE_ENV=production
    ipWhitelist?: string[];           // Défaut: [] (tous les IPs)
    csrfProtection?: boolean;         // Défaut: true
  };

  // ── Audio ────────────────────────────────────────────────
  audio?: {
    transport?: 'websocket' | 'webrtc';  // Défaut: 'websocket'
    webrtc?: {
      iceServers?: RTCIceServer[];
      turn?: {
        urls: string;
        username: string;
        credential: string;
      };
      codec?: 'opus' | 'pcm';       // Défaut: 'opus'
      sampleRate?: number;           // Défaut: 16000
      channels?: number;             // Défaut: 1
    };
  };

  // ── Plugins ──────────────────────────────────────────────
  plugins?: DomOSPlugin[];

  // ── Logging ──────────────────────────────────────────────
  logger?: {
    level?: 'debug' | 'info' | 'warn' | 'error'; // Défaut: 'info'
    prettyPrint?: boolean;            // Défaut: false en prod
    redactPaths?: string[];           // Champs à masquer dans les logs
  };

  // ── Persistence optionnelle ──────────────────────────────
  redis?: {
    url: string;                      // Si fourni — active Redis pour sessions
    keyPrefix?: string;               // Défaut: 'domos:'
  };

  // ── Timeouts ─────────────────────────────────────────────
  timeouts?: {
    handshake?: number;               // Défaut: 30000ms
    toolResult?: number;              // Défaut: 30000ms
    llmResponse?: number;             // Défaut: 60000ms
    sessionIdle?: number;             // Défaut: 30min
  };
}
```

---

## 10. Structure du package

```
packages/server/
│
├── package.json
├── tsconfig.json
│
├── src/
│   ├── index.ts                      # Exports publics
│   │
│   ├── standalone/
│   │   └── createDomOSServer.ts      # Factory standalone Fastify
│   │
│   ├── core/                         # Framework-agnostic
│   │   ├── DomOSCore.ts
│   │   ├── adtp/
│   │   │   ├── ADTPEngine.ts
│   │   │   ├── MessageValidator.ts
│   │   │   └── MessageRouter.ts
│   │   ├── session/
│   │   │   ├── SessionManager.ts
│   │   │   ├── SessionStore.ts       # Interface
│   │   │   ├── MemoryStore.ts        # Défaut
│   │   │   └── RedisStore.ts         # Si Redis configuré
│   │   ├── llm/
│   │   │   ├── LLMOrchestrator.ts
│   │   │   ├── AdapterRegistry.ts
│   │   │   ├── ContextBuilder.ts
│   │   │   └── StreamHandler.ts
│   │   ├── hitl/
│   │   │   └── HITLMiddleware.ts
│   │   ├── tools/
│   │   │   ├── ToolProviderRegistry.ts
│   │   │   ├── ServerToolRegistry.ts
│   │   │   └── ClientToolBridge.ts
│   │   ├── auth/
│   │   │   ├── ClientAuthManager.ts
│   │   │   ├── ApiKeyStore.ts
│   │   │   └── ApiKeyGenerator.ts
│   │   ├── plugins/
│   │   │   ├── PluginLoader.ts
│   │   │   ├── PluginRunner.ts
│   │   │   └── PluginContext.ts
│   │   └── audio/
│   │       ├── AudioHandler.ts
│   │       ├── WebSocketAudioHandler.ts
│   │       └── WebRTCAudioHandler.ts
│   │
│   ├── dashboard/                    # Embarqué Preact
│   │   ├── DashboardServer.ts
│   │   ├── DashboardAuth.ts          # Auth sécurisée complète
│   │   ├── DashboardAPI.ts           # Endpoints REST
│   │   ├── DashboardLogsStream.ts    # WebSocket logs
│   │   └── panel/                    # Bundle Preact compilé
│   │       ├── index.html
│   │       └── assets/
│   │
│   ├── adapters/                     # ❌ SUPPRIMÉ (31 mars 2026)
│   │   # Fastify/Express/NestJS adapters retirés
│   │   # Serveur natif Node.js HTTP reste la solution officielle
│   │
│   └── types/
│       └── public.ts                 # Tous les types exportés publiquement
│
└── dashboard-ui/                     # Source Preact (compilé → panel/)
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── auth/
    │   ├── layout/
    │   └── pages/
    └── vite.config.ts
```

### 10.1 Exports publics

```typescript
// src/index.ts — tout ce que le développeur peut importer

// Standalone
export { createDomOSServer } from './standalone/createDomOSServer';

// Adaptateurs
export { domosPlugin } from './adapters/fastify/domosPlugin';
export { DomosModule, DomosService } from './adapters/nestjs/DomosModule';
export { attachDomOS } from './adapters/express/expressAdapter';

// Interfaces pour créer des plugins
export type { DomOSPlugin } from './types/public';
export type { ToolProvider } from './types/public';
export type { DomOSConfig } from './types/public';
export type { Session } from './types/public';
export type { PluginContext } from './types/public';

// Classes de base
export { BaseLLMAdapter } from './core/llm/BaseLLMAdapter';
```

---

## 11. Roadmap serveur

### v1.0 — Stable (Q3 2026)

- [ ] `createDomOSServer()` standalone Fastify complet
- [ ] Plugin Fastify `domosPlugin`
- [ ] Module NestJS `DomosModule.forRoot()`
- [ ] Middleware Express `attachDomOS()`
- [ ] Dashboard embarqué Preact ~50KB avec sécurité complète
- [ ] Plugin system avec 5 core plugins
- [ ] Audio WebSocket PCM
- [ ] Rate limiting natif
- [ ] Logs structurés pino

### v1.1 — (Q4 2026)

- [ ] Audio WebRTC stable
- [ ] SessionStore Redis stable et documenté
- [ ] `@domos/integration-shopify` comme premier plugin e-commerce
- [ ] `@domos/integration-woocommerce`
- [ ] Dashboard UI — Console de test améliorée
- [ ] Plugin registry public (répertoire des plugins communauté)

### v1.2 — (Q1 2027)

- [ ] Hot reload des plugins sans redémarrage serveur
- [ ] Dashboard multi-utilisateurs (plusieurs admins)
- [ ] Métriques Prometheus exposées sur `/_domos/metrics`
- [ ] Health check Kubernetes-ready sur `/_domos/health`

### v2.0 — Rust option (si nécessaire)

Si les benchmarks à >50 000 connexions simultanées révèlent un bottleneck sur le WebSocket engine :

- [ ] Extraction du WebSocket engine en Rust via `napi-rs`
- [ ] `domos-ws-engine` — module Rust natif Node.js
- [ ] API TypeScript identique — migration transparente pour le développeur

---

*Document d'architecture — @domos/server*  
*Futur4Tech © 2026 — DomOS DOM Operating System*  
*Version 1.0 — Mars 2026*
