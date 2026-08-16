# Contributing to OwlLayer AI

OwlLayer AI is an open-source **Agentic UI SDK**. To maintain stability, performance, and clear alignment across framework SDKs and integrations, all contributors must strictly follow these contribution rules and workspace workflows.

---

## 1. Core Principles

### Stability Over Elegance
OwlLayer is used in active production environments. **Stability always comes first.** Any code changes must provide a clear, measurable, and verified improvement. Refactoring code "for style" or "elegance" is discouraged.

### Feature Ownership
Every package and feature is assigned a **project owner**. Changes to a feature owned by another contributor will not be accepted without their explicit consent and validation.

---

## 2. Strictly Prohibited Actions

Pull Requests containing any of the following actions will be **automatically closed without review**:

- **Renaming symbols**: Do not rename variables, properties, methods, functions, types, classes, or interfaces (e.g. changing `handleHangUp` to `closeWidget` or `cfg` to `config` is prohibited).
- **Unrequested Refactoring**: Do not restructure imports, decouple working components, or extract helper functions unless explicitly requested in a validated issue.
- **Modifying Existing Comments**: Do not translate, rewrite, or clarify code comments written by other developers.
- **Adding Dependencies**: Do not introduce new npm packages to any `package.json` without open issue approval.
- **Deleting Dead Code**: Do not delete unused functions or code blocks on your own initiative. (Some might be preserved for backward compatibility).
- **Out of Domain Changes**: Do not modify files outside your assigned domain of responsibility.

---

## 3. Workflow & Domains

### Domain Boundaries
A contributor must work within **one domain at a time**. Multi-domain pull requests are rejected.

| Domain | Packages | Description |
|---|---|---|
| **core** | `packages/core` | AITP protocol, VoiceStateMachine, shared types, CSS widget. |
| **server** | `packages/server`, `packages/adapter-*` | WebSocket server, LLM adapters, HITL, session handling. |
| **react** | `packages/react`, `apps/demo` | React SDK, hooks, widget component, React demo. |
| **ui** | `packages/ui` | Cross-framework shared UI runtime, embedded devtools dashboard. |
| **vue** | `packages/vue`, `apps/demo-vue` | Vue SDK, composables, Vue widget, Vue demo. |
| **svelte** | `packages/svelte`, `apps/demo-svelte` | Svelte SDK, Svelte widget, Svelte demo. |
| **browser** | `packages/browser`, `apps/demo-browser` | Vanilla JS SDK, native browser shadow root widget. |
| **shopify** | `packages/shopify` | Shopify Liquid blocks, theme widget scripts. |
| **woocommerce** | `packages/woocommerce` | WordPress WooCommerce plugin. |
| **infra** | `turbo.json`, `pnpm-workspace.yaml`, CI | Build pipelines, Turborepo configs, TS base settings. |

### Sequential Multi-Domain Updates
If a feature requires updates across both `core` and a framework SDK (e.g., React):
1. The **core** contributor implements and merges type/protocol changes first.
2. The **react** contributor subsequently integrates the new features inside the SDK.
Each step must be documented in separate issues/features files.

---

## 4. Code Guidelines

### Error Handling
- Validate inputs **only at system boundaries** (user requests, public API endpoints, WebSocket frames, database responses).
- Do not wrap internal routines with defensive `try/catch` statements. Internal exceptions should bubble up naturally to trigger active error-handling states.

### Dead Code Prevention
- Do not submit unused imports, variables, or functions. The workspace enforces compiler check constraints (`noUnusedLocals: true` is active across all packages).
- If a commented code block must be kept intentionally, append the prefix comment `// KEEP: <reason>`.

### Premature Abstractions
- Do not create helper utilities or generic layers for single-use scenarios.
- Write only the minimum complexity required to satisfy the active issue requirements.

---

## 5. Development Workflow Commands

Run all package workflows from the root repository directory:

```bash
# Install workspace dependencies
pnpm install

# Run build compilation across all packages in dependency order
pnpm build

# Run unit tests across all projects
pnpm test

# Run code style linter
pnpm lint

# Clean build caching files
pnpm clean
```
