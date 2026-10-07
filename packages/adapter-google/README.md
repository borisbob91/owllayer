# @owllayer/adapter-google

Google Gemini provider adapter for **OwlLayer AI**. Connect Google Gemini models (Gemini 2.5/2.0 Flash, Gemini Multimodal Live API, Gemini STT/TTS) to the OwlLayer server and Agentic UI pipeline.

---

## Features

- **Text Mode (`GoogleAdapter`)**: Connect to Gemini 2.5 Flash, Gemini 2.0 Flash, and Gemini 1.5 Pro via `@google/genai`.
- **Multimodal Live Mode (`GoogleLiveAdapter`)**: Real-time bidirectional audio & vision streaming with Gemini Live.
- **Speech Services**:
  - `GoogleSTT`: Gemini-powered speech recognition.
  - `GoogleTTS`: Google Cloud Text-to-Speech voices (`GOOGLE_TTS_VOICES`: Neural2, WaveNet, Studio, Chirp 3 HD… with gender and locale).
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

### 1. Text Mode (Gemini)

```ts
import { OwlLayerServer } from '@owllayer/server';
import { GoogleAdapter, GOOGLE_DEFAULT_TEXT_MODEL } from '@owllayer/adapter-google';

const server = new OwlLayerServer({
  llm: new GoogleAdapter({
    apiKey: process.env.GOOGLE_API_KEY!,
    model: GOOGLE_DEFAULT_TEXT_MODEL,
    systemPrompt: 'You are an AI assistant embedded in a web application.',
  }),
  port: 3001,
});

server.listen();
```

### 2. Live Audio Mode (Gemini Live)

```ts
import { OwlLayerServer } from '@owllayer/server';
import { GoogleLiveAdapter, GOOGLE_DEFAULT_LIVE_MODEL, GOOGLE_DEFAULT_LIVE_VOICE } from '@owllayer/adapter-google';

const server = new OwlLayerServer({
  live: new GoogleLiveAdapter({
    apiKey: process.env.GOOGLE_API_KEY!,
    model: GOOGLE_DEFAULT_LIVE_MODEL,
    voice: GOOGLE_DEFAULT_LIVE_VOICE,
    systemPrompt: 'You are a responsive voice assistant. Answer briefly.',
  }),
  port: 3001,
});

server.listen();
```

### 3. Speech Services (STT & TTS)

```ts
import { GoogleSTT, GoogleTTS, GOOGLE_DEFAULT_STT_MODEL, getGoogleDefaultTTSVoice } from '@owllayer/adapter-google';

const stt = new GoogleSTT({
  apiKey: process.env.GOOGLE_API_KEY!,
  model: GOOGLE_DEFAULT_STT_MODEL,
});

const tts = new GoogleTTS({
  apiKey: process.env.GOOGLE_API_KEY!,
  voice: getGoogleDefaultTTSVoice('fr-FR'),
});
```

---

## Model, voice and language catalog

This package exports typed catalogs so you can configure every adapter from autocompleted constants instead of copying long identifiers from Google's documentation. Any string is still accepted (unlisted identifiers are sent to the provider unchanged); the constants are recommended.

- **Text**: `GOOGLE_TEXT_MODELS` (`GoogleTextModel`), default `GOOGLE_DEFAULT_TEXT_MODEL`.
- **Live**: `GOOGLE_LIVE_MODELS` (`GoogleLiveModel`), default `GOOGLE_DEFAULT_LIVE_MODEL` (`gemini-2.5-flash-native-audio-preview-12-2025`); voices from `GEMINI_VOICES` (`GeminiVoice`), default `GOOGLE_DEFAULT_LIVE_VOICE`. `supportsLiveToolResume(model)` and `GOOGLE_LIVE_TOOL_RESUME_MODELS` tell which Live models take new tools during a session: the default model does, through session resumption; Gemini 3.x Live keeps the tools of the opening.
- **Speech-to-Text**: `GOOGLE_STT_MODELS` (`GoogleSTTModel`), default `GOOGLE_DEFAULT_STT_MODEL`, languages `GOOGLE_STT_LANGUAGES`. Gemini transcription models (`gemini-3.5-transcribe`, `-live`) are listed separately in `GEMINI_TRANSCRIBE_MODELS`: `GoogleSTT` calls Cloud Speech-to-Text and cannot use them.
- **Text-to-Speech**: Cloud TTS voices in `GOOGLE_TTS_VOICES` (`GoogleTTSVoice`), one documented family (Standard, WaveNet, Neural2, Studio, Chirp3-HD, …) per locale (`fr-FR`, `en-US`, `en-GB`, `es-ES`, `de-DE`, `it-IT`, `pt-BR`, `ja-JP`, `zh-CN`); `getGoogleDefaultTTSVoice(language)` returns the recommended voice for a language, or `undefined`. `GOOGLE_TTS_MODELS` also lists the Gemini API TTS models (`gemini-3.8-flash-tts`, …) for reference; `GoogleTTS` itself calls Cloud Text-to-Speech (voice-based, no model parameter).
- Every voice states its `gender` (`male` | `female` | `neutral`) when Google documents it, and its `languages`.
- `isKnownGoogleModel(id, role?)` and `isKnownGoogleVoice(id)` report whether an identifier is listed, without ever throwing.
- `googleSupportsLanguage(id, language)` reports whether a listed model or voice supports a language; unlisted identifiers are not checked (always reported as supported).
- `GOOGLE_DEPRECATED_MODELS` / `getGoogleDeprecatedModel(id)`: models Google has deprecated or retired (for example `gemini-2.0-flash`, retired 2026-06-01). Constructing an adapter with one of them — as a constant or as a free string — logs one warning naming the replacement; the configured value is still used.
- `GOOGLE_CATALOG_VERIFIED_AT`: the date the catalog was last checked against Google's official documentation.

---

## Configuration Options

### `GoogleAdapterOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | `process.env.GOOGLE_API_KEY` | Google AI Studio or Gemini API key. |
| `model` | `GoogleTextModel` | `GOOGLE_DEFAULT_TEXT_MODEL` | Gemini model identifier (catalog constant or free string). |
| `systemPrompt` | `string` | `undefined` | Instructions and persona for the agent. |
| `temperature` | `number` | `0.7` | Sampling temperature. |

### `GoogleLiveAdapterOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | `process.env.GOOGLE_API_KEY` | Google Gemini API key. |
| `model` | `GoogleLiveModel` | `GOOGLE_DEFAULT_LIVE_MODEL` | Live model identifier (catalog constant or free string). |
| `voice` | `GeminiVoice` | `GOOGLE_DEFAULT_LIVE_VOICE` | Voice name, from `GEMINI_VOICES` (30 documented voices) or any string. |
| `systemPrompt` | `string` | `undefined` | Voice instructions. |
| `reconnectOnToolsChange` | `boolean` | `false` | For Live models that keep their opening tools (Gemini 3.x Live): when the page tools change, opens a new connection with the new tools and replays the transcript. Off by default: those sessions keep the tools they were opened with. The default model always follows the tools, through session resumption. |

---

## License

MIT © OwlLayer
