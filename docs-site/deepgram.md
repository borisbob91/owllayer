# Deepgram Integration

Deepgram is an **optional** speech-to-text and text-to-speech provider for OwlLayer Server. It adds fast,
accurate voice capabilities via batch APIs. It does **not** replace `OwlLayerServer`, `OwlLayerClient`,
AITP, Shadow Context, or tools.

In this guide, **AITP** means *Agent-to-Interface Transfer Protocol*, the protocol between OwlLayer
clients and the OwlLayer server.

---

## Where does Deepgram plug in? (the short answer)

Deepgram's batch STT and TTS implementations drop into the same `stt` and `tts` slots as every other
speech service. Switch from Google to Deepgram with **one line per service**:

```ts
// Google batch voice:
stt: new GoogleSTT({ ... })
tts: new GoogleTTS({ ... })

// Deepgram batch voice — same slots:
stt: new DeepgramNovaSTT({ ... })
tts: new DeepgramAuraTTS({ ... })
```

The server only sees the `STTService` and `TTSService` interfaces. It has no idea Deepgram is
behind it.

> A complete, runnable example lives in the demo server configuration: set `VOICE_PROVIDER=deepgram`
> and `DEEPGRAM_API_KEY` in `apps/demo-server/.env`, then run `pnpm --filter @owllayer/demo-server dev`.

---

## What Deepgram brings

| Capability | Status | Notes |
|---|---|---|
| **Nova batch STT** | Delivered | Fast, accurate speech-to-text; classic and domain-specific models |
| **Aura-2 batch TTS** | Delivered | Natural, multi-lingual voices; 2000-char limit per request |
| **Flux streaming STT** | Coming next (#110) | Conversational, real-time speech recognition |
| **Aura-2 streaming TTS** | Coming next (#111) | Real-time text-to-speech streaming |
| **Server streaming pipeline** | Coming next (#112) | Full LLM ↔ Deepgram streaming (Flux + Aura) |
| **Voice Agent realtime** | Coming next (#113) | Deepgram Voice Agent as `LiveAdapter` (agentic voice mode) |

---

## Step 1 — Install

```bash
pnpm add @owllayer/adapter-deepgram
```

You also need a Deepgram API key from [console.deepgram.com](https://console.deepgram.com).

## Step 2 — Server env (server-side only)

```env
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

`DEEPGRAM_API_KEY` **never** leaves the server and is **never** sent to the browser.

## Step 3 — Plug into the server

```ts
import { OwlLayerServer } from '@owllayer/server';
import { GoogleAdapter } from '@owllayer/adapter-google';
import { DeepgramNovaSTT, DeepgramAuraTTS } from '@owllayer/adapter-deepgram';

const server = new OwlLayerServer({
  llm: new GoogleAdapter({ apiKey: process.env.GOOGLE_API_KEY!, model: 'gemini-2.0-flash' }),
  stt: new DeepgramNovaSTT({
    apiKey: process.env.DEEPGRAM_API_KEY!,
    language: 'en',  // or 'fr', 'de', 'es', etc.
  }),
  tts: new DeepgramAuraTTS({
    apiKey: process.env.DEEPGRAM_API_KEY!,
    language: 'en',  // defaults voice to aura-2-thalia-en
  }),
  port: 3002,
});
```

**Important:** Do **not** configure a `live` adapter when using Deepgram batch STT/TTS. The batch
pipeline and live adapter are mutually exclusive for audio input. If both are configured, the `live`
adapter takes priority. For Deepgram batch voice only, leave `live` undefined.

---

## Languages and voices

### Supported STT languages

Nova models support a wide range of languages. The exact list depends on your selected model:

```ts
import { DEEPGRAM_STT_MODEL_LANGUAGES } from '@owllayer/adapter-deepgram';

// Supported languages for each model:
DEEPGRAM_STT_MODEL_LANGUAGES['nova-3'];     // ['en', 'es', 'fr', 'de', 'hi', 'pt', ...]
DEEPGRAM_STT_MODEL_LANGUAGES['nova-2'];     // ['en', 'es', 'fr', 'de', ...]
```

When you set `language: 'fr-FR'`, the adapter normalizes it to the exact code Deepgram lists:
- If `fr-FR` is listed, it sends `fr-FR` as-is.
- If only `fr` is listed, it sends the primary subtag `fr`.
- If neither is listed, it sends your requested code unchanged and lets Deepgram respond if unsupported.

### Supported TTS voices

Aura-2 voices are grouped by language and gender:

```ts
import { DEEPGRAM_AURA_VOICES_BY_LANGUAGE, DEEPGRAM_DEFAULT_AURA_VOICE_BY_LANGUAGE } from '@owllayer/adapter-deepgram';

// Voices in French:
DEEPGRAM_AURA_VOICES_BY_LANGUAGE['fr'];
// [
//   { id: 'aura-2-agathe-fr', gender: 'female' },
//   { id: 'aura-2-gaston-fr', gender: 'male' },
//   ...
// ]

// Default voice for English and French:
DEEPGRAM_DEFAULT_AURA_VOICE_BY_LANGUAGE['en'];  // 'aura-2-thalia-en'
DEEPGRAM_DEFAULT_AURA_VOICE_BY_LANGUAGE['fr'];  // 'aura-2-agathe-fr'
```

When you create a `DeepgramAuraTTS` with `language: 'en'`, it automatically selects `aura-2-thalia-en`
unless you override `voice` in the constructor or per-call config.

---

## Settings and configuration

Every STT and TTS capability is split into a **serializable settings object** (stored, Studio-editable)
and **options** (constructor input, includes the API key):

```ts
import {
  deepgramNovaSTTSettingsSchema,
  parseDeepgramNovaSTTSettings,
  type DeepgramNovaSTTSettings,
  type DeepgramNovaSTTOptions,
} from '@owllayer/adapter-deepgram';

// Validate and parse a stored configuration:
const settings: DeepgramNovaSTTSettings = parseDeepgramNovaSTTSettings({
  language: 'fr',
  model: 'nova-3',
});

// At runtime: settings (no key) + a key supplied separately = constructor options.
const options: DeepgramNovaSTTOptions = {
  ...settings,
  apiKey: process.env.DEEPGRAM_API_KEY!,
};
const stt = new DeepgramNovaSTT(options);
```

The `apiKey` is **never** part of `*Settings`, never persisted, never logged, and never included in
errors. It is supplied separately, only at construction time.

### STT schema

- `language` (optional, string): Language code (e.g., `'en'`, `'fr'`, `'fr-FR'`); defaults to the session language and is validated against the model
- `model` (optional, string): Nova model ID (defaults to `'nova-3'`). See `DEEPGRAM_NOVA_MODELS`.

### TTS schema

- `language` (optional, string): Language code (e.g., `'en'`, `'fr'`); defaults to the session language and must match the voice language
- `voice` (optional, string): Aura-2 voice ID. Defaults based on `language`.
- `batchOutputFormat` (optional, string): Output audio format (`'pcm'` default, or `'wav'`, `'mp3'`, `'opus'`, `'flac'`, `'aac'`)
- `speed` (optional, number): Speech rate [0.5–2.0]. Deepgram Aura-2 accepts [0.7–1.5]; values outside this range are clamped.

---

## Error handling and codes

Provider failures map to a stable `SpeechServiceError` code:

| Code | Meaning | Retryable |
|---|---|---|
| `AUTH_FAILED` | Invalid or missing API key | No |
| `QUOTA_EXCEEDED` | Usage quota reached | No |
| `RATE_LIMITED` | Too many requests | Yes |
| `INVALID_REQUEST` | Malformed request | No |
| `PAYLOAD_TOO_LARGE` | Input (audio or text) too large | No |
| `PROVIDER_UNAVAILABLE` | Deepgram service unreachable | Yes |
| `TIMEOUT` | Request timed out | Yes |
| `INVALID_SETTINGS` | Settings validation failed | No |
| `UNSUPPORTED_LANGUAGE` | Language not supported by model/voice | No |

Use `getDeepgramErrorDetails()` to extract retry information:

```ts
import { getDeepgramErrorDetails } from '@owllayer/adapter-deepgram';

try {
  await stt.listen(/* ... */);
} catch (error) {
  const { retryable, requestId } = getDeepgramErrorDetails(error);
  if (retryable) {
    // Retry with backoff
  } else {
    // Log and move on
  }
}
```

Error messages **never** include provider response bodies, transcripts, or API keys (yours or
Deepgram's).

---

## Security

### API key placement

- **Server-side only.** Set `DEEPGRAM_API_KEY` in `apps/demo-server/.env` or via environment variables on your server.
- **Never in the browser.** The browser never sees or uses the key.
- **Header only.** The key travels to Deepgram exclusively in the `Authorization: Token <key>` header.

### HTTPS and TLS

Production deployments must use HTTPS. The Deepgram adapter always makes requests over TLS to
`api.deepgram.com`.

---

## Running the demo

### Quick start with Deepgram

1. Set environment variables:

```bash
export VOICE_PROVIDER=deepgram
export DEEPGRAM_API_KEY=your_api_key_here
```

2. Run the demo server:

```bash
pnpm --filter @owllayer/demo-server dev
```

3. Browser clients connect at `ws://localhost:4001/owllayer` and audio input uses Deepgram Nova STT
   and Aura-2 TTS (no live adapter).

### Monitoring

Check logs for the startup line:

```
Deepgram batch voice replaces the live adapter (<live adapter name>).
LLM provider: google (<adapter name>), hybrid STT/TTS: deepgram
```

---

## Coming next

### Flux streaming STT (#110)

Real-time, conversational speech recognition via WebSocket. Enables sub-100ms latency for agent
listening. Coming with `DeepgramFluxSTT`.

### Aura-2 streaming TTS (#111)

Real-time text-to-speech streaming over WebSocket. Enables agent speech output without buffering
the full response. Coming with `DeepgramAuraTTS` (same class, different interface).

### Server streaming pipeline (#112)

End-to-end streaming: LLM ↔ Deepgram. Agent speaks and listens in real-time without waiting for
batch boundaries. Works with any text LLM.

### Deepgram Voice Agent realtime (#113)

Deepgram Voice Agent as a `LiveAdapter` for OwlLayer. Direct agentic voice mode where Deepgram
manages the reasoning model (OpenAI, Anthropic, Google, Groq, or AWS Bedrock), and you configure
credentials per session. Full OwlLayer tool control and HITL remain in place.

---

## Model and voice catalogs

The package exports complete, typed catalogs verified against Deepgram's documentation:

```ts
import {
  DEEPGRAM_NOVA_MODELS,
  DEEPGRAM_FLUX_MODELS,
  DEEPGRAM_STT_MODEL_LANGUAGES,
  DEEPGRAM_AURA_VOICES_BY_LANGUAGE,
  DEEPGRAM_DEFAULT_AURA_VOICE_BY_LANGUAGE,
  DEEPGRAM_THINK_PROVIDERS,
  DEEPGRAM_THINK_MODELS,
  DEEPGRAM_CATALOG_VERIFIED_AT,
} from '@owllayer/adapter-deepgram';
```

Each export is a plain object, suitable for UI dropdowns, settings validation, and server-side
capability reports. The `DEEPGRAM_CATALOG_VERIFIED_AT` date tells you when this catalog was last
checked against Deepgram's official docs.

---

## Troubleshooting

### "AUTH_FAILED"

- Check that `DEEPGRAM_API_KEY` is set on the server.
- Verify the key is valid at [console.deepgram.com](https://console.deepgram.com).
- Ensure the key is not accidentally trimmed or modified in your environment loading.

### "UNSUPPORTED_LANGUAGE"

- The selected model does not list the requested language.
- Check `DEEPGRAM_STT_MODEL_LANGUAGES[modelId]` for supported languages.
- For TTS, verify the language has voices in `DEEPGRAM_AURA_VOICES_BY_LANGUAGE`.

### "RATE_LIMITED"

- You've hit Deepgram's request rate limit.
- Implement exponential backoff and retry. `getDeepgramErrorDetails()` confirms retry-ability.

### No audio output or "PAYLOAD_TOO_LARGE"

- For STT: audio exceeds Deepgram's size limit (~10 MB for batch).
- For TTS: text exceeds 2000 characters. Pre-split large responses.

---

## API reference

For complete type definitions and method signatures, see:
- `DeepgramNovaSTT` in `@owllayer/adapter-deepgram`
- `DeepgramAuraTTS` in `@owllayer/adapter-deepgram`
- `DeepgramErrorCode` in `@owllayer/adapter-deepgram`
- `getDeepgramErrorDetails()` in `@owllayer/adapter-deepgram`

All are exported from `@owllayer/adapter-deepgram/index.ts`.
