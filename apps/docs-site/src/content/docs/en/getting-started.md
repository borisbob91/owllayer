---
title: "Getting Started"
description: OwlLayer Documentation.
---

# Getting Started

Step-by-step guide to create your first OwlLayer application.

## 1. Create the server

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
    systemPrompt: 'You are an assistant for my application.',
  }),
  port: 3000,
  path: '/owllayer',
});

server.addApiKey('pk_dev_123');

// Server-side tool (optional) — for actions requiring backend access
server.tool('get_weather', async ({ city }) => {
  // Call a weather API
  return { city, temp: 22, condition: 'Sunny' };
});

server.listen(() => console.log('OwlLayer running on ws://localhost:3000/owllayer'));
```

## 2. Create the React client

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
        hitl: { ui: 'modal' }, // 'modal' (default) | 'banner' | 'none'
      }}
    >
      <MyPage />
    </OwlLayerProvider>
  );
}
```

### First tool

```tsx
// MyPage.tsx
import { useAgentTool, useAgent } from '@owllayer/react';
import { z } from 'zod';
import { useState } from 'react';

function MyPage() {
  const { sendText, lastResponse, isThinking } = useAgent();
  const [color, setColor] = useState('white');

  // The agent can change the background color
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
      <h1>OwlLayer Demo</h1>
      <p>{isThinking ? 'Thinking...' : lastResponse}</p>
      <button onClick={() => sendText('Set the background to blue')}>
        Ask the agent
      </button>
    </div>
  );
}
```

## 3. Launch

```bash
# Terminal 1
node --loader tsx server.ts

# Terminal 2
cd my-client
pnpm dev
```

Open `http://localhost:5173` and talk to the assistant!

## 4. Widget (quick alternative)

If you want an integrated chat without building your own UI:

```tsx
import { OwlLayerWidget } from '@owllayer/react';

<OwlLayerWidget apiKey="pk_dev_123" endpoint="ws://localhost:3000/owllayer" />
```

## Next steps

- Add more tools with `useAgentTool` (React/Vue) or `use:agentTool` (Svelte)
- Inject context with `useAgentContext`
- Enable voice mode with `useVoiceMode`
- Configure HITL risk levels
- Add server-side tools for data access
