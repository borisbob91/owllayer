---
title: "Getting Started"
description: DomOS Documentation.
---

# Getting Started

Step-by-step guide to create your first DomOS application.

## 1. Create the server

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

// Server-side tool (optional) — for actions requiring backend access
server.tool('get_weather', async ({ city }) => {
  // Call a weather API
  return { city, temp: 22, condition: 'Sunny' };
});

server.listen(() => console.log('DomOS running on ws://localhost:3000/domos'));
```

## 2. Create the React client

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
      config={{
        hitl: { ui: 'modal' }, // 'modal' (default) | 'banner' | 'none'
      }}
    >
      <MyPage />
    </DomOSProvider>
  );
}
```

### First tool

```tsx
// MyPage.tsx
import { useAgentTool, useAgent } from '@domos/react';
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
      <h1>DomOS Demo</h1>
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
import { DomOSWidget } from '@domos/react';

<DomOSWidget apiKey="pk_dev_123" endpoint="ws://localhost:3000/domos" />
```

## Next steps

- Add more tools with `useAgentTool` (React/Vue) or `use:agentTool` (Svelte)
- Inject context with `useAgentContext`
- Enable voice mode with `useVoiceMode`
- Configure HITL risk levels
- Add server-side tools for data access
