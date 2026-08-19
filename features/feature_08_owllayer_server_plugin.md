# Feature #08 — OwlLayerServerPlugin — Système de plugins côté serveur

**Statut** : 🔵 Proposition  
**Domaine** : server  
**Porteur** : @BorisBob  
**Date** : 2026-03-26

---

## User Story

> En tant que développeur d'intégrations, je veux packager mes tools serveur
> en un plugin isolé avec namespace `@scope/name`, afin de distribuer des
> intégrations réutilisables (Stripe, Shopify, alertes Prometheus…) avec
> le même pattern ergonomique que les plugins client (Feature #05),
> sans exposer les internals de `OwlLayerServer`.

---

## Motivation

Aujourd'hui, enregistrer des tools serveur requiert un accès direct à l'instance
`OwlLayerServer` et un appel manuel à `server.tool(name, handler)` pour chaque tool.

```ts
// Avant : pas d'isolation, pas de namespace, pas de cleanup
server.tool('check_stock', async ({ productId }) => { … });
server.tool('reserve_stock', async ({ productId, qty }) => { … });
server.tool('cancel_reservation', async ({ reservationId }) => { … });
```

Problèmes :
- Les noms sont plats — collision silencieuse possible entre intégrations.
- Aucun mécanisme de désinstallation isolée.
- On ne peut pas distribuer un plugin server comme package npm autonome.
- Asymétrie marquée avec le système de plugins client (Feature #05).

Feature #08 formalise un contrat `OwlLayerServerPlugin<C>` et une fonction
`installServerPlugin()` qui résolvent ces trois problèmes, en miroir exact du
pattern client établi par Feature #05.

---

## Core Design

### `OwlLayerServerPlugin<C>` — interface du plugin

```ts
// packages/server/src/plugins/plugin.types.ts

export interface ServerPluginContext {
  /** Enregistre un tool sous le namespace du plugin.
   *  'check_stock' → enregistré comme '@scope/name/check_stock' */
  registerTool(name: string, handler: ServerToolHandler): void;
  /** Retire tous les tools enregistrés par ce plugin. */
  uninstall(): void;
}

export interface OwlLayerServerPlugin<C = void> {
  meta: {
    name: string;        // Format requis : @scope/name
    version: string;
    description?: string;
  };
  setup(ctx: ServerPluginContext, config: C): void | Promise<void>;
}
```

### `installServerPlugin()` — fonction core (testable sans serveur)

```ts
// packages/server/src/plugins/installServerPlugin.ts

export function installServerPlugin<C>(
  toolRouter: ToolRouter,
  plugin: OwlLayerServerPlugin<C>,
  config: C
): () => void
```

Internals :
1. `assertNamespace(plugin.meta.name)` — valide le format `@scope/name` (réutilisé depuis `@owllayer/core`)
2. `createServerPluginContext(toolRouter, plugin.meta.name)` — contexte isolé avec auto-préfixage
3. `plugin.setup(ctx, config)` — sync ou async (erreurs asynchrones loguées, non-bloquant)
4. Retourne `ctx.uninstall` — callable pour retirer exactement les tools du plugin

### `createServerPluginContext()` — détails internes

- Maintient un `Set<string>` local des noms complets enregistrés (avec préfixe)
- `registerTool(name, handler)` :
  - Compose le nom préfixé : `${pluginName}/${name}` (ex: `@owllayer-plugins/stock/check_stock`)
  - Vérifie la collision via `toolRouter.hasServerTool(prefixedName)` → throw si conflit
  - Appelle `toolRouter.registerServerTool(prefixedName, handler)`
  - Ajoute `prefixedName` au Set local
- `uninstall()` :
  - Itère le Set local
  - Appelle `toolRouter.unregisterServerTool(name)` pour chaque entrée

### `OwlLayerServer.installPlugin()` — surface publique

```ts
// packages/server/src/core/OwlLayerServer.ts

installPlugin<C>(plugin: OwlLayerServerPlugin<C>, config: C): () => void {
  return installServerPlugin(this.toolRouter, plugin, config);
}
```

**Pourquoi une méthode sur `OwlLayerServer` :** `toolRouter` est `private`, seule la classe
peut y accéder. `installServerPlugin()` prend `ToolRouter` directement pour rester testable
sans instancier `OwlLayerServer`. Aucune violation d'encapsulation.

### Modification minimale de `ToolRouter`

`ToolRouter.hasServerTool(name)` existe déjà. Seule lacune : pas de `unregisterServerTool()`.

```ts
// packages/server/src/core/ToolRouter.ts — une seule ligne ajoutée

unregisterServerTool(name: string): void {
  this.serverTools.delete(name);
}
```

---

## Usage

### Auteur de plugin (package npm tiers)

```ts
// @owllayer-plugins/stock-manager/src/index.ts
import type { OwlLayerServerPlugin } from '@owllayer/server';

export interface StockConfig {
  dbUrl: string;
}

export const StockManagerPlugin: OwlLayerServerPlugin<StockConfig> = {
  meta: { name: '@owllayer-plugins/stock-manager', version: '1.0.0' },

  setup(ctx, config) {
    ctx.registerTool('check_stock', async ({ productId }) => {
      // Enregistré sous : @owllayer-plugins/stock-manager/check_stock
      const qty = await db.query(config.dbUrl, String(productId));
      return { available: qty };
    });

    ctx.registerTool('reserve_stock', async ({ productId, qty }) => {
      // Enregistré sous : @owllayer-plugins/stock-manager/reserve_stock
      await db.reserve(config.dbUrl, String(productId), Number(qty));
      return { ok: true };
    });
  },
};
```

### Intégration côté serveur applicatif

```ts
import { OwlLayerServer } from '@owllayer/server';
import { StockManagerPlugin } from '@owllayer-plugins/stock-manager';

const server = new OwlLayerServer({ /* options */ });

// Retourne une fonction de désinstallation
const uninstallStock = server.installPlugin(StockManagerPlugin, {
  dbUrl: process.env.DATABASE_URL!,
});

// Plus tard, pour désinstaller proprement (ex. hot-reload, feature flag) :
uninstallStock();
```

---

## Périmètre

**Ce que fait cette feature :**
- Interface `OwlLayerServerPlugin<C>` et `ServerPluginContext` dans `plugins/plugin.types.ts`
- Fonction `installServerPlugin(toolRouter, plugin, config)` testable sans `OwlLayerServer`
- Méthode publique `OwlLayerServer.installPlugin(plugin, config)` → retourne `() => void`
- Auto-préfixage des noms de tools (`pluginName/toolName`)
- Détection de collision au moment de l'enregistrement (throw explicite avec nom du tool)
- Désinstallation isolée : seuls les tools du plugin sont retirés, aucun autre
- Export public depuis `@owllayer/server`

**Hors scope :**
- Shadow Context / injection mémoire dans le prompt LLM — Feature future
- Registry de plugins central ou marketplace
- Chargement dynamique (dynamic import, hot-reload automatique)
- Interface UI côté client (DevPanel, PluginsPage)
- Modifications hors `packages/server/` (`core`, `react`, `vue`, `svelte`, `browser`)
- WASM / sandbox d'exécution isolée
- Tests d'intégration e2e avec `OwlLayerServer` complet (unitaire suffit en V1)

---

## Impact & Domaine

**Domaine unique** : `server` (`packages/server/`)

Impact zéro sur `@owllayer/core`, `@owllayer/react`, `@owllayer/vue`, `@owllayer/svelte`, `@owllayer/browser`.

---

## Fichiers à créer / modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `packages/server/src/plugins/plugin.types.ts` | **Créer** | `ServerPluginContext`, `OwlLayerServerPlugin<C>` |
| `packages/server/src/plugins/installServerPlugin.ts` | **Créer** | `installServerPlugin()`, `createServerPluginContext()` |
| `packages/server/src/plugins/__tests__/installServerPlugin.test.ts` | **Créer** | Tests unitaires — stub `FakeToolRouter` |
| `packages/server/src/core/ToolRouter.ts` | **Modifier** | Ajouter `unregisterServerTool(name: string): void` |
| `packages/server/src/core/OwlLayerServer.ts` | **Modifier** | Ajouter `installPlugin<C>(plugin, config): () => void` |
| `packages/server/src/index.ts` | **Modifier** | Exporter `OwlLayerServerPlugin`, `ServerPluginContext`, `installServerPlugin` |

**Fichiers NON modifiés dans cette feature :**
- `packages/core/*`, `packages/react/*`, `packages/vue/*`, `packages/svelte/*`, `packages/browser/*`
- `packages/server/src/core/SessionManager.ts`
- `packages/server/src/middleware/*`
- `packages/server/src/agent/*`

---

## Critères d'acceptance

1. `server.installPlugin(plugin, config)` retourne une fonction `() => void`
2. `server.installPlugin({ meta: { name: 'bad-name' }, setup() {} }, {})` → throw avec message clair sur le format requis
3. Deux plugins enregistrant le même tool name préfixé → throw nommant explicitement le tool en conflit
4. `uninstall()` retire exactement les tools du plugin — aucun autre tool affecté
5. Le nom enregistré suit `pluginName/toolName` (ex: `@owllayer-plugins/stock-manager/check_stock`)
6. `installServerPlugin(fakeRouter, plugin, config)` fonctionne sans instance `OwlLayerServer`
7. `pnpm build` passe dans le package `server` sans erreur TypeScript
8. Tous les tests existants (164) restent verts
9. Les nouveaux tests couvrent : namespace invalide, collision, enregistrement correct, désinstallation propre

---

## Sécurité

- `ServerPluginContext` n'expose pas `toolRouter` directement — encapsulation préservée
- Un plugin ne peut pas appeler `server.disconnect()` ni accéder à l'état des sessions actives
- `@scope/name` obligatoire prévient les collisions silencieuses entre intégrations tierces
- `unregisterServerTool()` n'affecte que `serverTools` — les tools client (`clientTools` map) sont intouchables
- Les handlers de tools ne sont pas validés à l'enregistrement — responsabilité de l'auteur du plugin
