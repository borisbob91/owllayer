# @owllayer/server

WebSocket & LLM orchestration server for **OwlLayer AI**. It connects AI models to frontend applications via the AITP protocol, orchestrating sessions, tool calls, voice streaming, HITL security confirmations, and API authentication.

---

## Features

- **Real-Time AITP WebSocket Server**: High-throughput bidirectional communication between frontend clients and LLM providers.
- **Dynamic Tool Routing (`ToolRouter`)**: Dispatches tool calls dynamically between frontend client-side tools and backend server-side tools.
- **LLM Adapters Support**: Seamless plug-and-play with OpenAI, Google Gemini, Anthropic Claude, and LiveKit.
- **Human-in-the-Loop (HITL) Security**: Intercepts high-risk actions (`risk: 'high'` / `risk: 'critical'`) and coordinates user approvals before execution.
- **Session Management & Persistence**: Memory, SQLite, or MongoDB storage for sessions, history, and memory graphs.
- **Authentication & API Keys**: Granular client API key validation and admin panel authentication.
- **Express / HTTP Integration**: Mount OwlLayer directly onto existing Node.js HTTP / Express servers (`@owllayer/server/adapters/express`).
- **Embedded Admin Dashboard**: Serve the management dashboard directly from the server runtime.

---

## Installation

```bash
# pnpm
pnpm add @owllayer/server @owllayer/core

# npm
npm install @owllayer/server @owllayer/core

# yarn
yarn add @owllayer/server @owllayer/core
```

---

## Quick Start

### 1. Standalone WebSocket Server

```ts
import { OwlLayerServer } from '@owllayer/server';
import { OpenAIAdapter } from '@owllayer/adapter-openai';
// Or: import { GoogleAdapter } from '@owllayer/adapter-google';
// Or: import { AnthropicAdapter } from '@owllayer/adapter-anthropic';

const server = new OwlLayerServer({
  port: 3001,
  path: '/owllayer',
  llm: new OpenAIAdapter({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o',
    systemPrompt: 'You are an intelligent assistant embedded in the application.',
  }),
  client: {
    requireApiKey: true,
  },
});

// Authorize client API keys
server.addApiKey('pk_live_xxxx');

// Register a server-side tool
server.tool(
  'get_user_orders',
  {
    description: 'Retrieve order history for a given user ID',
    parameters: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
      },
      required: ['userId'],
    },
    risk: 'none',
  },
  async ({ userId }) => {
    return { orders: [{ id: 'order_123', status: 'delivered', total: 49.99 }] };
  }
);

// Start listening
server.listen(() => {
  console.log('OwlLayer Server ready on ws://localhost:3001/owllayer');
});
```

### 2. Express Integration

Attach OwlLayer to an existing Express application and HTTP server:

```ts
import express from 'express';
import { createServer } from 'http';
import { attachOwlLayer } from '@owllayer/server/adapters/express';
import { GoogleAdapter } from '@owllayer/adapter-google';

const app = express();
const httpServer = createServer(app);

const server = attachOwlLayer(app, {
  server: httpServer,
  path: '/owllayer',
  llm: new GoogleAdapter({
    apiKey: process.env.GOOGLE_API_KEY!,
    model: 'gemini-2.5-flash',
  }),
});

httpServer.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### 3. Realtime Audio & Voice Mode

To enable live bidirectional voice streaming, configure the `live` adapter option:

```ts
import { OwlLayerServer } from '@owllayer/server';
import { OpenAILiveAdapter } from '@owllayer/adapter-openai';
// Or: import { GoogleLiveAdapter } from '@owllayer/adapter-google';

const server = new OwlLayerServer({
  port: 3001,
  live: new OpenAILiveAdapter({
    apiKey: process.env.OPENAI_API_KEY!,
    voice: 'alloy',
    systemPrompt: 'You are a fast voice assistant. Keep answers concise.',
  }),
});
```

---

## Configuration Options

| Option | Type | Description |
|---|---|---|
| `port` | `number` | Port for the standalone HTTP/WebSocket server. |
| `path` | `string` | WebSocket endpoint path (default: `'/owllayer'`). |
| `server` | `http.Server` | Existing Node.js HTTP server instance. |
| `llm` | `LLMAdapter` | Text-based LLM adapter (OpenAI, Google, Anthropic). |
| `live` | `LiveAdapter` | Real-time audio streaming adapter. |
| `tts` | `TTSService` | Optional Text-To-Speech service. |
| `stt` | `STTService` | Optional Speech-To-Text service. |
| `sessionStore` | `SessionStore` | Session persistence (`MemoryStore`, `SQLiteStore`, `MongoStore`). |
| `client.requireApiKey` | `boolean` | Require client API key authentication upon handshake. |

---

## Persistence Stores

- **`MemoryStore`**: In-memory storage for development and testing.
- **`SQLiteStore`**: Lightweight single-file database for self-hosted instances.
- **`MongoStore`**: Scalable multi-instance database for cloud deployments.

---

## Related Packages

- [`@owllayer/core`](https://www.npmjs.com/package/@owllayer/core) — Protocol and shared contracts.
- [`@owllayer/adapter-openai`](https://www.npmjs.com/package/@owllayer/adapter-openai) — OpenAI provider adapter.
- [`@owllayer/adapter-google`](https://www.npmjs.com/package/@owllayer/adapter-google) — Google Gemini provider adapter.
- [`@owllayer/adapter-anthropic`](https://www.npmjs.com/package/@owllayer/adapter-anthropic) — Anthropic Claude provider adapter.
- [`@owllayer/adapter-livekit`](https://www.npmjs.com/package/@owllayer/adapter-livekit) — LiveKit WebRTC provider adapter.

---

## License

MIT © OwlLayer
