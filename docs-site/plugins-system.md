# Plugins System

OwlLayer features an extensible plugin architecture, allowing developers to pack, publish, and share reusable AI functionalities. Plugins can run on the **client-side** (browser runtime) or **server-side** (OwlLayer Server on Node.js).

---

## 1. Client-Side Plugins (`DomOSClientPlugin`)

Client-side plugins are designed to interact with browser APIs, DOM elements, cookies, local storage, or front-end states.

### Plugin Definition Structure
A client plugin is a TypeScript object defining:
- `meta`: Package name, version, and details.
- `setup`: Execution logic registering tools and context configurations.

```typescript
import type { DomOSClientPlugin } from '@domos/core';

export interface WeatherPluginConfig {
  defaultCity: string;
}

export const WeatherPlugin: DomOSClientPlugin<WeatherPluginConfig> = {
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
import { DomOS } from '@domos/browser';
import { WeatherPlugin } from '@acme/weather';

await DomOS.init({ apiKey: 'pk_live_xxxx' });

DomOS.installPlugin(WeatherPlugin, { defaultCity: 'Paris' });
```

### React SDK
```tsx
import { DomOSProvider } from '@domos/react';
import { WeatherPlugin } from '@acme/weather';

<DomOSProvider
  apiKey="pk_live_xxxx"
  endpoint="wss://api.domos.dev/domos"
  plugins={[
    [WeatherPlugin, { defaultCity: 'Paris' }]
  ]}
>
  <YourApp />
</DomOSProvider>
```

### Vue 3 SDK
```typescript
import { createApp } from 'vue';
import { DomOSPlugin } from '@domos/vue';
import { WeatherPlugin } from '@acme/weather';

const app = createApp(App);
app.use(DomOSPlugin, {
  apiKey: 'pk_live_xxxx',
  plugins: [
    [WeatherPlugin, { defaultCity: 'Paris' }]
  ]
});
```

---

## 3. Server-Side Plugins

Server-side plugins extend `DomOSServer` sessions. They run in Node.js, providing access to file systems, databases, server caches, and protected environment secrets.

```typescript
import { DomOSServer, type DomOSServerPlugin } from '@domos/server';

export const DatabaseConnectorPlugin: DomOSServerPlugin = {
  meta: {
    name: 'db-connector',
    version: '1.0.0'
  },
  setup(server) {
    server.tool('query_account_balance', async ({ userId }) => {
      const balance = await db.queryBalance(userId);
      return { userId, balance };
    });
  }
};

// Install on server
const server = new DomOSServer({ llm: adapter });
server.installPlugin(DatabaseConnectorPlugin);
```
