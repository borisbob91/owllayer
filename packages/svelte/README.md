# @owllayer/svelte

Svelte 5 SDK for **OwlLayer AI**. Build Agentic UI applications with Svelte stores, actions, components, real-time voice mode, tool registration, and Human-in-the-Loop (HITL) security.

---

## Features

- **Svelte 5 Reactive Stores**: Fine-grained reactive state for agent status, connection, voice, and session management.
- **Svelte Actions (`use:agentTool`)**: Register tools directly on DOM elements or via declarative Svelte actions.
- **`createVoiceMode`**: Integrated microphone capture, PCM streaming, voice activity detection, and interrupt handling.
- **`OwlLayerWidget.svelte`**: Turnkey floating or embedded AI chat/voice assistant widget.
- **Human-in-the-Loop (HITL)**: Built-in `ApprovalModal` and `ApprovalBanner` components.
- **Specialized Actions & Helpers**: `agentContext`, `navigateTool`, `uiStateTool`, and `createAgentToolResolver`.

---

## Installation

```bash
# pnpm
pnpm add @owllayer/svelte @owllayer/core svelte

# npm
npm install @owllayer/svelte @owllayer/core svelte

# yarn
yarn add @owllayer/svelte @owllayer/core svelte
```

---

## Quick Start

### 1. Initialize the Client

Initialize OwlLayer in your root layout or component (`+layout.svelte` or `App.svelte`):

```svelte
<script lang="ts">
  import { initOwlLayer, OwlLayerWidget } from '@owllayer/svelte';

  initOwlLayer({
    endpoint: 'ws://localhost:3001/owllayer',
    apiKey: 'pk_dev_xxxx',
  });
</script>

<slot />

<OwlLayerWidget agentName="Léa" agentTitle="Assistant" />
```

### 2. Declare Client Tools (`use:agentTool` or `createAgent`)

```svelte
<script lang="ts">
  import { agentTool } from '@owllayer/svelte';

  let isHighlighted = $state(false);

  const highlightToolDef = {
    name: 'highlight_item',
    description: 'Highlight the item on the page',
    risk: 'none',
    handler: async () => {
      isHighlighted = true;
      return { ok: true };
    },
  };
</script>

<div use:agentTool={highlightToolDef} class:highlighted={isHighlighted}>
  <h3>Product Details</h3>
</div>
```

### 3. Voice Mode (`createVoiceMode`)

```svelte
<script lang="ts">
  import { createVoiceMode } from '@owllayer/svelte';

  const { voiceState, isCapturing, startVoice, stopVoice } = createVoiceMode();
</script>

<div>
  <p>Voice State: {$voiceState}</p>
  <button onclick={$isCapturing ? stopVoice : startVoice}>
    {$isCapturing ? 'Stop Talking' : 'Start Voice'}
  </button>
</div>
```

### 4. Reactive Stores

```svelte
<script lang="ts">
  import { agentState, isConnected, sendText } from '@owllayer/svelte';

  function handleSend() {
    sendText('Hello, what can you do?');
  }
</script>

<div>
  <span>Status: {$agentState}</span>
  <span>Connected: {$isConnected ? 'Yes' : 'No'}</span>
  <button onclick={handleSend}>Send Message</button>
</div>
```

---

## Core Exports & Components

### Stores & Actions

| Export | Purpose |
|---|---|
| `initOwlLayer(config)` | Initialize the global OwlLayer client instance. |
| `agentState` | Readable store with current agent state (`idle`, `thinking`, `speaking`, `disconnected`). |
| `use:agentTool` | Svelte action attaching a tool lifecycle to a DOM element. |
| `use:agentContext` | Svelte action syncing element/component context into shadow context. |
| `createVoiceMode()` | Composable returning reactive voice stores and audio controls. |
| `createAgent()` | Composable with agent messaging and event subscription handles. |

### Components

| Component | Description |
|---|---|
| `<OwlLayerWidget />` | Ready-to-use floating chat and voice assistant widget. |
| `<ApprovalModal />` | Modal overlay for confirming high-risk actions. |
| `<ApprovalBanner />` | Top banner for non-blocking HITL confirmations. |
| `<AgentIndicator />` | Visual indicator showing agent status. |

---

## License

MIT © OwlLayer
