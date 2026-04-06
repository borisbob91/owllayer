# Feature #05 — DomOS Client Plugin System

## User Story

> As a third-party developer, I want to package DomOS tools into a reusable npm module so I can share a complete integration (Shopify, CRM, Analytics…) with the community without exposing SDK internals.

---

## Motivation

Before Feature #05, adding tools to DomOS required direct access to the `DomOS` singleton or `DomOSClient`.
`DomOSShopify.init()` manually calls 6 `registerXxxTools(DomOS)` functions — no isolation, no namespace, no structured cleanup.

Result: store tools end up mixed with application tools under flat names (`add_to_cart`, `search_products`…) that can collide with other integrations.

Feature #05 formalises this pattern into a stable `DomOSClientPlugin<C>` interface.

---

## Framework Surfaces

DomOS has **four distinct UI layers**, each wrapping `DomOSClient` differently.
The plugin system must be accessible from all of them.

| Package | Entry point | How it wraps `DomOSClient` |
|---------|-------------|---------------------------|
| `@domos/browser` | `BrowserDomOS` singleton (`DomOS`) | Class singleton, imperative API |
| `@domos/react` | `<DomOSProvider>` component | React context, `clientRef.current` |
| `@domos/vue` | `app.use(DomOSPlugin, options)` | Vue plugin, `provide(DOMOS_CLIENT_KEY, client)` |
| `@domos/svelte` | `initDomOS(options)` function | Svelte writable store, `domosClient` |

`installPlugin()` lives in `@domos/core` and takes a raw `DomOSClient`.
Each framework layer just needs to call it with its own client instance.

---

## Core Design

### `DomOSClientPlugin<C>` interface

```ts
// packages/core/src/plugins/plugin.types.ts
export interface DomOSClientPlugin<C = void> {
  meta: {
    name: string;      // Required format: @scope/name  (e.g. '@domos/shopify', '@acme/crm')
    version: string;
    description?: string;
  };
  setup(ctx: PluginClientContext, config: C): void | Promise<void>;
}
```

- `C` is the typed config passed at install time.
- `setup()` is the only entry point — everything must go through `ctx`.

### `PluginClientContext` — restricted surface

```ts
export interface PluginClientContext {
  registerTool(name: string, definition: PluginToolDefinition): void;
  updateContext(ctx: Record<string, unknown>): void;
  getContext(): Record<string, unknown>;
  uninstall(): void;
}
```

**What `PluginClientContext` intentionally cannot do:**
- Call `client.connect()` / `client.disconnect()`
- Access agent memory (`DomosAgent`)
- Send raw WebSocket messages
- Register global tools (tools are scoped to the plugin lifetime)

**Tool name auto-prefixing:**
`ctx.registerTool('add_to_cart', def)` → registered as `@domos/shopify/add_to_cart`
- Collision with another plugin → explicit error thrown
- `uninstall()` removes only this plugin's tools (uses `componentId = pluginName`)

### `installPlugin(client, plugin, config)` — core function

```ts
// packages/core/src/plugins/installPlugin.ts
export function installPlugin<C>(
  client: DomOSClient,
  plugin: DomOSClientPlugin<C>,
  config: C
): void
```

Internals:
1. `assertNamespace(plugin.meta.name)` → validates `@scope/name` format
2. `createPluginContext(client, plugin.meta.name)` → isolated wrapper
3. `plugin.setup(ctx, config)` → sync or async (async errors are logged, non-blocking)

### Namespace validation (`assertNamespace`)

Required format: `^@[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$`

```ts
assertNamespace('@domos/shopify')   // ✅
assertNamespace('@acme/crm')        // ✅
assertNamespace('shopify')          // ❌ throws
assertNamespace('@domos/My-Plugin') // ❌ throws (uppercase not allowed)
```

---

## Usage Patterns — All Frameworks

### Browser (vanilla / Shopify theme.liquid)

```ts
import { DomOS } from '@domos/browser';
import { DemoCRMPlugin } from '@domos-plugins/demo-crm';

await DomOS.init({ apiKey: 'pk_...', endpoint: 'wss://...' });

// 'installPlugin' is a method on BrowserDomOS, delegates to core installPlugin()
DomOS.installPlugin(DemoCRMPlugin, { apiUrl: 'https://crm.acme.com', tenantId: 'acme' });
```

### React — `<DomOSProvider plugins={[...]}/>`

```tsx
import { DomOSProvider } from '@domos/react';
import { DemoCRMPlugin } from '@domos-plugins/demo-crm';

<DomOSProvider
  apiKey="pk_live_..."
  endpoint="wss://..."
  plugins={[
    [DemoCRMPlugin, { apiUrl: 'https://crm.acme.com', tenantId: 'acme' }],
  ]}
>
  <App />
</DomOSProvider>
```

`DomOSProvider` calls `installPlugin(client, plugin, config)` after the client is created, before `autoConnect`.

### Vue — `app.use(DomOSPlugin, { plugins: [...] })`

```ts
import { createApp } from 'vue';
import { DomOSPlugin } from '@domos/vue';
import { DemoCRMPlugin } from '@domos-plugins/demo-crm';

app.use(DomOSPlugin, {
  endpoint: 'wss://...',
  apiKey: 'pk_...',
  plugins: [
    [DemoCRMPlugin, { apiUrl: 'https://crm.acme.com', tenantId: 'acme' }],
  ],
});
```

`DomOSPlugin.install()` calls `installPlugin()` after creating the client.

### Svelte — `initDomOS({ plugins: [...] })`

```ts
import { initDomOS } from '@domos/svelte';
import { DemoCRMPlugin } from '@domos-plugins/demo-crm';

initDomOS({
  endpoint: 'wss://...',
  apiKey: 'pk_...',
  plugins: [
    [DemoCRMPlugin, { apiUrl: 'https://crm.acme.com', tenantId: 'acme' }],
  ],
});
```

`initDomOS()` calls `installPlugin()` after creating the client.

### Plugin author (npm package)

```ts
// @domos-plugins/demo-crm/src/index.ts
import type { DomOSClientPlugin } from '@domos/core';

export interface DemoCRMConfig {
  apiUrl: string;
  tenantId: string;
}

export const DemoCRMPlugin: DomOSClientPlugin<DemoCRMConfig> = {
  meta: { name: '@domos-plugins/demo-crm', version: '1.0.0', description: 'Demo CRM plugin for DomOS' },

  setup(ctx, config) {
    ctx.updateContext({ crm: { tenantId: config.tenantId } });

    ctx.registerTool('search_contacts', {
      description: 'Search contacts in the CRM by keyword.',
      parameters: {
        type: 'OBJECT',
        properties: {
          query: { type: 'STRING', description: 'Search keyword' },
        },
        required: ['query'],
      },
      risk: 'none',
      handler: async ({ query }) => {
        const res = await fetch(`${config.apiUrl}/contacts?q=${encodeURIComponent(String(query))}`);
        if (!res.ok) return { error: `CRM request failed: ${res.status}` };
        return res.json();
      },
    });

    ctx.registerTool('get_contact', {
      description: 'Get a single contact by ID.',
      parameters: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING', description: 'Contact ID' },
        },
        required: ['id'],
      },
      risk: 'none',
      handler: async ({ id }) => {
        const res = await fetch(`${config.apiUrl}/contacts/${encodeURIComponent(String(id))}`);
        if (!res.ok) return { error: `Contact not found: ${res.status}` };
        return res.json();
      },
    });
  },
};
```

Registered tool names: `@domos-plugins/demo-crm/search_contacts`, `@domos-plugins/demo-crm/get_contact`

---

## Repository Structure

Official plugins live in `plugins/` at the monorepo root — outside `packages/` (SDK) and `apps/` (demos).

```
domos/
├── packages/          # SDK — @domos/core, @domos/browser, @domos/react, etc.
├── apps/
│   └── demo-plugin/   # Demo app that installs and tests plugins
└── plugins/
    └── demo-crm/      # @domos-plugins/demo-crm — reference plugin implementation
```

`pnpm-workspace.yaml` must include `"plugins/*"` to resolve workspace deps.

---

## Files to Create / Modify

| File | Action | Notes |
|------|--------|-------|
| `packages/core/src/plugins/plugin.types.ts` | **Create** | `DomOSClientPlugin`, `PluginClientContext`, `PluginToolDefinition`, `PluginEntry` |
| `packages/core/src/plugins/installPlugin.ts` | **Create** | `installPlugin()`, `assertNamespace()`, `createPluginContext()` |
| `packages/core/src/client/DomOSClient.ts` | **Modify** | Add `getContext(): Record<string, unknown>` |
| `packages/core/src/index.ts` | **Modify** | Export `plugins/` types and functions |
| `packages/browser/src/runtime/BrowserDomOS.ts` | **Modify** | Add `installPlugin(plugin, config)` method |
| `packages/react/src/provider/DomOSProvider.tsx` | **Modify** | Add `plugins?: PluginEntry[]` prop, call `installPlugin` after client creation |
| `packages/vue/src/plugin/DomOSPlugin.ts` | **Modify** | Add `plugins?: PluginEntry[]` to `DomOSPluginOptions`, call `installPlugin` in `install()` |
| `packages/svelte/src/stores/domos.store.ts` | **Modify** | Add `plugins?: PluginEntry[]` to `DomOSInitOptions`, call `installPlugin` in `initDomOS()` |
| `plugins/demo-crm/src/index.ts` | **Create** | `DemoCRMPlugin` reference implementation |
| `plugins/demo-crm/package.json` | **Create** | `@domos-plugins/demo-crm` |
| `apps/demo-plugin/` | **Create** | Demo app (React) that installs `DemoCRMPlugin` and validates behavior |
| `pnpm-workspace.yaml` | **Modify** | Add `"plugins/*"` |

**NOT touched in this feature:**
- `packages/shopify/` — frozen until Feature #05 is stable
- `packages/woocommerce/` — frozen until Feature #05 is stable

---

## Acceptance Criteria

1. `pnpm build` passes in all packages including `plugins/demo-crm`
2. `installPlugin(client, { meta: { name: 'bad-name' }, ... }, {})` → throws with a clear message
3. Two plugins registering the same tool name → throws naming the conflicting tool
4. Browser: `DomOS.installPlugin(DemoCRMPlugin, config)` → tools `@domos-plugins/demo-crm/*` are registered on the client
5. React: `<DomOSProvider plugins={[[DemoCRMPlugin, config]]} />` → same tools registered at mount
6. Vue: `app.use(DomOSPlugin, { plugins: [[DemoCRMPlugin, config]] })` → same
7. Svelte: `initDomOS({ plugins: [[DemoCRMPlugin, config]] })` → same
8. `ctx.uninstall()` removes all tools registered by that plugin and no others
9. `apps/demo-plugin` connects, calls a CRM tool, receives a mocked response

---

## Security Notes

- Plugins cannot call `client.connect()` — not exposed via `PluginClientContext`
- Plugins cannot read agent memory or HITL state
- `@scope/name` namespace is mandatory — prevents silent npm package name collisions
- Auto-prefixing guarantees two plugins can never silently overwrite each other's tools
