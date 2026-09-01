# @owllayer/core

The canonical core package for **OwlLayer AI**. It provides the shared protocol, tool registry, voice state machine, security models, shadow context, and framework-agnostic client for Agentic UI applications.

---

## Features

- **AITP Protocol (Agent-to-Interface Transfer Protocol)**: Strongly-typed JSON protocol for bidirectional real-time AI-to-frontend communication.
- **Tool Registry & Schema Translation**: Register, declare, and validate tools with Zod schema mapping and granular risk levels (`none`, `low`, `medium`, `high`, `critical`).
- **HITL Security (Human-in-the-Loop)**: Built-in confirmation policies to safeguard sensitive UI and server actions.
- **Shadow Context**: Efficient DOM/UI state snapshot diffing (`diffContext`) to send only minimal mutations to LLMs.
- **Voice State Machine**: Deterministic voice turn-taking lifecycle (`idle`, `capturing`, `awaiting_model`, `playing`, `interrupted`).
- **Framework-Agnostic Client (`OwlLayerClient`)**: WebSocket / WebRTC client transport with full event subscriptions.
- **Media & Audio Utilities (`@owllayer/core/media/audio`)**: Isolated audio subpath for PCM, WAV, Opus encoding/decoding, and format detection.
- **Design Tokens & Theme Generator**: Pre-configured style engines (`generateWidgetStyles`) compatible with Shadow DOM and Light DOM.

---

## Installation

```bash
# pnpm
pnpm add @owllayer/core

# npm
npm install @owllayer/core

# yarn
yarn add @owllayer/core
```

---

## Quick Start

### 1. Framework-Agnostic Client

```ts
import { OwlLayerClient } from '@owllayer/core';

const client = new OwlLayerClient({
  endpoint: 'ws://localhost:3001/owllayer',
  apiKey: 'pk_dev_xxxx',
});

// Subscribe to connection and agent events
client.on('agentStateChange', ({ state }) => {
  console.log('Agent state:', state);
});

client.on('turnComplete', ({ text }) => {
  console.log('Agent response:', text);
});

// Connect to server
await client.connect();
```

### 2. Tool Registration with Zod

```ts
import { ToolRegistry, RiskLevel } from '@owllayer/core';
import { z } from 'zod';

const registry = new ToolRegistry();

registry.register({
  name: 'navigate_to',
  description: 'Navigate to a specific page or route in the application',
  risk: RiskLevel.LOW,
  schema: z.object({
    path: z.string().describe('Target route path'),
  }),
  handler: async ({ path }) => {
    window.location.pathname = path;
    return { success: true, navigatedTo: path };
  },
});
```

### 3. Audio & Media Utilities

Audio encoding and decoding utilities are located under the dedicated `@owllayer/core/media/audio` subpath to avoid pulling Web Audio / Opus dependencies into minimal text-only bundles:

```ts
import {
  base64EncodeAudio,
  decodeAudioToFloat32,
  detectFormatFromBase64,
  getMimeType,
} from '@owllayer/core/media/audio';

// Decode incoming base64 PCM / WAV to Float32Array for Web Audio playback
const audioBuffer = await decodeAudioToFloat32(base64Payload);
```

### 4. AITP Protocol Types & Serialization

```ts
import {
  MessageType,
  createMessage,
  encode,
  decode,
  type AITPMessage,
} from '@owllayer/core';

// Create a typed AITP message
const message = createMessage(MessageType.USER_INPUT, {
  text: 'Show me the latest products',
  modality: 'text',
});

// Encode to JSON string for transport
const rawPayload = encode(message);

// Parse and validate incoming payload
const receivedMessage = decode(rawPayload);
```

---

## Core Modules & Exports

| Subpath / Module | Purpose |
|---|---|
| `@owllayer/core` | Core AITP types, `OwlLayerClient`, `ToolRegistry`, `VoiceStateMachine`, `HITLPolicy`, `ShadowContext`, `generateWidgetStyles`. |
| `@owllayer/core/media/audio` | Audio format detection, PCM/WAV decoders, base64 audio encoders, Opus streaming helpers. |

---

## Ecosystem

`@owllayer/core` powers all OwlLayer SDKs and packages:
- **Server**: [`@owllayer/server`](https://www.npmjs.com/package/@owllayer/server)
- **Frontend SDKs**: [`@owllayer/react`](https://www.npmjs.com/package/@owllayer/react), [`@owllayer/vue`](https://www.npmjs.com/package/@owllayer/vue), [`@owllayer/svelte`](https://www.npmjs.com/package/@owllayer/svelte), [`@owllayer/angular`](https://www.npmjs.com/package/@owllayer/angular), [`@owllayer/browser`](https://www.npmjs.com/package/@owllayer/browser)
- **Adapters**: [`@owllayer/adapter-openai`](https://www.npmjs.com/package/@owllayer/adapter-openai), [`@owllayer/adapter-google`](https://www.npmjs.com/package/@owllayer/adapter-google), [`@owllayer/adapter-anthropic`](https://www.npmjs.com/package/@owllayer/adapter-anthropic), [`@owllayer/adapter-livekit`](https://www.npmjs.com/package/@owllayer/adapter-livekit)

---

## License

MIT © OwlLayer
