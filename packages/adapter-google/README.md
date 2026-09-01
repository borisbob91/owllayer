# @owllayer/adapter-google

Google Gemini provider adapter for **OwlLayer AI**. Connect Google Gemini models (Gemini 2.5/2.0 Flash, Gemini Multimodal Live API, Gemini STT/TTS) to the OwlLayer server and Agentic UI pipeline.

---

## Features

- **Text Mode (`GoogleAdapter`)**: Connect to Gemini 2.5 Flash, Gemini 2.0 Flash, and Gemini 1.5 Pro via `@google/genai`.
- **Multimodal Live Mode (`GoogleLiveAdapter`)**: Real-time bidirectional audio & vision streaming with Gemini Live.
- **Speech Services**:
  - `GoogleSTT`: Gemini-powered speech recognition.
  - `GoogleTTS`: Gemini voice synthesis with natural voices (`Puck`, `Charon`, `Kore`, `Fenrir`, `Aoede`).
- **Function Calling**: Automatic schema conversion from OwlLayer tool definitions to Gemini function declarations.

---

## Installation

```bash
# pnpm
pnpm add @owllayer/adapter-google @owllayer/server @owllayer/core

# npm
npm install @owllayer/adapter-google @owllayer/server @owllayer/core

# yarn
yarn add @owllayer/adapter-google @owllayer/server @owllayer/core
```

---

## Usage

### 1. Text Mode (Gemini 2.5 Flash)

```ts
import { OwlLayerServer } from '@owllayer/server';
import { GoogleAdapter } from '@owllayer/adapter-google';

const server = new OwlLayerServer({
  llm: new GoogleAdapter({
    apiKey: process.env.GOOGLE_API_KEY!,
    model: 'gemini-2.5-flash',
    systemPrompt: 'You are an AI assistant embedded in a web application.',
  }),
  port: 3001,
});

server.listen();
```

### 2. Live Audio Mode (Gemini Multimodal Live)

```ts
import { OwlLayerServer } from '@owllayer/server';
import { GoogleLiveAdapter } from '@owllayer/adapter-google';

const server = new OwlLayerServer({
  live: new GoogleLiveAdapter({
    apiKey: process.env.GOOGLE_API_KEY!,
    voice: 'Puck',
    systemPrompt: 'You are a responsive voice assistant. Answer briefly.',
  }),
  port: 3001,
});

server.listen();
```

### 3. Speech Services (STT & TTS)

```ts
import { GoogleSTT, GoogleTTS } from '@owllayer/adapter-google';

const stt = new GoogleSTT({
  apiKey: process.env.GOOGLE_API_KEY!,
});

const tts = new GoogleTTS({
  apiKey: process.env.GOOGLE_API_KEY!,
  voice: 'Kore',
});
```

---

## Configuration Options

### `GoogleAdapterOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | `process.env.GOOGLE_API_KEY` | Google AI Studio or Gemini API key. |
| `model` | `string` | `'gemini-2.5-flash'` | Gemini model identifier. |
| `systemPrompt` | `string` | `undefined` | Instructions and persona for the agent. |
| `temperature` | `number` | `0.7` | Sampling temperature. |

### `GoogleLiveAdapterOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | `process.env.GOOGLE_API_KEY` | Google Gemini API key. |
| `model` | `string` | `'gemini-2.0-flash-exp'` | Live model identifier. |
| `voice` | `string` | `'Puck'` | Voice name (`Puck`, `Charon`, `Kore`, `Fenrir`, `Aoede`). |
| `systemPrompt` | `string` | `undefined` | Voice instructions. |

---

## License

MIT © OwlLayer
