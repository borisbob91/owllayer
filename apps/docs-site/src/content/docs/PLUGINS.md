---
title: "Plugins OwlLayer"
description: Documentation OwlLayer.
---

# Plugins OwlLayer

OwlLayer propose deux systèmes de plugins complémentaires : un pour le **client** et un pour le **serveur**.

- Le **plugin client** s’exécute dans le navigateur, au plus près de l’interface et de l’état visible par l’utilisateur.
- Le **plugin serveur** s’exécute dans Node.js, au plus près des données métier, des API internes et des secrets d’infrastructure.

Dans les deux cas, l’objectif est le même : **étendre les capacités de OwlLayer de façon propre, réutilisable et distribuable**.

Un plugin permet de regrouper une intégration complète dans un objet autonome, versionné, installable et désinstallable. C’est la bonne abstraction pour publier des outils métiers réutilisables, comme une intégration CRM, Shopify, analytics, monitoring, stock, facturation, support, ou toute autre capacité spécialisée.

Ce document présente les deux types de plugins, leurs atouts, leurs différences, ainsi que les règles à respecter pour les publier comme packages npm.

---

## Pourquoi des plugins ?

Les plugins ne sont pas là pour “corriger un problème”, mais pour **structurer l’extension de OwlLayer** quand une application commence à agréger plusieurs capacités métier.

Ils apportent plusieurs avantages concrets :

- **Réutilisation** : une même intégration peut être partagée entre plusieurs applications ou clients.
- **Lisibilité** : chaque capacité est regroupée dans un module identifié, avec son nom, sa version et son point d’entrée.
- **Isolation** : les tools client et handlers serveur sont préfixés pour rendre les collisions visibles.
- **Distribution** : un plugin peut être publié comme package npm et réinstallé ailleurs sans recoder l’intégration.
- **Cycle de vie clair** : l’installation et la désinstallation sont explicites.
- **Montée en charge fonctionnelle** : plus OwlLayer gagne des capacités, plus le découpage en plugins devient utile pour garder une architecture compréhensible.

Autrement dit, le système de plugins transforme OwlLayer en **plateforme extensible** plutôt qu’en simple point d’enregistrement de tools.

Un plugin est un objet TypeScript ordinaire avec deux éléments principaux :

- `meta` : son identité (`name`, `version`, éventuellement `description`)
- `setup` : la fonction qui enregistre ses tools via un contexte contrôlé

Le plugin ne manipule pas directement les internals complets de OwlLayer. Il passe toujours par une surface restreinte, pensée pour l’extension.

---

## Plugin client (`OwlLayerClientPlugin`)

Un plugin client enregistre des tools qui s’exécutent **dans le navigateur**, côté utilisateur. Il vit dans `@owllayer/core` et fonctionne dans tous les environnements front supportés par OwlLayer : navigateur vanilla, React, Vue et Svelte.

Le plugin client est particulièrement adapté quand la capacité à ajouter dépend de l’interface ou de l’environnement front : DOM, état visuel, stockage local, fetch vers des API publiques, lecture d’un panier affiché à l’écran, interaction avec une page e-commerce, etc.

### Structure d’un plugin client

```ts
import type { OwlLayerClientPlugin } from '@owllayer/core';

export interface MyCRMConfig {
  apiUrl: string;
  tenantId: string;
}

export const MyCRMPlugin: OwlLayerClientPlugin<MyCRMConfig> = {
  meta: {
    name: '@acme/crm',
    version: '1.0.0',
    description: 'Intégration CRM pour OwlLayer',
  },

  setup(ctx, config) {
    // Le Shadow Context permet au LLM de connaître l’état utile
    // de l’intégration sans appeler un tool.
    ctx.updateContext({ crm: { tenantId: config.tenantId } });

    ctx.registerTool('search_contacts', {
      description: 'Rechercher des contacts dans le CRM par mot-clé.',
      parameters: {
        type: 'OBJECT',
        properties: {
          query: { type: 'STRING', description: 'Mot-clé de recherche' },
          limit: { type: 'NUMBER', description: 'Nombre maximum de résultats (défaut 10)' },
        },
        required: ['query'],
      },
      risk: 'none',
      handler: async ({ query, limit }) => {
        const url = `${config.apiUrl}/contacts?q=${encodeURIComponent(String(query))}&limit=${limit ?? 10}`;
        const res = await fetch(url, {
          headers: { 'X-Tenant': config.tenantId },
        });
        if (!res.ok) return { error: `Erreur CRM : ${res.status}` };
        return res.json();
      },
    });

    ctx.registerTool('create_contact', {
      description: 'Créer un nouveau contact dans le CRM.',
      parameters: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: 'Nom complet du contact' },
          email: { type: 'STRING', description: 'Adresse e-mail' },
          phone: { type: 'STRING', description: 'Numéro de téléphone (optionnel)' },
        },
        required: ['name', 'email'],
      },
      risk: 'low',
      handler: async ({ name, email, phone }) => {
        const res = await fetch(`${config.apiUrl}/contacts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Tenant': config.tenantId },
          body: JSON.stringify({ name, email, phone }),
        });
        if (!res.ok) return { error: `Création échouée : ${res.status}` };
        return res.json();
      },
    });

    ctx.registerTool('delete_contact', {
      description: 'Supprimer définitivement un contact.',
      parameters: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING', description: 'Identifiant du contact à supprimer' },
        },
        required: ['id'],
      },
      risk: 'high',
      handler: async ({ id }) => {
        const res = await fetch(`${config.apiUrl}/contacts/${encodeURIComponent(String(id))}`, {
          method: 'DELETE',
          headers: { 'X-Tenant': config.tenantId },
        });
        if (!res.ok) return { error: `Suppression échouée : ${res.status}` };
        return { deleted: true };
      },
    });
  },
};
```

Les tools seront enregistrés sous `@acme/crm/search_contacts`, `@acme/crm/create_contact` et `@acme/crm/delete_contact`.

Cette convention apporte immédiatement deux bénéfices :

- le nom complet du tool reste explicite pour le LLM et pour le développeur,
- deux plugins différents peuvent avoir un tool logique de même nom sans ambiguïté, dès lors que leur namespace diffère.

### Le champ `risk` côté client

Le plugin client s’intègre au système HITL de OwlLayer.

- `none` : exécution silencieuse
- `low` : exécution avec notification utilisateur
- `high` : exécution bloquée jusqu’à approbation explicite

Le niveau de risque n’est pas décoratif. Il exprime l’impact attendu de l’action dans l’interface ou dans le parcours utilisateur.

### Le Shadow Context côté client

`ctx.updateContext(data)` enrichit le contexte que OwlLayer injecte au LLM. Ce mécanisme permet de donner au modèle une vision structurée de l’état utile de l’intégration sans multiplier les appels de tools.

Exemple : si un plugin CRM injecte `{ crm: { tenantId: 'acme' } }`, le LLM peut raisonner avec cette information dans ses réponses ou ses choix d’action.

`ctx.getContext()` permet de relire cet état courant. C’est utile pour coordonner plusieurs capacités ou pour lire une information déposée plus tôt dans le cycle de vie du plugin.

### Installer un plugin client

L’installation suit le même principe partout : on fournit le plugin et sa configuration.

**Browser (vanilla / thème Shopify)**

```ts
import { OwlLayer } from '@owllayer/browser';
import { MyCRMPlugin } from '@acme/crm';

await OwlLayer.init({ apiKey: 'pk_...', endpoint: 'wss://...' });

OwlLayer.installPlugin(MyCRMPlugin, {
  apiUrl: 'https://crm.acme.com',
  tenantId: 'acme',
});
```

**React**

```tsx
import { OwlLayerProvider } from '@owllayer/react';
import { MyCRMPlugin } from '@acme/crm';

<OwlLayerProvider
  apiKey="pk_live_..."
  endpoint="wss://..."
  plugins={[
    [MyCRMPlugin, { apiUrl: 'https://crm.acme.com', tenantId: 'acme' }],
    [AnalyticsPlugin, { trackingId: 'UA-...' }],
  ]}
>
  <App />
</OwlLayerProvider>
```

**Vue**

```ts
import { createApp } from 'vue';
import { OwlLayerPlugin } from '@owllayer/vue';
import { MyCRMPlugin } from '@acme/crm';

const app = createApp(App);

app.use(OwlLayerPlugin, {
  endpoint: 'wss://...',
  apiKey: 'pk_...',
  plugins: [
    [MyCRMPlugin, { apiUrl: 'https://crm.acme.com', tenantId: 'acme' }],
  ],
});

app.mount('#app');
```

**Svelte**

```ts
import { initOwlLayer } from '@owllayer/svelte';
import { MyCRMPlugin } from '@acme/crm';

initOwlLayer({
  endpoint: 'wss://...',
  apiKey: 'pk_...',
  plugins: [
    [MyCRMPlugin, { apiUrl: 'https://crm.acme.com', tenantId: 'acme' }],
  ],
});
```

### Surface de `PluginClientContext`

Le contexte fourni au plugin client expose uniquement ce qui est utile à l’extension :

| Méthode | Rôle |
|---------|------|
| `registerTool(name, definition)` | Enregistre un tool sous `pluginName/name` et l’associe au plugin courant. |
| `updateContext(ctx)` | Met à jour le Shadow Context visible par le LLM. |
| `getContext()` | Lit le Shadow Context courant. |
| `uninstall()` | Retire les tools enregistrés par ce plugin. |

Cette surface volontairement réduite protège l’intégrité du runtime. Le plugin n’a pas besoin de piloter toute l’infrastructure OwlLayer pour ajouter une capacité utile.

---

## Plugin serveur (`OwlLayerServerPlugin`)

Un plugin serveur enregistre des handlers qui s’exécutent **dans le processus Node.js** de OwlLayer. Ici, le traitement reste côté backend du début à la fin. Il est donc adapté aux systèmes métier : base de données, API privées, ERP, stock, facturation, support, monitoring ou workflows internes.

Le plugin serveur est la bonne abstraction quand la valeur métier se trouve dans le backend plutôt que dans l’interface.

:::caution[Visibilité auprès du modèle]
Dans le runtime actuel, un plugin serveur ajoute des handlers au `ToolRouter`. Les déclarations de tools transmises au LLM proviennent du contexte de la session, synchronisé par le frontend. Installer un plugin serveur ne suffit donc pas à annoncer automatiquement ses handlers au modèle.
:::

### Structure d’un plugin serveur

La structure reste très proche du plugin client : une identité, puis un `setup` qui enregistre des tools via un contexte dédié.

```ts
import type { OwlLayerServerPlugin } from '@owllayer/server';

export interface StockConfig {
  dbUrl: string;
  warehouseId: string;
}

export const StockPlugin: OwlLayerServerPlugin<StockConfig> = {
  meta: {
    name: '@acme/stock',
    version: '1.0.0',
    description: 'Gestion des stocks en temps réel depuis la BDD interne.',
  },

  setup(ctx, config) {
    ctx.registerTool('check_stock', async ({ productId }) => {
      const rows = await db.query(
        config.dbUrl,
        'SELECT qty FROM stock WHERE product_id = ? AND warehouse_id = ?',
        [String(productId), config.warehouseId],
      );

      if (rows.length === 0) return { available: 0, found: false };
      return { available: rows[0].qty, found: true };
    });

    ctx.registerTool('reserve_stock', async ({ productId, qty, orderId }) => {
      const reserved = await db.transaction(config.dbUrl, async (trx) => {
        const current = await trx.query('SELECT qty FROM stock WHERE product_id = ?', [productId]);
        if (!current[0] || current[0].qty < Number(qty)) {
          return { ok: false, reason: 'stock insuffisant' };
        }

        await trx.exec('UPDATE stock SET qty = qty - ? WHERE product_id = ?', [qty, productId]);
        await trx.exec(
          'INSERT INTO reservations (order_id, product_id, qty) VALUES (?, ?, ?)',
          [orderId, productId, qty],
        );

        return { ok: true };
      });

      return reserved;
    });

    ctx.registerTool('release_reservation', async ({ orderId }) => {
      await db.exec(config.dbUrl, 'DELETE FROM reservations WHERE order_id = ?', [orderId]);
      return { released: true };
    });
  },
};
```

Les handlers seront enregistrés sous `stock_check_stock`, `stock_reserve_stock` et `stock_release_reservation`. L'implémentation serveur construit ce préfixe à partir de la partie `stock` du namespace `@acme/stock`.

### Installer un plugin serveur

```ts
import { OwlLayerServer } from '@owllayer/server';
import { StockPlugin } from '@acme/stock';

const server = new OwlLayerServer({
  llm: myLLMAdapter,
  transport: 'websocket',
});

const uninstallStock = server.installPlugin(StockPlugin, {
  dbUrl: process.env.DATABASE_URL!,
  warehouseId: process.env.WAREHOUSE_ID!,
});

server.listen();

// Plus tard si besoin
uninstallStock();
```

`server.installPlugin()` retourne directement une fonction `() => void`. C’est pratique pour des activations conditionnelles, des tests, du multi-tenant ou du rechargement contrôlé.

### Setup asynchrone

Le `setup` d’un plugin serveur peut être asynchrone. C’est utile si le plugin doit vérifier une connexion, charger une configuration distante ou initialiser une ressource avant d’enregistrer ses tools.

```ts
setup: async (ctx, config) => {
  await db.ping(config.dbUrl);

  ctx.registerTool('check_stock', async ({ productId }) => {
    return { productId };
  });
},
```

Si un `setup` asynchrone échoue, l’erreur est journalisée. Pour un plugin optionnel, c’est souvent suffisant. Pour un plugin critique, il est recommandé de gérer explicitement ce cas dans `setup`.

### Surface de `ServerPluginContext`

Le contexte serveur est volontairement minimal :

| Méthode | Rôle |
|---------|------|
| `registerTool(name, handler)` | Enregistre un handler avec le préfixe court du plugin, par exemple `stock_check_stock`. |
| `uninstall()` | Retire les tools du plugin courant. |

Le plugin serveur ne reçoit pas un accès illimité au runtime. Il n’a pas vocation à piloter le transport, les sessions ou l’adaptateur LLM. Son rôle est d’ajouter des **capacités serveur** bien délimitées.

---

## Choisir entre plugin client et plugin serveur

La bonne question n’est pas “quel type est meilleur ?”, mais **où la capacité doit vivre**.

### Utiliser un plugin client quand

- le tool dépend du DOM ou de l’état visible dans l’interface,
- le résultat dépend du contexte navigateur,
- l’intégration interagit avec un widget, un thème ou une page front,
- l’appel réseau peut être fait depuis le navigateur sans exposer de secret,
- le Shadow Context côté client apporte de la valeur au LLM.

### Utiliser un plugin serveur quand

- le tool a besoin d’un secret ou d’un accès backend,
- la capacité repose sur une base de données ou une API interne,
- l’intégration doit rester centralisée côté infrastructure,
- la logique métier ne doit pas dépendre du navigateur,
- la capacité doit être partagée uniformément entre plusieurs clients.

Dans une vraie application, il est fréquent d’avoir les deux. Une intégration e-commerce peut, par exemple, utiliser :

- un plugin client pour lire l’état du panier visible et interagir avec la page,
- un plugin serveur pour vérifier le stock, réserver des articles ou créer une commande.

---

## Différences entre les deux types

| | Plugin client | Plugin serveur |
|--|---------------|----------------|
| Package source | `@owllayer/core` | `@owllayer/server` |
| Interface | `OwlLayerClientPlugin<C>` | `OwlLayerServerPlugin<C>` |
| Contexte fourni à `setup` | `PluginClientContext` | `ServerPluginContext` |
| Point d’installation | `OwlLayer.installPlugin()` ou prop `plugins` | `server.installPlugin()` |
| Lieu d’exécution du handler | Navigateur | Node.js |
| Ressources typiques | DOM, fetch public, localStorage, état UI | BDD, API internes, secrets `.env`, filesystem |
| Shadow Context | Oui | Non |
| HITL / `risk` | Porté par la déclaration client | Les handlers seuls ne déclarent pas de risque |
| Retour d’installation | `void` | `() => void` |
| Setup asynchrone | Oui | Oui |

Les deux systèmes partagent les mêmes fondations :

- namespace `@scope/name` obligatoire,
- préfixage automatique des handlers selon le runtime concerné,
- détection explicite des collisions,
- désinstallation ciblée,
- packaging naturel en npm.

---

## Collisions et validation

L’un des grands apports du système est de rendre les enregistrements explicites et sûrs.

Quand un plugin enregistre un tool, OwlLayer compose automatiquement son nom complet. Par exemple :

- plugin : `@acme/stock`
- handler déclaré : `check_stock`
- handler enregistré : `stock_check_stock`

Si un autre plugin tente d’enregistrer exactement le même nom complet, OwlLayer lève une erreur immédiate. C’est une protection utile, car une collision silencieuse serait beaucoup plus difficile à diagnostiquer.

De la même manière, si le nom du plugin ne respecte pas le format `@scope/name`, l’installation échoue avant l’exécution du `setup`.

Pour les plugins serveur, le préfixe effectif utilise la partie située après `/`. Ainsi, `@acme/stock` et `@another/stock` produiraient tous deux le préfixe `stock_` : choisissez des noms courts distincts lorsque ces plugins peuvent être installés ensemble.

---

## Règles de namespace

Le nom du plugin doit respecter le format `@scope/name`.

Les deux segments doivent :

- être en minuscules,
- commencer par une lettre ou un chiffre,
- contenir uniquement des lettres, chiffres et tirets.

Exemples valides :

```txt
@owllayer/shopify
@acme/crm
@owllayer-plugins/stock
@my-org/my-tool
```

Exemples invalides :

```txt
shopify
@OwlLayer/Stock
@owllayer/my plugin
@owllayer/
@/crm
```

Cette convention aligne les plugins OwlLayer sur les conventions npm des packages scopés, ce qui simplifie leur publication et leur identification.

---

## Tester un plugin

Un plugin se teste facilement parce qu’il reste un objet TypeScript simple. Dans un test unitaire, il suffit généralement de fournir un faux contexte.

### Exemple de test pour un plugin client

```ts
import { describe, it, expect, vi } from 'vitest';
import { MyCRMPlugin } from './index.js';

describe('MyCRMPlugin', () => {
  it('enregistre les tools attendus', () => {
    const registeredTools: string[] = [];

    const fakeCtx = {
      registerTool: (name: string) => registeredTools.push(name),
      updateContext: vi.fn(),
      getContext: vi.fn(() => ({})),
      uninstall: vi.fn(),
    };

    MyCRMPlugin.setup(fakeCtx as never, {
      apiUrl: 'https://crm.test',
      tenantId: 'test',
    });

    expect(registeredTools).toContain('search_contacts');
    expect(registeredTools).toContain('create_contact');
    expect(registeredTools).toContain('delete_contact');
  });
});
```

### Exemple de test pour un plugin serveur

```ts
import { describe, it, expect, vi } from 'vitest';
import { StockPlugin } from './index.js';

describe('StockPlugin', () => {
  it('enregistre les tools avec les bons handlers', () => {
    const tools = new Map<string, Function>();

    const fakeCtx = {
      registerTool: (name: string, handler: Function) => tools.set(name, handler),
      uninstall: vi.fn(),
    };

    StockPlugin.setup(fakeCtx as never, {
      dbUrl: 'sqlite::memory:',
      warehouseId: 'W1',
    });

    expect(tools.has('check_stock')).toBe(true);
    expect(tools.has('reserve_stock')).toBe(true);
  });
});
```

Pour tester le runtime d’installation lui-même, `@owllayer/server` expose aussi `installServerPlugin` directement.

---

## Distribuer un plugin comme package npm

Un plugin OwlLayer est naturellement fait pour être distribué comme package npm.

Il importe uniquement les types nécessaires depuis `@owllayer/core` ou `@owllayer/server`. En pratique, cela se traduit généralement par une `peerDependency` côté package plugin.

### Structure recommandée

```txt
mon-plugin/
├── package.json
├── tsconfig.json
└── src/
    └── index.ts
```

### Exemple de `package.json`

```json
{
  "name": "@acme/mon-plugin",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "peerDependencies": {
    "@owllayer/core": ">=0.4.0"
  },
  "devDependencies": {
    "@owllayer/core": "^0.4.0",
    "typescript": "^5.0.0"
  }
}
```

Pour un plugin serveur, remplacer `@owllayer/core` par `@owllayer/server`.

### Exemple de point d’entrée

```ts
import type { OwlLayerClientPlugin } from '@owllayer/core';

export interface MonPluginConfig {
  apiUrl: string;
}

export const MonPlugin: OwlLayerClientPlugin<MonPluginConfig> = {
  meta: { name: '@acme/mon-plugin', version: '1.0.0' },
  setup(ctx, config) {
    ctx.registerTool('my_tool', {
      description: 'Fait quelque chose.',
      parameters: { type: 'OBJECT', properties: {}, required: [] },
      risk: 'none',
      handler: async () => ({ ok: true }),
    });
  },
};
```

L’utilisateur installe ensuite le package et le transmet directement à OwlLayer.

### Plugins officiels dans le monorepo

Dans le monorepo OwlLayer, les plugins officiels ont vocation à vivre dans `plugins/`, à la racine, à côté du SDK et des apps de démonstration :

```txt
owllayer/
├── packages/          # SDK — @owllayer/core, @owllayer/server, @owllayer/react, etc.
├── apps/              # Applications de démonstration
└── plugins/
    └── demo-crm/      # @owllayer-plugins/demo-crm
```

Ce découpage garde une séparation nette entre :

- le cœur du framework,
- les applications d’exemple,
- les capacités distribuables sous forme de plugins.
