<p align="center">
  <img src="./domos_logo_agentic.png" alt="DomOS" width="144" />
</p>

<h1 align="center">DomOS</h1>

<p align="center">
  <strong>Turn your product UI into a safe, live capability surface for AI agents.</strong>
</p>

<p align="center">
  DomOS is an open-source TypeScript framework for building agentic interfaces where actions are explicit, contextual, and always owned by your application.
</p>

<p align="center">
  <a href="https://borisbob91.github.io/domos/"><strong>Documentation</strong></a>
  ·
  <a href="https://borisbob91.github.io/domos/getting-started/">Get started</a>
  ·
  <a href="./CONTRIBUTING.md">Contributing</a>
  ·
  <a href="./SECURITY.md">Security</a>
  ·
  <a href="./README_FR.md">Français</a>
</p>

<p align="center">
  <a href="https://github.com/borisbob91/domos/actions/workflows/ci.yml?query=branch%3Amaster"><img alt="CI" src="https://github.com/borisbob91/domos/actions/workflows/ci.yml/badge.svg?branch=master" /></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-2563eb.svg" /></a>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6.svg" />
  <img alt="Node.js 22" src="https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white" />
  <img alt="pnpm 9" src="https://img.shields.io/badge/pnpm-9-f69220?logo=pnpm&logoColor=white" />
</p>

---

## Table of contents

- [Why DomOS](#why-domos)
- [The DomOS model](#the-domos-model)
- [What an interaction looks like](#what-an-interaction-looks-like)
- [Framework support](#framework-support)
- [Security by construction](#security-by-construction)
- [Architecture and protocol](#architecture-and-protocol)
- [Start building](#start-building)
- [Repository development](#repository-development)
- [Contributing](#contributing)

## Why DomOS

Most AI integrations can describe a product, but they cannot safely operate it. DomOS gives an agent a **bounded, live view of what it is allowed to do** in the interface that the user is currently using.

It is not a DOM scraper, a generated replacement UI, or a chatbot bolted onto an application. Your components, business rules, and existing workflows remain the source of truth.

With DomOS, an agent can:

- understand the allow-listed context you decide to share;
- discover only the actions available on the active screen;
- invoke application-owned handlers with validated input;
- request human approval before sensitive work;
- return results to the conversation without bypassing your domain logic.

This makes DomOS useful for guided commerce, product operations, support flows, enterprise dashboards, and voice experiences where an AI must be helpful without becoming an unrestricted automation layer.

## The DomOS model

DomOS is built around four concepts. They are deliberately independent of any UI framework or backend implementation.

| Concept | What it means |
| --- | --- |
| **Live capabilities** | UI code declares named tools with schemas, descriptions, and risk levels. A capability exists only while the owning interface is active, so the agent's available actions follow the user journey. |
| **Shadow Context** | A compact, allow-listed representation of relevant UI state. It gives the agent product awareness without exposing the DOM, internal stores, or arbitrary data. |
| **Policy-controlled execution** | Every tool has an explicit contract. Risky operations can pause for Human-in-the-Loop approval before any handler runs. |
| **ADTP** | The Agent-to-DOM Transfer Protocol synchronizes context, capabilities, messages, calls, approvals, and results across the runtime boundary. |

### Declare a capability where it belongs

```tsx
useAgentTool(
  {
    name: 'add_to_cart',
    description: 'Add the current product to the shopping cart',
    schema: z.object({ quantity: z.number().int().min(1) }),
    risk: 'low',
  },
  async ({ quantity }) => {
    await cart.add(product, quantity);
    return { productId: product.id, quantity };
  },
);
```

When this product view unmounts, its capability leaves the live registry. Navigating to checkout exposes a different surface. The agent therefore acts on the current interface, not on a stale global command list.

## What an interaction looks like

```text
1. UI declares capabilities and publishes safe context.
2. The user asks for help in text or voice.
3. The agent receives the current context and capability contracts.
4. It chooses a declared action and provides schema-valid input.
5. Policy evaluates the action; approval is requested when required.
6. Your handler executes inside your application and returns a result.
7. The agent responds with the completed outcome.
```

The important boundary is step 6: the agent does not implement business operations. It requests a named capability; your application performs the work.

## Framework support

Pick the integration style that matches your product. Each guide covers installation, runtime setup, components, voice, and framework-specific API details.

| Integration | Best for | Guide |
| --- | --- | --- |
| **React** | Hooks, providers, components, and embedded widgets | [React guide](https://borisbob91.github.io/domos/react/readme/) |
| **Vue** | Plugin-based setup, composables, and Vue widgets | [Vue guide](https://borisbob91.github.io/domos/vue/readme/) |
| **Svelte** | Stores, actions, and Svelte-native components | [Svelte guide](https://borisbob91.github.io/domos/svelte/readme/) |
| **Angular** | Providers, services, signals, directives, and widgets | [Angular guide](https://borisbob91.github.io/domos/angular/readme/) |
| **Browser / vanilla JavaScript** | HTML, multi-page applications, server-rendered pages, and progressive adoption | [Browser guide](https://borisbob91.github.io/domos/browser/readme/) |

Provider adapters are available for OpenAI, Google Gemini, Anthropic, and an optional LiveKit voice runtime. See the [server documentation](https://borisbob91.github.io/domos/server/) for orchestration and provider configuration.

## Security by construction

DomOS treats AI execution as an explicit application capability, not as arbitrary automation.

- **No DOM scraping:** agents receive structured contracts and selected context, never implicit access to the rendered page.
- **Schema validation:** every tool defines the input it accepts before execution.
- **Risk-aware policy:** `high` and `critical` actions can require a human decision before running.
- **Scoped context:** only data you publish becomes available to the agent.
- **Authoritative handlers:** application code owns side effects, permissions, transactions, and domain rules.
- **Runtime observability:** sessions, calls, approvals, and tool results remain traceable through the runtime surface.

Read the [HITL security guide](https://borisbob91.github.io/domos/hitl_security/) before exposing destructive or high-impact operations. Never place provider credentials in browser bundles. For vulnerabilities, follow [SECURITY.md](./SECURITY.md) instead of opening a public issue.

## Architecture and protocol

ADTP is a typed JSON protocol designed for the agentic interaction loop, rather than a generic chat transport.

```text
HANDSHAKE_INIT / HANDSHAKE_ACK
          ↓
CONTEXT_UPDATE and capability synchronization
          ↓
USER_INPUT or audio input
          ↓
TOOL_CALL → policy / approval → application handler → TOOL_RESULT
          ↓
AGENT_RESPONSE
```

The runtime merges the current UI capabilities with declared backend capabilities before an agent turn. Backend declarations remain authoritative if a name collides, preventing a transient UI component from weakening a protected operation.

For the complete model, read [Core concepts](https://borisbob91.github.io/domos/core-concepts/), [Architecture](https://borisbob91.github.io/domos/architecture/), and the [ADTP protocol](https://borisbob91.github.io/domos/adtp-protocol/).

## Start building

Use the maintained guide for your framework rather than copying a long SDK tutorial from this page:

- [Getting started](https://borisbob91.github.io/domos/getting-started/)
- [Widget and embedded UI](https://borisbob91.github.io/domos/widget/)
- [Text and voice experiences](https://borisbob91.github.io/domos/livekit/)
- [Server orchestration](https://borisbob91.github.io/domos/server/)
- [Plugin model](https://borisbob91.github.io/domos/plugins/)

## Repository development

Requirements: Node.js 22 and pnpm 9.

```bash
git clone https://github.com/borisbob91/domos.git
cd domos
pnpm install --frozen-lockfile
pnpm lint:packages
pnpm test:packages
pnpm build:packages
```

Public npm artifacts are built only from `packages/`. Applications, plugins, documentation sites, and local planning material are not released.

## Contributing

Focused contributions are welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md), open or reference an issue, keep changes within one domain, and add a Changeset for functional modifications to public packages.

Please also follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Project status

DomOS is under active development and preparing its first public npm release. APIs may change before the first stable release; use exact versions for production evaluation and review migration notes when upgrading.

## License

DomOS is available under the [MIT License](./LICENSE).
