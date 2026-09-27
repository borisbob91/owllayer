# Svelte SDK Integration

The `@owllayer/svelte` package integrates Agentic UI SDK client registries and WebSocket sessions with Svelte's stores and action directives.

---

## Installation

Install the required Svelte bindings and validations:
```bash
pnpm add @owllayer/svelte @owllayer/core zod
```

---

## 1. Setup (`initOwlLayer`)

Initialize the socket lifecycle on mount inside your root layout component:

```svelte
<!-- +layout.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { initOwlLayer } from '@owllayer/svelte';

  let destroySession;

  onMount(() => {
    destroySession = initOwlLayer({
      endpoint: 'wss://api.owllayer.dev/owllayer',
      apiKey: 'pk_live_xxxx',
      debug: true
    });
  });

  onDestroy(() => {
    if (destroySession) destroySession();
  });
</script>

<slot />
```

---

## 2. Declaring Tools (`agentTool` Action Directive)

In Svelte, tools are declared using **Svelte actions**. This binds tool registrations directly to the lifecycle of HTML elements in the DOM.

```svelte
<script>
  import { agentTool } from '@owllayer/svelte';
  import { z } from 'zod';

  export let productId;
  export let stock = 10;

  // Options configuration object
  $: toolOptions = {
    name: `purchase_item_${productId}`,
    description: `Purchase this item directly. Current stock is ${stock}.`,
    schema: z.object({
      qty: z.number().min(1).default(1)
    }),
    risk: 'critical', // Will show checkout confirmation overlay
    handler: async ({ qty }) => {
      const order = await api.buy(productId, qty);
      return { orderId: order.id, total: order.amount };
    }
  };
</script>

<!-- The tool registers when this div mounts, and unmounts with it -->
<div class="product-item" use:agentTool={toolOptions}>
  <h3>Product details</h3>
  <p>Available stock: {stock}</p>
</div>
```

---

## 3. Passive Context (`agentContext` Action Directive)

You can sync shadow context parameters using the `agentContext` directive:

```svelte
<script>
  import { agentContext } from '@owllayer/svelte';

  export let pageType = 'category';
  export let activeFilters = [];

  // Re-evaluates context changes reactively
  $: contextData = { pageType, activeFilters };
</script>

<div class="category-grid" use:agentContext={contextData}>
  <!-- grid items -->
</div>
```

---

## 4. UI Access (`createAgent` & `createVoiceMode`)

The SDK provides stores to track agent responses and capture vocal inputs:

```svelte
<script>
  import { createAgent, createVoiceMode } from '@owllayer/svelte';

  const { agentState, lastResponse, isThinking, sendText } = createAgent();
  const { isRecording, startRecording, stopRecording } = createVoiceMode();
</script>

<div class="voice-bar">
  <p>Agent Status: {$agentState}</p>
  <p>Thinking: {$isThinking ? 'Yes' : 'No'}</p>
  <p>Response: {$lastResponse}</p>

  <button on:click={() => sendText("Explain details")}>Send Text</button>
  
  <button on:click={$isRecording ? stopRecording : startRecording}>
    {$isRecording ? 'Stop Voice' : 'Talk to Agent'}
  </button>
</div>
```

---

## 5. UI Components

Import standard widgets or indicators:

```svelte
<script>
  import { OwlLayerWidget, AgentIndicator } from '@owllayer/svelte';
</script>

<AgentIndicator />

<OwlLayerWidget
  apiKey="pk_live_xxxx"
  endpoint="wss://api.owllayer.dev/owllayer"
  config={{ agentName: 'Max', voiceEnabled: true }}
/>
```
