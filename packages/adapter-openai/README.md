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
    model: 'gpt-realtime-1.5', // or 'gpt-realtime-2' for reasoning (effort 'low' by default)
    voice: 'marin',
    systemPrompt: 'You are a voice agent. Respond concisely in natural spoken language.',
  }),
  port: 3001,
});

server.listen();
```

### 3. Speech Services (STT & TTS)

```ts
import { WhisperSTT, OpenAITTS, OPENAI_DEFAULT_STT_MODEL, OPENAI_DEFAULT_TTS_VOICE } from '@owllayer/adapter-openai';

const stt = new WhisperSTT({
  apiKey: process.env.OPENAI_API_KEY!,
  model: OPENAI_DEFAULT_STT_MODEL,
  language: 'en',
});

const tts = new OpenAITTS({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o-mini-tts',
  voice: OPENAI_DEFAULT_TTS_VOICE,
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

This package's existing lists (`OPENAI_CHAT_MODELS`, `OPENAI_REALTIME_MODELS`, `OPENAI_TTS_MODELS`, `OPENAI_STT_MODELS`, `OPENAI_TTS_VOICES`, `OPENAI_REALTIME_VOICES`) keep their names and types. A richer catalog completes them:

- `OPENAI_MODEL_CATALOG`: every listed model (chat, realtime, TTS, STT) with its `role` and `status`.
- `OPENAI_VOICE_CATALOG`: the 13 TTS voices, each stating whether it is also usable in Realtime (`realtime: true`); `languages: ['multilingual']` and no `gender` (OpenAI does not document voice gender).
- `OPENAI_LANGUAGES`: `['multilingual']`; `openAISupportsLanguage(id, language)` always reports every language as supported.
- `isKnownOpenAIModel(id, role?)` / `isKnownOpenAIVoice(id)`: report whether an identifier is listed, without ever throwing.
- `OPENAI_DEFAULT_CHAT_MODEL`, `OPENAI_DEFAULT_REALTIME_MODEL`, `OPENAI_DEFAULT_REALTIME_VOICE`, `OPENAI_DEFAULT_TTS_MODEL`, `OPENAI_DEFAULT_TTS_VOICE`, `OPENAI_DEFAULT_STT_MODEL`.
- `OPENAI_DEPRECATED_MODELS` / `getOpenAIDeprecatedModel(id)`: models OpenAI has deprecated or retired (for example `whisper-1`, `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, deprecated; `gpt-5-chat-latest`, `gpt-5.2-chat-latest`, retired). Constructing an adapter with one of them — as a constant or as a free string — logs one warning naming the replacement; the configured value is still used.
- `OPENAI_CATALOG_VERIFIED_AT`: the date the catalog was last checked against OpenAI's official documentation.

**Default change**: `whisper-1` is deprecated by OpenAI (announced shutdown 2027-02-26). `WhisperSTT`'s default model and `OpenAILiveAdapter`'s default `inputTranscriptionModel` now use `OPENAI_DEFAULT_STT_MODEL` (`'gpt-transcribe'`) instead of `'whisper-1'`; passing `model: 'whisper-1'` explicitly still works and now logs a deprecation warning.

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
| `model` | `OpenAIRealtimeModel` | `'gpt-realtime-1.5'` | Realtime model (see `OPENAI_REALTIME_MODELS`). `gpt-realtime-2*` models reason before speaking. |
| `reasoningEffort` | `'minimal' \| 'low' \| 'medium' \| 'high' \| 'xhigh'` | `'low'` on `gpt-realtime-2*` | Reasoning effort; not sent to non-reasoning models unless set. |
| `voice` | `OpenAIRealtimeVoice` | `'alloy'` | Realtime voice (see `OPENAI_REALTIME_VOICES`). |
| `systemPrompt` | `string` | `undefined` | System instructions for the voice assistant. |
| `inputTranscriptionModel` | `OpenAISTTModel \| null` | `OPENAI_DEFAULT_STT_MODEL` (`'gpt-transcribe'`) | User input transcription model, `null` to disable. |
| `turnDetection` | `object \| null` | server VAD (`0.5`, `300`, `500`) | `{ threshold, prefixPaddingMs, silenceDurationMs }`; `null` for push-to-talk. |

---

## License

MIT © OwlLayer
