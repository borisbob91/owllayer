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
import { OpenAIAdapter, OPENAI_DEFAULT_CHAT_MODEL } from '@owllayer/adapter-openai';
// Or: import { GoogleAdapter, GOOGLE_DEFAULT_TEXT_MODEL } from '@owllayer/adapter-google';
// Or: import { AnthropicAdapter, ANTHROPIC_DEFAULT_MODEL } from '@owllayer/adapter-anthropic';

const server = new OwlLayerServer({
  port: 3001,
  path: '/owllayer',
  llm: new OpenAIAdapter({
    apiKey: process.env.OPENAI_API_KEY!,
    model: OPENAI_DEFAULT_CHAT_MODEL,
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
import { GoogleAdapter, GOOGLE_DEFAULT_TEXT_MODEL } from '@owllayer/adapter-google';

const app = express();
const httpServer = createServer(app);

const server = attachOwlLayer(app, {
  server: httpServer,
  path: '/owllayer',
  llm: new GoogleAdapter({
    apiKey: process.env.GOOGLE_API_KEY!,
    model: GOOGLE_DEFAULT_TEXT_MODEL,
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

### 4. Streaming Voice Pipeline (any streaming STT + LLM + streaming TTS)

`StreamingPipelineLiveAdapter` composes any provider-neutral `StreamingSTTService` +
`LLMAdapter` + `StreamingTTSService` (from `@owllayer/core`) into a `LiveAdapter`. It plugs
into the existing `live` option, so the AITP wire protocol, audio streaming, interruption,
and the HITL tool router are reused unchanged:

```ts
import { OwlLayerServer, StreamingPipelineLiveAdapter } from '@owllayer/server';

const server = new OwlLayerServer({
  llm: myTextLLM,
  live: new StreamingPipelineLiveAdapter({
    stt: myStreamingSTT, // e.g. a turn-aware Deepgram Flux-style STT service
    llm: myTextLLM,
    tts: myStreamingTTS, // e.g. a Deepgram Aura-style streaming TTS service
    maxToolCallsPerTurn: 5, // default
    speculativeReplies: false, // default; see below
  }),
});
```

Behavior:

- One turn is answered at a time; text and audio output are only ever produced for a
  confirmed turn. When the user confirms a new turn while the previous one is still being
  answered, the previous turn is interrupted: its late reply is dropped and its pending tool
  call is reported through `onToolCallCancelled`.
- Tool calls are emitted sequentially, one at a time, up to `maxToolCallsPerTurn` per turn.
  When one LLM response contains several tool calls, they are all emitted, in order.
  Reaching the cap ends the turn (logged) without closing the session.
- Each reply is reported as `onTextOutput(text, true)` and as an agent transcript, so the
  server keeps it in the conversation used to recreate the session.
- `speculativeReplies: true` starts the LLM call as soon as the STT stream reports a
  tentative end of turn. The resulting text and tool calls are held and only released if the
  STT stream later confirms the exact same text; if the STT stream instead reports that the
  turn resumed (the user kept talking), the held response is discarded and any of its tool
  calls are reported through `onToolCallCancelled`.
- `interrupt()` (barge-in) stops the current turn and interrupts the TTS stream immediately.
- If the STT stream closes on its own (for example a provider without a keepalive, closing
  after a period of silence), the live session is not torn down: the next audio chunk
  transparently reopens a single new turn stream. A TTS stream closed by its provider is
  reopened for the next reply.
- `onError` is reserved for failures that make the session unusable (for example an STT
  authentication error, or three consecutive provider closes without any turn); the session
  then closes itself. Recoverable incidents are logged instead: a non-fatal STT error, a TTS
  failure (the reply text is kept), an LLM failure (the turn ends empty), or the tool-call cap.
- `close()` releases both the STT and the TTS stream.

---

## One voice mode per agent

`OwlLayerServer` supports two voice modes — the `live` adapter (realtime or the streaming
pipeline above) and the batch `stt`/`tts` pair — but only one is ever active per agent:
`live`, when configured, always takes precedence. Configuring both is not an error (existing
deployments keep working unchanged); the server logs exactly one warning at startup instead of
one message per hybrid service.

`validateVoiceRuntimeDefinition()` is a pure, provider-neutral helper for validating a voice
configuration *before* constructing any provider — useful for a registry or a settings UI:

```ts
import { validateVoiceRuntimeDefinition } from '@owllayer/server';

validateVoiceRuntimeDefinition({ mode: 'pipeline', stt, tts });
// → { valid: true }

validateVoiceRuntimeDefinition({ mode: 'pipeline', stt, tts, live });
// → { valid: false, code: 'VOICE_MODE_CONFLICT' }

validateVoiceRuntimeDefinition({ mode: 'pipeline', stt });
// → { valid: false, code: 'VOICE_PIPELINE_INCOMPLETE', missing: ['tts'] }

validateVoiceRuntimeDefinition({ mode: 'realtime' });
// → { valid: false, code: 'VOICE_REALTIME_INCOMPLETE', missing: ['live'] }
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
