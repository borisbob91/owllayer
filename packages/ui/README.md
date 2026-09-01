# @owllayer/ui

Embedded UI runtime, administration dashboard, and developer tools for **OwlLayer AI**.

---

## Features

- **Embedded DevTools Panel (`@owllayer/ui/devtools`)**: Real-time inspect panel to observe active tools, effective tool surfaces, session states, shadow context mutations, and simulate tool calls.
- **Embedded Dashboard (`@owllayer/ui/dashboard`)**: Full-featured administrative dashboard for managing API keys, sessions, virtual lines, and server metrics.
- **Framework-Agnostic Preact Runtime**: Ultra-compact footprint rendered in any web page or web app without bulky dependencies.
- **Multi-Language Support**: Built-in English and French internationalization.

---

## Installation

```bash
# pnpm
pnpm add @owllayer/ui @owllayer/core

# npm
npm install @owllayer/ui @owllayer/core

# yarn
yarn add @owllayer/ui @owllayer/core
```

---

## Usage

### 1. DevTools Panel (`@owllayer/ui/devtools`)

Mount an interactive developer overlay to inspect tool routing and agent lifecycle:

```ts
import { mountDevTools, unmountDevTools } from '@owllayer/ui/devtools';
import { OwlLayerClient } from '@owllayer/core';

const client = new OwlLayerClient({
  endpoint: 'ws://localhost:3001/owllayer',
  apiKey: 'pk_dev_xxxx',
});

const container = document.createElement('div');
document.body.appendChild(container);

mountDevTools(container, {
  plugins: [],
  getRegisteredTools: () => client.getRegisteredTools(),
  getEffectiveTools: () => client.getRegisteredTools(),
  getAgentState: () => client.getState(),
  getSessionId: () => client.getSessionId(),
  callTool: async (name, args) => client.executeTool(name, args),
});
```

### 2. Embedded Dashboard (`@owllayer/ui/dashboard`)

Embed the full administrative interface into an internal management page:

```ts
import { mountDashboard, unmountDashboard } from '@owllayer/ui/dashboard';

const container = document.getElementById('dashboard-root')!;

mountDashboard(container, {
  serverUrl: 'http://localhost:3001',
  language: 'en', // 'en' | 'fr'
});
```

---

## Public Entry Points

| Subpath | Purpose |
|---|---|
| `@owllayer/ui` | Shared entry point exporting both dashboard and devtools mounters. |
| `@owllayer/ui/devtools` | Floating DevTools panel for debugging tool registrations and AITP events. |
| `@owllayer/ui/dashboard` | Administrative console for monitoring sessions, lines, and API keys. |

---

## License

MIT © OwlLayer
