# Sprint 3 — Dashboard Capabilities UI, Fastify Adapters, Plugin System

> **Objectif** : Le dashboard embarqué affiche les capabilities (modèles, voix, providers),
> les Fastify/NestJS/Express adapters sont créés, et le plugin system fonctionne avec
> les tool providers. À la fin de ce sprint : le serveur est intégrable dans n'importe
> quel framework HTTP existant et le dashboard montre les capabilities en temps réel.

---

## Prérequis

- Sprint 2 complet — `/admin/capabilities` retourne les données
- Dashboards existants : `apps/dashboard` (React) + `packages/ui/src/dashboard` (Preact)

---

## Phase A — Dashboard UI Capabilities

### Étape 3.1 — API client : fetchCapabilities()

**Fichier** : `apps/dashboard/src/api.ts` + `packages/ui/src/dashboard/api.ts` (modifier les deux)

```ts
// Ajouter à l'API client (identique React et Preact)

export interface LLMModel {
  id: string;
  name: string;
  supportsAudio: boolean;
  supportsTools: boolean;
  description?: string;
}

export interface VoiceInfo {
  id: string;
  name: string;
  language?: string;
  gender?: 'male' | 'female' | 'neutral';
}

export interface ProviderCapabilities {
  provider: string;
  providerName: string;
  models: LLMModel[];
  voices?: VoiceInfo[];
  currentModel?: string;
  currentVoice?: string;
}

export interface SpeechCapabilities {
  provider: string;
  providerName: string;
  voices?: VoiceInfo[];
  languages?: string[];
  currentVoice?: string;
  currentLanguage?: string;
}

export interface ServerCapabilities {
  llm: ProviderCapabilities | null;
  live: ProviderCapabilities | null;
  stt: SpeechCapabilities | null;
  tts: SpeechCapabilities | null;
  server: { version: string; mode: string; uptime: number };
}

export async function fetchCapabilities(): Promise<ServerCapabilities> {
  const res = await fetch(`${BASE_URL}/capabilities`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch capabilities');
  return res.json();
}
```

---

### Étape 3.2 — Page CapabilitiesPage (React — apps/dashboard)

**Fichier** : `apps/dashboard/src/pages/CapabilitiesPage.tsx` (créer)

Layout en 4 sections :
1. **LLM Provider** — provider actif, modèle actuel, liste des modèles disponibles
2. **Live Audio** — voix configurée, liste des voix avec genre, modèle live
3. **STT** — provider, langue, liste des langues/modèles
4. **TTS** — provider, voix actuelle, liste des voix avec sample (futur)

Chaque section :
- Badge "actif" vert si configuré, gris si non
- Tableau des modèles/voix disponibles
- Le modèle/voix actuel(le) est mis en surbrillance
- Pas de modification possible (read-only) — la config se fait dans le YAML

```tsx
// Structure de la page (React + Tailwind)

export default function CapabilitiesPage() {
  const [caps, setCaps] = useState<ServerCapabilities | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCapabilities().then(setCaps).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!caps) return <p>Impossible de charger les capabilities.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuration Serveur</h1>

      {/* Server info */}
      <ServerInfoCard server={caps.server} />

      {/* LLM Text */}
      <ProviderCard title="LLM (Texte)" data={caps.llm} icon="brain" />

      {/* Live Audio */}
      <ProviderCard title="Audio Live" data={caps.live} icon="mic" showVoices />

      {/* STT */}
      <SpeechCard title="Speech-to-Text" data={caps.stt} icon="ear" />

      {/* TTS */}
      <SpeechCard title="Text-to-Speech" data={caps.tts} icon="speaker" showVoices />
    </div>
  );
}
```

**Composants enfants** : `ProviderCard`, `SpeechCard`, `ServerInfoCard` — dans `apps/dashboard/src/components/`

---

### Étape 3.3 — Page CapabilitiesPage (Preact — packages/ui)

**Fichier** : `packages/ui/src/dashboard/pages/CapabilitiesPage.tsx` (créer)

Même logique que React mais avec inline styles (pas de Tailwind dans @domos/ui).
Structure identique : 4 cartes, lecture seule.

---

### Étape 3.4 — Router + Navigation

**apps/dashboard** :
- `App.tsx` : Route `/capabilities` → `CapabilitiesPage`
- `Layout.tsx` : Ajouter "Configuration" dans la nav (entre "Agents" et "Métriques")

**packages/ui** :
- `DashboardPanel.tsx` : Route `page === 'capabilities'` → `CapabilitiesPage`
- `Layout.tsx` : Ajouter dans NAV_ITEMS

---

## Phase B — Fastify Adapter

### Étape 3.5 — Créer le Fastify adapter

**Fichier** : `packages/server/src/adapters/fastify/FastifyAdapter.ts` (créer)

Ce fichier permet d'intégrer DomOS dans une app Fastify existante.

```ts
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { DomOSServer } from '../../core/DomOSServer.js';
import type { DomOSServerOptions } from '../../core/DomOSServer.js';

export interface DomOSFastifyPluginOptions extends DomOSServerOptions {}

/**
 * Plugin Fastify pour DomOS.
 *
 * @example
 * ```ts
 * import Fastify from 'fastify';
 * import { domosPlugin } from '@domos/server/adapters/fastify';
 *
 * const app = Fastify();
 * await app.register(domosPlugin, { llm, port: 3000 });
 * ```
 */
const domosPluginFn: FastifyPluginAsync<DomOSFastifyPluginOptions> = async (fastify, options) => {
  const domos = new DomOSServer(options);

  // Décorer Fastify avec l'instance DomOS
  fastify.decorate('domos', domos);

  // Le DomOSServer gère déjà son propre HTTP server + WebSocket upgrade
  // On n'a pas besoin de @fastify/websocket car DomOS utilise `ws` directement
  // DomOS écoute en parallèle sur le même port via le serveur HTTP sous-jacent

  // Hook : arrêt propre
  fastify.addHook('onClose', async () => {
    await domos.close();
  });

  fastify.log.info(`[DomOS] Plugin registered — path: ${options.path || '/domos'}`);
};

export const domosPlugin = fp(domosPluginFn, {
  name: 'domos',
  fastify: '>=4.0.0',
});

// Type augmentation
declare module 'fastify' {
  interface FastifyInstance {
    domos: DomOSServer;
  }
}
```

**Nouvelle dépendance optionnelle** : `fastify-plugin` (peerDependency — pas dans dependencies)

---

### Étape 3.6 — Créer le NestJS adapter

**Fichier** : `packages/server/src/adapters/nestjs/DomosModule.ts` (créer)

```ts
import { Module, DynamicModule, Global, OnModuleDestroy, Inject } from '@nestjs/common';
import { DomOSServer } from '../../core/DomOSServer.js';
import type { DomOSServerOptions } from '../../core/DomOSServer.js';

const DOMOS_OPTIONS = 'DOMOS_SERVER_OPTIONS';
const DOMOS_SERVER = 'DOMOS_SERVER';

@Global()
@Module({})
export class DomosModule implements OnModuleDestroy {
  constructor(@Inject(DOMOS_SERVER) private server: DomOSServer) {}

  static forRoot(options: DomOSServerOptions): DynamicModule {
    return {
      module: DomosModule,
      providers: [
        { provide: DOMOS_OPTIONS, useValue: options },
        {
          provide: DOMOS_SERVER,
          useFactory: (opts: DomOSServerOptions) => new DomOSServer(opts),
          inject: [DOMOS_OPTIONS],
        },
      ],
      exports: [DOMOS_SERVER],
    };
  }

  async onModuleDestroy() {
    await this.server.close();
  }
}
```

**Note** : NestJS est une peerDependency, pas installée dans @domos/server.

---

### Étape 3.7 — Créer le Express adapter

**Fichier** : `packages/server/src/adapters/express/expressAdapter.ts` (créer)

```ts
import type { Application } from 'express';
import { DomOSServer } from '../../core/DomOSServer.js';
import type { DomOSServerOptions } from '../../core/DomOSServer.js';

/**
 * Attache DomOS a une application Express existante.
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { attachDomOS } from '@domos/server/adapters/express';
 *
 * const app = express();
 * const domos = attachDomOS(app, { llm, port: 3000 });
 * ```
 */
export function attachDomOS(app: Application, options: DomOSServerOptions): DomOSServer {
  const domos = new DomOSServer(options);

  // DomOS gère son propre WebSocket server — Express ne gère que le HTTP
  // Le serveur HTTP sous-jacent est partagé

  return domos;
}
```

---

### Étape 3.8 — Exports des adapters dans packages/server

**Fichier** : `packages/server/package.json` — ajouter les exports conditionnels :

```json
{
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
    },
    "./adapters/nestjs": {
      "import": "./dist/adapters/nestjs/DomosModule.js",
      "types": "./dist/adapters/nestjs/DomosModule.d.ts"
    },
    "./adapters/express": {
      "import": "./dist/adapters/express/expressAdapter.js",
      "types": "./dist/adapters/express/expressAdapter.d.ts"
    }
  }
}
```

**Modifier le build tsup** pour inclure les adapters comme entry points :
```json
"build": "tsup src/index.ts src/standalone/main.ts src/standalone/index.ts src/adapters/fastify/FastifyAdapter.ts src/adapters/nestjs/DomosModule.ts src/adapters/express/expressAdapter.ts --format esm --dts --clean --external ..."
```

---

## Phase C — Plugin System

### Étape 3.9 — Étendre l'interface DomOSPlugin existante

**Fichier** : `packages/server/src/plugins/plugin.types.ts` (modifier)

L'interface `DomOSServerPlugin` existe déjà. S'assurer qu'elle inclut :

```ts
export interface DomOSServerPlugin {
  name: string;
  version?: string;

  // Lifecycle hooks
  onInit?(context: PluginContext): Promise<void>;
  onSessionStart?(session: Session): Promise<void>;
  onSessionEnd?(session: Session): Promise<void>;

  // Message pipeline hooks
  onMessage?(message: ADTPMessage, session: Session): Promise<ADTPMessage | null>;
  onBeforeLLMCall?(request: LLMRequest, session: Session): Promise<LLMRequest>;
  onAfterLLMCall?(response: LLMResponse, session: Session): Promise<LLMResponse>;
  onToolCall?(call: ToolCall, session: Session): Promise<ToolCall | null>;
  onToolResult?(call: ToolCall, result: unknown, session: Session): Promise<unknown>;

  // Tool providers
  toolProviders?: ToolProvider[];

  // Routes HTTP additionnelles (ex: OAuth callbacks)
  registerRoutes?(fastify: FastifyInstance): Promise<void>;
}

export interface ToolProvider {
  name: string;
  getTools(session?: Session): ToolDeclaration[];
  execute(call: ToolCall, session: Session): Promise<unknown>;
  shouldActivate?(session: Session): boolean;
}

export interface PluginContext {
  server: DomOSServer;
  config: Record<string, unknown>;
  logger: Logger;
}
```

---

### Étape 3.10 — Plugin Loader depuis config YAML

**Fichier** : `packages/server/src/standalone/plugins/pluginLoader.ts` (créer)

```ts
import { installServerPlugin } from '../../plugins/installServerPlugin.js';
import type { DomOSServer } from '../../core/DomOSServer.js';

/**
 * Charge les plugins listés dans la config YAML.
 *
 * Configuration exemple :
 * ```yaml
 * plugins:
 *   - package: "@domos-plugins/demo-promotions"
 *   - package: "@domos/plugin-shopify"
 *     config:
 *       clientId: ${SHOPIFY_CLIENT_ID}
 * ```
 */
export async function loadPluginsFromConfig(
  server: DomOSServer,
  plugins?: Array<{ package: string; config?: Record<string, unknown> }>
): Promise<void> {
  if (!plugins || plugins.length === 0) return;

  for (const pluginDef of plugins) {
    try {
      const mod = await import(pluginDef.package);
      const plugin = mod.default ?? mod;

      if (typeof plugin === 'function') {
        // Plugin factory — passe la config
        installServerPlugin(server, plugin(pluginDef.config));
      } else {
        installServerPlugin(server, plugin);
      }

      console.log(`[DomOS] ✅ Plugin chargé : ${pluginDef.package}`);
    } catch (err) {
      console.error(`[DomOS] ❌ Impossible de charger le plugin ${pluginDef.package}:`, err);
    }
  }
}
```

---

### Étape 3.11 — Intégrer le plugin loader dans createDomOSServer

**Fichier** : `packages/server/src/standalone/createDomOSServer.ts` (modifier)

Ajouter après la création du serveur :
```ts
import { loadPluginsFromConfig } from './plugins/pluginLoader.js';

// ... dans createDomOSServer() après server.addApiKey() ...

// Charger les plugins de la config YAML
await loadPluginsFromConfig(server, config.plugins);
```

Ajouter dans `config/types.ts` :
```ts
export interface DomOSConfig {
  // ... existants ...
  plugins?: Array<{ package: string; config?: Record<string, unknown> }>;
}
```

Ajouter dans `config/schema.ts` :
```ts
plugins: z.array(z.object({
  package: z.string(),
  config: z.record(z.unknown()).optional(),
})).optional(),
```

---

## Résumé Sprint 3

| # | Fichier | Action | Livrable |
|---|---------|--------|----------|
| 3.1 | `api.ts` (React + Preact) | Modifier | fetchCapabilities() |
| 3.2 | `apps/dashboard/pages/CapabilitiesPage.tsx` | **Créer** | Page React capabilities |
| 3.3 | `packages/ui/dashboard/pages/CapabilitiesPage.tsx` | **Créer** | Page Preact capabilities |
| 3.4 | `App.tsx` + `Layout.tsx` (les deux dashboards) | Modifier | Route + nav |
| 3.5 | `adapters/fastify/FastifyAdapter.ts` | **Créer** | Plugin Fastify |
| 3.6 | `adapters/nestjs/DomosModule.ts` | **Créer** | Module NestJS |
| 3.7 | `adapters/express/expressAdapter.ts` | **Créer** | Helper Express |
| 3.8 | `package.json` exports + build | Modifier | Subpath exports |
| 3.9 | `plugins/plugin.types.ts` | Modifier | Interface complète |
| 3.10 | `standalone/plugins/pluginLoader.ts` | **Créer** | Chargement YAML plugins |
| 3.11 | `standalone/createDomOSServer.ts` + config | Modifier | Intégration |

**Critère de fin de sprint** :
```bash
# Dashboard affiche les capabilities
open http://localhost:3000/_domos/panel → Config tab → modèles + voix listés ✅

# Plugin Fastify utilisable
import { domosPlugin } from '@domos/server/adapters/fastify' ✅

# Plugin YAML chargé
# domos.config.yml → plugins: [{ package: "@domos-plugins/demo-promotions" }]
# → Console : "[DomOS] ✅ Plugin chargé : @domos-plugins/demo-promotions"
```
