# Quick Start

Create a DomOS server and connect a first interface with explicit context and tools.

In this guide, the interface provides its useful context and authorized tools; the server talks to the model; **ADTP** (*Agent-to-DOM Transfer Protocol*) transports these exchanges over WebSocket.

::: tip Tool Contract
A tool handler must return or `await` all work needed for its result. `DomOSClient` awaits the handler's Promise before sending `TOOL_RESULT`; any background async work is outside this contract.
:::

---

## 1. Create the Server

```bash
mkdir my-domos-app && cd my-domos-app
pnpm init
pnpm add @domos/server @domos/core @domos/adapter-google dotenv
```

```ts
// server.ts
import 'dotenv/config';
import { DomOSServer } from '@domos/server';
import { GoogleAdapter } from '@domos/adapter-google';

const server = new DomOSServer({
  llm: new GoogleAdapter({
    model: 'gemini-2.0-flash',
    apiKey: process.env.GOOGLE_API_KEY!,
    systemPrompt: 'You are an assistant for my application.',
  }),
  port: 3000,
  path: '/domos',
});

server.addApiKey('pk_dev_123');

server.listen(() => console.log('DomOS on ws://localhost:3000/domos'));
```

---

## 2. React Client

```bash
pnpm create vite my-client --template react-ts
cd my-client
pnpm add @domos/react @domos/core zod
```

### Provider

```tsx
// main.tsx
import { DomOSProvider } from '@domos/react';

function App() {
  return (
    <DomOSProvider
      apiKey="pk_dev_123"
      endpoint="ws://localhost:3000/domos"
      config={{ hitl: { ui: 'modal' } }}
    >
      <MyPage />
    </DomOSProvider>
  );
}
```

### First Tool

```tsx
// MyPage.tsx
import { useAgentTool, useAgent } from '@domos/react';
import { z } from 'zod';
import { useState } from 'react';

function MyPage() {
  const { sendText, lastResponse, isThinking } = useAgent();
  const [color, setColor] = useState('white');

  useAgentTool({
    name: 'change_background',
    description: 'Change the page background color',
    schema: z.object({
      color: z.string().describe('CSS color (red, blue, #ff0, etc.)'),
    }),
    risk: 'none',
  }, async ({ color }) => {
    setColor(color);
    return `Background changed to ${color}`;
  });

  return (
    <div style={{ background: color, minHeight: '100vh', padding: 40 }}>
      <h1>DomOS Demo</h1>
      <p>{isThinking ? 'Thinking...' : lastResponse}</p>
      <button onClick={() => sendText('Set the background to blue')}>
        Ask the agent
      </button>
    </div>
  );
}
```

---

## 3. Vue Client

```bash
pnpm create vite my-client-vue --template vue-ts
cd my-client-vue
pnpm add @domos/vue @domos/core zod
```

### Plugin

```ts
// main.ts
import { createApp } from 'vue';
import { DomOSPlugin } from '@domos/vue';
import App from './App.vue';

const app = createApp(App);
app.use(DomOSPlugin, {
  endpoint: 'ws://localhost:3000/domos',
  apiKey: 'pk_dev_123',
  hitl: { ui: 'modal' },
});
app.mount('#app');
```

### First Composable

```vue
<!-- MyPage.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { useAgentTool, useAgent } from '@domos/vue';
import { z } from 'zod';

const { state, sendText } = useAgent();
const color = ref('white');

useAgentTool({
  name: 'change_background',
  description: 'Change the background color',
  schema: z.object({
    color: z.string().describe('CSS color'),
  }),
}, async ({ color: newColor }) => {
  color.value = newColor;
  return `Background changed to ${newColor}`;
});
</script>

<template>
  <div :style="{ background: color, minHeight: '100vh', padding: '40px' }">
    <h1>DomOS Vue</h1>
    <p>{{ state.isThinking ? 'Thinking...' : state.lastResponse }}</p>
    <button @click="sendText('Set the background to green')">
      Ask the agent
    </button>
  </div>
</template>
```

---

## 4. Svelte Client

```bash
npm create svelte@latest my-client-svelte
cd my-client-svelte
pnpm add @domos/svelte @domos/core zod
```

### Layout

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { initDomOS } from '@domos/svelte';

  let cleanup;
  onMount(() => {
    cleanup = initDomOS({
      endpoint: 'ws://localhost:3000/domos',
      apiKey: 'pk_dev_123',
    });
  });
  onDestroy(() => cleanup?.());
</script>

<slot />
```

### First Tool (Svelte Action)

```svelte
<!-- src/routes/+page.svelte -->
<script>
  import { agentTool, createAgent } from '@domos/svelte';
  import { z } from 'zod';

  const { lastResponse, isThinking, sendText } = createAgent();
  let color = 'white';

  const toolOptions = {
    name: 'change_background',
    description: 'Change the page background color',
    schema: z.object({
      color: z.string().describe('CSS color'),
    }),
    risk: 'none',
    handler: async ({ color: newColor }) => {
      color = newColor;
      return `Background changed to ${newColor}`;
    },
  };
</script>

<div use:agentTool={toolOptions} style="background: {color}; min-height: 100vh; padding: 40px;">
  <h1>DomOS Svelte</h1>
  <p>{$isThinking ? 'Thinking...' : $lastResponse}</p>
  <button on:click={() => sendText('Set the background to blue')}>
    Ask the agent
  </button>
</div>
```

---

## 5. Angular Client

```bash
pnpm create @angular my-client-angular
cd my-client-angular
pnpm add @domos/angular @domos/core zod
```

### ApplicationConfig

```ts
// app.config.ts
import type { ApplicationConfig } from '@angular/core';
import { provideDomOS } from '@domos/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideDomOS({
      endpoint: 'ws://localhost:3000/domos',
      apiKey: 'pk_dev_123',
      debug: true,
    }),
  ],
};
```

### First Tool with Signals

```ts
// app.component.ts
import { Component, signal } from '@angular/core';
import { injectDomOS, registerContext } from '@domos/angular';
import { z } from 'zod';

@Component({
  standalone: true,
  selector: 'app-root',
  template: `
    <div [style.background]="color()" style="min-height: 100vh; padding: 40px">
      <h1>DomOS Angular</h1>
      <button (click)="askAgent()">Ask the agent</button>
      <p>{{ domos.state() }}</p>
    </div>
  `,
})
export class AppComponent {
  readonly domos = injectDomOS();
  readonly color = signal('white');
  private disposeTool: VoidFunction = () => {};

  async ngOnInit(): Promise<void> {
    await this.domos.connect();

    this.disposeTool = this.domos.registerTool(
      {
        name: 'change_background',
        description: 'Change the page background color',
        schema: z.object({
          color: z.string().describe('CSS color to apply'),
        }) as any,
        risk: 'none',
      },
      async ({ color }: { color: string }) => {
        this.color.set(color);
        return `Background changed to ${color}`;
      }
    );
  }

  ngOnDestroy(): void {
    this.disposeTool();
    void this.domos.disconnect();
  }

  askAgent(): void {
    this.domos.sendText('Set the background to blue');
  }
}
```

---

## 6. Run

```bash
# Terminal 1
node --loader tsx server.ts

# Terminal 2
cd my-client  # or my-client-vue / my-client-svelte / my-client-angular
pnpm dev
```

Open `http://localhost:5173` and talk to the assistant.

---

## 7. Widget (Quick Alternative)

If you want a built-in chat without building your own UI, use the widget:

```tsx
// React - explicit component
import { DomOSWidget } from '@domos/react';

<DomOSWidget apiKey="pk_dev_123" endpoint="ws://localhost:3000/domos" />
```

```svelte
<!-- Svelte -->
<script>
  import { DomOSWidget } from '@domos/svelte';
</script>

<DomOSWidget apiKey="pk_dev_123" endpoint="ws://localhost:3000/domos" />
```

The widget is a convenience layer. The core of DomOS remains: **context + tools + ADTP protocol**.

---

## 8. Next.js / Nuxt (SSR Client-Only)

### React + Next (App Router)

```tsx
'use client';

import { DomOSProvider } from '@domos/react';

export function DomOSClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <DomOSProvider
      apiKey="pk_dev_123"
      endpoint="ws://localhost:3000/domos"
      config={{ hitl: { ui: 'modal' } }}
    >
      {children}
    </DomOSProvider>
  );
}
```

### Vue + Nuxt

```ts
// plugins/domos.client.ts
import { defineNuxtPlugin } from '#app';
import { DomOSPlugin } from '@domos/vue';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(DomOSPlugin, {
    endpoint: 'ws://localhost:3000/domos',
    apiKey: 'pk_dev_123',
    hitl: { ui: 'modal' },
  });
});
```

DomOS UI SDK is officially supported in **client-only** mode for Next/Nuxt.

---

## Next Steps

- Add more tools with `useAgentTool` (React/Vue) or `use:agentTool` (Svelte)
- Inject context with `useAgentContext` / `use:agentContext`
- Enable voice mode with `useVoiceMode` / `createVoiceMode`
- Configure HITL risk levels
- Structure system prompts with `SystemPromptConfig`
- Check the [Server Setup](/server-setup) chapter for backend tools
- Enable adaptive memory with [Agent Memory](/agent-memory)
