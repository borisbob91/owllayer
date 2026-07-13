# Directives & UI Components

Each DomOS client SDK exposes declarative primitives to bind tools, context, and UI behaviors to your components. This page summarizes what's available per framework.

---

## React

### Hooks

| Hook | Purpose |
|---|---|
| `useAgentTool(config, handler)` | Register a tool tied to component lifecycle |
| `useAgentContext(contextFn)` | Inject dynamic context into Shadow Context |
| `useAgent()` | Access `sendText`, `lastResponse`, `isThinking`, `sessionId`, `agentState` |
| `useVoiceMode()` | Manage voice session (start/stop recording, audio state) |
| `useDomOSLiveKitRoom(opts)` | Join/leave a LiveKit room tied to the DomOS session |

### Components

| Component | Purpose |
|---|---|
| `<DomOSProvider>` | Root provider (endpoint, apiKey, HITL config) |
| `<DomOSWidget>` | Drop-in chat/voice widget |
| `<HITLConfirmation>` | Custom HITL approval UI override |

---

## Vue

### Composables

| Composable | Purpose |
|---|---|
| `useAgentTool(config, handler)` | Register a tool tied to component lifecycle |
| `useAgentContext(contextFn)` | Inject dynamic context |
| `useAgent()` | Access `state`, `sendText`, `lastResponse` |
| `useVoiceMode()` | Voice session management |

### Plugin & Components

| API | Purpose |
|---|---|
| `DomOSPlugin` | Vue plugin for `app.use()` |
| `<DomOSWidget>` | Drop-in widget component |

---

## Svelte

### Actions (Directives)

| Action | Purpose |
|---|---|
| `use:agentTool={options}` | Bind a tool to a DOM element's lifecycle |
| `use:agentContext={contextFn}` | Bind context to element visibility |

### Stores & Functions

| API | Purpose |
|---|---|
| `createAgent()` | Returns `agentState`, `lastResponse`, `isThinking`, `sendText` stores |
| `initDomOS(config)` | Initialize connection (layout-level) |
| `createVoiceMode()` | Voice session stores |
| `<DomOSWidget>` | Widget component |

---

## Angular

### Providers & Services

| API | Purpose |
|---|---|
| `provideDomOS(config)` | Root-level DI provider |
| `injectDomOS()` | Inject the DomOS service (connect, registerTool, sendText, state signal) |
| `registerContext(ctx)` | Push context to Shadow Context |

### Directives

| Directive | Purpose |
|---|---|
| `registerToolResolver()` | Centralized tool registration via resolver pattern |

### Patterns

- Tools register in `ngOnInit`, dispose in `ngOnDestroy`
- Use Angular signals for reactive context
- Convert RxJS to `firstValueFrom()` in tool handlers

---

## Browser (Vanilla JS)

### Imperative API

| Method | Purpose |
|---|---|
| `DomOS.init(config)` | Initialize client connection |
| `DomOS.registerTool(config, handler)` | Register a tool manually |
| `DomOS.unregisterTool(name)` | Remove a tool |
| `DomOS.updateContext(ctx)` | Push context update |
| `DomOS.sendText(msg)` | Send user message |

### Auto-Discovery (HTML Directives)

The Browser SDK can auto-discover tools from HTML attributes:

```html
<button
  data-domos-tool="add_to_cart"
  data-domos-description="Add this product to the cart"
  data-domos-risk="low"
  data-domos-args='{"productId": "kb-99"}'
>
  Add to Cart
</button>
```

When the element enters/leaves the DOM, the tool is automatically registered/unregistered. This enables agentic UI without writing JavaScript.

### Widget (Script Tag)

```html
<script src="https://cdn.domos.dev/widget.js"
  data-endpoint="ws://localhost:3000/domos"
  data-api-key="pk_dev_123"
></script>
```

---

## Cross-SDK Summary

| Capability | React | Vue | Svelte | Angular | Browser |
|---|---|---|---|---|---|
| Tool declaration | hook | composable | action | service | imperative / HTML attr |
| Context injection | hook | composable | action | signal + fn | imperative |
| Lifecycle cleanup | automatic | automatic | automatic | manual (OnDestroy) | manual / DOM observer |
| Widget | component | component | component | n/a | script tag |
| Voice mode | hook | composable | store | service | imperative |
