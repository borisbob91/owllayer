# Quick Start

Get OwlLayer running locally in minutes, either with the included demo or from scratch.

The current protocol name is **AITP** (*Agent-to-Interface Transfer Protocol*). **ADTP** remains the legacy compatibility name for the existing wire contract, so the current examples keep their existing protocol identifiers.

---

## Prerequisites

- **Node.js** >= 18
- **pnpm** >= 9

---

## Option A: Run the Demo

```bash
git clone https://github.com/borisbob91/domos.git
cd domos
pnpm install
pnpm build
```

### 1. Start the Server

```bash
cd apps/demo-server
cp .env.example .env
```

Add your Gemini API key in `.env`:

```env
PORT=4001
GOOGLE_API_KEY=your_gemini_api_key_here
DOMOS_API_KEY=pk_demo_local
```

```bash
pnpm dev
```

Server listens on `ws://localhost:4001/domos`.

### 2. Start the Client

```bash
cd apps/demo
pnpm dev
```

Open `http://localhost:5173`. You'll see **ShopMate**, a mock e-commerce store with an embedded OwlLayer chat.

### 3. Things to Try

- *"Show me Bluetooth accessories."* (product search tool)
- *"Add the Bluetooth headphones to my cart."* (low risk, direct exec)
- *"Empty my cart."* (high risk, HITL confirmation dialog)
- *"Confirm my order."* (critical risk, reinforced approval)

---

## Option B: From Scratch (Server + React)

### Server

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

### React Client

```bash
pnpm create vite my-client --template react-ts
cd my-client
pnpm add @domos/react @domos/core zod
```

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
      color: z.string().describe('CSS color'),
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

### Run

```bash
# Terminal 1
node --loader tsx server.ts

# Terminal 2
cd my-client && pnpm dev
```

Open `http://localhost:5173` and talk to the assistant.

---

## Next Steps

- See the [Tools Guide](/tools-guide) for lifecycle and best practices
- Check [Vue](/vue-sdk), [Svelte](/svelte-sdk), [Angular](/angular-sdk), [Browser](/vanilla-browser) SDK pages for other frameworks
- Add a [Widget](/chat-widget) for a drop-in chat UI
- Configure [System Prompt](/system-prompt) for agent personality
- Enable [Agent Memory](/agent-memory) for persistent context
