# @owllayer/adapter-openai

OpenAI provider adapter for **OwlLayer AI**. Connect OpenAI models (GPT-4o, OpenAI Realtime API, Whisper, OpenAI TTS) to the OwlLayer server and Agentic UI pipeline.

---

## Features

- **Text Mode (`OpenAIAdapter`)**: Standard Chat Completions with automated AITP tool calling translation.
- **Live Audio Mode (`OpenAILiveAdapter`)**: Low-latency bidirectional voice streaming via OpenAI Realtime API.
- **Speech Services**:
  - `WhisperSTT`: Server-side audio transcription.
  - `OpenAITTS`: Text-to-speech synthesis with OpenAI voices (`alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`).
- **Automatic Tool Conversion**: Seamless transformation between OwlLayer / Zod schemas and OpenAI function definitions.

---

## Installation

```bash
# pnpm
pnpm add @owllayer/adapter-openai @owllayer/server @owllayer/core

# npm
npm install @owllayer/adapter-openai @owllayer/server @owllayer/core

# yarn
yarn add @owllayer/adapter-openai @owllayer/server @owllayer/core
```

---

## Usage

### 1. Text Mode (Chat Completions)

```ts
import { OwlLayerServer } from '@owllayer/server';
import { OpenAIAdapter } from '@owllayer/adapter-openai';

const server = new OwlLayerServer({
  llm: new OpenAIAdapter({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o', // or 'gpt-4o-mini'
    systemPrompt: 'You are a helpful assistant embedded in the application.',
    temperature: 0.7,
  }),
  port: 3001,
});

server.listen();
```

### 2. Live Audio Mode (OpenAI Realtime API)

```ts
import { OwlLayerServer } from '@owllayer/server';
import { OpenAILiveAdapter } from '@owllayer/adapter-openai';

const server = new OwlLayerServer({
  live: new OpenAILiveAdapter({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o-realtime-preview',
    voice: 'alloy',
    systemPrompt: 'You are a voice agent. Respond concisely in natural spoken language.',
  }),
  port: 3001,
});

server.listen();
```

### 3. Speech Services (STT & TTS)

```ts
import { WhisperSTT, OpenAITTS } from '@owllayer/adapter-openai';

const stt = new WhisperSTT({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'whisper-1',
  language: 'en',
});

const tts = new OpenAITTS({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'tts-1',
  voice: 'alloy',
});
```

---

## Configuration Options

### `OpenAIAdapterOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | `process.env.OPENAI_API_KEY` | OpenAI API Key. |
| `model` | `string` | `'gpt-4o'` | Model name (`gpt-4o`, `gpt-4o-mini`, etc.). |
| `systemPrompt` | `string` | `undefined` | System prompt defining agent personality and instructions. |
| `temperature` | `number` | `0.7` | Sampling temperature. |
| `maxTokens` | `number` | `undefined` | Maximum completion tokens. |

### `OpenAILiveAdapterOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | `process.env.OPENAI_API_KEY` | OpenAI API Key. |
| `model` | `string` | `'gpt-4o-realtime-preview'` | Realtime model name. |
| `voice` | `string` | `'alloy'` | Realtime voice (`alloy`, `echo`, `shimmer`, etc.). |
| `systemPrompt` | `string` | `undefined` | System instructions for the voice assistant. |

---

## License

MIT © OwlLayer
