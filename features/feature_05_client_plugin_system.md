# Feature #05 — OwlLayer Client Plugin System

## User Story

> As a third-party developer, I want to package OwlLayer tools into a reusable npm module so I can share a complete integration (Shopify, CRM, Analytics…) with the community without exposing SDK internals.

---

## Motivation

Before Feature #05, adding tools to OwlLayer required direct access to the `OwlLayer` singleton or `OwlLayerClient`.
`OwlLayerShopify.init()` manually calls 6 `registerXxxTools(OwlLayer)` functions — no isolation, no namespace, no structured cleanup.

Result: store tools end up mixed with application tools under flat names (`add_to_cart`, `search_products`…) that can collide with other integrations.

Feature #05 formalises this pattern into a stable `OwlLayerClientPlugin<C>` interface.

---

## Framework Surfaces

OwlLayer has **four distinct UI layers**, each wrapping `OwlLayerClient` differently.
The plugin system must be accessible from all of them.

| Package | Entry point | How it wraps `OwlLayerClient` |
|---------|-------------|---------------------------|
| `@owllayer/browser` | `BrowserOwlLayer` singleton (`OwlLayer`) | Class singleton, imperative API |
| `@owllayer/react` | `<OwlLayerProvider>` component | React context, `clientRef.current` |
| `@owllayer/vue` | `app.use(OwlLayerPlugin, options)` | Vue plugin, `provide(OWLLAYER_CLIENT_KEY, client)` |
| `@owllayer/svelte` | `initOwlLayer(options)` function | Svelte writable store, `owllayerClient` |

`installPlugin()` lives in `@owllayer/core` and takes a raw `OwlLayerClient`.
Each framework layer just needs to call it with its own client instance.

---

## Core Design

### `OwlLayerClientPlugin<C>` interface

```ts
// packages/core/src/plugins/plugin.types.ts
export interface OwlLayerClientPlugin<C = void> {
  meta: {
    name: string;      // Required format: @scope/name  (e.g. '@owllayer/shopify', '@acme/crm')
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
- Access agent memory (`OwlLayerAgent`)
- Send raw WebSocket messages
- Register global tools (tools are scoped to the plugin lifetime)

**Tool name auto-prefixing:**
`ctx.registerTool('add_to_cart', def)` → registered as `@owllayer/shopify/add_to_cart`
- Collision with another plugin → explicit error thrown
- `uninstall()` removes only this plugin's tools (uses `componentId = pluginName`)

### `installPlugin(client, plugin, config)` — core function

```ts
// packages/core/src/plugins/installPlugin.ts
export function installPlugin<C>(
  client: OwlLayerClient,
  plugin: OwlLayerClientPlugin<C>,
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
assertNamespace('@owllayer/shopify')   // ✅
assertNamespace('@acme/crm')        // ✅
assertNamespace('shopify')          // ❌ throws
assertNamespace('@owllayer/My-Plugin') // ❌ throws (uppercase not allowed)
```

---

## Usage Patterns — All Frameworks

### Browser (vanilla / Shopify theme.liquid)

```ts
import { OwlLayer } from '@owllayer/browser';
import { DemoCRMPlugin } from '@owllayer-plugins/demo-crm';

await OwlLayer.init({ apiKey: 'pk_...', endpoint: 'wss://...' });

// 'installPlugin' is a method on BrowserOwlLayer, delegates to core installPlugin()
OwlLayer.installPlugin(DemoCRMPlugin, { apiUrl: 'https://crm.acme.com', tenantId: 'acme' });
```

### React — `<OwlLayerProvider plugins={[...]}/>`

```tsx
import { OwlLayerProvider } from '@owllayer/react';
import { DemoCRMPlugin } from '@owllayer-plugins/demo-crm';

<OwlLayerProvider
  apiKey="pk_live_..."
  endpoint="wss://..."
  plugins={[
    [DemoCRMPlugin, { apiUrl: 'https://crm.acme.com', tenantId: 'acme' }],
  ]}
>
  <App />
</OwlLayerProvider>
```

`OwlLayerProvider` calls `installPlugin(client, plugin, config)` after the client is created, before `autoConnect`.

### Vue — `app.use(OwlLayerPlugin, { plugins: [...] })`

```ts
import { createApp } from 'vue';
import { OwlLayerPlugin } from '@owllayer/vue';
import { DemoCRMPlugin } from '@owllayer-plugins/demo-crm';

app.use(OwlLayerPlugin, {
  endpoint: 'wss://...',
  apiKey: 'pk_...',
  plugins: [
    [DemoCRMPlugin, { apiUrl: 'https://crm.acme.com', tenantId: 'acme' }],
  ],
});
```

`OwlLayerPlugin.install()` calls `installPlugin()` after creating the client.

### Svelte — `initOwlLayer({ plugins: [...] })`

```ts
import { initOwlLayer } from '@owllayer/svelte';
import { DemoCRMPlugin } from '@owllayer-plugins/demo-crm';

initOwlLayer({
  endpoint: 'wss://...',
  apiKey: 'pk_...',
  plugins: [
    [DemoCRMPlugin, { apiUrl: 'https://crm.acme.com', tenantId: 'acme' }],
  ],
});
```

`initOwlLayer()` calls `installPlugin()` after creating the client.

### Plugin author (npm package)

```ts
// @owllayer-plugins/demo-crm/src/index.ts
import type { OwlLayerClientPlugin } from '@owllayer/core';

export interface DemoCRMConfig {
  apiUrl: string;
  tenantId: string;
}

export const DemoCRMPlugin: OwlLayerClientPlugin<DemoCRMConfig> = {
  meta: { name: '@owllayer-plugins/demo-crm', version: '1.0.0', description: 'Demo CRM plugin for OwlLayer' },

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

Registered tool names: `@owllayer-plugins/demo-crm/search_contacts`, `@owllayer-plugins/demo-crm/get_contact`

---

## Repository Structure

Official plugins live in `plugins/` at the monorepo root — outside `packages/` (SDK) and `apps/` (demos).

```
owllayer/
├── packages/          # SDK — @owllayer/core, @owllayer/browser, @owllayer/react, etc.
├── apps/
│   └── demo-plugin/   # Demo app that installs and tests plugins
└── plugins/
    └── demo-crm/      # @owllayer-plugins/demo-crm — reference plugin implementation
```

`pnpm-workspace.yaml` must include `"plugins/*"` to resolve workspace deps.

---

## Files to Create / Modify

| File | Action | Notes |
|------|--------|-------|
| `packages/core/src/plugins/plugin.types.ts` | **Create** | `OwlLayerClientPlugin`, `PluginClientContext`, `PluginToolDefinition`, `PluginEntry` |
| `packages/core/src/plugins/installPlugin.ts` | **Create** | `installPlugin()`, `assertNamespace()`, `createPluginContext()` |
| `packages/core/src/client/OwlLayerClient.ts` | **Modify** | Add `getContext(): Record<string, unknown>` |
| `packages/core/src/index.ts` | **Modify** | Export `plugins/` types and functions |
| `packages/browser/src/runtime/BrowserOwlLayer.ts` | **Modify** | Add `installPlugin(plugin, config)` method |
| `packages/react/src/provider/OwlLayerProvider.tsx` | **Modify** | Add `plugins?: PluginEntry[]` prop, call `installPlugin` after client creation |
| `packages/vue/src/plugin/OwlLayerPlugin.ts` | **Modify** | Add `plugins?: PluginEntry[]` to `OwlLayerPluginOptions`, call `installPlugin` in `install()` |
| `packages/svelte/src/stores/owllayer.store.ts` | **Modify** | Add `plugins?: PluginEntry[]` to `OwlLayerInitOptions`, call `installPlugin` in `initOwlLayer()` |
| `plugins/demo-crm/src/index.ts` | **Create** | `DemoCRMPlugin` reference implementation |
| `plugins/demo-crm/package.json` | **Create** | `@owllayer-plugins/demo-crm` |
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
4. Browser: `OwlLayer.installPlugin(DemoCRMPlugin, config)` → tools `@owllayer-plugins/demo-crm/*` are registered on the client
5. React: `<OwlLayerProvider plugins={[[DemoCRMPlugin, config]]} />` → same tools registered at mount
6. Vue: `app.use(OwlLayerPlugin, { plugins: [[DemoCRMPlugin, config]] })` → same
7. Svelte: `initOwlLayer({ plugins: [[DemoCRMPlugin, config]] })` → same
8. `ctx.uninstall()` removes all tools registered by that plugin and no others
9. `apps/demo-plugin` connects, calls a CRM tool, receives a mocked response

---

## Security Notes

- Plugins cannot call `client.connect()` — not exposed via `PluginClientContext`
- Plugins cannot read agent memory or HITL state
- `@scope/name` namespace is mandatory — prevents silent npm package name collisions
- Auto-prefixing guarantees two plugins can never silently overwrite each other's tools
