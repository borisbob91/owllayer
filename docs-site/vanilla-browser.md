# Vanilla Browser SDK

The `@domos/browser` package integrates DomOS directly into any HTML page or server-rendered website (such as WordPress, Shopify Liquid, Webflow, or PHP templates) without requiring a modern JavaScript UI framework.

---

## Installation

### CDN Integration
Include the library directly from the CDN at the end of your `<body>` tag:

```html
<script type="module">
  import { DomOS } from 'https://cdn.domos.dev/browser/latest/domos.min.js';

  await DomOS.init({
    apiKey: 'pk_live_xxxx',
    endpoint: 'wss://api.domos.dev/domos',
    widget: { agentName: 'Alex', voiceEnabled: true }
  });
</script>
```

### NPM Integration
```bash
pnpm add @domos/browser
```
```ts
import { DomOS } from '@domos/browser';

await DomOS.init({ apiKey: 'pk_live_xxxx' });
```

---

## 1. HTML Auto-Discovery (`data-domos-*`)

When `DomOS.init()` executes, the SDK scans the active DOM for elements with `data-domos-tool` attributes and automatically registers them in the tool registry.

```html
<!-- Register a click action -->
<button
  data-domos-tool="clear_filters"
  data-domos-description="Clear all search filters and resets results list"
  data-domos-risk="none"
  data-domos-action="click"
>
  Reset Grid Filters
</button>

<!-- Register a focus action -->
<input
  type="text"
  data-domos-tool="focus_search"
  data-domos-description="Focus the search input field to type queries"
  data-domos-risk="none"
  data-domos-action="focus"
  placeholder="Search..."
/>
```

### Discovery Attributes Reference

| Attribute | Values | Description |
|---|---|---|
| `data-domos-tool` | `string` | Unique identifier name for the tool. |
| `data-domos-description` | `string` | Human-like description of what the element does for the LLM. |
| `data-domos-risk` | `none \| low \| high \| critical` | HITL validation level (default is `none`). |
| `data-domos-action` | `click \| focus \| scrollIntoView \| show \| hide` | DOM action triggered on the element. |

---

## 2. Programmatic API Reference

For dynamic pages or complex AJAX callbacks, declare tools programmatically using the JavaScript API:

```ts
import { DomOS } from '@domos/browser';

// Register custom handler logic
DomOS.registerTool('apply_coupon', {
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
| `DomOS.init(config)` | Initializes the runtime, scans the DOM, and loads the widget. |
| `DomOS.registerTool(name, options)` | Registers a programmatic tool with schema definitions and handlers. |
| `DomOS.unregisterTool(name)` | Removes a tool from the current registry. |
| `DomOS.updateContext(data)` | Appends metadata properties to the current Shadow Context. |
| `DomOS.setContext(data)` | Overwrites the current Shadow Context metadata object. |
| `DomOS.sendText(text)` | Manually dispatches a text input string to the active agent. |
| `DomOS.startVoice()` | Triggers microphone capture sequence (initiates voice mode). |
| `DomOS.stopVoice()` | Suspends voice recording stream. |
| `DomOS.getAgentState()` | Returns the current state string of the `VoiceStateMachine`. |
| `DomOS.disconnect()` | Closes the active WebSocket ADTP session. |
| `DomOS.destroy()` | Deregisters all active tools, disconnects sessions, and unmounts UI nodes. |
