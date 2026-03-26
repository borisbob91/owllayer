# Plugins DomOS

DomOS dispose de deux systemes de plugins distincts : un pour le **client** (le code qui tourne dans le navigateur ou dans React/Vue/Svelte), et un pour le **serveur** (Node.js). Les deux partagent le meme principe — namespace `@scope/name`, auto-prefixage des tools, desinstallation propre — mais s'utilisent dans des contextes differents.

---

## Pourquoi des plugins ?

Sans plugins, distribuer une integration demande d'exposer `DomOSClient` ou `DomOSServer` directement a des packages tiers. Les tools sont enregistres sous des noms plats, les collisions sont silencieuses, et il n'y a aucun moyen de tout retirer proprement.

Les plugins reglent ca : chaque integration est un objet autonome avec un namespace unique, et elle peut etre installee ou desinstallee sans toucher au reste.

---

## Plugin client (`DomOSClientPlugin`)

Un plugin client enregistre des tools qui s'executent **dans le navigateur**, du cote de l'utilisateur. Il vit dans `@domos/core` et fonctionne dans tous les frameworks (React, Vue, Svelte, vanilla).

### Creer un plugin client

```ts
import type { DomOSClientPlugin } from '@domos/core';

export interface MyCRMConfig {
  apiUrl: string;
  tenantId: string;
}

export const MyCRMPlugin: DomOSClientPlugin<MyCRMConfig> = {
  meta: {
    name: '@acme/crm',    // format obligatoire : @scope/name en minuscules
    version: '1.0.0',
  },

  setup(ctx, config) {
    ctx.updateContext({ crm: { tenantId: config.tenantId } });

    ctx.registerTool('search_contacts', {
      description: 'Rechercher des contacts dans le CRM.',
      parameters: {
        type: 'OBJECT',
        properties: {
          query: { type: 'STRING', description: 'Mot-cle de recherche' },
        },
        required: ['query'],
      },
      risk: 'none',
      handler: async ({ query }) => {
        const res = await fetch(`${config.apiUrl}/contacts?q=${encodeURIComponent(String(query))}`);
        return res.json();
      },
    });
  },
};
```

Le tool est enregistre sous `@acme/crm/search_contacts`. Il n'y a pas de collision possible avec un autre plugin qui aurait aussi un tool `search_contacts`.

### Installer un plugin client

**Browser (vanilla)**

```ts
import { DomOS } from '@domos/browser';
import { MyCRMPlugin } from '@acme/crm';

await DomOS.init({ apiKey: 'pk_...', endpoint: 'wss://...' });
DomOS.installPlugin(MyCRMPlugin, { apiUrl: 'https://crm.acme.com', tenantId: 'acme' });
```

**React**

```tsx
import { DomOSProvider } from '@domos/react';
import { MyCRMPlugin } from '@acme/crm';

<DomOSProvider
  apiKey="pk_..."
  endpoint="wss://..."
  plugins={[
    [MyCRMPlugin, { apiUrl: 'https://crm.acme.com', tenantId: 'acme' }],
  ]}
>
  <App />
</DomOSProvider>
```

**Vue**

```ts
app.use(DomOSPlugin, {
  endpoint: 'wss://...',
  apiKey: 'pk_...',
  plugins: [
    [MyCRMPlugin, { apiUrl: 'https://crm.acme.com', tenantId: 'acme' }],
  ],
});
```

**Svelte**

```ts
initDomOS({
  endpoint: 'wss://...',
  apiKey: 'pk_...',
  plugins: [
    [MyCRMPlugin, { apiUrl: 'https://crm.acme.com', tenantId: 'acme' }],
  ],
});
```

### Ce que `PluginClientContext` expose

| Methode | Description |
|---------|-------------|
| `registerTool(name, definition)` | Enregistre un tool (prefixe auto) |
| `updateContext(ctx)` | Met a jour le Shadow Context du client |
| `getContext()` | Lit le Shadow Context courant |
| `uninstall()` | Retire tous les tools enregistres par ce plugin |

Le plugin ne peut **pas** appeler `client.connect()` / `disconnect()`, envoyer des messages WebSocket bruts, ou acceder a la memoire de l'agent. La surface est volontairement reduite.

---

## Plugin serveur (`DomOSServerPlugin`)

Un plugin serveur enregistre des tools qui s'executent **sur le serveur Node.js**, cote DomOS. Il a acces aux ressources backend (base de donnees, API internes, variables d'environnement) et retourne ses resultats directement au LLM.

### Creer un plugin serveur

```ts
import type { DomOSServerPlugin } from '@domos/server';

export interface StockConfig {
  dbUrl: string;
}

export const StockPlugin: DomOSServerPlugin<StockConfig> = {
  meta: {
    name: '@acme/stock',    // meme format @scope/name
    version: '1.0.0',
  },

  setup(ctx, config) {
    ctx.registerTool('check_stock', async ({ productId }) => {
      // execute directement sur le serveur, jamais envoye au navigateur
      const qty = await db.query(config.dbUrl, String(productId));
      return { available: qty };
    });

    ctx.registerTool('reserve_stock', async ({ productId, qty }) => {
      await db.reserve(config.dbUrl, String(productId), Number(qty));
      return { ok: true };
    });
  },
};
```

Les tools sont enregistres sous `@acme/stock/check_stock` et `@acme/stock/reserve_stock`.

### Installer un plugin serveur

```ts
import { DomOSServer } from '@domos/server';
import { StockPlugin } from '@acme/stock';

const server = new DomOSServer({ /* options */ });

// installPlugin retourne une fonction de desinstallation
const uninstallStock = server.installPlugin(StockPlugin, {
  dbUrl: process.env.DATABASE_URL!,
});

// pour retirer les tools plus tard (feature flag, hot-reload, etc.)
uninstallStock();
```

### Ce que `ServerPluginContext` expose

| Methode | Description |
|---------|-------------|
| `registerTool(name, handler)` | Enregistre un tool serveur (prefixe auto) |
| `uninstall()` | Retire tous les tools enregistres par ce plugin |

Le plugin ne peut **pas** acceder aux sessions actives, aux connexions WebSocket, ni appeler `server.stop()`. La surface est volontairement reduite.

---

## Differences entre les deux types

| | Plugin client | Plugin serveur |
|--|---------------|----------------|
| Package | `@domos/core` | `@domos/server` |
| Interface | `DomOSClientPlugin<C>` | `DomOSServerPlugin<C>` |
| Contexte | `PluginClientContext` | `ServerPluginContext` |
| Installation | `DomOS.installPlugin()` / prop `plugins` | `server.installPlugin()` |
| Execution du handler | Navigateur de l'utilisateur | Processus Node.js du serveur |
| Acces aux ressources | Fetch public, localStorage, DOM | BDD, API internes, secrets |
| Shadow Context | Oui (`updateContext`) | Non |

Les deux systemes partagent les memes regles : namespace `@scope/name` obligatoire, collision detectee au moment de l'enregistrement, desinstallation isolee.

---

## Regles de namespace

Le nom du plugin doit respecter le format `@scope/name` en minuscules :

```
@domos/shopify      ✅
@acme/crm           ✅
@domos-plugins/stock ✅
shopify             ❌  (pas de @scope)
@Domos/Stock        ❌  (majuscules interdites)
@domos/my plugin    ❌  (espace interdit)
```

Si le format est invalide, `installPlugin` leve une erreur immediate avant meme d'appeler `setup`.

---

## Distribuer un plugin comme package npm

Un plugin est un objet TypeScript ordinaire. Il suffit de l'exporter depuis un package npm :

```
packages/
└── mon-plugin/
    ├── package.json   ("name": "@acme/mon-plugin")
    └── src/
        └── index.ts   (export const MonPlugin: DomOSClientPlugin<...> = { … })
```

L'utilisateur installe le package et passe le plugin a `installPlugin`. Aucune dependance sur les internals de DomOS — seulement les types `DomOSClientPlugin` ou `DomOSServerPlugin`.

Pour les plugins officiels de la communaute, le dossier `plugins/` a la racine du monorepo est la reference :

```
domos/
├── packages/      # SDK
├── apps/          # Demos
└── plugins/
    └── demo-crm/  # @domos-plugins/demo-crm
```
