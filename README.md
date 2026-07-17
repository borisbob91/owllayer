<p align="center">
  <img src="./domos_logo_agentic.png" alt="DomOS" width="144" />
</p>

<h1 align="center">DomOS</h1>

<p align="center">
  <strong>Give AI agents safe, explicit actions inside your existing interface.</strong>
</p>

<p align="center">
  DomOS is an open-source TypeScript framework for building agentic interfaces without giving an AI unrestricted access to your application or DOM.
</p>

<p align="center">
  <a href="https://borisbob91.github.io/domos/"><strong>Documentation</strong></a>
  ·
  <a href="https://borisbob91.github.io/domos/getting-started/">Getting started</a>
  ·
  <a href="./CONTRIBUTING.md">Contributing</a>
  ·
  <a href="./SECURITY.md">Security</a>
</p>

<p align="center">
  <a href="./README_FR.md">Version française</a>
</p>

<p align="center">
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-2563eb.svg" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6.svg" />
  <img alt="pnpm workspace" src="https://img.shields.io/badge/pnpm-workspace-f69220.svg" />
  <img alt="Status: pre-release" src="https://img.shields.io/badge/status-pre--release-f59e0b.svg" />
</p>

---

## What is DomOS?

DomOS connects an AI agent to a web application through actions that the application explicitly declares.

Your application remains in control:

- the agent receives only the context you choose to expose;
- it can call only the tools available on the current screen;
- tools mount and unmount with the interface that owns them;
- sensitive actions can require human approval;
- business logic stays inside your application.

DomOS does not scrape the DOM and does not replace your product with generated UI. It provides a controlled bridge between natural language, live application context, and real user-facing actions.

## How it works

```text
User
  ↓
Framework SDK → DomOSClient → ADTP / WebSocket → DomOSServer → LLM adapter
     ↑               ↓                                ↓
UI context      Active tools                    Tool request
     └──────────── Controlled execution + result ─────┘
```

**ADTP** (Agent-to-DOM Transfer Protocol) carries authorized context, active tool definitions, agent responses, tool calls, and tool results between `DomOSClient` and `DomOSServer`.

When the model requests an action, the client executes the matching application-owned handler. High-risk actions can be paused by the built-in Human-in-the-Loop layer before execution.

```tsx
useAgentTool(
  {
    name: 'add_to_cart',
    description: 'Add the current product to the cart',
    schema: z.object({ quantity: z.number().int().min(1) }),
    risk: 'low',
  },
  async ({ quantity }) => {
    await cart.add(product, quantity);
    return { productId: product.id, quantity };
  },
);
```

The handler owns the business operation. DomOS only exposes its declared contract to the agent and transports the result.

## Core capabilities

- **Live tool registry** — the agent sees only tools mounted for the current interface.
- **Scoped application context** — expose useful state without exposing the full DOM or internal store.
- **Human-in-the-Loop security** — require confirmation for high-risk and critical actions.
- **Framework SDKs** — React, Vue, Svelte, Angular, and framework-agnostic browser APIs.
- **Provider adapters** — OpenAI, Google Gemini, Anthropic, and optional LiveKit voice runtime.
- **Text and voice surfaces** — build a custom experience or use the provided widget.
- **Server-side tools** — register trusted backend actions with explicit visibility and policy boundaries.
- **Sessions and storage** — server-side orchestration, memory adapters, rate limiting, and observability surfaces.
- **Embedded UI tooling** — shared dashboard and developer tools through `@domos/ui`.

## Packages

DomOS is a pnpm monorepo. Public npm packages are built exclusively from `packages/`.

| Package | Purpose |
| --- | --- |
| `@domos/core` | ADTP contracts, `DomOSClient`, tool registry, HITL, and shared types |
| `@domos/server` | WebSocket server, sessions, security, storage, and LLM orchestration |
| `@domos/react` | React provider, hooks, tools, context, voice, and widget |
| `@domos/vue` | Vue plugin, composables, tools, context, voice, and widget |
| `@domos/svelte` | Svelte stores, actions, tools, context, voice, and widget |
| `@domos/angular` | Angular providers, services, signals, directives, and widget |
| `@domos/browser` | Framework-agnostic browser SDK and HTML auto-discovery |
| `@domos/ui` | Shared embedded dashboard and cross-framework DevTools runtime |
| `@domos/audio` | Shared audio encoding, decoding, and normalization utilities |
| `@domos/adapter-openai` | OpenAI text and realtime adapter |
| `@domos/adapter-google` | Google Gemini text and live audio adapter |
| `@domos/adapter-anthropic` | Anthropic Claude adapter |
| `@domos/adapter-livekit` | Optional LiveKit realtime voice integration |

Shopify and WooCommerce integrations currently remain private workspace packages and are not part of the public npm release.

## Start building

Choose the SDK for your application and follow its maintained guide:

- [React](https://borisbob91.github.io/domos/react/readme/)
- [Vue](https://borisbob91.github.io/domos/vue/readme/)
- [Svelte](https://borisbob91.github.io/domos/svelte/readme/)
- [Angular](https://borisbob91.github.io/domos/angular/readme/)
- [Browser / vanilla JavaScript](https://borisbob91.github.io/domos/browser/readme/)
- [DomOS Server](https://borisbob91.github.io/domos/server/)

For the complete installation flow, see [Getting started](https://borisbob91.github.io/domos/getting-started/). The documentation contains the current package installation commands, server setup, framework examples, widget configuration, security guidance, and deployment notes.

## Security model

DomOS is designed around explicit capabilities rather than unrestricted automation.

- Tools are declared by the application and scoped to the active UI.
- Tool inputs are validated with schemas.
- Risk levels determine whether human approval is required.
- API keys and provider credentials belong on the server, never in browser bundles.
- The server controls authentication, session policy, CORS, rate limits, and tool visibility.
- Context transfer should be allow-listed when it may contain sensitive application state.

Read [HITL security](https://borisbob91.github.io/domos/hitl_security/) for the execution model. To report a vulnerability, follow [SECURITY.md](./SECURITY.md) instead of opening a public issue.

## Documentation

- [Introduction](https://borisbob91.github.io/domos/)
- [Core concepts](https://borisbob91.github.io/domos/core-concepts/)
- [Architecture](https://borisbob91.github.io/domos/architecture/)
- [ADTP protocol](https://borisbob91.github.io/domos/adtp-protocol/)
- [Widget](https://borisbob91.github.io/domos/widget/)
- [Server](https://borisbob91.github.io/domos/server/)
- [Plugins](https://borisbob91.github.io/domos/plugins/)
- [LiveKit](https://borisbob91.github.io/domos/livekit/)

The documentation is the source of truth for integration details. README examples are intentionally minimal so they do not duplicate framework guides.

## Repository development

Requirements: Node.js and pnpm 9.

```bash
git clone https://github.com/borisbob91/domos.git
cd domos
pnpm install
pnpm build
pnpm test
```

The repository uses strict TypeScript, pnpm workspaces, Turborepo, and Vitest.

## Contributing

Contributions are welcome, but stability and scoped changes take priority over broad refactoring.

Before opening a pull request:

1. Read [CONTRIBUTING.md](./CONTRIBUTING.md).
2. Use the required issue or feature document for the change.
3. Work within one ownership domain at a time.
4. List the files you intend to modify.
5. Run the build and tests for every affected package.
6. Update public documentation when an API or behavior changes.

Please also follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Project status

DomOS is under active development and preparing its public npm release. APIs and package metadata may still change before the first stable release. Use exact versions for production evaluation and review migration notes when upgrading.

## License

DomOS is available under the [MIT License](./LICENSE).
