# Sprint 1 — Fondations Standalone Server

> **Objectif** : Créer `packages/server/src/standalone/` avec un entrypoint déployable,
> une factory `createDomOSServer()`, et le loader de config YAML/Zod.
> À la fin de ce sprint : `node dist/standalone/main.js` démarre un serveur DomOS fonctionnel.

---

## Prérequis

- `@domos/server` build OK (tsup)
- `@domos/adapter-google` build OK
- `@domos/core` stable
- Node.js >= 22 LTS
- pnpm monorepo opérationnel

---

## Étape 1.1 — Nouveaux types de configuration

**Fichier** : `packages/server/src/standalone/config/types.ts`

```ts
export interface DomOSConfig {
  mode: 'self' | 'cloud';
  port: number;
  host: string;
  path: string;

  llm: LLMConfig;
  live?: LiveConfig;
  stt?: STTConfig;
  tts?: TTSConfig;

  admin: AdminConfig;
  client: ClientConfig;
  rateLimit: RateLimitConfig;
  ui: UIConfig;

  apiKeys?: ApiKeyConfig[];

  virtualLines?: VirtualLinesConfig;

  // Cloud Pro (Sprint 5)
  cloud?: CloudConfig;
}

export interface LLMConfig {
  provider: 'google' | 'openai' | 'anthropic';
  model?: string;
  // apiKey lu depuis env, JAMAIS dans le YAML
}

export interface LiveConfig {
  enabled: boolean;
  voice?: string;
  model?: string;
}

export interface STTConfig {
  provider: 'google' | 'whisper';
  language?: string;
  model?: string;
}

export interface TTSConfig {
  provider: 'google' | 'openai' | 'elevenlabs';
  voice?: string;
  language?: string;
  voiceType?: string;
}

export interface AdminConfig {
  username: string;
  password?: string;  // lu depuis env ADMIN_PASSWORD
  path: string;
}

export interface ClientConfig {
  requireApiKey: boolean;
  enableApiKeyManagement?: boolean;
  maxConnectionsPerKey: number;
}

export interface RateLimitConfig {
  disabled: boolean;
  burstLimit: number;
  burstWindowMs?: number;
  burstCloseAfter?: number;
  maxRequests: number;
  windowMs: number;
}

export interface UIConfig {
  enabled: boolean;
}

export interface ApiKeyConfig {
  key: string;
  name?: string;
  description?: string;
  prompt?: string;
  clientType?: string[];
}

export interface VirtualLinesConfig {
  lines: Array<{
    apiKey: string;
    count: number;
    ttlMs: number;
    waitingTtlMs?: number;
  }>;
}

export interface CloudConfig {
  jwtSecret?: string;
  refreshTokenSecret?: string;
  redisUrl?: string;
  databaseUrl?: string;
  encryptionKey?: string;
  multiTenant?: boolean;
  billing?: { enabled: boolean };
  analytics?: { retentionDays: number };
}
```

**Dépend de** : rien
**Testé par** : import TypeScript — tsc --noEmit

---

## Étape 1.2 — Schéma Zod de validation

**Fichier** : `packages/server/src/standalone/config/schema.ts`

```ts
import { z } from 'zod';

export const LLMConfigSchema = z.object({
  provider: z.enum(['google', 'openai', 'anthropic']),
  model: z.string().optional(),
});

export const LiveConfigSchema = z.object({
  enabled: z.boolean().default(false),
  voice: z.string().optional(),
  model: z.string().optional(),
});

export const STTConfigSchema = z.object({
  provider: z.enum(['google', 'whisper']),
  language: z.string().default('fr-FR'),
  model: z.string().optional(),
});

export const TTSConfigSchema = z.object({
  provider: z.enum(['google', 'openai', 'elevenlabs']),
  voice: z.string().optional(),
  language: z.string().default('fr-FR'),
  voiceType: z.string().optional(),
});

export const AdminConfigSchema = z.object({
  username: z.string().default('admin'),
  password: z.string().optional(), // sera injecté depuis env
  path: z.string().default('/admin'),
});

export const ClientConfigSchema = z.object({
  requireApiKey: z.boolean().default(true),
  enableApiKeyManagement: z.boolean().default(true),
  maxConnectionsPerKey: z.coerce.number().default(10),
});

export const RateLimitConfigSchema = z.object({
  disabled: z.boolean().default(false),
  burstLimit: z.coerce.number().default(15),
  burstWindowMs: z.coerce.number().default(1_000),
  burstCloseAfter: z.coerce.number().default(5),
  maxRequests: z.coerce.number().default(200),
  windowMs: z.coerce.number().default(300_000),
});

export const UIConfigSchema = z.object({
  enabled: z.boolean().default(true),
});

export const ApiKeyConfigSchema = z.object({
  key: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  prompt: z.string().optional(),
  clientType: z.array(z.string()).optional(),
});

export const VirtualLineSchema = z.object({
  apiKey: z.string(),
  count: z.coerce.number(),
  ttlMs: z.coerce.number(),
  waitingTtlMs: z.coerce.number().optional(),
});

export const VirtualLinesConfigSchema = z.object({
  lines: z.array(VirtualLineSchema),
});

export const CloudConfigSchema = z.object({
  jwtSecret: z.string().optional(),
  refreshTokenSecret: z.string().optional(),
  redisUrl: z.string().optional(),
  databaseUrl: z.string().optional(),
  encryptionKey: z.string().optional(),
  multiTenant: z.boolean().default(false),
  billing: z.object({ enabled: z.boolean().default(false) }).optional(),
  analytics: z.object({ retentionDays: z.coerce.number().default(90) }).optional(),
});

export const DomOSConfigSchema = z.object({
  mode: z.enum(['self', 'cloud']).default('self'),
  port: z.coerce.number().default(3000),
  host: z.string().default('0.0.0.0'),
  path: z.string().default('/domos'),

  llm: LLMConfigSchema,
  live: LiveConfigSchema.optional(),
  stt: STTConfigSchema.optional(),
  tts: TTSConfigSchema.optional(),

  admin: AdminConfigSchema.default({}),
  client: ClientConfigSchema.default({}),
  rateLimit: RateLimitConfigSchema.default({}),
  ui: UIConfigSchema.default({}),

  apiKeys: z.array(ApiKeyConfigSchema).optional(),
  virtualLines: VirtualLinesConfigSchema.optional(),

  cloud: CloudConfigSchema.optional(),
});
```

**Dépend de** : `zod` (déjà dans packages/server/dependencies)
**Critère de validation** : `DomOSConfigSchema.safeParse({ llm: { provider: 'google' } })` retourne `success: true` avec tous les defaults appliqués

---

## Étape 1.3 — Config Loader (YAML + env merge)

**Fichier** : `packages/server/src/standalone/config/loader.ts`

**Nouvelle dépendance** : `yaml` (à ajouter dans packages/server/package.json)

```ts
import { readFileSync, existsSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { DomOSConfigSchema } from './schema.js';
import type { DomOSConfig } from './types.js';

export function loadConfig(configPath?: string): DomOSConfig {
  const filePath = configPath ?? process.env.DOMOS_CONFIG ?? 'domos.config.yml';

  let fileConfig: Record<string, unknown> = {};
  if (existsSync(filePath)) {
    const raw = readFileSync(filePath, 'utf-8');
    fileConfig = parseYaml(raw) ?? {};
  }

  // Env vars surchargent le YAML — jamais d'API key dans le fichier
  const merged = deepMerge(fileConfig, {
    mode: process.env.DOMOS_MODE,
    port: process.env.PORT,
    admin: {
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD,
    },
    cloud: {
      jwtSecret: process.env.JWT_SECRET,
      refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
      redisUrl: process.env.REDIS_URL,
      databaseUrl: process.env.DATABASE_URL,
      encryptionKey: process.env.ENCRYPTION_KEY,
    },
  });

  const result = DomOSConfigSchema.safeParse(merged);
  if (!result.success) {
    console.error('[DomOS] ❌ Configuration invalide :');
    for (const issue of result.error.issues) {
      console.error(`  → ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  return result.data as DomOSConfig;
}

/** Deep merge non-null values (env surcharge YAML) */
function deepMerge(base: Record<string, any>, overrides: Record<string, any>): Record<string, any> {
  const result = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === null || value === '') continue;
    if (typeof value === 'object' && !Array.isArray(value) && typeof result[key] === 'object') {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
```

**Dépend de** : étape 1.1 (types) + étape 1.2 (schema)
**Critère de validation** : avec un fichier YAML minimal `llm: { provider: google }` + `ADMIN_PASSWORD=test123456`, le loader retourne un config complet avec tous les defaults

---

## Étape 1.4 — Adapter Factory

**Fichier** : `packages/server/src/standalone/adapters/factory.ts`

Ce fichier utilise des **dynamic imports** pour ne charger que l'adapter nécessaire (les autres ne sont pas en dépendance obligatoire).

```ts
import type { DomOSConfig } from '../config/types.js';
import type { LLMAdapter, LiveAdapter } from '../../llm/types.js';
import type { STTService } from '../../speech/STTService.js';
import type { TTSService } from '../../speech/TTSService.js';

export interface BuiltAdapters {
  llm: LLMAdapter;
  live?: LiveAdapter;
  stt?: STTService;
  tts?: TTSService;
}

export async function buildAdapters(config: DomOSConfig): Promise<BuiltAdapters> {
  const llm = await buildLLMAdapter(config);
  const live = config.live?.enabled ? await buildLiveAdapter(config) : undefined;
  const stt = config.stt ? await buildSTT(config) : undefined;
  const tts = config.tts ? await buildTTS(config) : undefined;

  return { llm, live, stt, tts };
}

// ── LLM Text Adapter ────────────────────────────────────

async function buildLLMAdapter(config: DomOSConfig): Promise<LLMAdapter> {
  const provider = config.llm.provider;
  const model = config.llm.model;

  switch (provider) {
    case 'google': {
      const apiKey = requireEnv('GOOGLE_API_KEY');
      const { GoogleAdapter } = await import('@domos/adapter-google');
      return new GoogleAdapter({ apiKey, model: model ?? 'gemini-2.5-flash' });
    }
    case 'openai': {
      const apiKey = requireEnv('OPENAI_API_KEY');
      const { OpenAIAdapter } = await import('@domos/adapter-openai');
      return new OpenAIAdapter({ apiKey, model: model ?? 'gpt-4o' });
    }
    case 'anthropic': {
      // @domos/adapter-anthropic — à créer dans Sprint 2
      throw new Error('[DomOS] Adapter Anthropic non encore implémenté. Utilisez google ou openai.');
    }
    default:
      throw new Error(`[DomOS] Provider LLM inconnu : ${provider}`);
  }
}

// ── Live Audio Adapter ──────────────────────────────────

async function buildLiveAdapter(config: DomOSConfig): Promise<LiveAdapter | undefined> {
  const provider = config.llm.provider;

  switch (provider) {
    case 'google': {
      const apiKey = requireEnv('GOOGLE_API_KEY');
      const { GoogleLiveAdapter } = await import('@domos/adapter-google');
      return new GoogleLiveAdapter({
        apiKey,
        model: config.live?.model ?? 'gemini-2.5-flash-native-audio-preview-12-2025',
        voice: config.live?.voice ?? 'Fenrir',
      });
    }
    case 'openai': {
      // OpenAI Realtime API — import depuis @domos/adapter-openai si disponible
      const apiKey = requireEnv('OPENAI_API_KEY');
      try {
        const { OpenAILiveAdapter } = await import('@domos/adapter-openai');
        return new OpenAILiveAdapter({ apiKey, voice: config.live?.voice ?? 'alloy' });
      } catch {
        console.warn('[DomOS] OpenAI Live adapter non disponible — mode texte uniquement.');
        return undefined;
      }
    }
    default:
      return undefined;
  }
}

// ── STT ─────────────────────────────────────────────────

async function buildSTT(config: DomOSConfig): Promise<STTService | undefined> {
  if (!config.stt) return undefined;

  switch (config.stt.provider) {
    case 'google': {
      const apiKey = requireEnv('GOOGLE_API_KEY');
      const { GoogleSTT } = await import('../../speech/providers/GoogleSTT.js');
      return new GoogleSTT({
        apiKey,
        defaultLanguage: config.stt.language ?? 'fr-FR',
        model: config.stt.model ?? 'latest_long',
      });
    }
    case 'whisper': {
      const apiKey = requireEnv('OPENAI_API_KEY');
      const { WhisperSTT } = await import('../../speech/providers/WhisperSTT.js');
      return new WhisperSTT({ apiKey });
    }
    default:
      return undefined;
  }
}

// ── TTS ─────────────────────────────────────────────────

async function buildTTS(config: DomOSConfig): Promise<TTSService | undefined> {
  if (!config.tts) return undefined;

  switch (config.tts.provider) {
    case 'google': {
      const apiKey = requireEnv('GOOGLE_API_KEY');
      const { GoogleTTS } = await import('../../speech/providers/GoogleTTS.js');
      return new GoogleTTS({
        apiKey,
        voice: config.tts.voice ?? 'fr-FR-Neural2-A',
        defaultLanguage: config.tts.language ?? 'fr-FR',
        voiceType: config.tts.voiceType ?? 'Neural2',
      });
    }
    case 'openai': {
      const apiKey = requireEnv('OPENAI_API_KEY');
      const { OpenAITTS } = await import('../../speech/providers/OpenAITTS.js');
      return new OpenAITTS({ apiKey, voice: config.tts.voice ?? 'nova' });
    }
    case 'elevenlabs': {
      const apiKey = requireEnv('ELEVENLABS_API_KEY');
      const { ElevenLabsTTS } = await import('../../speech/providers/ElevenLabsTTS.js');
      return new ElevenLabsTTS({ apiKey, voice: config.tts.voice });
    }
    default:
      return undefined;
  }
}

// ── Utilitaire ──────────────────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`[DomOS] ❌ Variable d'environnement requise manquante : ${name}`);
    process.exit(1);
  }
  return value;
}
```

**Dépend de** : étape 1.1 + packages existants (`@domos/adapter-google`, `@domos/adapter-openai`, speech providers)
**Critère de validation** : avec `GOOGLE_API_KEY` défini et config `llm.provider: 'google'`, retourne un `GoogleAdapter` fonctionnel

---

## Étape 1.5 — createDomOSServer() factory

**Fichier** : `packages/server/src/standalone/createDomOSServer.ts`

```ts
import { DomOSServer } from '../core/DomOSServer.js';
import { loadConfig } from './config/loader.js';
import { buildAdapters } from './adapters/factory.js';
import type { DomOSConfig } from './config/types.js';

export interface StandaloneServer {
  server: DomOSServer;
  config: DomOSConfig;
  listen: (callback?: () => void) => void;
  close: () => Promise<void>;
  readonly port: number;
}

export async function createDomOSServer(configPath?: string): Promise<StandaloneServer> {
  const config = loadConfig(configPath);
  const { llm, live, stt, tts } = await buildAdapters(config);

  const server = new DomOSServer({
    llm,
    live,
    stt,
    tts,
    port: config.port,
    path: config.path,
    admin: {
      username: config.admin.username,
      password: config.admin.password ?? process.env.ADMIN_PASSWORD ?? '',
      path: config.admin.path,
    },
    client: {
      requireApiKey: config.client.requireApiKey,
      enableApiKeyManagement: config.client.enableApiKeyManagement,
      maxConnectionsPerKey: config.client.maxConnectionsPerKey,
    },
    rateLimit: {
      disabled: config.rateLimit.disabled,
      burstLimit: config.rateLimit.burstLimit,
      burstWindowMs: config.rateLimit.burstWindowMs,
      burstCloseAfter: config.rateLimit.burstCloseAfter,
      maxRequests: config.rateLimit.maxRequests,
      windowMs: config.rateLimit.windowMs,
    },
    ui: config.ui,
    virtualLines: config.virtualLines,
  });

  // Enregistrer les clés API depuis la config
  if (config.apiKeys) {
    for (const entry of config.apiKeys) {
      server.addApiKey(entry.key);
      if (entry.prompt) {
        server.setPromptOverride(entry.key, entry.prompt);
      }
    }
  }

  return {
    server,
    config,
    port: config.port,
    listen(callback?: () => void) {
      // DomOSServer.listen() gère déjà le HTTP server + WebSocket
      server.listen(callback);
    },
    async close() {
      await server.close();
    },
  };
}
```

**Dépend de** : étapes 1.1-1.4 + DomOSServer existant
**Critère de validation** : `const s = await createDomOSServer('test.yml'); s.listen(() => console.log('ok'))` démarre le serveur

---

## Étape 1.6 — Entrypoint main.ts

**Fichier** : `packages/server/src/standalone/main.ts`

```ts
import 'dotenv/config';
import { createDomOSServer } from './createDomOSServer.js';

async function main() {
  try {
    const app = await createDomOSServer();

    app.listen(() => {
      console.log('');
      console.log('╔══════════════════════════════════════════════════════╗');
      console.log('║           DomOS Server — Ready                      ║');
      console.log('╠══════════════════════════════════════════════════════╣');
      console.log(`║  WebSocket   → ws://localhost:${app.port}${app.config.path}`);
      console.log(`║  Dashboard   → http://localhost:${app.port}/_domos/panel`);
      console.log(`║  Admin API   → http://localhost:${app.port}${app.config.admin.path}`);
      console.log(`║  Mode        → ${app.config.mode}`);
      console.log('╚══════════════════════════════════════════════════════╝');
      console.log('');
    });

    const shutdown = async () => {
      console.log('\n[DomOS] Arrêt en cours...');
      await app.close();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('[DomOS] ❌ Échec au démarrage :', err);
    process.exit(1);
  }
}

main();
```

**Dépend de** : étape 1.5
**Nouvelle dépendance** : `dotenv` (à ajouter dans packages/server/dependencies)

---

## Étape 1.7 — Index d'export standalone

**Fichier** : `packages/server/src/standalone/index.ts`

```ts
export { createDomOSServer } from './createDomOSServer.js';
export { loadConfig } from './config/loader.js';
export { DomOSConfigSchema } from './config/schema.js';
export type { DomOSConfig } from './config/types.js';
```

---

## Étape 1.8 — Ajouter l'export dans packages/server/src/index.ts

**AVANT** : `index.ts` n'exporte pas le standalone.

**APRÈS** : Ajouter en fin de fichier :
```ts
// Standalone server
export { createDomOSServer, loadConfig, DomOSConfigSchema } from './standalone/index.js';
export type { DomOSConfig } from './standalone/config/types.js';
```

---

## Étape 1.9 — Ajuster le build tsup

**AVANT** (package.json scripts) :
```json
"build": "tsup src/index.ts --format esm --dts --clean --external ..."
```

**APRÈS** :
```json
"build": "tsup src/index.ts src/standalone/main.ts --format esm --dts --clean --external mongodb --external ioredis --external wrtc --external better-sqlite3 --external @domos/ui --external @domos/adapter-google --external @domos/adapter-openai --external @domos/adapter-anthropic --external dotenv --external yaml",
"start": "node dist/standalone/main.js",
"start:dev": "tsx src/standalone/main.ts"
```

**Nouvelles dépendances** à ajouter :
```json
"dependencies": {
  // ... existants ...
  "dotenv": "^16.4.7",
  "yaml": "^2.4.0"
}
```

---

## Étape 1.10 — Fichier domos.config.example.yml

**Fichier** : `packages/server/domos.config.example.yml`

```yaml
# ═══════════════════════════════════════════════════════════
# DomOS Server — Configuration
# ═══════════════════════════════════════════════════════════
# Les clés API sensibles sont TOUJOURS lues depuis les
# variables d'environnement. Ne les mettez JAMAIS ici.

# Mode : self (self-hosting) | cloud (Cloud Pro)
mode: self

# ── Réseau ─────────────────────────────────────────────
port: 3000
host: "0.0.0.0"
path: "/domos"

# ── LLM ────────────────────────────────────────────────
# Provider LLM (google | openai | anthropic)
# La clé API est lue depuis GOOGLE_API_KEY, OPENAI_API_KEY, ou ANTHROPIC_API_KEY
llm:
  provider: google
  model: gemini-2.5-flash

# ── Audio Live (optionnel) ─────────────────────────────
# Gemini Native Audio — bidirectionnel, pas de STT/TTS externe
# live:
#   enabled: true
#   voice: Fenrir    # Fenrir | Puck | Kore | Charon | Aoede
#   model: gemini-2.5-flash-native-audio-preview-12-2025

# ── STT — Speech-to-Text (optionnel, mode hybride) ────
# Utilisé quand live.enabled=false et que le client envoie de l'audio
# stt:
#   provider: google     # google | whisper
#   language: fr-FR

# ── TTS — Text-to-Speech (optionnel, mode hybride) ────
# tts:
#   provider: google     # google | openai | elevenlabs
#   voice: fr-FR-Neural2-A
#   language: fr-FR

# ── Admin Dashboard ────────────────────────────────────
admin:
  username: admin
  # password: depuis ADMIN_PASSWORD env — JAMAIS en clair ici
  path: /admin

# ── Auth client WebSocket ──────────────────────────────
client:
  requireApiKey: true
  enableApiKeyManagement: true
  maxConnectionsPerKey: 10

# ── Rate Limiting ──────────────────────────────────────
rateLimit:
  disabled: false
  burstLimit: 15
  maxRequests: 200
  windowMs: 300000     # 5 minutes

# ── Dashboard UI embarqué ─────────────────────────────
ui:
  enabled: true

# ── Clés API prédéfinies (optionnel) ──────────────────
# apiKeys:
#   - key: pk_live_xxx
#     name: "Boutique principale"
#     description: "Clé pour le site e-commerce"
#   - key: pk_live_admin
#     name: "Admin Vue"
#     prompt: "Tu es l'assistant admin de la boutique DomOS..."

# ── Virtual Lines (optionnel) ─────────────────────────
# virtualLines:
#   lines:
#     - apiKey: pk_live_xxx
#       count: 4
#       ttlMs: 300000
#       waitingTtlMs: 120000

# ── Cloud Pro (Sprint 5) ──────────────────────────────
# cloud:
#   multiTenant: true
#   billing:
#     enabled: true
#   analytics:
#     retentionDays: 90
```

---

## Étape 1.11 — Fichier .env.example

**Fichier** : `packages/server/.env.example`

```bash
# ═══════════════════════════════════════════════════════
# DomOS Server — Variables d'environnement
# ═══════════════════════════════════════════════════════

# ── Mode ─────────────────────────────────────────────
# DOMOS_MODE=self

# ── Serveur ──────────────────────────────────────────
PORT=3000
NODE_ENV=development

# ── LLM — au moins une clé requise selon llm.provider ──
GOOGLE_API_KEY=
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=

# ── Admin Dashboard (requis) ─────────────────────────
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changez-moi-imperativement

# ── ElevenLabs (si tts.provider=elevenlabs) ──────────
# ELEVENLABS_API_KEY=

# ── Cloud Pro (si mode=cloud — Sprint 5) ─────────────
# DATABASE_URL=postgresql://domos:password@localhost:5432/domos
# REDIS_URL=redis://:password@localhost:6379
# JWT_SECRET=
# REFRESH_TOKEN_SECRET=
# ENCRYPTION_KEY=
# COOKIE_SECRET=
```

---

## Résumé Sprint 1

| # | Fichier | Dépend de | Livrable |
|---|---------|-----------|----------|
| 1.1 | `standalone/config/types.ts` | — | Types DomOSConfig |
| 1.2 | `standalone/config/schema.ts` | 1.1 | Validation Zod |
| 1.3 | `standalone/config/loader.ts` | 1.1, 1.2 | YAML + env merge |
| 1.4 | `standalone/adapters/factory.ts` | 1.1 | Dynamic import adapters |
| 1.5 | `standalone/createDomOSServer.ts` | 1.3, 1.4 | Factory principale |
| 1.6 | `standalone/main.ts` | 1.5 | Entrypoint node |
| 1.7 | `standalone/index.ts` | 1.5 | Barrel export |
| 1.8 | `src/index.ts` (modifier) | 1.7 | Export public |
| 1.9 | `package.json` (modifier) | 1.6 | Build + start scripts |
| 1.10 | `domos.config.example.yml` | — | Config exemple |
| 1.11 | `.env.example` | — | Env exemple |

**Critère de fin de sprint** :
```bash
cd packages/server
cp .env.example .env   # remplir GOOGLE_API_KEY + ADMIN_PASSWORD
cp domos.config.example.yml domos.config.yml
pnpm build
pnpm start
# → ws://localhost:3000/domos ✅
# → http://localhost:3000/_domos/panel ✅
```
