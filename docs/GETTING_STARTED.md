# Getting Started with OwlLayer AI

Guide pas-à-pas pour créer votre première intégration avec l'**Agentic UI SDK** OwlLayer AI.

Le serveur et la couche d'exécution constituent l'**OwlLayer AI Runtime**. Les exemples ci-dessous utilisent volontairement les imports `@owllayer/*`, les classes `OwlLayer*` et le chemin WebSocket `/owllayer` actuellement présents dans le dépôt. Pendant la période de compatibilité, ne les remplacez pas par de futurs noms de package ou d'API.

Le protocole s'appelle désormais **AITP** (*Agent-to-Interface Transfer Protocol*). **AITP** est son nom historique ; le renommage ne modifie ni les messages, ni leur ordre, ni le transport, ni les règles de sécurité, ni le contrat filaire.

## 1. Creer le serveur

```bash
mkdir my-owllayer-app && cd my-owllayer-app
pnpm init
pnpm add @owllayer/server @owllayer/core @owllayer/adapter-google dotenv
```

```ts
// server.ts
import 'dotenv/config';
import { OwlLayerServer } from '@owllayer/server';
import { GoogleAdapter } from '@owllayer/adapter-google';

const server = new OwlLayerServer({
  llm: new GoogleAdapter({
    model: 'gemini-2.0-flash',
    apiKey: process.env.GOOGLE_API_KEY!,
    systemPrompt: 'Tu es un assistant pour mon application.',
  }),
  port: 3000,
  path: '/owllayer',
});

server.addApiKey('pk_dev_123');

// Tool serveur (optionnel) â€” pour les actions qui necessitent le backend
server.tool('get_weather', async ({ city }) => {
  // Appeler une API meteo
  return { city, temp: 22, condition: 'Ensoleille' };
});

server.listen(() => console.log('OwlLayer sur ws://localhost:3000/owllayer'));
```

## 2. Creer le client React

```bash
pnpm create vite my-client --template react-ts
cd my-client
pnpm add @owllayer/react @owllayer/core zod
```

### Provider

```tsx
// main.tsx
import { OwlLayerProvider } from '@owllayer/react';

function App() {
  return (
    <OwlLayerProvider
      apiKey="pk_dev_123"
      endpoint="ws://localhost:3000/owllayer"
      config={{
        hitl: { ui: 'modal' }, // 'modal' (defaut) | 'banner' | 'none'
      }}
    >
      <MyPage />
    </OwlLayerProvider>
  );
}
```

### Premier tool

```tsx
// MyPage.tsx
import { useAgentTool, useAgent } from '@owllayer/react';
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
      <h1>OwlLayer Demo</h1>
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
pnpm add @owllayer/vue @owllayer/core zod
```

### Plugin

```ts
// main.ts
import { createApp } from 'vue';
import { OwlLayerPlugin } from '@owllayer/vue';
import App from './App.vue';

const app = createApp(App);
app.use(OwlLayerPlugin, {
  endpoint: 'ws://localhost:3000/owllayer',
  apiKey: 'pk_dev_123',
  hitl: { ui: 'modal' }, // 'modal' (defaut) | 'banner' | 'none'
});
app.mount('#app');
```

### Premier composable

```vue
<!-- MyPage.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { useAgentTool, useAgent } from '@owllayer/vue';
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
    <h1>OwlLayer Vue</h1>
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
pnpm add @owllayer/svelte @owllayer/core zod
```

### Layout racine

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { initOwlLayer } from '@owllayer/svelte';

  let cleanup;
  onMount(() => {
    cleanup = initOwlLayer({
      endpoint: 'ws://localhost:3000/owllayer',
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
  import { agentTool } from '@owllayer/svelte';
  import { createAgent } from '@owllayer/svelte';
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
  <h1>OwlLayer Svelte</h1>
  <p>{$isThinking ? 'Reflexion...' : $lastResponse}</p>
  <button on:click={() => sendText('Mets le fond en bleu')}>
    Demander a l'agent
  </button>
</div>
```

## 5. Creer le client Angular

```bash
pnpm create @angular my-client-angular
cd my-client-angular
pnpm add @owllayer/angular @owllayer/core zod
```

### ApplicationConfig

```ts
// app.config.ts
import type { ApplicationConfig } from '@angular/core';
import { provideOwlLayer } from '@owllayer/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideOwlLayer({
      endpoint: 'ws://localhost:3000/owllayer',
      apiKey: 'pk_dev_123',
      debug: true,
      componentId: 'my-angular-app',
    }),
  ],
};
```

### Premier contexte + premier tool

```ts
// app.component.ts
import { Component, effect, signal } from '@angular/core';
import { injectOwlLayer, registerContext } from '@owllayer/angular';
import { z } from 'zod';

@Component({
  standalone: true,
  selector: 'app-root',
  template: `
    <button (click)="askAgent()">Demander a l'agent</button>
    <p>Etat: {{ owllayer.state() }}</p>
  `,
})
export class AppComponent {
  readonly owllayer = injectOwlLayer();
  readonly color = signal('white');
  private disposeTool: VoidFunction = () => {};

  constructor() {
    effect(() => {
      registerContext({
        page: 'home',
        currentColor: this.color(),
        pageGoal: 'Changer dynamiquement la couleur de fond',
      });
    });
  }

  async ngOnInit(): Promise<void> {
    await this.owllayer.connect();

    this.disposeTool = this.owllayer.registerTool(
      {
        name: 'change_background',
        description: 'Changer la couleur de fond de la page courante',
        schema: z.object({
          color: z.string().describe('Couleur CSS a appliquer au fond'),
        }) as any,
        risk: 'none',
      },
      async ({ color }: { color: string }) => {
        this.color.set(color);
        return `Fond change en ${color}`;
      }
    );
  }

  ngOnDestroy(): void {
    this.disposeTool();
    void this.owllayer.disconnect();
  }

  askAgent(): void {
    this.owllayer.sendText('Mets le fond en bleu');
  }
}
```

Voir aussi la doc Angular detaillee : [docs/angular/README.md](./angular/README.md).

## 6. Lancer

```bash
# Terminal 1
node --loader tsx server.ts

# Terminal 2
cd my-client  # ou my-client-vue / my-client-svelte / my-client-angular
pnpm dev
```

Ouvrez `http://localhost:5173` et parlez a l'assistant !

## 7. Widget (alternative rapide)

Si vous voulez un chat integre sans construire votre propre UI, utilisez le widget :

```tsx
// React - composant explicite
import { OwlLayerWidget, OwlLayerProvider } from '@owllayer/react';

<OwlLayerWidget apiKey="pk_dev_123" endpoint="ws://localhost:3000/owllayer" />

// React - auto-mount via Provider (v1)
<OwlLayerProvider
  apiKey="pk_dev_123"
  endpoint="ws://localhost:3000/owllayer"
  config={{
    widget: {
      enabled: true,
      config: { stylePreset: 'chat', mode: 'audio' },
    },
  }}
>
  <MyApp />
</OwlLayerProvider>
```

```svelte
<!-- Svelte -->
<script>
  import { OwlLayerWidget, initOwlLayer } from '@owllayer/svelte';
</script>

<OwlLayerWidget apiKey="pk_dev_123" endpoint="ws://localhost:3000/owllayer" />

<!-- Svelte - auto-mount -->
<script>
  initOwlLayer({
    endpoint: 'ws://localhost:3000/owllayer',
    apiKey: 'pk_dev_123',
    widget: { enabled: true, config: { stylePreset: 'travel', mode: 'audio' } },
  });
</script>
```

Le widget explicite est autonome. En mode auto-mount, configurez `widget: { enabled: true }` dans React/Vue/Svelte. Voir [WIDGET.md](WIDGET.md) pour la configuration complète.

Les applications `apps/demo*` restent la reference fonctionnelle principale pour les comportements UI/audio.

## 8. Next / Nuxt (SSR client-only)

### React + Next (App Router)

```tsx
'use client';

import { OwlLayerProvider } from '@owllayer/react';

export function OwlLayerClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <OwlLayerProvider
      apiKey="pk_dev_123"
      endpoint="ws://localhost:3000/owllayer"
      config={{ hitl: { ui: 'modal' } }}
    >
      {children}
    </OwlLayerProvider>
  );
}
```

### Vue + Nuxt

```ts
// plugins/owllayer.client.ts
import { defineNuxtPlugin } from '#app';
import { OwlLayerPlugin } from '@owllayer/vue';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(OwlLayerPlugin, {
    endpoint: 'ws://localhost:3000/owllayer',
    apiKey: 'pk_dev_123',
    hitl: { ui: 'modal' },
  });
});
```

Le SDK UI OwlLayer AI est supporté en mode **client-only officiel** pour Next/Nuxt en V1. Les identifiants `@owllayer/*` restent ceux à utiliser dans les exemples actuels.

## Prochaines etapes

- Ajoutez plus de tools avec `useAgentTool` (React/Vue) ou `use:agentTool` (Svelte)
- Pour Angular, structurez les tools avec `registerToolResolver()` et injectez un contexte riche avec `registerContext()`
- Injectez du contexte avec `useAgentContext` / `use:agentContext`
- Activez le mode vocal avec `useVoiceMode` / `createVoiceMode`
- Configurez les niveaux de risque HITL
- Utilisez `SystemPromptConfig` pour structurer vos prompts (voir [SYSTEM_PROMPT.md](SYSTEM_PROMPT.md))
- Ajoutez des tools serveur pour l'acces aux donnees
- Activez la memoire adaptable (`memory/sqlite/mongo`) avec [AGENT_MEMORY.md](AGENT_MEMORY.md)
