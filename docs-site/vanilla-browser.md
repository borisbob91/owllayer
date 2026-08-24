# Vanilla Browser SDK

The `@owllayer/browser` package integrates the Agentic UI SDK directly into any HTML page or server-rendered website (such as WordPress, Shopify Liquid, Webflow, or PHP templates) without requiring a modern JavaScript UI framework.

The current protocol name is **AITP** (*Agent-to-Interface Transfer Protocol*). **AITP** is the legacy compatibility name retained by the current wire contract and existing runtime identifiers.

---

## Installation

### CDN Integration
Include the library directly from the CDN at the end of your `<body>` tag:

```html
<script type="module">
  import { OwlLayer } from 'https://cdn.owllayer.dev/browser/latest/owllayer.min.js';

  await OwlLayer.init({
    apiKey: 'pk_live_xxxx',
    endpoint: 'wss://api.owllayer.dev/owllayer',
    widget: { agentName: 'Alex', voiceEnabled: true }
  });
</script>
```

### NPM Integration
```bash
pnpm add @owllayer/browser
```
```ts
import { OwlLayer } from '@owllayer/browser';

await OwlLayer.init({ apiKey: 'pk_live_xxxx' });
```

---

## 1. HTML Auto-Discovery (`data-owllayer-*`)

When `OwlLayer.init()` executes, the SDK scans the active DOM for elements with `data-owllayer-tool` attributes and automatically registers them in the tool registry.

```html
<!-- Register a click action -->
<button
  data-owllayer-tool="clear_filters"
  data-owllayer-description="Clear all search filters and resets results list"
  data-owllayer-risk="none"
  data-owllayer-action="click"
>
  Reset Grid Filters
</button>

<!-- Register a focus action -->
<input
  type="text"
  data-owllayer-tool="focus_search"
  data-owllayer-description="Focus the search input field to type queries"
  data-owllayer-risk="none"
  data-owllayer-action="focus"
  placeholder="Search..."
/>
```

### Discovery Attributes Reference

| Attribute | Values | Description |
|---|---|---|
| `data-owllayer-tool` | `string` | Unique identifier name for the tool. |
| `data-owllayer-description` | `string` | Human-like description of what the element does for the LLM. |
| `data-owllayer-risk` | `none \| low \| high \| critical` | HITL validation level (default is `none`). |
| `data-owllayer-action` | `click \| focus \| scrollIntoView \| show \| hide` | DOM action triggered on the element. |

---

## 2. Programmatic API Reference

For dynamic pages or complex AJAX callbacks, declare tools programmatically using the JavaScript API:

```ts
import { OwlLayer } from '@owllayer/browser';

// Register custom handler logic
OwlLayer.registerTool('apply_coupon', {
  description: 'Apply a checkout discount coupon code',
  parameters: {
    type: 'object',
    properties: {
      code: { type: 'string', description: 'The coupon code (e.g. SAVE10)' }
    },
    required: ['code']
  },
  risk: 'low',
  handler: async ({ code }) => {
    const success = await applyDiscount(code);
    return { success, message: success ? 'Coupon applied' : 'Invalid coupon' };
  }
});
```

### API Methods Summary

| Method | Description |
|---|---|
| `OwlLayer.init(config)` | Initializes the runtime, scans the DOM, and loads the widget. |
| `OwlLayer.registerTool(name, options)` | Registers a programmatic tool with schema definitions and handlers. |
| `OwlLayer.unregisterTool(name)` | Removes a tool from the current registry. |
| `OwlLayer.updateContext(data)` | Appends metadata properties to the current Shadow Context. |
| `OwlLayer.setContext(data)` | Overwrites the current Shadow Context metadata object. |
| `OwlLayer.sendText(text)` | Manually dispatches a text input string to the active agent. |
| `OwlLayer.startVoice()` | Triggers microphone capture sequence (initiates voice mode). |
| `OwlLayer.stopVoice()` | Suspends voice recording stream. |
| `OwlLayer.getAgentState()` | Returns the current state string of the `VoiceStateMachine`. |
| `OwlLayer.disconnect()` | Closes the active WebSocket AITP session (with AITP legacy wire compatibility). |
| `OwlLayer.destroy()` | Deregisters all active tools, disconnects sessions, and unmounts UI nodes. |
