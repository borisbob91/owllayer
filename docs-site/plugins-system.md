# Plugins System

OwlLayer features an extensible plugin architecture, allowing developers to pack, publish, and share reusable AI functionalities. Plugins can run on the **client-side** (browser runtime) or **server-side** (OwlLayer Server on Node.js).

---

## 1. Client-Side Plugins (`OwlLayerClientPlugin`)

Client-side plugins are designed to interact with browser APIs, DOM elements, cookies, local storage, or front-end states.

### Plugin Definition Structure
A client plugin is a TypeScript object defining:
- `meta`: Package name, version, and details.
- `setup`: Execution logic registering tools and context configurations.

```typescript
import type { OwlLayerClientPlugin } from '@owllayer/core';

export interface WeatherPluginConfig {
  defaultCity: string;
}

export const WeatherPlugin: OwlLayerClientPlugin<WeatherPluginConfig> = {
  meta: {
    name: '@acme/weather',
    version: '1.0.0',
    description: 'Fetch current weather details for the user location'
  },

  setup(ctx, config) {
    // Inject passive state coordinates
    ctx.updateContext({ weather: { defaultCity: config.defaultCity } });

    // Register tools under plugin namespace: '@acme/weather/get_temperature'
    ctx.registerTool('get_temperature', {
      description: 'Fetch temperature for a specific city location',
      parameters: {
        type: 'OBJECT',
        properties: {
          city: { type: 'STRING', description: 'Name of the city' }
        },
        required: ['city']
      },
      risk: 'none',
      handler: async ({ city }) => {
        const queryCity = String(city || config.defaultCity);
        const data = await fetch(`https://api.weather.com/v1?q=${queryCity}`).then(r => r.json());
        return { city: queryCity, temp: data.temp, conditions: data.text };
      }
    });
  }
};
```

### Namespace Resolution Rules
When a plugin registers a tool (e.g., `get_temperature`), the client engine prefixes the tool identifier with the plugin's metadata name to avoid collisions:

```
Tool declaration name: 'get_temperature'
Resolved identifier exposed to LLM: '@acme/weather/get_temperature'
```

---

## 2. Installing Client Plugins

### Vanilla Browser
Pass the plugin class and configuration objects to the init lifecycle:
```js
import { OwlLayer } from '@owllayer/browser';
import { WeatherPlugin } from '@acme/weather';

await OwlLayer.init({ apiKey: 'pk_live_xxxx' });

OwlLayer.installPlugin(WeatherPlugin, { defaultCity: 'Paris' });
```

### React SDK
```tsx
import { OwlLayerProvider } from '@owllayer/react';
import { WeatherPlugin } from '@acme/weather';

<OwlLayerProvider
  apiKey="pk_live_xxxx"
  endpoint="wss://api.owllayer.dev/owllayer"
  plugins={[
    [WeatherPlugin, { defaultCity: 'Paris' }]
  ]}
>
  <YourApp />
</OwlLayerProvider>
```

### Vue 3 SDK
```typescript
import { createApp } from 'vue';
import { OwlLayerPlugin } from '@owllayer/vue';
import { WeatherPlugin } from '@acme/weather';

const app = createApp(App);
app.use(OwlLayerPlugin, {
  apiKey: 'pk_live_xxxx',
  plugins: [
    [WeatherPlugin, { defaultCity: 'Paris' }]
  ]
});
```

---

## 3. Server-Side Plugins

Server-side plugins extend `OwlLayerServer` with server tools. The plugin name uses the `@scope/name` format; its tools are registered as `name_toolName`.

```typescript
import { OwlLayerServer, type OwlLayerServerPlugin } from '@owllayer/server';

export const AccountPlugin: OwlLayerServerPlugin<{ dbUrl: string }> = {
  meta: {
    name: '@acme/accounts',
    version: '1.0.0',
  },
  setup(ctx, config) {
    ctx.registerTool('query_account_balance', {
      description: 'Read the balance of an account',
      risk: 'none',
      parameters: { type: 'OBJECT', properties: { userId: { type: 'STRING' } }, required: ['userId'] },
    }, async ({ userId }) => {
      const balance = await db(config.dbUrl).queryBalance(userId);
      return { userId, balance };
    });
  },
};

// Install on server: returns an uninstall function
const server = new OwlLayerServer({ llm: adapter });
const uninstall = server.installPlugin(AccountPlugin, { dbUrl: process.env.DATABASE_URL! });
```

### Restricting and isolating a server plugin

The third argument of `installPlugin()` restricts who can use the plugin and how its handlers run:

```typescript
server.installPlugin(AccountPlugin, config, {
  apiKeys: ['pk_backoffice'],   // tools offered and executed only for these keys
  mode: 'untrusted',            // handlers run in a separate process
  capabilities: { env: { allowKeys: ['ACCOUNTS_API_URL'] } },
  timeoutMs: 5_000,
});
```

In `untrusted` mode, each tool call runs in a separate Node.js process started with the Node permission model. Effective capabilities are the intersection of what the author declares (`meta.capabilities`) and what the installer passes: the installer can restrict, never widen.

| Access | Default | To allow it |
|---|---|---|
| Files (read / write) | denied | `filesystem.readAllowPaths` / `writeAllowPaths` |
| Child processes | denied | `process.allowSpawn` (spawned processes are **not** confined) |
| Workers, native addons | denied | — |
| Environment variables | none | `env.allowKeys` |
| Network | **allowed** | not restricted yet (Node 22 has no network permission) |

Limits to know:
- The plugin module and its `setup()` run in the server process. Only install plugins whose package you trust or have reviewed.
- An `untrusted` handler must be self-contained: it is sent as source code and cannot use outer variables. Pass the data it needs through its arguments.
