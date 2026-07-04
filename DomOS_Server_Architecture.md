# @domos/server - Architecture serveur reelle

Date: 2026-07-03

Ce document decrit la surface publique actuelle de `@domos/server`. Il remplace l'ancienne architecture qui documentait un mode `standalone`, Fastify/NestJS et des modules Cloud internes qui ne font plus partie de la surface publique reelle.

## Surface publique

Exports principaux:

- `DomOSServer` depuis `@domos/server`
- `createDomOSProxy` depuis `@domos/server`
- `attachDomOS` depuis `@domos/server/adapters/express`
- `ADTPTransport`, `WebRTCTransport`, `ConnectionPool`
- `SessionManager`, `ToolRouter`
- `AdminAPI`, `DashboardUIHandler`
- `VirtualLineManager`, `LineHTTPHandler`
- stores memoire, SQLite et Mongo pour sessions, API keys et agents
- types LLM/live/speech reexportes depuis `@domos/core`

Exports retires:

- `@domos/server/standalone`
- `createDomOSServer`
- `packages/server/src/standalone/**`
- `RateLimitMiddleware`
- `RedisRateLimiter`

## Role de DomOSServer

`DomOSServer` est l'orchestrateur principal:

- authentifie les connexions client par API key;
- gere les sessions ADTP;
- synchronise le Shadow Context et les tools client;
- expose les tools serveur declares;
- fusionne les tools client et serveur avant chaque appel LLM ou live session;
- route les tool calls vers le client ou vers un handler serveur local;
- applique HITL selon le niveau de risque du tool;
- gere les lignes virtuelles, l'AdminAPI et le dashboard embarque.

Le serveur fonctionne sur un transport WebSocket ADTP par defaut. WebRTC existe comme transport optionnel et partage les handlers HTTP embarques (`/admin`, `/lines/*`, dashboard) quand ils sont configures.

## Tools serveur

La surface recommandee est declarative:

```ts
server.tool(
  'get_order',
  {
    description: 'Lire une commande depuis le backend.',
    parameters: {
      type: 'OBJECT',
      properties: {
        id: { type: 'STRING', description: 'Identifiant de commande' },
      },
      required: ['id'],
    },
    risk: 'none',
  },
  async ({ id }) => {
    return orders.get(String(id));
  }
);
```

La signature legacy reste supportee:

```ts
server.tool('ping', async () => ({ ok: true }));
```

Dans ce cas, DomOS genere une declaration minimale:

- `description`: `Server-side tool "ping"`
- `risk`: `none`

## Fusion des tools

Avant chaque `llm.chat()` et avant chaque creation ou mise a jour de live session:

1. DomOS lit les declarations serveur depuis `ToolRouter`.
2. DomOS lit les declarations client depuis `session.toolRegistry`.
3. Les deux listes sont fusionnees par nom.
4. Si un tool client actif porte le meme nom qu'un tool serveur, le tool serveur reste prioritaire. Un composant UI ne doit pas pouvoir modifier le contrat ou le risque d'un handler serveur.

Cela garantit que:

- un composant monte peut exposer un tool local temporaire;
- un composant demonte retire bien son tool;
- les tools serveur restent disponibles independamment de la page active;
- le LLM voit la meme surface en mode texte, hybride audio et live.

## HITL et securite tool

`HITLSecurityMiddleware` accepte maintenant deux sources:

- le registre client de la session;
- la declaration serveur du tool appele.

Un tool serveur declare avec `risk: 'high'` ou `risk: 'critical'` suit donc le meme flux d'approbation qu'un tool client risque. Le handler serveur n'est execute qu'apres validation.

Les tools serveur peuvent aussi etre bloques explicitement avec:

```ts
server.blockTool('delete_order');
```

## Rate limiting runtime

Le rate limiting runtime WebSocket/Redis a ete retire.

Raison:

- une limite de messages WebSocket est difficile a rendre fiable dans ce modele;
- l'ancien `RedisRateLimiter` etait contournable ou ignore selon les chemins;
- la vraie capacite doit etre controlee par les lignes virtuelles et les limites de connexions.

Les protections conservees:

- `client.maxConnectionsPerKey`;
- `maxConnections` global cote transport;
- virtual lines par API key;
- protection brute-force du login admin.

La protection brute-force admin n'est pas le rate limiting runtime retire: elle protege l'acces au dashboard et reste volontairement active.

## Virtual lines

Les virtual lines sont le mecanisme officiel pour controler la capacite d'appels, messages ou conversations par API key.

Configuration initiale:

```ts
const server = new DomOSServer({
  llm,
  virtualLines: {
    lines: [
      { apiKey: 'pk_live_xxx', count: 4, ttlMs: 300000, waitingTtlMs: 120000 },
    ],
  },
});
```

Configuration dynamique:

```ts
server.configureLines('pk_live_xxx', 4, 300000);
```

Les routes HTTP `/lines/*` restent disponibles apres configuration dynamique, meme si aucune ligne n'etait configuree au demarrage. Si l'AdminAPI est active, son etat `/admin/lines` est synchronise avec cette configuration dynamique.

## AdminAPI et dashboard

`AdminAPI` est exposee quand `options.admin` est configure.

Endpoints principaux:

- `POST /admin/login`
- `POST /admin/logout`
- `GET /admin/status`
- `GET /admin/sessions`
- `GET /admin/sessions/:id`
- `DELETE /admin/sessions/:id`
- `GET /admin/tools`
- `GET /admin/metrics`
- `GET /admin/lines`
- `POST /admin/lines/acquire`
- `POST /admin/lines/release`
- `GET /admin/client/keys`
- `POST /admin/client/keys`
- `DELETE /admin/client/keys/:key`
- `GET /admin/prompts`
- `POST /admin/prompts`
- `DELETE /admin/prompts/:apiKey`
- `GET /admin/capabilities`

Le dashboard embarque `@domos/ui` est servi par `DashboardUIHandler` quand `ui.enabled` est actif.

## Express adapter

Le seul adapter HTTP framework officiel aujourd'hui est Express.

Usage recommande:

```ts
import express from 'express';
import { createServer } from 'http';
import { attachDomOS } from '@domos/server/adapters/express';

const app = express();
const httpServer = createServer(app);

const domos = attachDomOS(app, {
  server: httpServer,
  llm,
  path: '/domos',
  admin: {
    username: process.env.ADMIN_USERNAME!,
    password: process.env.ADMIN_PASSWORD!,
    path: '/admin',
  },
});

domos.addApiKey('pk_live_xxx');
domos.listen();

httpServer.listen(3000);
```

Quand un serveur HTTP externe est fourni, DomOS ne repond pas `404` pour les routes qu'il ne gere pas. L'application Express reste proprietaire de ses routes.

## Shutdown

`stop()` reste disponible pour compatibilite, mais la methode recommandee est:

```ts
await server.shutdown();
```

`shutdown()` attend:

- flush de la memoire agent;
- fermeture des live sessions;
- fermeture du memory manager;
- arret du transport;
- arret des virtual lines;
- arret des sessions admin.

## Structure reelle du package

```txt
packages/server/src/
  index.ts
  createDomOSProxy.ts
  adapters/
    express.ts
  admin/
    AdminAPI.ts
    DashboardUIHandler.ts
  auth/
    AdminAuthManager.ts
    ClientAuthManager.ts
    types.ts
  core/
    DomOSServer.ts
    SessionManager.ts
    ToolRouter.ts
  lines/
    LineHTTPHandler.ts
    VirtualLineManager.ts
  llm/
    BaseLLMAdapter.ts
    types.ts
  middleware/
    auth.ts
    hitl.security.ts
  persistence/
  plugins/
  runtime/
  speech/
  transport/
```

`packages/server/src/standalone/**` n'est plus une surface supportee.

## Roadmap courte

- Stabiliser la declaration des tools serveur.
- Ajouter des scopes/quotas explicites aux virtual lines.
- Ajouter un endpoint admin de test tool controle.
- Durcir CORS admin et exposition des API keys.
- Documenter un guide Express complet.
