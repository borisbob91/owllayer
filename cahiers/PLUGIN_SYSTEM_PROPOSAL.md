# DomOS — Système de Plugins Sécurisé

> **Date** : 25 Mars 2026  
> **Objectif** : Permettre à la communauté d'étendre DomOS via des plugins **sécurisés par design**  
> **Scope** : Serveur + UI (client) — deux écosystèmes distincts

---

## 1. Vision & Principes Directeurs

### 1.1 Pourquoi un système de plugins ?

**Objectifs :**
- ✅ Permettre à la communauté de créer des extensions sans modifier le core
- ✅ Accélérer l'adoption via un écosystème de plugins communautaires
- ✅ Isoler les fonctionnalités optionnelles (ex: intégrations tierces)
- ✅ Maintenir la sécurité et la stabilité du core

### 1.2 Principes de Sécurité (NON-NÉGOCIABLES)

| Principe | Description |
|---|---|
| **Zero Trust** | Un plugin est considéré comme **malveillant par défaut** |
| **Sandboxing** | Aucun accès direct au filesystem, réseau, ou processus hôte |
| **Capabilities** | Accès explicites et limités via des permissions déclaratives |
| **Isolation** | Un plugin crashé n'affecte pas le serveur ou les autres plugins |
| **Auditabilité** | Code source obligatoire, signature cryptographique requise |
| **Révocabilité** | Un plugin peut être désactivé à chaud sans redémarrage |

---

## 2. Périmètre du Système de Plugins

### 2.1 Ce que les plugins PEUVENT faire

| Catégorie | Exemples | Localisation |
|---|---|---|
| **Tools Personnalisés** | Tool `send_email`, `create_invoice`, `sync_crm` | **Serveur** |
| **Adaptateurs LLM** | Support Anthropic, Mistral, Llama | **Serveur** |
| **Middleware Auth** | Validation JWT custom, OAuth provider | **Serveur** |
| **Persistence** | MongoDB, PostgreSQL, S3 pour mémoire | **Serveur** |
| **Intégrations Tierces** | Stripe, Shopify API, Salesforce | **Serveur** |
| **Composants UI** | `<ProductCard />`, `<ChatBubble />` custom | **Client (UI)** |
| **Hooks/Composables** | `useAnalytics`, `createStorage` | **Client (UI)** |
| **Thèmes Widget** | CSS custom, presets de couleurs | **Client (UI)** |

### 2.2 Ce que les plugins NE PEUVENT PAS faire

| Interdiction | Raison |
|---|---|
| ❌ Accéder au filesystem sans permission explicite | Sécurité |
| ❌ Faire des requêtes réseau non autorisées | Fuite de données |
| ❌ Modifier le core de DomOS | Stabilité |
| ❌ Accéder aux sessions d'autres plugins | Isolation |
| ❌ Exécuter du code natif (sauf WASM sandbox) | Sécurité |
| ❌ Contourner HITL | Sécurité utilisateur |

---

## 3. Architecture du Système de Plugins

### 3.1 Vue d'ensemble

```
┌────────────────────────────────────────────────────────────────────┐
│                         DomOS Ecosystem                             │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    SERVEUR (Backend)                          │  │
│  │                                                               │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  DomOSServer Core                                       │  │  │
│  │  │  - WebSocket Transport                                  │  │  │
│  │  │  - Session Management                                   │  │  │
│  │  │  - LLM Adapters                                         │  │  │
│  │  │  - HITL Security                                        │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │         ↑                                                    │  │
│  │         │ Plugin API (stable)                                │  │
│  │         ↓                                                    │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  Plugin Runtime (Sandbox)                               │  │  │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │  │  │
│  │  │  │  Plugin A    │  │  Plugin B    │  │  Plugin C    │  │  │  │
│  │  │  │  (WASM)      │  │  (WASM)      │  │  (WASM)      │  │  │  │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘  │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    CLIENT (UI - Browser)                      │  │
│  │                                                               │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  DomOSClient (@domos/core)                              │  │  │
│  │  │  - Tool Registry                                        │  │  │
│  │  │  - Shadow Context                                       │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │         ↑                                                    │  │
│  │         │ Plugin API (stable)                                │  │
│  │         ↓                                                    │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  Plugin Loader (Light DOM)                              │  │  │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │  │  │
│  │  │  │  Plugin UI A │  │  Plugin UI B │  │  Plugin UI C │  │  │  │
│  │  │  │  (ES Module) │  │  (ES Module) │  │  (ES Module) │  │  │  │
│  │  │  └──────────────┘  └──────────────┘  └──────────────┘  │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### 3.2 Deux écosystèmes distincts

| Aspect | **Plugins Serveur** | **Plugins Client (UI)** |
|---|---|---|
| **Langage** | TypeScript + WASM | TypeScript + ES Modules |
| **Sandbox** | WASM + WASI | Light DOM + iframe (optionnel) |
| **Accès** | Limité via capabilities | Limité à l'UI uniquement |
| **Distribution** | npm + registry DomOS | npm + registry DomOS |
| **Exécution** | Isolée (thread dédié) | Dans le browser client |
| **Risque** | Élevé (serveur) | Faible (client-side) |

---

## 4. Plugins Serveur — Architecture Détaillée

### 4.1 Plugin Manifest (`domos-plugin.json`)

```json
{
  "name": "@domos/plugin-stripe",
  "version": "1.0.0",
  "description": "Intégration Stripe pour paiements",
  "author": "DomOS Team",
  "license": "MIT",
  
  "type": "server",
  "entryPoint": "./dist/index.js",
  "wasmModule": "./dist/stripe.wasm",
  
  "capabilities": {
    "network": {
      "allowedDomains": ["api.stripe.com"],
      "maxRequestsPerMinute": 100
    },
    "filesystem": {
      "allowedPaths": ["/tmp/stripe"],
      "maxStorageMB": 10
    },
    "memory": {
      "maxMemoryMB": 50
    },
    "cpu": {
      "maxExecutionTimeMs": 5000
    }
  },
  
  "tools": [
    {
      "name": "create_payment_intent",
      "description": "Créer un paiement Stripe",
      "risk": "critical"
    },
    {
      "name": "refund_payment",
      "description": "Rembourser un paiement",
      "risk": "high"
    }
  ],
  
  "dependencies": {
    "@domos/server": "^0.2.0",
    "@domos/core": "^0.2.0"
  },
  
  "signature": "sha256:abc123..."
}
```

### 4.2 Plugin API — Interfaces TypeScript

```typescript
// packages/server/src/plugins/types.ts

/**
 * Capabilities déclarées par un plugin.
 */
export interface PluginCapabilities {
  network?: {
    allowedDomains: string[];
    maxRequestsPerMinute: number;
  };
  filesystem?: {
    allowedPaths: string[];
    maxStorageMB: number;
  };
  memory?: {
    maxMemoryMB: number;
  };
  cpu?: {
    maxExecutionTimeMs: number;
  };
}

/**
 * Contexte d'exécution fourni au plugin.
 */
export interface PluginContext {
  // Accès aux tools (enregistrement)
  registerTool: (tool: ToolDefinition, handler: ToolHandler) => void;
  
  // Accès limité au réseau
  fetch: (url: string, options?: RequestInit) => Promise<Response>;
  
  // Accès limité au filesystem
  fs: {
    readFile: (path: string) => Promise<Buffer>;
    writeFile: (path: string, data: Buffer) => Promise<void>;
  };
  
  // Logging (isolé par plugin)
  log: {
    info: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
  };
  
  // Configuration (variables d'environnement du plugin)
  config: Record<string, string>;
  
  // Métadonnées du plugin
  metadata: {
    name: string;
    version: string;
    capabilities: PluginCapabilities;
  };
}

/**
 * Point d'entrée d'un plugin serveur.
 */
export interface ServerPlugin {
  /** Nom du plugin */
  name: string;
  
  /** Initialisation du plugin */
  init(ctx: PluginContext): Promise<void> | void;
  
  /** Nettoyage (optionnel) */
  destroy?(): Promise<void> | void;
}
```

### 4.3 Plugin Runtime — Sandbox WASM

```rust
// packages/server-native/src/plugin_runtime.rs
// Runtime WASM pour l'exécution isolée des plugins

use wasmtime::*;
use wasi_common::sync::WasiCtxBuilder;
use std::collections::HashMap;

pub struct PluginRuntime {
    engine: Engine,
    store: Store<PluginState>,
    capabilities: PluginCapabilities,
}

struct PluginState {
    network_allowed: bool,
    fs_allowed: bool,
    memory_limit: usize,
    start_time: std::time::Instant,
    max_execution_time: std::time::Duration,
}

impl PluginRuntime {
    pub fn new(capabilities: PluginCapabilities) -> Result<Self, Error> {
        let mut config = Config::new();
        config.cranelift_opt_level(OptLevel::Speed);
        
        let engine = Engine::new(&config)?;
        let mut store = Store::new(
            &engine,
            PluginState {
                network_allowed: capabilities.network.is_some(),
                fs_allowed: capabilities.filesystem.is_some(),
                memory_limit: capabilities.memory.map(|m| m.max_memory_mb * 1024 * 1024).unwrap_or(50 * 1024 * 1024),
                start_time: std::time::Instant::now(),
                max_execution_time: std::time::Duration::from_millis(
                    capabilities.cpu.map(|c| c.max_execution_time_ms).unwrap_or(5000)
                ),
            },
        );
        
        // Limiter la mémoire
        store.limiter(|state| {
            let mut limiter = ResourceLimiter::default();
            limiter.set_memory_limit(state.memory_limit);
            limiter
        });
        
        Ok(Self {
            engine,
            store,
            capabilities,
        })
    }
    
    pub fn execute_plugin(&mut self, wasm_bytes: &[u8], entry_point: &str) -> Result<PluginOutput, Error> {
        let module = Module::new(&self.engine, wasm_bytes)?;
        
        // Créer le contexte WASI avec restrictions
        let mut wasi_builder = WasiCtxBuilder::new();
        
        // Restreindre l'accès filesystem
        if let Some(fs_caps) = &self.capabilities.filesystem {
            for path in &fs_caps.allowed_paths {
                wasi_builder.inherit_dir(path)?;
            }
        }
        
        // Restreindre l'accès réseau (via proxy)
        if self.capabilities.network.is_some() {
            wasi_builder.inherit_env();
        }
        
        let wasi_ctx = wasi_builder.build();
        self.store.data_mut().set_wasi_ctx(wasi_ctx);
        
        let instance = Instance::new(&mut self.store, &module, &[])?;
        
        // Appeler le point d'entrée
        let run_func = instance.get_typed_func::<(), PluginOutput>(&mut self.store, entry_point)?;
        
        // Exécuter avec timeout
        let result = tokio::time::timeout(
            self.store.data().max_execution_time,
            run_func.call_async(&mut self.store, ())
        ).await??;
        
        Ok(result)
    }
}
```

### 4.4 Plugin Loader — TypeScript

```typescript
// packages/server/src/plugins/PluginLoader.ts
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { createHash } from 'crypto';
import { PluginRuntime } from '../native/plugin_runtime.js';
import type { ServerPlugin, PluginContext, PluginCapabilities } from './types.js';
import { createLogger } from '@domos/core';

const log = createLogger('DomOS:PluginLoader');

export class PluginLoader {
  private plugins = new Map<string, LoadedPlugin>();
  private pluginRuntimes = new Map<string, PluginRuntime>();
  
  constructor(
    private pluginDir: string,
    private networkSandbox: NetworkSandbox,
    private fsSandbox: FilesystemSandbox,
  ) {}
  
  /**
   * Charger un plugin depuis le filesystem.
   */
  async loadPlugin(pluginPath: string): Promise<void> {
    const manifestPath = resolve(pluginPath, 'domos-plugin.json');
    const manifestRaw = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestRaw);
    
    // Vérifier la signature cryptographique
    const isValid = await this.verifySignature(pluginPath, manifest);
    if (!isValid) {
      throw new Error(`Plugin ${manifest.name}: signature invalide`);
    }
    
    // Charger le module WASM
    const wasmPath = resolve(pluginPath, manifest.wasmModule);
    const wasmBytes = await readFile(wasmPath);
    
    // Créer le runtime sandboxé
    const runtime = new PluginRuntime(manifest.capabilities);
    this.pluginRuntimes.set(manifest.name, runtime);
    
    // Créer le contexte limité pour le plugin
    const context = this.createPluginContext(manifest);
    
    // Initialiser le plugin
    const plugin = await this.instantiatePlugin(wasmBytes, context);
    
    this.plugins.set(manifest.name, {
      manifest,
      instance: plugin,
      runtime,
    });
    
    log.info(`Plugin chargé: ${manifest.name} v${manifest.version}`);
  }
  
  /**
   * Créer le contexte d'exécution pour un plugin.
   */
  private createPluginContext(manifest: any): PluginContext {
    const capabilities: PluginCapabilities = manifest.capabilities;
    
    return {
      // Enregistrement de tools
      registerTool: (tool, handler) => {
        // Vérifier que le tool est déclaré dans le manifest
        const declaredTool = manifest.tools.find((t: any) => t.name === tool.name);
        if (!declaredTool) {
          throw new Error(`Tool "${tool.name}" non déclaré dans le manifest`);
        }
        
        // Enregistrer avec le risk level du manifest
        this.toolRouter.register(tool, handler, {
          pluginName: manifest.name,
          risk: declaredTool.risk,
        });
      },
      
      // Fetch sandboxé
      fetch: async (url: string, options?: RequestInit) => {
        const allowedDomains = capabilities.network?.allowedDomains || [];
        const urlObj = new URL(url);
        
        if (!allowedDomains.includes(urlObj.hostname)) {
          throw new Error(
            `Accès réseau refusé: ${urlObj.hostname} n'est pas dans la liste autorisée`
          );
        }
        
        return this.networkSandbox.fetch(url, options);
      },
      
      // Filesystem sandboxé
      fs: {
        readFile: async (path: string) => {
          return this.fsSandbox.readFile(path, manifest.name);
        },
        writeFile: async (path: string, data: Buffer) => {
          return this.fsSandbox.writeFile(path, data, manifest.name);
        },
      },
      
      // Logging isolé
      log: {
        info: (msg, ...args) => log.info(`[${manifest.name}] ${msg}`, ...args),
        warn: (msg, ...args) => log.warn(`[${manifest.name}] ${msg}`, ...args),
        error: (msg, ...args) => log.error(`[${manifest.name}] ${msg}`, ...args),
      },
      
      // Configuration
      config: this.loadPluginConfig(manifest.name),
      
      // Métadonnées
      metadata: {
        name: manifest.name,
        version: manifest.version,
        capabilities,
      },
    };
  }
  
  /**
   * Vérifier la signature cryptographique du plugin.
   */
  private async verifySignature(pluginPath: string, manifest: any): Promise<boolean> {
    const signaturePath = resolve(pluginPath, 'SIGNATURE');
    const signature = await readFile(signaturePath, 'utf-8');
    
    // Calculer le hash du contenu
    const content = await readFile(resolve(pluginPath, manifest.wasmModule));
    const hash = createHash('sha256').update(content).digest('hex');
    
    // Vérifier la signature (à implémenter avec clé publique DomOS)
    return this.verifyCryptographicSignature(hash, signature);
  }
  
  /**
   * Instancier un plugin WASM.
   */
  private async instantiatePlugin(wasmBytes: Buffer, context: PluginContext): Promise<ServerPlugin> {
    // Instanciation WASM via NAPI
    const { instantiatePlugin } = await import('../native/plugin_runtime.js');
    return instantiatePlugin(wasmBytes, context);
  }
  
  /**
   * Décharger un plugin.
   */
  async unloadPlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} non trouvé`);
    }
    
    // Appeler destroy si présent
    if (plugin.instance.destroy) {
      await plugin.instance.destroy();
    }
    
    // Nettoyer le runtime
    this.pluginRuntimes.delete(pluginName);
    this.plugins.delete(pluginName);
    
    log.info(`Plugin déchargé: ${pluginName}`);
  }
  
  /**
   * Lister les plugins chargés.
   */
  getLoadedPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }
}
```

---

## 5. Plugins Client (UI) — Architecture Détaillée

### 5.1 Manifeste Plugin UI

```json
{
  "name": "@domos/plugin-analytics-ui",
  "version": "1.0.0",
  "description": "Composants d'analytics pour DomOS",
  "type": "client",
  
  "exports": {
    "components": ["AnalyticsCard", "ConversionFunnel"],
    "hooks": ["useAnalytics", "useConversionTracking"],
    "tools": ["track_event", "get_analytics"]
  },
  
  "peerDependencies": {
    "@domos/react": "^0.2.0",
    "react": "^18.0.0"
  },
  
  "signature": "sha256:xyz789..."
}
```

### 5.2 Plugin Loader UI (React)

```typescript
// packages/react/src/plugins/PluginLoader.tsx
import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';

interface UIPluginManifest {
  name: string;
  version: string;
  exports: {
    components: string[];
    hooks: string[];
    tools: string[];
  };
}

interface LoadedUIPlugin {
  manifest: UIPluginManifest;
  components: Record<string, ComponentType<any>>;
  hooks: Record<string, Function>;
}

export class ClientPluginLoader {
  private plugins = new Map<string, LoadedUIPlugin>();
  
  /**
   * Charger un plugin UI depuis npm/CDN.
   */
  async loadPlugin(pluginName: string, version: string): Promise<void> {
    // Charger le manifeste
    const manifestUrl = `https://cdn.domos.dev/plugins/${pluginName}/${version}/manifest.json`;
    const manifest: UIPluginManifest = await fetch(manifestUrl).then(r => r.json());
    
    // Vérifier la signature
    const isValid = await this.verifySignature(pluginName, version, manifest);
    if (!isValid) {
      throw new Error(`Plugin ${pluginName}: signature invalide`);
    }
    
    // Charger les composants
    const components: Record<string, ComponentType<any>> = {};
    for (const componentName of manifest.exports.components) {
      const module = await import(
        `https://cdn.domos.dev/plugins/${pluginName}/${version}/${componentName}.js`
      );
      components[componentName] = module.default;
    }
    
    // Charger les hooks
    const hooks: Record<string, Function> = {};
    for (const hookName of manifest.exports.hooks) {
      const module = await import(
        `https://cdn.domos.dev/plugins/${pluginName}/${version}/${hookName}.js`
      );
      hooks[hookName] = module.default;
    }
    
    this.plugins.set(pluginName, {
      manifest,
      components,
      hooks,
    });
  }
  
  /**
   * Récupérer un composant d'un plugin.
   */
  getComponent(pluginName: string, componentName: string): ComponentType<any> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} non chargé`);
    }
    
    const component = plugin.components[componentName];
    if (!component) {
      throw new Error(`Composant ${componentName} non trouvé dans ${pluginName}`);
    }
    
    return component;
  }
  
  /**
   * Utiliser un hook d'un plugin.
   */
  useHook(pluginName: string, hookName: string, ...args: any[]): any {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} non chargé`);
    }
    
    const hook = plugin.hooks[hookName];
    if (!hook) {
      throw new Error(`Hook ${hookName} non trouvé dans ${pluginName}`);
    }
    
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return hook(...args);
  }
}

/**
 * Hook pour charger et utiliser un plugin UI.
 */
export function useUIPlugin(pluginName: string, version: string) {
  const [loader] = useState(() => new ClientPluginLoader());
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    loader.loadPlugin(pluginName, version)
      .then(() => setLoaded(true))
      .catch(err => setError(err));
  }, [pluginName, version]);
  
  return {
    loaded,
    error,
    getComponent: (name: string) => loader.getComponent(pluginName, name),
    useHook: (hookName: string, ...args: any[]) => loader.useHook(pluginName, hookName, ...args),
  };
}
```

### 5.3 Exemple d'usage — Plugin UI

```tsx
// App.tsx
import { useUIPlugin } from '@domos/react';

function Dashboard() {
  const { loaded, getComponent, useHook } = useUIPlugin(
    '@domos/plugin-analytics-ui',
    '1.0.0'
  );
  
  // Hook du plugin
  const analytics = useHook('useAnalytics', { projectId: 'abc123' });
  
  // Composant du plugin
  const AnalyticsCard = getComponent('AnalyticsCard');
  
  if (!loaded) return <div>Chargement...</div>;
  
  return (
    <div>
      <AnalyticsCard metrics={analytics.metrics} />
      <button onClick={() => analytics.track('button_click')}>
        Click me
      </button>
    </div>
  );
}
```

---

## 6. Sécurité — Mécanismes de Protection

### 6.1 Signature Cryptographique des Plugins

```typescript
// packages/server/src/plugins/signature.ts
import { createSign, createVerify, generateKeyPairSync } from 'crypto';
import { readFile, writeFile } from 'fs/promises';

const DOMOS_PRIVATE_KEY = process.env.DOMOS_PLUGIN_SIGNING_KEY;
const DOMOS_PUBLIC_KEY = process.env.DOMOS_PLUGIN_VERIFYING_KEY;

/**
 * Signer un plugin avant publication.
 */
export async function signPlugin(pluginPath: string): Promise<string> {
  const wasmPath = `${pluginPath}/dist/plugin.wasm`;
  const wasmBytes = await readFile(wasmPath);
  
  // Hash du contenu
  const hash = createHash('sha256').update(wasmBytes).digest('hex');
  
  // Signature avec clé privée DomOS
  const sign = createSign('SHA256');
  sign.update(hash);
  sign.end();
  
  const signature = sign.sign(DOMOS_PRIVATE_KEY, 'hex');
  
  // Écrire la signature
  await writeFile(`${pluginPath}/SIGNATURE`, signature);
  
  return signature;
}

/**
 * Vérifier la signature d'un plugin.
 */
export async function verifyPluginSignature(pluginPath: string): Promise<boolean> {
  const manifestPath = `${pluginPath}/domos-plugin.json`;
  const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));
  
  const wasmPath = `${pluginPath}/${manifest.wasmModule}`;
  const wasmBytes = await readFile(wasmPath);
  
  const signature = await readFile(`${pluginPath}/SIGNATURE`, 'utf-8');
  
  // Vérifier la signature
  const hash = createHash('sha256').update(wasmBytes).digest('hex');
  
  const verify = createVerify('SHA256');
  verify.update(hash);
  verify.end();
  
  return verify.verify(DOMOS_PUBLIC_KEY, signature, 'hex');
}
```

### 6.2 Network Sandbox

```typescript
// packages/server/src/plugins/NetworkSandbox.ts
import { Agent } from 'undici';

interface NetworkPolicy {
  allowedDomains: string[];
  maxRequestsPerMinute: number;
  blockedIPs: string[];
  timeoutMs: number;
}

export class NetworkSandbox {
  private policy: NetworkPolicy;
  private requestCount = new Map<string, number>();
  private rateLimitInterval: NodeJS.Timeout;
  
  constructor(policy: NetworkPolicy) {
    this.policy = policy;
    
    // Reset rate limits chaque minute
    this.rateLimitInterval = setInterval(() => {
      this.requestCount.clear();
    }, 60000);
  }
  
  async fetch(url: string, options?: RequestInit): Promise<Response> {
    const urlObj = new URL(url);
    
    // Vérifier le domaine
    if (!this.policy.allowedDomains.includes(urlObj.hostname)) {
      throw new Error(`Domaine non autorisé: ${urlObj.hostname}`);
    }
    
    // Vérifier rate limiting
    const count = this.requestCount.get(urlObj.hostname) || 0;
    if (count >= this.policy.maxRequestsPerMinute) {
      throw new Error(`Rate limit dépassé pour ${urlObj.hostname}`);
    }
    
    this.requestCount.set(urlObj.hostname, count + 1);
    
    // Requête HTTP avec timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.policy.timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }
  
  destroy() {
    clearInterval(this.rateLimitInterval);
  }
}
```

### 6.3 Filesystem Sandbox

```typescript
// packages/server/src/plugins/FilesystemSandbox.ts
import { readFile, writeFile, mkdir } from 'fs/promises';
import { resolve, normalize } from 'path';

interface FSPolicy {
  allowedPaths: string[];
  maxStorageMB: number;
}

export class FilesystemSandbox {
  private policy: FSPolicy;
  private storageUsed = new Map<string, number>(); // pluginName → bytes
  
  constructor(policy: FSPolicy) {
    this.policy = policy;
  }
  
  async readFile(path: string, pluginName: string): Promise<Buffer> {
    const resolvedPath = this.resolveAndValidate(path, pluginName);
    return readFile(resolvedPath);
  }
  
  async writeFile(path: string, data: Buffer, pluginName: string): Promise<void> {
    const resolvedPath = this.resolveAndValidate(path, pluginName);
    
    // Vérifier quota de stockage
    const currentUsage = this.storageUsed.get(pluginName) || 0;
    const newUsage = currentUsage + data.length;
    
    if (newUsage > this.policy.maxStorageMB * 1024 * 1024) {
      throw new Error(`Quota de stockage dépassé pour ${pluginName}`);
    }
    
    await mkdir(resolve(resolvedPath, '..'), { recursive: true });
    await writeFile(resolvedPath, data);
    
    this.storageUsed.set(pluginName, newUsage);
  }
  
  private resolveAndValidate(path: string, pluginName: string): string {
    const normalized = normalize(path);
    
    // Trouver le path autorisé correspondant
    const allowedPath = this.policy.allowedPaths.find(allowed => 
      normalized.startsWith(allowed)
    );
    
    if (!allowedPath) {
      throw new Error(
        `Accès filesystem refusé: ${path} n'est pas dans les paths autorisés`
      );
    }
    
    return resolve(normalized);
  }
}
```

---

## 7. Registry de Plugins — Infrastructure

### 7.1 Architecture du Registry

```
┌─────────────────────────────────────────────────────────────┐
│                    DomOS Plugin Registry                     │
│                     (plugins.domos.dev)                      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  API REST                                               │ │
│  │  GET  /plugins                                          │ │
│  │  GET  /plugins/:name                                    │ │
│  │  POST /plugins/:name/versions                           │ │
│  │  GET  /plugins/:name/versions/:version                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  CDN (Stockage des plugins)                             │ │
│  │  - plugins/@domos/plugin-stripe/1.0.0/plugin.wasm       │ │
│  │  - plugins/@domos/plugin-stripe/1.0.0/manifest.json     │ │
│  │  - plugins/@domos/plugin-stripe/1.0.0/SIGNATURE         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Base de données (Métadonnées)                          │ │
│  │  - Nom, version, auteur, description                    │ │
│  │  - Capabilities requises                                │ │
│  │  - Statistiques (downloads, ratings)                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Système de vérification                                │ │
│  │  - Signature cryptographique                            │ │
│  │  - Scan de sécurité automatique                         │ │
│  │  - Validation manuelle (plugins critiques)              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 CLI de Publication

```bash
# packages/cli/src/commands/publish.ts
import { signPlugin } from '../plugins/signature.js';
import { uploadToRegistry } from '../registry/upload.js';

export async function publishPlugin(pluginPath: string) {
  console.log('🔐 Signing plugin...');
  const signature = await signPlugin(pluginPath);
  
  console.log('📦 Packaging plugin...');
  const packagePath = await packagePlugin(pluginPath);
  
  console.log('🚀 Publishing to registry...');
  const result = await uploadToRegistry(packagePath);
  
  console.log(`✅ Plugin published: ${result.pluginName}@${result.version}`);
  console.log(`   URL: https://plugins.domos.dev/${result.pluginName}`);
}
```

**Usage :**

```bash
domos plugin publish ./my-plugin
```

---

## 8. Exemples de Plugins

### 8.1 Plugin Serveur — Stripe

```typescript
// plugins/stripe/src/index.ts
import type { ServerPlugin, PluginContext } from '@domos/server';

export const stripePlugin: ServerPlugin = {
  name: '@domos/plugin-stripe',
  
  async init(ctx) {
    const stripeSecretKey = ctx.config.STRIPE_SECRET_KEY;
    
    // Tool: Créer un paiement
    ctx.registerTool({
      name: 'create_payment_intent',
      description: 'Créer un paiement Stripe',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Montant en centimes' },
          currency: { type: 'string', description: 'Devise (eur, usd...)' },
          email: { type: 'string', description: 'Email du client' },
        },
        required: ['amount', 'currency'],
      },
      risk: 'critical',
    }, async (args) => {
      const response = await ctx.fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          amount: String(args.amount),
          currency: args.currency,
        }),
      });
      
      const data = await response.json();
      return `Paiement créé: ${data.id} (${data.status})`;
    });
    
    // Tool: Rembourser un paiement
    ctx.registerTool({
      name: 'refund_payment',
      description: 'Rembourser un paiement Stripe',
      parameters: {
        type: 'object',
        properties: {
          paymentIntentId: { type: 'string', description: 'ID du paiement' },
          amount: { type: 'number', description: 'Montant à rembourser (optionnel)' },
        },
        required: ['paymentIntentId'],
      },
      risk: 'high',
    }, async (args) => {
      const response = await ctx.fetch('https://api.stripe.com/v1/refunds', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          payment_intent: args.paymentIntentId,
          ...(args.amount && { amount: String(args.amount) }),
        }),
      });
      
      const data = await response.json();
      return `Remboursement créé: ${data.id}`;
    });
  },
};

export default stripePlugin;
```

### 8.2 Plugin Serveur — MongoDB Persistence

```typescript
// plugins/mongodb-persistence/src/index.ts
import type { ServerPlugin, PluginContext } from '@domos/server';

export const mongodbPlugin: ServerPlugin = {
  name: '@domos/plugin-mongodb-persistence',
  
  async init(ctx) {
    const mongoUri = ctx.config.MONGODB_URI;
    const dbName = ctx.config.MONGODB_DB_NAME;
    
    // Initialiser la connexion (via fetch sandboxé)
    // Note: En pratique, utiliser un driver MongoDB WASM
    
    ctx.log.info('MongoDB persistence initialized');
    
    // Le plugin expose une API de persistence pour les autres plugins
    // via un mécanisme de service registry
  },
};

export default mongodbPlugin;
```

### 8.3 Plugin Client — Analytics UI

```tsx
// plugins/analytics-ui/src/AnalyticsCard.tsx
import React from 'react';
import { useAgentTool } from '@domos/react';

interface AnalyticsCardProps {
  metrics: {
    pageViews: number;
    conversions: number;
    revenue: number;
  };
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({ metrics }) => {
  // Tool pour tracker un événement
  useAgentTool({
    name: 'track_event',
    description: 'Tracker un événement analytics',
    schema: {
      type: 'object',
      properties: {
        eventName: { type: 'string' },
        properties: { type: 'object' },
      },
      required: ['eventName'],
    },
    risk: 'none',
  }, async ({ eventName, properties }) => {
    // Envoi à l'API analytics
    await fetch('https://analytics.example.com/track', {
      method: 'POST',
      body: JSON.stringify({ eventName, properties }),
    });
    return `Événement tracké: ${eventName}`;
  });
  
  return (
    <div className="analytics-card">
      <h3>Analytics</h3>
      <div className="metric">
        <span className="label">Page Views</span>
        <span className="value">{metrics.pageViews}</span>
      </div>
      <div className="metric">
        <span className="label">Conversions</span>
        <span className="value">{metrics.conversions}</span>
      </div>
      <div className="metric">
        <span className="label">Revenue</span>
        <span className="value">${metrics.revenue}</span>
      </div>
    </div>
  );
};

export default AnalyticsCard;
```

---

## 9. Roadmap d'Implémentation

### Phase 1 : Foundation (4-6 semaines)

| Semaine | Tâche | Fichiers |
|---|---|---|
| **S1-2** | Définir les interfaces Plugin API | `packages/server/src/plugins/types.ts` |
| **S2-3** | Implémenter PluginLoader (base) | `packages/server/src/plugins/PluginLoader.ts` |
| **S3-4** | Network + FS Sandboxes | `packages/server/src/plugins/NetworkSandbox.ts`, `FilesystemSandbox.ts` |
| **S4-5** | Signature cryptographique | `packages/server/src/plugins/signature.ts` |
| **S5-6** | Tests + documentation | `docs/plugins/README.md` |

**Livrable** : Système de plugins serveur fonctionnel (sans WASM).

### Phase 2 : WASM Runtime (6-8 semaines)

| Semaine | Tâche | Fichiers |
|---|---|---|
| **S1-2** | Setup WASM runtime (Rust) | `packages/server-native/Cargo.toml` |
| **S2-4** | Intégrer wasmtime + WASI | `packages/server-native/src/plugin_runtime.rs` |
| **S4-5** | Binding NAPI TypeScript | `packages/server-native/src/lib.rs` |
| **S5-6** | Compiler TypeScript → WASM | `packages/create-plugin/templates/server/` |
| **S6-8** | Tests de charge + isolation | `tests/plugins/sandbox.test.ts` |

**Livrable** : Runtime WASM pour isolation totale des plugins.

### Phase 3 : Registry + CLI (4-6 semaines)

| Semaine | Tâche | Fichiers |
|---|---|---|
| **S1-2** | API Registry | `registry-api/src/index.ts` |
| **S2-3** | CDN + stockage | Infrastructure (S3/Cloudflare) |
| **S3-4** | CLI de publication | `packages/cli/src/commands/publish.ts` |
| **S4-5** | Système de vérification | `registry-api/src/verify.ts` |
| **S5-6** | Documentation + exemples | `docs/plugins/publishing.md` |

**Livrable** : Registry public + CLI de publication.

### Phase 4 : Plugins Client UI (4-6 semaines)

| Semaine | Tâche | Fichiers |
|---|---|---|
| **S1-2** | PluginLoader UI (React) | `packages/react/src/plugins/PluginLoader.tsx` |
| **S2-3** | Hook `useUIPlugin` | `packages/react/src/plugins/useUIPlugin.ts` |
| **S3-4** | Support Vue + Svelte | `packages/vue/src/plugins/`, `packages/svelte/src/plugins/` |
| **S4-5** | CDN pour plugins UI | Infrastructure |
| **S5-6** | Exemples + templates | `templates/plugin-ui-react/` |

**Livrable** : Écosystème de plugins UI complet.

---

## 10. Comparaison avec Autres Systèmes

| Système | Sandboxing | Signature | Registry | Complexité |
|---|---|---|---|---|
| **VS Code Extensions** | Processus isolé | ✅ Oui | ✅ Marketplace | Moyenne |
| **Figma Plugins** | Sandbox JS | ✅ Oui | ✅ Marketplace | Faible |
| **Shopify Apps** | API limits | ✅ OAuth | ✅ App Store | Moyenne |
| **DomOS (proposé)** | WASM + WASI | ✅ Cryptographique | ✅ Registry | Élevée |

**Avantage DomOS** : Isolation WASM + double écosystème (serveur + UI) + HITL intégré.

---

## 11. Risques & Atténuation

| Risque | Impact | Probabilité | Atténuation |
|---|---|---|---|
| **Plugin malveillant** | Critique | Moyenne | Signature + sandbox WASM + review manuelle |
| **Fuite de données** | Élevé | Moyenne | Network sandbox + allowedDomains |
| **Crash serveur** | Élevé | Faible | Isolation WASM + timeout + circuit breaker |
| **Abuse rate limiting** | Moyen | Élevée | Rate limiting par plugin + quotas |
| **Compatibilité** | Moyen | Élevée | Versioning sémantique + peerDependencies |

---

## 12. Conclusion & Recommandations

### ✅ Ce qu'il faut faire

1. **Commencer simple** : Plugins serveur sans WASM (Phase 1)
2. **Sandboxing progressif** : Network + FS d'abord, WASM ensuite
3. **Registry privé d'abord** : Tester en interne avant d'ouvrir
4. **Documentation exhaustive** : Guides, templates, exemples

### ❌ Ce qu'il ne faut PAS faire

1. **Ouvrir trop tôt** : Attendre que la sécurité soit mature
2. **Plugins trop puissants** : Limiter les capabilities au minimum
3. **Négliger le versioning** : Gérer la compatibilité dès le début

### 🎯 Priorité

**Phase 1 (Plugins serveur basiques)** est la priorité absolue — c'est le plus utile pour la communauté et le plus rapide à livrer.

Le WASM (Phase 2) peut attendre si la Phase 1 suffit pour les cas d'usage initiaux.

---

**Document généré le 25 Mars 2026**  
**Prochaine étape** : Valider le périmètre et commencer la Phase 1.
