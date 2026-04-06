# Sprint 4 — Docker, Self-Hosting & Déploiement Production

> **Objectif** : À la fin de ce sprint, n'importe qui peut déployer DomOS en production
> avec **5 commandes**. Le serveur standalone tourne dans Docker, les health checks
> fonctionnent, les logs sont structurés, et la doc explique tout.

---

## Prérequis

- Sprint 3 complet — le serveur standalone et les adapters compilent
- Docker + Docker Compose installés localement pour les tests

---

## Phase A — Docker

### Étape 4.1 — Dockerfile multi-stage

**Fichier** : `packages/server/Dockerfile` (créer)

```dockerfile
# ——— Stage 1 : Build ———
FROM node:20-alpine AS build

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copier les manifests pour le cache des dépendances
COPY pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/server/package.json packages/server/
COPY packages/core/package.json packages/core/
COPY packages/adapter-google/package.json packages/adapter-google/
COPY packages/adapter-openai/package.json packages/adapter-openai/
COPY packages/adapter-anthropic/package.json packages/adapter-anthropic/

# Installer les dépendances
RUN pnpm install --frozen-lockfile --filter @domos/server... --filter @domos/adapter-google... --filter @domos/adapter-openai... --filter @domos/adapter-anthropic...

# Copier les sources
COPY packages/ packages/
COPY tsconfig.base.json ./

# Build tous les packages nécessaires
RUN pnpm turbo build --filter @domos/server...

# ——— Stage 2 : Production ———
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@9 --activate

# Sécurité : non-root user
RUN addgroup -S domos && adduser -S domos -G domos

WORKDIR /app

# Copier uniquement le build + node_modules
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/packages/server/package.json ./packages/server/
COPY --from=build /app/packages/core/dist ./packages/core/dist
COPY --from=build /app/packages/core/package.json ./packages/core/
COPY --from=build /app/packages/adapter-google/dist ./packages/adapter-google/dist
COPY --from=build /app/packages/adapter-google/package.json ./packages/adapter-google/
COPY --from=build /app/packages/adapter-openai/dist ./packages/adapter-openai/dist
COPY --from=build /app/packages/adapter-openai/package.json ./packages/adapter-openai/
COPY --from=build /app/packages/adapter-anthropic/dist ./packages/adapter-anthropic/dist
COPY --from=build /app/packages/adapter-anthropic/package.json ./packages/adapter-anthropic/
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/pnpm-lock.yaml ./
COPY --from=build /app/pnpm-workspace.yaml ./

# Copier les scripts
COPY packages/server/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Créer le dossier pour la config montée en volume
RUN mkdir -p /config && chown domos:domos /config

USER domos

ENV NODE_ENV=production
ENV DOMOS_CONFIG_PATH=/config/domos.config.yml
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "packages/server/dist/standalone/main.js"]
```

---

### Étape 4.2 — Entrypoint script

**Fichier** : `packages/server/docker/entrypoint.sh` (créer)

```bash
#!/bin/sh
set -e

echo "╔═══════════════════════════════════════╗"
echo "║         DomOS Server v$(cat packages/server/package.json | grep '"version"' | head -1 | awk -F'"' '{print $4}')          ║"
echo "╚═══════════════════════════════════════╝"

# Vérifier la config
if [ ! -f "$DOMOS_CONFIG_PATH" ]; then
  echo "⚠️  Pas de config trouvée à $DOMOS_CONFIG_PATH"
  echo "   Utilisation des variables d'environnement uniquement."
fi

# Vérifier les API keys obligatoires
if [ -z "$GOOGLE_API_KEY" ] && [ -z "$OPENAI_API_KEY" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "❌ Aucune API key LLM détectée."
  echo "   Définissez au moins : GOOGLE_API_KEY, OPENAI_API_KEY, ou ANTHROPIC_API_KEY"
  exit 1
fi

echo "🔑 Provider détecté : ${LLM_PROVIDER:-auto}"
echo "🚀 Démarrage sur port ${PORT:-3000}..."
echo ""

exec "$@"
```

---

### Étape 4.3 — docker-compose.yml

**Fichier** : `packages/server/docker/docker-compose.yml` (créer)

```yaml
version: "3.8"

services:
  domos:
    build:
      context: ../../..  # Racine du monorepo
      dockerfile: packages/server/Dockerfile
    container_name: domos-server
    restart: unless-stopped
    ports:
      - "${PORT:-3000}:3000"
    env_file:
      - .env
    volumes:
      - ./config:/config:ro
      - domos-data:/data
    environment:
      - NODE_ENV=production
      - DOMOS_CONFIG_PATH=/config/domos.config.yml
      - PERSISTENCE_DIR=/data
    healthcheck:
      test: [ "CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health" ]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

  # Optionnel — MongoDB pour la persistance avancée
  # mongo:
  #   image: mongo:7
  #   restart: unless-stopped
  #   volumes:
  #     - mongo-data:/data/db
  #   environment:
  #     MONGO_INITDB_ROOT_USERNAME: domos
  #     MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}

volumes:
  domos-data:
  # mongo-data:
```

---

### Étape 4.4 — Config templates

**Fichier** : `packages/server/docker/config/domos.config.yml` (créer — template)

```yaml
# DomOS Server Configuration
# Variables d'environnement : ${VAR_NAME} sera résolu depuis .env

server:
  port: 3000
  host: "0.0.0.0"
  adminPassword: ${ADMIN_PASSWORD}

llm:
  provider: google              # google | openai | anthropic
  model: gemini-2.0-flash-001   # Modèle par défaut
  # apiKey: ${GOOGLE_API_KEY}   # Préférer les env vars

live:
  provider: google
  model: gemini-2.0-flash-live-001
  voice: Kore                   # Fenrir, Puck, Kore, Charon, Aoede, Zephyr, Orbit

speech:
  stt:
    provider: google            # google | whisper
    language: fr-FR
  tts:
    provider: google            # google | openai | elevenlabs
    language: fr-FR

persistence:
  type: sqlite                  # memory | sqlite | mongodb
  path: /data/domos.db          # Pour sqlite

# Plugins (optionnel)
# plugins:
#   - package: "@domos-plugins/demo-promotions"
```

**Fichier** : `packages/server/docker/.env.example` (créer)

```env
# ═══════════════════════════════════════
# DomOS Server — Variables d'environnement
# Copiez ce fichier : cp .env.example .env
# ═══════════════════════════════════════

# Port du serveur
PORT=3000

# Mot de passe admin (dashboard + API)
ADMIN_PASSWORD=changeme

# ─── LLM Provider (au moins un requis) ───
LLM_PROVIDER=google

# Google Gemini
GOOGLE_API_KEY=

# OpenAI
# OPENAI_API_KEY=

# Anthropic
# ANTHROPIC_API_KEY=

# ─── Persistence ───
PERSISTENCE_TYPE=sqlite

# MongoDB (si PERSISTENCE_TYPE=mongodb)
# MONGODB_URI=mongodb://domos:password@mongo:27017/domos
# MONGO_PASSWORD=changeme

# ─── ElevenLabs (optionnel pour TTS) ───
# ELEVENLABS_API_KEY=
```

---

## Phase B — Health & Observability

### Étape 4.5 — Endpoint /health

**Fichier** : `packages/server/src/standalone/health.ts` (créer)

```ts
import type { DomOSServer } from '../core/DomOSServer.js';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  checks: {
    llm: { status: 'ok' | 'error'; provider?: string };
    persistence: { status: 'ok' | 'error'; type?: string };
    websocket: { status: 'ok'; connections: number };
  };
}

export function getHealthStatus(server: DomOSServer): HealthStatus {
  const checks = {
    llm: { status: 'ok' as const, provider: server.getLLMProviderName?.() },
    persistence: { status: 'ok' as const, type: server.getPersistenceType?.() },
    websocket: { status: 'ok' as const, connections: server.getActiveConnectionCount?.() ?? 0 },
  };

  // Le serveur est "degraded" si un check échoue, "unhealthy" si LLM down
  const hasError = Object.values(checks).some(c => c.status === 'error');
  const llmDown = checks.llm.status === 'error';

  return {
    status: llmDown ? 'unhealthy' : hasError ? 'degraded' : 'healthy',
    version: process.env.npm_package_version || 'unknown',
    uptime: process.uptime(),
    checks,
  };
}
```

---

### Étape 4.6 — Intégrer /health dans main.ts

**Fichier** : `packages/server/src/standalone/main.ts` (modifier)

Ajouter le handler HTTP avant le démarrage :

```ts
import { getHealthStatus } from './health.js';

// Dans le httpServer.on('request') handler :
if (req.url === '/health' && req.method === 'GET') {
  const health = getHealthStatus(server);
  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(health));
  return;
}
```

---

### Étape 4.7 — Logger structuré

**Fichier** : `packages/server/src/standalone/logger.ts` (créer)

```ts
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

/**
 * Logger minimaliste JSON pour production, lisible pour dev.
 */
export function createLogger(minLevel: LogLevel = 'info'): Logger {
  const isProduction = process.env.NODE_ENV === 'production';
  const threshold = LEVELS[minLevel];

  function log(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
    if (LEVELS[level] < threshold) return;

    if (isProduction) {
      // JSON structuré pour log aggregators (Datadog, Loki, etc.)
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        msg,
        ...meta,
      }));
    } else {
      const prefix = { debug: '🐛', info: 'ℹ️ ', warn: '⚠️ ', error: '❌' }[level];
      const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
      console.log(`${prefix} [${level.toUpperCase()}] ${msg}${metaStr}`);
    }
  }

  return {
    debug: (msg, meta) => log('debug', msg, meta),
    info: (msg, meta) => log('info', msg, meta),
    warn: (msg, meta) => log('warn', msg, meta),
    error: (msg, meta) => log('error', msg, meta),
  };
}
```

---

## Phase C — Commandes NPM & Documentation

### Étape 4.8 — Scripts package.json

**Fichier** : `packages/server/package.json` (modifier)

```json
{
  "scripts": {
    "build": "tsup ...",
    "dev": "tsx watch src/standalone/main.ts",
    "start": "node dist/standalone/main.js",
    "docker:build": "docker build -t domos-server -f Dockerfile ../..",
    "docker:up": "cd docker && docker compose up -d",
    "docker:down": "cd docker && docker compose down",
    "docker:logs": "cd docker && docker compose logs -f domos"
  }
}
```

---

### Étape 4.9 — README Self-Hosting

**Fichier** : `packages/server/SELF-HOSTING.md` (créer)

```markdown
# DomOS — Self-Hosting Guide

## Déploiement rapide (5 commandes)

\```bash
# 1. Cloner le monorepo
git clone https://github.com/your-org/domos.git && cd domos

# 2. Configurer les variables d'environnement
cp packages/server/docker/.env.example packages/server/docker/.env
# → Éditez .env avec vos API keys

# 3. (Optionnel) Personnaliser la config YAML
# → Éditez packages/server/docker/config/domos.config.yml

# 4. Lancer
cd packages/server && pnpm docker:up

# 5. Vérifier
curl http://localhost:3000/health
# → {"status":"healthy","version":"...","uptime":...}
\```

## Sans Docker

\```bash
pnpm install
pnpm turbo build --filter @domos/server...

# Configurer les envs
export GOOGLE_API_KEY=your-key
export ADMIN_PASSWORD=your-password

# Lancer
cd packages/server && pnpm start
\```

## Configuration

Le serveur cherche la configuration dans cet ordre :
1. `$DOMOS_CONFIG_PATH` (variable d'env)
2. `./domos.config.yml` (répertoire courant)
3. Variables d'environnement uniquement (mode minimal)

### Variables d'environnement

| Variable | Requis | Default | Description |
|----------|--------|---------|-------------|
| `PORT` | Non | `3000` | Port d'écoute |
| `ADMIN_PASSWORD` | Oui | — | Mot de passe admin |
| `LLM_PROVIDER` | Non | `google` | Provider LLM |
| `GOOGLE_API_KEY` | Si google | — | Clé API Google |
| `OPENAI_API_KEY` | Si openai | — | Clé API OpenAI |
| `ANTHROPIC_API_KEY` | Si anthropic | — | Clé API Anthropic |
| `PERSISTENCE_TYPE` | Non | `sqlite` | Type de store |
| `DOMOS_CONFIG_PATH` | Non | `./domos.config.yml` | Chemin config YAML |

## Endpoints

| Route | Méthode | Description |
|-------|---------|-------------|
| `/health` | GET | Health check JSON |
| `/admin/capabilities` | GET | Modèles et voix disponibles |
| `/_domos/panel` | GET | Dashboard embarqué |
| `/ws` | WS | WebSocket ADTP |

## Upgrade

\```bash
git pull
pnpm docker:build
pnpm docker:up
\```
```

---

### Étape 4.10 — Graceful shutdown dans main.ts

**Fichier** : `packages/server/src/standalone/main.ts` (modifier)

```ts
// En fin de main() — gestion propre de l'arrêt

const shutdown = async (signal: string) => {
  logger.info(`Signal ${signal} reçu — arrêt en cours...`);

  // Arrêter d'accepter de nouvelles connexions
  httpServer.close();

  // Fermer les sessions + WebSocket
  await server.close();

  logger.info('Serveur arrêté proprement.');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Redémarrage propre par Docker
process.on('SIGUSR2', () => shutdown('SIGUSR2'));
```

---

## Résumé Sprint 4

| # | Fichier | Action | Livrable |
|---|---------|--------|----------|
| 4.1 | `packages/server/Dockerfile` | **Créer** | Multi-stage build |
| 4.2 | `docker/entrypoint.sh` | **Créer** | Script boot avec checks |
| 4.3 | `docker/docker-compose.yml` | **Créer** | Orchestration |
| 4.4 | `docker/config/domos.config.yml` + `.env.example` | **Créer** | Templates config |
| 4.5 | `standalone/health.ts` | **Créer** | Health check endpoint |
| 4.6 | `standalone/main.ts` | Modifier | Intégrer /health |
| 4.7 | `standalone/logger.ts` | **Créer** | Logger JSON/dev |
| 4.8 | `package.json` | Modifier | Scripts docker: |
| 4.9 | `SELF-HOSTING.md` | **Créer** | Documentation complète |
| 4.10 | `standalone/main.ts` | Modifier | Graceful shutdown |

**Critère de fin de sprint** :
```bash
# Build Docker
cd packages/server && pnpm docker:build  # → Image ~150MB ✅

# Déploiement
cp docker/.env.example docker/.env
# → Éditer avec GOOGLE_API_KEY + ADMIN_PASSWORD
pnpm docker:up                           # → Container running ✅

# Health check
curl http://localhost:3000/health
# → {"status":"healthy","version":"0.5.0","uptime":12.3,...} ✅

# Dashboard accessible
open http://localhost:3000/_domos/panel   # → Dashboard avec capabilities ✅

# Graceful shutdown
docker stop domos-server                 # → "Serveur arrêté proprement." dans logs ✅
```
