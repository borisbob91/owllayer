# @owllayer/vue

Vue 3 SDK for **OwlLayer AI**. Build Agentic UI applications with Vue composables, components, real-time voice mode, dynamic tool registration, and Human-in-the-Loop (HITL) security.

---

## Features

- **`OwlLayerPlugin`**: Vue 3 plugin managing reactive state, WebSocket connection, and session lifecycle.
- **`useAgentTool`**: Register reactive frontend tools directly within Vue components (auto-registered on mount, unregistered on unmount).
- **`useVoiceMode`**: Integrated microphone capture, PCM streaming, voice activity detection, and interrupt handling.
- **`OwlLayerWidget`**: Turnkey floating or embedded AI chat/voice assistant widget.
- **Human-in-the-Loop (HITL)**: Built-in `ApprovalModal` and `ApprovalBanner` Vue components for sensitive tool execution.
- **Specialized Composables**: `useNavigationTool`, `useViewStateTool`, `useAgentContext`, `useOwlLayerEvent`.

---

## Installation

```bash
# pnpm
pnpm add @owllayer/vue @owllayer/core vue

# npm
npm install @owllayer/vue @owllayer/core vue

# yarn
yarn add @owllayer/vue @owllayer/core vue
```

---

## Quick Start

### 1. Setup the Plugin

Install `OwlLayerPlugin` in your Vue app entrypoint:

```ts
import { createApp } from 'vue';
import { OwlLayerPlugin } from '@owllayer/vue';
import App from './App.vue';

const app = createApp(App);

app.use(OwlLayerPlugin, {
  endpoint: 'ws://localhost:3001/owllayer',
  apiKey: 'pk_dev_xxxx',
});

app.mount('#app');
```

### 2. Embed the Widget

In your root template (`App.vue`):

```vue
<template>
  <router-view />
  <OwlLayerWidget agent-name="Léa" agent-title="Assistant" />
</template>

<script setup lang="ts">
import { OwlLayerWidget } from '@owllayer/vue';
</script>
```

### 3. Declare Client Tools (`useAgentTool`)

Tools declared with `useAgentTool` are available to the AI only while the component is mounted:

```vue
<template>
  <div :class="['product-card', { highlighted: isHighlighted }]">
    <h2>{{ product.name }}</h2>
    <p>{{ product.price }} €</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAgentTool } from '@owllayer/vue';

const props = defineProps<{
  product: { id: string; name: string; price: number };
}>();

const isHighlighted = ref(false);

useAgentTool({
  name: 'highlight_product',
  description: 'Highlight the currently viewed product',
  parameters: {
    type: 'object',
    properties: {
      color: { type: 'string' },
    },
  },
  risk: 'none',
  handler: async () => {
    isHighlighted.value = true;
    return { success: true };
  },
});
</script>
```

### 4. Voice Mode (`useVoiceMode`)

```vue
<template>
  <div>
    <p>Voice State: {{ voiceState }}</p>
    <button @click="isCapturing ? stopVoice() : startVoice()">
      {{ isCapturing ? 'Stop Talking' : 'Start Voice' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useVoiceMode } from '@owllayer/vue';

const { voiceState, isCapturing, startVoice, stopVoice } = useVoiceMode();
</script>
```

---

## Core Composables & Components

### Composables

| Composable | Purpose |
|---|---|
| `useAgent()` | Access global agent reactive state (`idle`, `thinking`, `speaking`), session ID, and send messages. |
| `useAgentTool(definition)` | Register a client-side tool with the server. |
| `useVoiceMode()` | Full microphone capture and audio playback control. |
| `useAgentContext(key, data)` | Sync local component state into the AI's shadow context. |
| `useNavigationTool()` | Expose Vue router navigation actions to the AI. |
| `useApproval()` | Manage pending HITL approval requests. |

### Components

| Component | Description |
|---|---|
| `<OwlLayerWidget />` | Ready-to-use floating chat and voice assistant widget. |
| `<ApprovalModal />` | Modal overlay for confirming high-risk actions. |
| `<ApprovalBanner />` | Non-blocking top banner for HITL confirmation. |
| `<AgentIndicator />` | Visual indicator showing agent status and voice activity. |

---

## License

MIT © OwlLayer
