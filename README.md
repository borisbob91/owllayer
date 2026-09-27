<p align="center">
  <img src="./owllayer_logo_agentic.png" alt="OwlLayer AI" width="155" />
</p>

<h1 align="center">OwlLayer AI</h1>

<p align="center">
  <strong>Make your web interface drivable by AI: turn buttons, links, and form fields into tools an agent can call.</strong>
</p>

<p align="center">
  OwlLayer AI is an open-source TypeScript <strong>Agentic UI SDK</strong> for building interfaces where actions are explicit, contextual, and always owned by your application: buttons, links, form fields, and components become <strong>tools the AI agent can call</strong> to operate the interface, and the agent lives inside your app, so your users simply talk to it.
</p>

<p align="center">
  <a href="https://borisbob91.github.io/owllayer/"><strong>Documentation</strong></a>
  ·
  <a href="https://borisbob91.github.io/owllayer/getting-started/">Get started</a>
  ·
  <a href="./CONTRIBUTING.md">Contributing</a>
  ·
  <a href="./SECURITY.md">Security</a>
  ·
  <a href="./README_FR.md">Français</a>
</p>

<p align="center">
  <a href="https://github.com/borisbob91/owllayer/actions/workflows/ci.yml?query=branch%3Amaster"><img alt="CI" src="https://github.com/borisbob91/owllayer/actions/workflows/ci.yml/badge.svg?branch=master" /></a>
  <a href="https://github.com/borisbob91/owllayer/actions/workflows/pages-docs.yml"><img alt="Docs deploy" src="https://github.com/borisbob91/owllayer/actions/workflows/pages-docs.yml/badge.svg" /></a>
  <a href="https://github.com/borisbob91/owllayer/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/borisbob91/owllayer?label=release" /></a>
  <a href="https://www.npmjs.com/package/@owllayer/core"><img alt="npm" src="https://img.shields.io/npm/v/@owllayer/core?label=npm&logo=npm&color=cb3837" /></a>
  <a href="https://github.com/borisbob91/owllayer/releases"><img alt="Pre-release" src="https://img.shields.io/github/v/release/borisbob91/owllayer?include_prereleases&label=pre-release" /></a>
  <a href="https://github.com/borisbob91/owllayer/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/borisbob91/owllayer?logo=github" /></a>
  <a href="https://github.com/borisbob91/owllayer"><img alt="Repository views" src="https://hits.sh/github.com/borisbob91/owllayer.svg?label=repo%20views&color=2563eb" /></a>
  <a href="https://github.com/borisbob91/owllayer/commits/master"><img alt="Last commit" src="https://img.shields.io/github/last-commit/borisbob91/owllayer?label=last%20commit" /></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-2563eb.svg" /></a>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6.svg" />
  <img alt="Node.js 22" src="https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white" />
  <img alt="pnpm 9" src="https://img.shields.io/badge/pnpm-9-f69220?logo=pnpm&logoColor=white" />
</p>

---

## Table of contents

- [Table of contents](#table-of-contents)
- [1. Why OwlLayer AI](#1-why-owllayer-ai)
  - [1.1 OwlLayer AI and MCP](#11-owllayer-ai-and-mcp)
- [2. The OwlLayer AI model](#2-the-owllayer-ai-model)
  - [2.1 Neural-DOM Binding](#21-neural-dom-binding)
- [3. Framework support](#3-framework-support)
- [4. Models, realtime, and voice](#4-models-realtime-and-voice)
- [5. Connect your app](#5-connect-your-app)
- [6. Declare a capability where it belongs](#6-declare-a-capability-where-it-belongs)
  - [6.1 In script](#61-in-script)
  - [6.2 Declarative React components](#62-declarative-react-components)
  - [6.3 HTML attributes](#63-html-attributes)
- [7. Publish context without exposing the whole app](#7-publish-context-without-exposing-the-whole-app)
  - [7.1 In script (React)](#71-in-script-react)
  - [7.2 Browser SDK (imperative)](#72-browser-sdk-imperative)
- [8. Interaction lifecycle and protocol](#8-interaction-lifecycle-and-protocol)
- [9. Security by construction](#9-security-by-construction)
- [10. Repository development and contributing](#10-repository-development-and-contributing)
  - [10.1 Repository layout](#101-repository-layout)
  - [10.2 Contributor workflow](#102-contributor-workflow)
- [11. Project status](#11-project-status)
- [12. License](#12-license)

## 1. Why OwlLayer AI

Most AI integrations can describe a product, but they cannot safely operate it. OwlLayer AI gives an agent a **bounded, live view of what it is allowed to do** in the interface that the user is currently using.

It is not a DOM scraper, a generated replacement UI, or a chatbot bolted onto an application. Your components, business rules, and existing workflows remain the source of truth.

With OwlLayer AI, an agent can:

- understand the allow-listed context you decide to share;
- discover only the actions available on the active screen;
- invoke application-owned handlers with validated input;
- request human approval before sensitive work;
- return results to the conversation without bypassing your domain logic.

This makes OwlLayer AI useful for guided commerce, product operations, support flows, enterprise dashboards, and voice experiences where an AI must be helpful without becoming an unrestricted automation layer.

### 1.1 OwlLayer AI and MCP

The **Model Context Protocol (MCP)** is a standard for exposing tools **on the server side**: an MCP server declares functions (`query_database`, `create_ticket`, …) that an AI agent such as Codex or Claude Code can call.

OwlLayer AI works **on the interface side**: it turns the elements of your web app — buttons, links, form fields, components — into tools, and puts the agent **inside the app**. Your users chat with it directly in your product; they do not install or configure any agent tool.

| | MCP | OwlLayer AI |
| --- | --- | --- |
| **Tools come from** | Functions declared in a backend MCP server | Buttons, forms, and components of your UI (plus server tools if you need them) |
| **Who uses them** | An agent in the user's own AI client (Codex, Claude Code, …) | The agent embedded in your app, used by your end users in text or voice |
| **What the agent knows** | What each tool returns | The current screen, through the context you choose to share |
| **When a tool exists** | As long as the server exposes it | Only while its component is on screen |
| **Human approval** | Depends on the client | Built in for `high` and `critical` actions |

## 2. The OwlLayer AI model

The model is built around four concepts, deliberately independent of any UI framework or backend implementation.

| Concept | What it means |
| --- | --- |
| **Neural-DOM Binding** | The governed connection between the living page and the LLM's reasoning network: the page exposes what it means and what it can do, and the model reasons about those intentions without being given control of the DOM. |
| **Shadow Context** | A compact, allow-listed representation of relevant UI state. It gives the agent product awareness without exposing the DOM, internal stores, or arbitrary data. |
| **Policy-controlled execution** | Every tool has an explicit contract. Risky operations can pause for Human-in-the-Loop approval before any handler runs. |
| **AITP** | The Agent-to-Interface Transfer Protocol synchronizes context, capabilities, messages, calls, approvals, and results across the runtime boundary. |

### 2.1 Neural-DOM Binding

**Neural-DOM Binding is the connection between a living page and an LLM brain.**

- **Neural** is the reasoning network: Gemini, GPT, Claude, or another language model that understands intent and decides what to do.
- **DOM** is the living product interface: the current page, its visible state, its available actions, and its rules.
- **Binding** is the governed link that lets the model understand and act on the page through explicit contracts.

OwlLayer AI turns the page into a semantic, agent-readable surface. Instead of making an agent hunt for a button, click it, and guess what changed, the application tells the model: *these are the intentions that exist on this page, this is the context, and these are the rules for executing them.*

It is not browser automation, and it is not a framework virtual DOM. The agent receives a named, typed, policy-governed intention such as `add_to_cart`, `get_order`, or `approve_refund`.

| Imperative UI automation | Neural-DOM Binding |
| --- | --- |
| Find a button, click it, wait for the screen, then infer whether it worked. | Request a declared intention with validated input; the application executes its own handler and returns a structured result. |
| Fragile when layout, labels, or navigation change. | Stable across UI changes because the capability contract is explicit. |
| May bypass product permissions and domain rules. | Keeps permissions, Human-in-the-Loop approval, transactions, and business logic in the application. |

The binding is declarative and lifecycle-aware: a component exposes a tool when it is relevant, receives the execution through its own handler, and removes the tool when the interface disappears. The same model applies to every integration.

## 3. Framework support

Pick the integration style that matches your product.

| Integration | Best for | Guide |
| --- | --- | --- |
| <img alt="React" src="https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=111827" /> <br/> <img alt="Next.js" src="https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white" /> | React and Next.js share the same integration model: hooks, providers, and components; in Next.js, used from client components. | [React guide](https://borisbob91.github.io/owllayer/react/readme/) |
| <img alt="Vue" src="https://img.shields.io/badge/Vue-42B883?logo=vuedotjs&logoColor=white" /> <br/> <img alt="Nuxt.js" src="https://img.shields.io/badge/Nuxt.js-00DC82?logo=nuxtdotjs&logoColor=white" /> | Vue and Nuxt.js share the same integration model: plugin, composables, and components; in Nuxt, used from client components. | [Vue guide](https://borisbob91.github.io/owllayer/vue/readme/) |
| <img alt="Svelte" src="https://img.shields.io/badge/Svelte-FF3E00?logo=svelte&logoColor=white" /> | Stores, actions, and Svelte-native components | [Svelte guide](https://borisbob91.github.io/owllayer/svelte/readme/) |
| <img alt="Angular" src="https://img.shields.io/badge/Angular-DD0031?logo=angular&logoColor=white" /> | Providers, services, signals, directives, and widgets | [Angular guide](https://borisbob91.github.io/owllayer/angular/readme/) |
| <img alt="Browser" src="https://img.shields.io/badge/Browser-4285F4?logo=googlechrome&logoColor=white" /> | HTML, multi-page applications, server-rendered pages, and progressive adoption | [Browser guide](https://borisbob91.github.io/owllayer/browser/readme/) |
| <img alt="Shopify" src="https://img.shields.io/badge/Shopify-7AB55C?logo=shopify&logoColor=white" /> | Voice shopping on an existing Shopify storefront (experimental) | [Shopify plugin](./packages/shopify/README.md) |
| <img alt="WooCommerce" src="https://img.shields.io/badge/WooCommerce-96588A?logo=woocommerce&logoColor=white" /> | Voice shopping on an existing WooCommerce store (experimental) | [WooCommerce plugin](./packages/woocommerce/README.md) |
| <img alt="Flutter" src="https://img.shields.io/badge/Flutter-54C5F8?logo=flutter&logoColor=white" /> | Cross-platform mobile runtime | [Flutter SDK](https://github.com/borisbob91/owllayer-flutter) |
| <img alt="Swift" src="https://img.shields.io/badge/Swift-F05138?logo=swift&logoColor=white" /> | Native iOS surface | [Swift SDK](https://github.com/borisbob91/owllayer-swift) |
| <img alt="Kotlin" src="https://img.shields.io/badge/Kotlin-7F52FF?logo=kotlin&logoColor=white" /> | Kotlin Multiplatform surface | [Kotlin SDK](https://github.com/borisbob91/owllayer-kotlin) |

Each guide covers installation, runtime setup, components, and framework-specific API details. Start from the maintained entry points:

- [Getting started](https://borisbob91.github.io/owllayer/getting-started/)
- [Widget and embedded UI](https://borisbob91.github.io/owllayer/widget/)
- [Text and voice experiences](https://borisbob91.github.io/owllayer/livekit/)
- [Server orchestration](https://borisbob91.github.io/owllayer/server/)
- [Plugin model](https://borisbob91.github.io/owllayer/plugins/)

On native mobile the equivalent is a compact, screen-scoped context — `ScreenContext`. The same rule applies: expose only the relevant UI state and the active tools, and keep execution inside the application owner.

## 4. Models, realtime, and voice

OwlLayer AI separates agent reasoning, low-latency conversation, and speech services so each product can choose the right interaction model.

| Category | Current support | What it enables |
| --- | --- | --- |
| **LLM and tool calling** | <img alt="OpenAI" src="https://img.shields.io/badge/OpenAI-412991?logo=openai&logoColor=white" /> <img alt="Google Gemini" src="https://img.shields.io/badge/Google%20Gemini-4285F4?logo=google&logoColor=white" /> <img alt="Anthropic Claude" src="https://img.shields.io/badge/Anthropic%20Claude-191919?logo=anthropic&logoColor=white" /> | Text conversations, structured tool calls, and provider-specific model selection. |
| **Native realtime models** | <img alt="OpenAI Realtime" src="https://img.shields.io/badge/OpenAI%20Realtime-412991?logo=openai&logoColor=white" /> <img alt="Gemini Live" src="https://img.shields.io/badge/Gemini%20Live-4285F4?logo=google&logoColor=white" /> | Persistent bidirectional audio, live transcriptions, barge-in, and tools during a voice turn. |
| **Speech-to-text** | <img alt="OpenAI Whisper" src="https://img.shields.io/badge/OpenAI%20Whisper-412991?logo=openai&logoColor=white" /> <img alt="Google Cloud Speech-to-Text" src="https://img.shields.io/badge/Google%20STT-4285F4?logo=google&logoColor=white" /> <img alt="Deepgram Nova and Flux" src="https://img.shields.io/badge/Deepgram%20Nova%20%C2%B7%20Flux-13EF93?logo=deepgram&logoColor=111827" /> | Audio transcription for voice experiences that use a text-model pipeline. |
| **Text-to-speech** | <img alt="OpenAI TTS" src="https://img.shields.io/badge/OpenAI%20TTS-412991?logo=openai&logoColor=white" /> <img alt="Google Cloud TTS" src="https://img.shields.io/badge/Google%20TTS-4285F4?logo=google&logoColor=white" /> <img alt="ElevenLabs" src="https://img.shields.io/badge/ElevenLabs-000000?logo=elevenlabs&logoColor=white" /> <img alt="Deepgram Aura" src="https://img.shields.io/badge/Deepgram%20Aura-13EF93?logo=deepgram&logoColor=111827" /> | Configurable speech synthesis and voice selection. |
| **Voice runtime** | <img alt="LiveKit" src="https://img.shields.io/badge/LiveKit-FF4F00?logo=livekit&logoColor=white" /> | Rooms, tokens, agent-session bridging, Gemini realtime, and tool execution routed back through the OwlLayer AI Runtime. |
| **Deepgram voice** | <img alt="Deepgram" src="https://img.shields.io/badge/Deepgram-13EF93?logo=deepgram&logoColor=111827" /> | Three voice modes with one key: batch speech (Nova + Aura), streaming turn-aware speech with any text model (Flux + Aura), or the Deepgram Voice Agent as the realtime model. |

The runtime keeps the same capability and approval model whether a turn is text-based, uses a STT/LLM/TTS pipeline, or runs on a native realtime audio model. See the [server documentation](https://borisbob91.github.io/owllayer/server/) and [voice guide](https://borisbob91.github.io/owllayer/livekit/) for integration details.

## 5. Connect your app

Every package is published on npm. Install the server and the SDK of your front end:

```bash
npm install @owllayer/server @owllayer/adapter-google   # server
npm install @owllayer/react @owllayer/core zod          # front end (or vue, svelte, angular, browser)
```

The server connects the model, the sessions, and the approval policy. Model keys stay on the server; the browser only holds the public `pk_…` key.

```ts
import { OwlLayerServer } from '@owllayer/server';
import { GoogleAdapter } from '@owllayer/adapter-google';

const server = new OwlLayerServer({
  llm: new GoogleAdapter({ model: 'gemini-2.0-flash', apiKey: process.env.GOOGLE_API_KEY! }),
  port: 3001,
  path: '/owllayer',
});
server.addApiKey('pk_live_your_public_api_key');
server.listen();
```

On the client, the runtime is established once, at the application root. It opens the live connection and makes agent context and tool registration available to every component below it.

```tsx
import React from 'react';
import { OwlLayerProvider } from '@owllayer/react';
import MainLayout from './MainLayout';

export default function App() {
  return (
    <OwlLayerProvider
      apiKey="pk_live_your_public_api_key"
      endpoint="wss://your-server.example.com/owllayer"
      config={{
        voice: true,
        hitl: { ui: 'modal' },
      }}
    >
      <MainLayout />
    </OwlLayerProvider>
  );
}
```

## 6. Declare a capability where it belongs

A capability — a **tool** — is an action the agent can call. It is declared next to the UI it belongs to, with a description the model reads, the input schema it accepts, and the risk level that governs it. The handler is your existing application code. (Information the agent should know without acting — what the page shows, what the user is trying to do — is **context**, covered in [section 7](#7-publish-context-without-exposing-the-whole-app).) There are two ways to declare it in React: with the `useAgentTool` hook for dynamic or schema-driven tools, or with the declarative `<OwlLayerToolBtn>` / `<OwlLayerTool>` components for standalone elements.

### 6.1 In script

```tsx
import React from 'react';
import { useAgentTool } from '@owllayer/react';
import { z } from 'zod';

const addToCartSchema = z.object({
  productId: z.string(),
  qty: z.number().min(1).default(1),
});

export function ProductCatalog({ products }) {
  // One tool for the entire list — the LLM selects the right product via productId.
  // Listing all products in the description gives the model full awareness.
  // Creating one tool per product would flood the registry with near-identical entries.
  useAgentTool(
    {
      name: 'add_to_cart',
      description: `Add a product to the cart. Available: ${
        products.map((p) => `${p.id} — ${p.name} $${p.price}`).join('; ')
      }`,
      schema: addToCartSchema,
      risk: 'low',
    },
    async ({ productId, qty }) => {
      const product = products.find((p) => p.id === productId);
      await apiAddToCart(productId, qty);
      return {
        success: true,
        message: `${qty}× "${product?.name ?? productId}" added to cart.`,
      };
    },
  );

  return (
    <ul>
      {products.map((p) => (
        <li key={p.id}>
          {p.name} — <button onClick={() => apiAddToCart(p.id, 1)}>Add to cart</button>
        </li>
      ))}
    </ul>
  );
}
```

Because the tool is registered on mount and released on unmount, the capability surface follows the screen the user is on. Navigating to checkout exposes a different surface: the agent never acts on a stale global command list.

Without a framework, the same declaration is imperative:

```ts
import { OwlLayer } from '@owllayer/browser';

await OwlLayer.init({ apiKey: 'pk_live_your_public_api_key', endpoint: 'wss://your-server.example.com/owllayer' });

OwlLayer.registerTool('track_order', {
  description: "Show the delivery status of one of the user's orders",
  parameters: {
    type: 'object',
    properties: { orderId: { type: 'string', description: 'Order number, e.g. A-1042' } },
    required: ['orderId'],
  },
  risk: 'none',
  handler: async ({ orderId }) => fetchOrderStatus(String(orderId)),
});
```

### 6.2 Declarative React components

For standalone elements, React exposes two co-location components. `<OwlLayerToolBtn>` renders its own `<button>` and registers the tool in one step — the same handler is called by the agent and by the user click. `<OwlLayerTool>` wraps an existing element and triggers a DOM action or a direct callback.

```tsx
import { OwlLayerToolBtn, OwlLayerTool } from '@owllayer/react';
import { Link } from 'react-router-dom';

// Self-rendered button — for a single product (e.g. a product detail page).
// The same handler is called by the user click and by the agent.
// Use context to give the agent the product details it needs.
<OwlLayerToolBtn
  name="add_to_cart"
  description="Add the current product to the cart"
  risk="low"
  handler={async () => {
    await apiAddToCart(product.id, 1);
    return { success: true, message: `"${product.name}" added to cart.` };
  }}
  context={{ productId: product.id, name: product.name, price: product.price }}
>
  Add to cart
</OwlLayerToolBtn>

// Transparent wrapper — agent clicks an existing element.
<OwlLayerTool
  name="go_to_checkout"
  description="Navigate to the checkout page"
  risk="none"
  action="click"
>
  <Link to="/checkout">Checkout →</Link>
</OwlLayerTool>
```

Use `useAgentTool` when the tool needs a Zod schema, handles a list of dynamic items, or requires async business logic. Use `<OwlLayerToolBtn>` or `<OwlLayerTool>` for standalone, schema-free elements where co-location is enough.

### 6.3 HTML attributes

For plain HTML or server-rendered pages without a framework, `@owllayer/browser` turns marked elements into tools: a button the agent can click, a form field it can fill.

```html
<button
  data-owllayer-tool="add_to_cart"
  data-owllayer-description="Add the Bluetooth Pro headphones to the cart"
  data-owllayer-risk="low"
>
  Add to cart
</button>

<input
  name="city"
  data-owllayer-tool="set_shipping_city"
  data-owllayer-description="Set the city of the shipping address"
  data-owllayer-action="setValue"
  data-owllayer-schema='{"type":"object","properties":{"value":{"type":"string"}},"required":["value"]}'
/>
```

`data-owllayer-action` accepts `click` (default), `setValue`, `focus`, `scrollIntoView`, `show`, `hide`, `addClass`, and `removeClass`. For elements created dynamically, use `OwlLayer.registerTool()` instead.

## 7. Publish context without exposing the whole app

Context is passive information the agent reads to understand the current situation: what the page shows, what the user is trying to do, and instructions the developer wants the agent to follow on this screen. It is not a tool and triggers no action. Write it as a human-readable description — the LLM reads it as text, so explicit sentences are more useful than raw variable dumps.

### 7.1 In script (React)

```tsx
import { useAgentContext } from '@owllayer/react';

function CartPage({ cart, user }) {
  useAgentContext({
    page: 'Shopping cart',
    summary: `${user.name} has ${cart.items.length} item(s) in their cart for a total of $${cart.total}. ` +
             `The cart contains: ${cart.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}.`,
    nextStep: 'User can confirm the order, remove items, or continue shopping.',
  });

  return <CartView cart={cart} />;
}
```

The hook re-publishes the context whenever its data changes.

### 7.2 Browser SDK (imperative)

Outside a framework, context is pushed imperatively whenever the page state changes. An element marked as a tool can also carry context in HTML, as JSON in `data-owllayer-context`.

```ts
import { OwlLayer } from '@owllayer/browser';

// Call after navigation or whenever the relevant state changes.
OwlLayer.updateContext({
  page: 'Product catalog',
  summary: 'User is browsing 24 headphones. Active filter: Bluetooth. Sort: Price ascending.',
});
```


## 8. Interaction lifecycle and protocol

A single turn follows the same path whether the user types or speaks.

<p align="center">
  <img src="./assets/owllayer-interaction-loop.png" alt="One agent turn: the UI declares tools and context, the user asks, the agent picks a tool, approval is requested when needed, your code runs, the agent answers" width="760" />
</p>

Step 5 is the boundary that matters: the agent does not implement business operations. It requests a named capability, and your application performs the work. The messages travel over **AITP**, a typed JSON protocol over WebSocket.

For the complete model, read [Core concepts](https://borisbob91.github.io/owllayer/core-concepts/), [Architecture](https://borisbob91.github.io/owllayer/architecture/), and the [AITP protocol](https://borisbob91.github.io/owllayer/aitp-protocol/).

## 9. Security by construction

<p align="center">
  <img src="./assets/owllayer-hitl-approval.png" alt="Approval dialog: the agent asks to run a critical payment action and waits for the user" width="480" />
</p>

OwlLayer AI treats AI execution as an explicit application capability, not as arbitrary automation.

- **No DOM scraping:** agents receive structured contracts and selected context, never implicit access to the rendered page.
- **Schema validation:** every tool defines the input it accepts before execution.
- **Risk-aware policy:** `none` runs directly, `low` runs with a notification, and `high` and `critical` always wait for the user's approval before running.
- **Scoped context:** only data you publish becomes available to the agent.
- **Authoritative handlers:** application code owns side effects, permissions, transactions, and domain rules.
- **Server authority:** the runtime merges UI tools with the tools declared on the server before each agent turn; a server declaration wins if a name collides, so a transient UI component cannot weaken a protected operation, and `server.blockTool('name')` blocks a tool even if a client declares it.
- **Runtime observability:** sessions, calls, approvals, and tool results remain traceable through the runtime surface.

Read the [HITL security guide](https://borisbob91.github.io/owllayer/hitl_security/) before exposing destructive or high-impact operations. Never place provider credentials in browser bundles. For vulnerabilities, follow [SECURITY.md](./SECURITY.md) instead of opening a public issue.


## 10. Repository development and contributing

Requirements: Node.js 22 and pnpm 9.

```bash
git clone https://github.com/borisbob91/owllayer.git
cd owllayer
pnpm install --frozen-lockfile
pnpm lint:packages
pnpm test:packages
pnpm build:packages
```

While developing, target a single package:

```bash
pnpm --filter @owllayer/core test
pnpm --filter @owllayer/react build
```

Public npm artifacts are built only from `packages/`. Applications, plugins, documentation sites, and local planning material are not released.

### 10.1 Repository layout

- `packages/` — the public framework surface: runtime packages, shared primitives, adapters, and the main integrations meant to be consumed by other projects. This is what gets published to npm.
- `apps/` — demo applications and validation environments used to exercise the framework in real scenarios. Excellent for testing behavior and UX, but not part of the published surface.
- `packages/shopify/` and `packages/woocommerce/` — experimental integrations that bring voice shopping to existing storefronts. They evolve quickly and are not published to npm.
- `packages/angular/` — Angular SDK with providers, injectable service, directives, and standalone components.
- `packages/adapter-anthropic/` — Anthropic Claude adapter (text and tool calling).
- `packages/adapter-livekit/` — optional LiveKit runtime for WebRTC rooms, Gemini Live, and agent-session bridging.
- Audio and realtime packages are foundational and tightly coupled to the rest of the system. Changes there must be validated across every package that depends on them.

### 10.2 Contributor workflow

1. Read [CONTRIBUTING.md](./CONTRIBUTING.md) and the [Code of Conduct](./CODE_OF_CONDUCT.md).
2. Search existing issues, then open or reference one before starting non-trivial work.
3. Keep the change inside a single domain: one SDK, Core, Server/adapters, UI, or infrastructure.
4. Add a Changeset for any functional modification to a public `@owllayer/*` package.
5. Explain the affected packages and public APIs in the pull request, and keep CI green before requesting review.

## 11. Project status

OwlLayer AI is under active development. The packages are published on npm and are pre-1.0: APIs may change between minor versions, so use exact versions for production evaluation and review the changelogs when upgrading.

## 12. License

OwlLayer AI is available under the [MIT License](./LICENSE).
