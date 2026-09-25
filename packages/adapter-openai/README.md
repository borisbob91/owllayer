# @owllayer/adapter-openai

OpenAI provider adapter for **OwlLayer AI**. Connect OpenAI models (GPT-4o, OpenAI Realtime API, Whisper, OpenAI TTS) to the OwlLayer server and Agentic UI pipeline.

---

## Features

- **Text Mode (`OpenAIAdapter`)**: Standard Chat Completions with automated AITP tool calling translation.
- **Live Audio Mode (`OpenAILiveAdapter`)**: Low-latency bidirectional voice streaming via the OpenAI Realtime API (GA interface). 16 kHz client audio is resampled to the 24 kHz PCM required by the API; barge-in and live tool updates are supported.
- **Speech Services**:
  - `WhisperSTT`: Server-side audio transcription (`whisper-1`, `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`).
  - `OpenAITTS`: Text-to-speech synthesis (`gpt-4o-mini-tts`, `tts-1`, `tts-1-hd`) with all OpenAI voices.
- **Typed model catalog**: exported `as const` lists and union types for chat, realtime, TTS and STT models and voices.
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
    model: 'gpt-realtime',
    voice: 'marin',
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
  model: 'gpt-4o-mini-tts',
  voice: 'coral',
  instructions: 'Speak in a warm, friendly tone.', // gpt-4o-mini-tts only
});
```

### 4. Typed model catalog

```ts
import {
  OPENAI_CHAT_MODELS,
  OPENAI_REALTIME_VOICES,
  type OpenAIChatModel,
} from '@owllayer/adapter-openai';

const model: OpenAIChatModel = 'gpt-4.1'; // autocompletion, custom ids still accepted
console.log(OPENAI_CHAT_MODELS, OPENAI_REALTIME_VOICES);
```

Reasoning models (`o*`, `gpt-5*` except `*-chat-*`) do not receive `temperature` unless you set it explicitly.

---

## Configuration Options

### `OpenAIAdapterOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | `process.env.OPENAI_API_KEY` | OpenAI API Key. |
| `model` | `OpenAIChatModel` | `'gpt-4o'` | Model name (see `OPENAI_CHAT_MODELS`; any string is accepted). |
| `systemPrompt` | `string` | `undefined` | System prompt defining agent personality and instructions. |
| `temperature` | `number` | `0.7` | Sampling temperature. |
| `maxTokens` | `number` | `undefined` | Maximum completion tokens. |

### `OpenAILiveAdapterOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | `process.env.OPENAI_API_KEY` | OpenAI API Key. |
| `model` | `OpenAIRealtimeModel` | `'gpt-realtime'` | Realtime model (see `OPENAI_REALTIME_MODELS`). |
| `voice` | `OpenAIRealtimeVoice` | `'alloy'` | Realtime voice (see `OPENAI_REALTIME_VOICES`). |
| `systemPrompt` | `string` | `undefined` | System instructions for the voice assistant. |
| `inputTranscriptionModel` | `OpenAISTTModel \| null` | `'whisper-1'` | User input transcription model, `null` to disable. |
| `turnDetection` | `object \| null` | server VAD (`0.5`, `300`, `500`) | `{ threshold, prefixPaddingMs, silenceDurationMs }`; `null` for push-to-talk. |

---

## License

MIT © OwlLayer
