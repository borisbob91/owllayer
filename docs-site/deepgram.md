# Deepgram Integration

Deepgram is an **optional** voice provider for OwlLayer Server. It gives an agent its ears and its
voice, and optionally its whole realtime conversation. It does **not** replace `OwlLayerServer`,
`OwlLayerClient`, AITP, Shadow Context, tools, or HITL approvals.

In this guide, **AITP** means *Agent-to-Interface Transfer Protocol*, the protocol between OwlLayer
clients and the OwlLayer server.

---

## Three voice modes, one per agent

An agent uses exactly one voice mode. Pick the one that matches what you want Deepgram to do:

| Mode | Deepgram does | Your text LLM does | Server slot |
|---|---|---|---|
| **Batch pipeline** | Nova speech-to-text, Aura-2 text-to-speech | Reasoning and tools | `stt` + `tts` |
| **Streaming pipeline** | Flux turn-aware speech-to-text, Aura-2 streaming speech | Reasoning and tools | `live` (`StreamingPipelineLiveAdapter`) |
| **Realtime** | Listening, reasoning (a managed LLM), and speech: the Deepgram Voice Agent | Text chat only | `live` (`DeepgramVoiceAgentAdapter`) |

In every mode, tools stay in OwlLayer: each tool call goes through the server's HITL router, and
`high` / `critical` tools still ask the user for approval.

If both `live` and `stt`/`tts` are configured, `live` wins and the server logs one warning. To check
a configuration before building it, use `validateVoiceRuntimeDefinition()` from `@owllayer/server`.

---

## Step 1 — Install

```bash
pnpm add @owllayer/adapter-deepgram
```

You also need a Deepgram API key from [console.deepgram.com](https://console.deepgram.com).

## Step 2 — Server environment (server side only)

```env
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

`DEEPGRAM_API_KEY` never leaves the server and is never sent to the browser. It travels to Deepgram
only in the `Authorization: Token <key>` header, never in a URL, a log, an event, or an error.

## Step 3 — Plug the mode you chose

### Batch pipeline

```ts
import { OwlLayerServer } from '@owllayer/server';
import { GoogleAdapter, GOOGLE_DEFAULT_TEXT_MODEL } from '@owllayer/adapter-google';
import { DeepgramNovaSTT, DeepgramAuraTTS } from '@owllayer/adapter-deepgram';

const server = new OwlLayerServer({
  llm: new GoogleAdapter({ apiKey: process.env.GOOGLE_API_KEY!, model: GOOGLE_DEFAULT_TEXT_MODEL }),
  stt: new DeepgramNovaSTT({ apiKey: process.env.DEEPGRAM_API_KEY!, language: 'fr' }),
  tts: new DeepgramAuraTTS({ apiKey: process.env.DEEPGRAM_API_KEY!, language: 'fr' }),
});
```

The user speaks, the whole utterance is transcribed, the LLM answers, and the whole answer is
synthesized. Aura-2 accepts at most 2000 characters per request.

### Streaming pipeline

```ts
import { OwlLayerServer, StreamingPipelineLiveAdapter } from '@owllayer/server';
import { GoogleAdapter, GOOGLE_DEFAULT_TEXT_MODEL } from '@owllayer/adapter-google';
import { DeepgramFluxSTT, DeepgramAuraTTS } from '@owllayer/adapter-deepgram';

const llm = new GoogleAdapter({ apiKey: process.env.GOOGLE_API_KEY!, model: GOOGLE_DEFAULT_TEXT_MODEL });

const server = new OwlLayerServer({
  llm,
  live: new StreamingPipelineLiveAdapter({
    stt: new DeepgramFluxSTT({ apiKey: process.env.DEEPGRAM_API_KEY!, language: 'fr' }),
    llm,
    tts: new DeepgramAuraTTS({ apiKey: process.env.DEEPGRAM_API_KEY!, language: 'fr' }),
  }),
});
```

Flux detects the end of the user's turn itself; the reply is spoken as soon as it is ready, and the
user can interrupt it by speaking. Behavior worth knowing:

- One turn is answered at a time. If the user confirms a new turn while the previous one is still
  being answered, the previous reply is dropped and its pending tool call is cancelled.
- `speculativeReplies: true` starts the LLM on a tentative end of turn and releases the reply only
  if the user really stopped talking.
- Flux has no keepalive: after a silence, Deepgram may close the stream, and the next audio opens a
  new one. The voice session itself stays up.
- Recoverable incidents (a closed stream, a speech synthesis failure, an LLM failure) are logged and
  never end the voice session. A non-recoverable speech-to-text error, or three provider closes in
  a row without any turn (for example a rejected key), end it and are reported to the client.

### Realtime (Deepgram Voice Agent)

```ts
import { OwlLayerServer } from '@owllayer/server';
import { GoogleAdapter, GOOGLE_DEFAULT_TEXT_MODEL } from '@owllayer/adapter-google';
import { DeepgramVoiceAgentAdapter } from '@owllayer/adapter-deepgram';

const server = new OwlLayerServer({
  llm: new GoogleAdapter({ apiKey: process.env.GOOGLE_API_KEY!, model: GOOGLE_DEFAULT_TEXT_MODEL }), // text chat
  live: new DeepgramVoiceAgentAdapter({
    apiKey: process.env.DEEPGRAM_API_KEY!,
    language: 'fr',
    think: { provider: 'anthropic', model: 'claude-haiku-4-5' },
    greeting: 'Bonjour, que puis-je faire pour vous ?',
  }),
});
```

With a reasoning model managed by Deepgram (`open_ai`, `anthropic`, `google`, `nvidia`) and a
Deepgram voice, the Deepgram key is the only credential. `groq` and `aws_bedrock` for reasoning, and
`open_ai`, `eleven_labs`, `cartesia`, `aws_polly` for the voice, run on your own account: pass their
credential as `thinkProviderCredential` / `speakProviderCredential` with the matching
`endpointUrl`. Credentials are sent only inside the Voice Agent settings message and are never
stored in settings.

- Tools become Voice Agent functions with no endpoint: every call comes back to OwlLayer. `high`
  and `critical` tools wait for the end of the user's turn before being called.
- While a tool waits for the user's approval, the agent waits too; it receives the final result
  once the user approves or refuses.
- The previous conversation is given to the agent when a session is created or re-created (last
  50 messages by default, `limits.maxHistoryMessages`).
- The adapter never reconnects by itself. After a drop, the server creates a new session with the
  conversation so far.

---

## Languages and voices

Every setting is checked against the typed catalog before any connection:

```ts
import {
  DEEPGRAM_STT_MODEL_LANGUAGES,
  DEEPGRAM_AURA_VOICES_BY_LANGUAGE,
  DEEPGRAM_DEFAULT_AURA_VOICE_BY_LANGUAGE,
} from '@owllayer/adapter-deepgram';

DEEPGRAM_AURA_VOICES_BY_LANGUAGE['fr'];
// [{ id: 'aura-2-agathe-fr', gender: 'female' }, { id: 'aura-2-hector-fr', gender: 'male' }]

DEEPGRAM_DEFAULT_AURA_VOICE_BY_LANGUAGE['en']; // 'aura-2-thalia-en'
DEEPGRAM_DEFAULT_AURA_VOICE_BY_LANGUAGE['fr']; // 'aura-2-agathe-fr'
```

- A language code such as `fr-FR` is sent as listed by Deepgram for that model: `fr-FR` if listed,
  otherwise `fr`.
- `flux-general-en` accepts English only; other languages use `flux-general-multi`, the default
  for them.
- A voice that does not speak the requested language is rejected with `UNSUPPORTED_LANGUAGE`.
- In realtime mode, a session voice that is not an Aura-2 voice of the session language (for
  example a voice name from another provider) is ignored and the configured or default voice is
  used.

---

## Settings for storage and the Studio

Each class has a **serializable settings object** (validated by a strict Zod schema, safe to
store) and **options** (settings plus the API key, used only at construction):

```ts
import { parseDeepgramVoiceAgentSettings, DeepgramVoiceAgentAdapter } from '@owllayer/adapter-deepgram';

const settings = parseDeepgramVoiceAgentSettings(storedJson); // throws INVALID_SETTINGS, UNSUPPORTED_PROVIDER, ...
const adapter = new DeepgramVoiceAgentAdapter({ ...settings, apiKey: process.env.DEEPGRAM_API_KEY! });
```

Schemas: `deepgramNovaSTTSettingsSchema`, `deepgramFluxSTTSettingsSchema`,
`deepgramAuraTTSSettingsSchema`, `deepgramVoiceAgentSettingsSchema`, `deepgramConnectionLimitsSchema`.
Unknown fields are rejected. The API key and provider credentials are never part of a settings
object.

---

## Errors

Provider failures map to a stable `SpeechServiceError` code:

| Code | Meaning | Retryable |
|---|---|---|
| `AUTH_FAILED` | Missing or rejected API key | No |
| `QUOTA_EXCEEDED` | Usage quota reached | No |
| `RATE_LIMITED` | Too many requests | Yes |
| `INVALID_REQUEST` | Request refused by Deepgram | No |
| `PAYLOAD_TOO_LARGE` | Audio or text too large | No |
| `PROVIDER_UNAVAILABLE` | Deepgram unavailable or reported an error | Yes |
| `TIMEOUT` | Connection, handshake, or acknowledgement timed out | Yes |
| `REMOTE_CLOSED` | Deepgram closed the connection | Yes |
| `INVALID_SETTINGS` | Settings validation failed | No |
| `UNSUPPORTED_LANGUAGE` | Language not supported by the model or voice | No |
| `UNSUPPORTED_PROVIDER` | Voice Agent provider not in the catalog | No |
| `PROVIDER_CREDENTIAL_REQUIRED` | A Voice Agent provider needs its own credential | No |
| `AUDIO_QUEUE_FULL` / `TEXT_QUEUE_FULL` | Too much input before the connection was ready | No |

```ts
import { getDeepgramErrorDetails } from '@owllayer/adapter-deepgram';

try {
  await stt.transcribe({ audioBase64, mimeType: 'audio/webm' });
} catch (error) {
  const { retryable, requestId } = getDeepgramErrorDetails(error);
}
```

Error messages never include provider response bodies, transcripts, API keys, or provider
credentials.

---

## Running the demo

The demo server has one entry point per provider. The Deepgram one runs the voice with Deepgram and the typed text with a text LLM of your choice.

1. Copy `apps/demo-server/.env.deepgram.example` to `apps/demo-server/.env.deepgram`:

```env
DEEPGRAM_API_KEY=your_deepgram_api_key_here
# realtime (default) | pipeline-streaming | pipeline-batch
VOICE_MODE=realtime
# Text LLM for typed messages: deepseek | openai | google (its key goes in .env.deepseek, .env.openai or .env.google)
DEEPGRAM_TEXT_PROVIDER=deepseek
```

2. Start the Deepgram demo server:

```bash
pnpm --filter @owllayer/demo-server dev:deepgram
```

3. Browser clients connect at `ws://localhost:4001/owllayer`. The banner shows the active setup, for example `Provider: deepgram realtime + deepseek text` and `Audio: live deepgram-voice-agent`.

In `realtime` mode, the Deepgram Voice Agent listens, reasons and speaks: a voice conversation only uses Deepgram. `DEEPGRAM_THINK_PROVIDER` and `DEEPGRAM_THINK_MODEL` optionally choose the reasoning model managed by Deepgram. In the `pipeline-*` modes, the text LLM also answers the voice turns. An unknown `VOICE_MODE` or `DEEPGRAM_TEXT_PROVIDER` stops the demo with an error.

The other demo servers are `dev:google`, `dev:openai` and `dev:deepseek`, each with its own `.env.<provider>` file; shared settings (port, client keys, admin) stay in `.env`.

---

## Troubleshooting

### `AUTH_FAILED`

- Check that `DEEPGRAM_API_KEY` is set on the server and valid at
  [console.deepgram.com](https://console.deepgram.com).

### `UNSUPPORTED_LANGUAGE`

- The model or voice does not list the requested language. Check
  `DEEPGRAM_STT_MODEL_LANGUAGES[modelId]` and `DEEPGRAM_AURA_VOICES_BY_LANGUAGE`.

### `PROVIDER_CREDENTIAL_REQUIRED`

- The chosen Voice Agent provider runs on your own account: pass its credential and `endpointUrl`.

### The voice stops after a long silence (streaming pipeline)

- Expected: Flux has no keepalive. The next audio reopens a stream automatically.

---

## API reference

Exported from `@owllayer/adapter-deepgram`: `DeepgramNovaSTT`, `DeepgramFluxSTT`, `DeepgramAuraTTS`,
`DeepgramVoiceAgentAdapter`, the settings schemas and parse functions, the model catalogs, the event
maps, and `getDeepgramErrorDetails()`. Exported from `@owllayer/server`:
`StreamingPipelineLiveAdapter` and `validateVoiceRuntimeDefinition()`.
