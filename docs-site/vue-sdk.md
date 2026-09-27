# Vue SDK Integration

The `@owllayer/vue` package provides native Vue 3 integrations for the Agentic UI SDK, featuring a reactive plugin, composables, and components.

---

## Installation

Install the required package dependencies:
```bash
pnpm add @owllayer/vue @owllayer/core zod
```

---

## 1. Setup (`OwlLayerPlugin`)

Initialize the client engine inside your main entrance script using Vue's plugin architecture:

```ts
import { createApp } from 'vue';
import { OwlLayerPlugin } from '@owllayer/vue';
import App from './App.vue';

const app = createApp(App);

app.use(OwlLayerPlugin, {
  endpoint: 'wss://api.owllayer.dev/owllayer',
  apiKey: 'pk_live_xxxx',
  debug: true,
  voice: true,
});

app.mount('#app');
```

---

## 2. Declaring Tools (`useAgentTool`)

Register components actions inside `<script setup>` tags. The composable registers the tool on mount and clean up on unmount automatically.

```vue
<script setup>
import { useAgentTool } from '@owllayer/vue';
import { z } from 'zod';

const props = defineProps({
  productId: String,
  price: Number
});

useAgentTool({
  name: `add_to_cart_${props.productId}`,
  description: `Add this item to the cart (Price: ${props.price} EUR)`,
  schema: z.object({
    qty: z.number().min(1).default(1)
  }),
  risk: 'low',
}, async ({ qty }) => {
  // Call internal cart service
  cart.add(props.productId, qty);
  return { status: 'success', message: `${qty} items added.` };
});
</script>

<template>
  <div class="product-card">
    Product: {{ productId }}
  </div>
</template>
```

---

## 3. Reactive Context Updates (`useAgentContext`)

In Vue, context updates can accept a reactive getter function. The SDK evaluates the getter function dynamically to transmit updated properties whenever reactive dependencies change.

```vue
<script setup>
import { computed } from 'vue';
import { useAgentContext } from '@owllayer/vue';

const props = defineProps({
  user: Object
});

// Reacts to changes in user profile props automatically
useAgentContext(() => ({
  isLoggedIn: !!props.user,
  userName: props.user?.name || 'Guest',
  userPlan: props.user?.plan || 'Free'
}));
</script>
```

---

## 4. UI Access (`useAgent` & `useVoiceMode`)

To build custom UI controls or trigger audio calls from your templates:

```vue
<script setup>
import { useAgent, useVoiceMode } from '@owllayer/vue';

const { state, sendText } = useAgent();
const { isRecording, startRecording, stopRecording } = useVoiceMode();
</script>

<template>
  <div class="agent-panel">
    <p>Status: {{ state.agentState }}</p>
    <p>Last Agent Reply: {{ state.lastResponse }}</p>
    
    <button @click="sendText('Hi Agent!')" :disabled="!state.isConnected">
      Send Hello
    </button>
    
    <button @click="isRecording ? stopRecording() : startRecording()">
      {{ isRecording ? '🔴 Stop Recording' : '🎤 Talk' }}
    </button>
  </div>
</template>
```

---

## 5. Pre-built Components

Import standard widgets or workflow indicators directly into Vue templates:

```vue
<script setup>
import { OwlLayerWidget, AgentIndicator } from '@owllayer/vue';
</script>

<template>
  <AgentIndicator />
  <OwlLayerWidget
    apiKey="pk_live_xxxx"
    endpoint="wss://api.owllayer.dev/owllayer"
    :config="{ agentName: 'Alice', mode: 'text' }"
  />
</template>
```
