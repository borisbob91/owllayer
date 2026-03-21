# Getting Started

Guide pas-a-pas pour creer votre premiere application DomOS.

## 1. Creer le serveur

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
    systemPrompt: 'Tu es un assistant pour mon application.',
  }),
  port: 3000,
  path: '/domos',
});

server.addApiKey('pk_dev_123');

// Tool serveur (optionnel) â€” pour les actions qui necessitent le backend
server.tool('get_weather', async ({ city }) => {
  // Appeler une API meteo
  return { city, temp: 22, condition: 'Ensoleille' };
});

server.listen(() => console.log('DomOS sur ws://localhost:3000/domos'));
```

## 2. Creer le client React

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
    <DomOSProvider apiKey="pk_dev_123" endpoint="ws://localhost:3000/domos">
      <MyPage />
    </DomOSProvider>
  );
}
```

### Premier tool

```tsx
// MyPage.tsx
import { useAgentTool, useAgent } from '@domos/react';
import { z } from 'zod';
import { useState } from 'react';

function MyPage() {
  const { sendText, lastResponse, isThinking } = useAgent();
  const [color, setColor] = useState('white');

  // L'agent peut changer la couleur de fond
  useAgentTool({
    name: 'change_background',
    description: 'Changer la couleur de fond de la page',
    schema: z.object({
      color: z.string().describe('Couleur CSS (red, blue, #ff0, etc.)'),
    }),
    risk: 'none',
  }, async ({ color }) => {
    setColor(color);
    return `Fond change en ${color}`;
  });

  return (
    <div style={{ background: color, minHeight: '100vh', padding: 40 }}>
      <h1>DomOS Demo</h1>
      <p>{isThinking ? 'Reflexion...' : lastResponse}</p>
      <button onClick={() => sendText('Mets le fond en bleu')}>
        Demander a l'agent
      </button>
    </div>
  );
}
```

## 3. Creer le client Vue

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
});
app.mount('#app');
```

### Premier composable

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
  description: 'Changer la couleur de fond',
  schema: z.object({
    color: z.string().describe('Couleur CSS'),
  }),
}, async ({ color: newColor }) => {
  color.value = newColor;
  return `Fond change en ${newColor}`;
});
</script>

<template>
  <div :style="{ background: color, minHeight: '100vh', padding: '40px' }">
    <h1>DomOS Vue</h1>
    <p>{{ state.isThinking ? 'Reflexion...' : state.lastResponse }}</p>
    <button @click="sendText('Mets le fond en vert')">
      Demander a l'agent
    </button>
  </div>
</template>
```

## 4. Creer le client Svelte

```bash
npm create svelte@latest my-client-svelte
cd my-client-svelte
pnpm add @domos/svelte @domos/core zod
```

### Layout racine

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

### Premier tool (action Svelte)

```svelte
<!-- src/routes/+page.svelte -->
<script>
  import { agentTool } from '@domos/svelte';
  import { createAgent } from '@domos/svelte';
  import { z } from 'zod';

  const { agentState, lastResponse, isThinking, sendText } = createAgent();
  let color = 'white';

  const toolOptions = {
    name: 'change_background',
    description: 'Changer la couleur de fond de la page',
    schema: z.object({
      color: z.string().describe('Couleur CSS (red, blue, #ff0, etc.)'),
    }),
    risk: 'none',
    handler: async ({ color: newColor }) => {
      color = newColor;
      return `Fond change en ${newColor}`;
    },
  };
</script>

<div use:agentTool={toolOptions} style="background: {color}; min-height: 100vh; padding: 40px;">
  <h1>DomOS Svelte</h1>
  <p>{$isThinking ? 'Reflexion...' : $lastResponse}</p>
  <button on:click={() => sendText('Mets le fond en bleu')}>
    Demander a l'agent
  </button>
</div>
```

## 5. Lancer

```bash
# Terminal 1
node --loader tsx server.ts

# Terminal 2
cd my-client  # ou my-client-vue / my-client-svelte
pnpm dev
```

Ouvrez `http://localhost:5173` et parlez a l'assistant !

## 6. Widget (alternative rapide)

Si vous voulez un chat integre sans construire votre propre UI, utilisez le widget :

```tsx
// React - composant explicite
import { DomOSWidget, DomOSProvider } from '@domos/react';

<DomOSWidget apiKey="pk_dev_123" endpoint="ws://localhost:3000/domos" />

// React - auto-mount via Provider (v1)
<DomOSProvider
  apiKey="pk_dev_123"
  endpoint="ws://localhost:3000/domos"
  config={{
    widget: {
      enabled: true,
      config: { stylePreset: 'chat', mode: 'audio' },
    },
  }}
>
  <MyApp />
</DomOSProvider>
```

```svelte
<!-- Svelte -->
<script>
  import { DomOSWidget, initDomOS } from '@domos/svelte';
</script>

<DomOSWidget apiKey="pk_dev_123" endpoint="ws://localhost:3000/domos" />

<!-- Svelte - auto-mount -->
<script>
  initDomOS({
    endpoint: 'ws://localhost:3000/domos',
    apiKey: 'pk_dev_123',
    widget: { enabled: true, config: { stylePreset: 'travel', mode: 'audio' } },
  });
</script>
```

Le widget explicite est autonome. En mode auto-mount, configurez `widget: { enabled: true }` dans React/Vue/Svelte. Voir [WIDGET.md](WIDGET.md) pour la configuration complete.

Les applications `apps/demo*` restent la reference fonctionnelle principale pour les comportements UI/audio.

## Prochaines etapes

- Ajoutez plus de tools avec `useAgentTool` (React/Vue) ou `use:agentTool` (Svelte)
- Injectez du contexte avec `useAgentContext` / `use:agentContext`
- Activez le mode vocal avec `useVoiceMode` / `createVoiceMode`
- Configurez les niveaux de risque HITL
- Utilisez `SystemPromptConfig` pour structurer vos prompts (voir [SYSTEM_PROMPT.md](SYSTEM_PROMPT.md))
- Ajoutez des tools serveur pour l'acces aux donnees

