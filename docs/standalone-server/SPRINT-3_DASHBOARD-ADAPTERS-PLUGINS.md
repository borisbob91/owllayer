# Sprint 3 — Dashboard Capabilities UI, Plugin System

> **Objectif** : Le dashboard embarqué affiche les capabilities (modèles, voix, providers),
> et le plugin system fonctionne avec les tool providers.
> À la fin de ce sprint : le dashboard montre les capabilities en temps réel et
> les plugins peuvent être chargés depuis la config YAML.

> **Note (Mars 2026)** : Tous les adapters (Express/NestJS/Fastify) ont été supprimés
> car l'évaluation a montré que le serveur natif Node.js HTTP est suffisant et performant.
> Fastify évalué -14.84% plus lent sur WebSocket (path critique).
> Voir [CLEANUP-AND-FASTIFY-EVAL.md](CLEANUP-AND-FASTIFY-EVAL.md) pour les benchmarks.

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

## Phase B — Fastify Adapter (SUPPRIMÉ - Mars 2026)

> **Note** : FastifyAdapter a été évalué via benchmarks en mars 2026.  
> **Résultat** : Fastify est **-14.84% plus lent sur WebSocket ADTP** (le path critique).  
> **Décision** : Supprimé. Le serveur natif Node.js HTTP (DomOSServer) reste la solution officielle.  
> Voir [CLEANUP-AND-FASTIFY-EVAL.md](CLEANUP-AND-FASTIFY-EVAL.md) pour les détails.

### Étape 3.5 — Le Fastify adapter (OBSOLÈTE)

**Fichier** : `packages/server/src/adapters/fastify/FastifyAdapter.ts` ❌ (supprimé le 31 mars 2026)

~~Ce fichier permettait d'évaluer l'intégration DomOS dans une app Fastify pour benchmarks futurs.~~

Résultat des benchmarks (mars 2026) :
- HTTP REST: Fastify +0.13% (statistiquement négligeable)
- WebSocket ADTP: Fastify **-14.84%** (PLUS LENT sur 90% du trafic)
- **Verdict** : Serveur natif supérieur, Fastify non justifié

```ts
// Code archivé dans git commit 40b20d9
// Répertoire supprimé : packages/server/src/adapters/ (vide)
// Démo supprimée : apps/demo-fastify/ (benchmarks + tests)
```

~~Plugin pattern conservé~~ → **SUPPRIMÉ**
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

**Dépendance** : `fastify-plugin` (devDependency pour tests futurs)

**Usage (pour évaluation future uniquement) :**

```ts
import Fastify from 'fastify';
import { domosPlugin } from '@domos/server/adapters/fastify';

const app = Fastify();
await app.register(domosPlugin, { llm, port: 3000 });
```

**⚠️ Actuellement NON utilisé en production** — le serveur natif DomOSServer est suffisant.

---

---

## Phase C — Plugin System

### Étape 3.6 — Étendre l'interface DomOSPlugin existante

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

### Étape 3.7 — Plugin Loader depuis config YAML

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

### Étape 3.8 — Intégrer le plugin loader dans createDomOSServer

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
| 3.1 | `api.ts` (React + Preact) | ✅ Modifier | fetchCapabilities() |
| 3.2 | `apps/dashboard/pages/CapabilitiesPage.tsx` | ✅ Créer | Page React capabilities |
| 3.3 | `packages/ui/dashboard/pages/CapabilitiesPage.tsx` | ✅ Créer | Page Preact capabilities |
| 3.4 | `App.tsx` + `Layout.tsx` (dashboards) | ✅ Modifier | Route + nav |
| 3.5 | `adapters/fastify/FastifyAdapter.ts` | ❌ Supprimé | Évalué puis supprimé (31 mars 2026) |
| 3.6 | `plugins/plugin.types.ts` | ✅ Modifier | Interface complète |
| 3.7 | `standalone/plugins/pluginLoader.ts` | ✅ Créer | Chargement YAML plugins |
| 3.8 | `standalone/createDomOSServer.ts` + config | ✅ Modifier | Intégration |

**Adapters retirés (Mars 2026) :**
- ❌ Express adapter (supprimé — pas d'intégration réelle)
- ❌ NestJS adapter (supprimé — pas d'intégration réelle)
- ❌ Fastify adapter (supprimé — évalué -14.84% sur WebSocket, non justifié)

Voir [CLEANUP-AND-FASTIFY-EVAL.md](CLEANUP-AND-FASTIFY-EVAL.md) pour les détails.

**Critère de fin de sprint** :
```bash
# Dashboard affiche les capabilities
open http://localhost:3000/_domos/panel → Config tab → modèles + voix listés ✅

# Plugin YAML chargé
# domos.config.yml → plugins: [{ package: "@domos-plugins/demo-promotions" }]
# → Console : "[DomOS] ✅ Plugin chargé : @domos-plugins/demo-promotions" ✅

# Serveur natif DomOSServer stable et en production ✅
```
