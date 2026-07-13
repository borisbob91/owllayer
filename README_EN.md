<p align="center">
  <img src="domos_logo_agentic.png" alt="DomOS Logo" width="180" />
</p>

<h1 align="center">DomOS</h1>

<p align="center">
  <strong>Give your AI control of your interface.</strong><br/>
  The open-source SDK for building Agentic UIs.
</p>

<p align="center">
  <a href="https://borisbob91.github.io/domos/">Documentation</a> &bull;
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#packages">Packages</a> &bull;
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

---

## What is DomOS?

DomOS lets an AI agent **act inside your existing interface** through explicit, declared tools. No DOM scraping. No generative UI. Your app stays in control.

The agent receives only what you expose: a **Shadow Context** (what's on screen) and a list of **tools** (what it can do). Everything else is invisible to it.

```
Your App  ↔  DomOSClient  ↔  ADTP/WebSocket  ↔  DomOSServer  ↔  LLM
```

---

## Why DomOS?

- **Your UI, your rules.** The agent calls tools you declared. It never touches the DOM directly.
- **Dynamic tools.** Tools mount/unmount with components. The LLM only sees what's relevant now.
- **Framework-agnostic.** React, Vue, Svelte, Angular, vanilla JS. Same protocol underneath.
- **Human-in-the-Loop.** Built-in risk levels (none/low/high/critical) with approval UI in Shadow DOM.
- **Voice-ready.** Audio pipeline + LiveKit integration for realtime voice agents.
- **Open protocol.** ADTP (Agent-to-DOM Transfer Protocol) is documented and extensible.

---

## Quick Start

```bash
git clone https://github.com/borisbob91/domos.git
cd domos
pnpm install && pnpm build
```

**Start the server:**

```bash
cd apps/demo-server
cp .env.example .env  # add your GOOGLE_API_KEY
pnpm dev
```

**Start the client:**

```bash
cd apps/demo
pnpm dev
```

Open `http://localhost:5173`. Try: *"Add the headphones to my cart"* or *"Empty my cart"* (triggers HITL confirmation).

---

## Packages

| Package | Description |
|---|---|
| `@domos/core` | Shared runtime, ADTP protocol, tool registry, HITL |
| `@domos/server` | Node.js server, sessions, transport, security |
| `@domos/react` | React SDK (hooks, provider, widget) |
| `@domos/vue` | Vue SDK (composables, plugin, widget) |
| `@domos/svelte` | Svelte SDK (actions, stores, widget) |
| `@domos/angular` | Angular SDK (services, signals, DI) |
| `@domos/browser` | Vanilla JS SDK (imperative API, HTML auto-discovery) |
| `@domos/adapter-google` | Gemini adapter |
| `@domos/adapter-openai` | OpenAI adapter |
| `@domos/adapter-livekit` | LiveKit realtime voice adapter |

---

## How It Works (30 seconds)

1. Your component declares a **tool** (name + schema + handler + risk level).
2. `DomOSClient` syncs active tools and **Shadow Context** to the server via ADTP.
3. User talks to the agent (text or voice).
4. LLM picks a tool → server sends `TOOL_CALL` → your handler runs locally → result goes back.
5. If `risk: 'high'` or `'critical'`, user must approve first.

When the component unmounts, the tool disappears. The LLM never sees stale actions.

---

## Minimal Example (React)

```tsx
import { DomOSProvider, useAgentTool, useAgent } from '@domos/react';
import { z } from 'zod';

function App() {
  return (
    <DomOSProvider apiKey="pk_dev" endpoint="ws://localhost:3000/domos">
      <MyPage />
    </DomOSProvider>
  );
}

function MyPage() {
  const { sendText, lastResponse } = useAgent();

  useAgentTool({
    name: 'add_to_cart',
    description: 'Add the visible product to cart',
    schema: z.object({ quantity: z.number().min(1) }),
    risk: 'low',
  }, async ({ quantity }) => {
    await cartApi.add(currentProduct.id, quantity);
    return { added: true, quantity };
  });

  return <div>{lastResponse}</div>;
}
```

---

## Documentation

- **[Full docs (VitePress)](https://borisbob91.github.io/domos/)** — English, concise, code-first
- `docs-site/` — VitePress source (EN)
- `apps/docs-site/` — Astro + Starlight source (FR, detailed)

---

## Tech Stack

- TypeScript monorepo (pnpm + Turborepo)
- Vitest for testing
- WebSocket transport (ws / uWebSockets.js)
- Zod for tool schemas
- LLM-agnostic via adapter pattern

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). PRs welcome.

```bash
pnpm install
pnpm build
pnpm test
```

---

## License

MIT © 2026 DomOS Team
