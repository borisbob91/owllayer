# @owllayer/browser

Universal Vanilla JavaScript SDK for **OwlLayer AI**. Designed for non-framework web applications (HTML, Laravel Blade, Shopify Liquid, WordPress, PHP, Ruby on Rails, Django).

---

## Features

- **No Framework Required**: Works with vanilla HTML5, legacy stacks, and template engines.
- **HTML Auto-Discovery**: Declare AI tools directly in HTML markup using `data-owllayer-*` attributes.
- **Dual Distribution**: Available as standard npm/ESM package and standalone self-hosted/CDN bundle.
- **Interactive Assistant Widget**: Floating chat and voice widget rendered in isolated Shadow DOM.
- **Human-in-the-Loop (HITL)**: Built-in confirmation dialogs for high-risk tools.
- **Session Persistence**: Automatic localStorage session caching across page navigations.

---

## Installation

### Via NPM / PNPM / Yarn

```bash
# pnpm
pnpm add @owllayer/browser @owllayer/core

# npm
npm install @owllayer/browser @owllayer/core

# yarn
yarn add @owllayer/browser @owllayer/core
```

### Via CDN (Script Tag)

```html
<script src="https://[CDN_URL]/browser@latest/owllayer.min.js"></script>
```

---

## Quick Start

### 1. JavaScript Initialization (ESM)

```ts
import { OwlLayer } from '@owllayer/browser';

await OwlLayer.init({
  apiKey: 'pk_dev_123',
  endpoint: 'ws://localhost:3001/owllayer',
  widget: {
    enabled: true,
    agentName: 'Léa',
    agentTitle: 'Assistant',
  },
  hitl: { enabled: true },
  autoDiscovery: { enabled: true },
  sessionPersistence: { enabled: true, ttlMs: 1800000 },
});

// Imperative tool registration
OwlLayer.registerTool('highlight_section', {
  description: 'Highlight a section of the page',
  risk: 'none',
  handler: ({ selector }) => {
    const el = document.querySelector(String(selector));
    if (el) (el as HTMLElement).style.outline = '2px solid #22c55e';
    return { ok: true };
  },
});
```

### 2. CDN Usage (Vanilla HTML)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Web App</title>
</head>
<body>
  <h1>Welcome to our store</h1>

  <button
    data-owllayer-tool="open_contact_form"
    data-owllayer-description="Open the contact form modal"
    data-owllayer-risk="none"
    data-owllayer-action="click"
    data-owllayer-selector="#contact-button"
  >
    Contact Us
  </button>

  <script src="https://[CDN_URL]/browser@latest/owllayer.min.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', async function () {
      await OwlLayer.init({
        apiKey: 'pk_live_xxxx',
        endpoint: 'wss://[CLOUD_URL]/owllayer',
        widget: { enabled: true },
      });
    });
  </script>
</body>
</html>
```

---

## HTML Auto-Discovery Attributes

When `autoDiscovery: { enabled: true }` is set, OwlLayer scans the DOM for elements with `data-owllayer-*` attributes and exposes them automatically to the AI agent:

| Attribute | Required | Description |
|---|---|---|
| `data-owllayer-tool` | **Yes** | Unique tool name (e.g. `scroll_to_pricing`). |
| `data-owllayer-description` | **Yes** | Description explaining what the action does to the AI. |
| `data-owllayer-risk` | No | Risk level: `none`, `low`, `medium`, `high`, `critical` (default: `none`). |
| `data-owllayer-action` | No | Automated action type: `click`, `focus`, `scrollIntoView`, `setValue`. |
| `data-owllayer-selector` | No | Target CSS selector (defaults to current element). |

---

## Public API Reference

- **`OwlLayer.init(config)`**: Initialize the connection, widget, and auto-discovery.
- **`OwlLayer.registerTool(name, definition)`**: Dynamically register an imperative tool.
- **`OwlLayer.unregisterTool(name)`**: Remove an imperative tool.
- **`OwlLayer.updateContext(data)`**: Update shadow context data sent to the AI.
- **`OwlLayer.sendText(text)`**: Send a prompt or text message to the AI agent.
- **`OwlLayer.destroy()`**: Disconnect client, remove event listeners, and clean up the widget.

---

## License

MIT © OwlLayer
