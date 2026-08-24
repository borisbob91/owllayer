# Architecture

OwlLayer lets an agent act within an existing interface only through the tools the application declares. The frontend exposes the useful context of the current screen and its active tools; `OwlLayerServer` maintains the session and talks to the configured LLM adapter.

---

## Main Flow: AITP (legacy AITP)

**AITP** (*Agent-to-Interface Transfer Protocol*) is the JSON message protocol transported over WebSocket between `OwlLayerClient` and `OwlLayerServer`. **AITP** is the legacy name and remains a valid compatibility alias. AITP carries application-authorized information, visible tools, and action requests, without giving the model free access to the DOM.

The cycle is:

1. The framework SDK uses the `OwlLayerClient` runtime from `@owllayer/core`.
2. The client synchronizes its context and active tools via `CONTEXT_UPDATE`.
3. `OwlLayerServer` stores this state in the relevant session and sends it to the LLM adapter when a user message arrives.
4. If the model requests a frontend tool, the server sends `TOOL_CALL` to the same client and awaits its `TOOL_RESULT`.

---

## System Layers

| Layer | Main Package | Responsibility |
|---|---|---|
| Shared contracts | `packages/core/` | AITP protocol, `OwlLayerClient`, tool registry, HITL, and voice states |
| Server | `packages/server/` | Sessions, transport, routing, security, storage, and LLM orchestration |
| Model adapters | `packages/adapter-google/`, `packages/adapter-openai/` | Connect OwlLayer to the selected model provider |
| UI SDKs | `packages/react/`, `vue/`, `svelte/`, `angular/`, `browser/` | Expose OwlLayer primitives in developer applications |
| Demos | `apps/demo*` | Demo applications for each SDK |
| Documentation | `apps/docs-site/` (Astro), `docs-site/` (VitePress) | Published documentation |

---

## Monorepo Structure

```
owllayer/
├─ apps/
│  ├─ demo/              # React demo
│  ├─ demo-vue/          # Vue demo
│  ├─ demo-svelte/       # Svelte demo
│  ├─ demo-browser/      # Browser SDK demo
│  ├─ demo-angular/      # Angular demo
│  ├─ demo-server/       # Demo server
│  └─ docs-site/         # Astro + Starlight docs
├─ packages/
│  ├─ core/              # Shared contracts & client runtime
│  ├─ server/            # Node.js server & transport
│  ├─ adapter-google/    # Gemini adapter
│  ├─ adapter-openai/    # OpenAI adapter
│  ├─ react/             # React SDK
│  ├─ vue/               # Vue SDK
│  ├─ svelte/            # Svelte SDK
│  ├─ angular/           # Angular SDK
│  ├─ browser/           # Vanilla JS / Preact SDK
│  └─ ui/                # Shared UI runtime & dashboard
├─ plugins/               # Official plugin packages
├─ docs-site/             # VitePress EN docs (this site)
└─ docs/                  # Historical Markdown sources
```

---

## What Crosses the Layers

Interface context is not an authorization to act. Exposed data helps the model understand the situation; only declared tools define the actions it can request. The server then applies authentication, rate limiting, and HITL control before routing a call.

### Data flow summary

```
┌─────────────────┐    AITP/WS    ┌─────────────────┐    LLM API    ┌───────────────┐
│   Browser App   │◄───────────►│ OwlLayer Server│◄───────────►│  LLM Provider │
│                 │              │                 │              │               │
│ • OwlLayerClient   │              │ • Sessions       │              │ • Gemini      │
│ • Tool Registry │              │ • Auth/Rate Limit│              │ • OpenAI      │
│ • Shadow Context│              │ • HITL Enforce   │              │ • Custom      │
│ • HITL UI       │              │ • Adapter Routing│              │               │
└─────────────────┘              └─────────────────┘              └───────────────┘
```

---

## Adapters

OwlLayer uses an adapter pattern to connect to LLM providers. Each adapter translates OwlLayer session state (context + tools + history) into the provider's native API format.

Currently supported:

- **`@owllayer/adapter-google`**: Gemini models (2.0 Flash, Pro, etc.)
- **`@owllayer/adapter-openai`**: OpenAI models (GPT-4o, etc.)

Custom adapters can be built by implementing the `LLMAdapter` interface from `@owllayer/core`.

---

## Technical Notes

- The repository is a **pnpm monorepo** with **Turborepo** orchestration.
- Builds and tests run from the root.
- All packages share a common `tsconfig.base.json`.
- Tests use **Vitest**.
- CI uses GitHub Actions with Danger.js for PR checks.
