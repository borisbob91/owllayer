# @owllayer/adapter-deepgram

[![npm version](https://img.shields.io/npm/v/@owllayer/adapter-deepgram?color=2563eb)](https://www.npmjs.com/package/@owllayer/adapter-deepgram)
[![npm downloads](https://img.shields.io/npm/dt/@owllayer/adapter-deepgram?color=2563eb&label=downloads)](https://www.npmjs.com/package/@owllayer/adapter-deepgram)
[![License: MIT](https://img.shields.io/badge/license-MIT-2563eb.svg)](https://github.com/borisbob91/owllayer/blob/master/LICENSE)
[![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](https://www.typescriptlang.org/docs/handbook/tsconfig.json#strict)
[![Node.js 22](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)

OwlLayer AI adapter for [Deepgram](https://deepgram.com): delivers **batch speech-to-text** (Nova
models), **streaming, turn-aware speech-to-text** (Flux models), **batch and streaming
text-to-speech** (Aura-2 voices), the **Deepgram Voice Agent realtime mode**, a complete typed model
catalog, and strict settings schemas for the OwlLayer AI Runtime.

## Installation

```bash
pnpm add @owllayer/adapter-deepgram
```

The package depends only on `@owllayer/core` (workspace), `ws`, and `zod`. It never imports
`@owllayer/server`.

## Quick start

The batch pipeline (STT + TTS) replaces the live adapter when no `live` is configured:

```ts
import { OwlLayerServer } from '@owllayer/server';
import { GoogleAdapter } from '@owllayer/adapter-google';
import { DeepgramNovaSTT, DeepgramAuraTTS } from '@owllayer/adapter-deepgram';

const server = new OwlLayerServer({
  adapter: new GoogleAdapter({ apiKey: process.env.GOOGLE_API_KEY!, model: 'gemini-2.0-flash' }),
  stt: new DeepgramNovaSTT({ apiKey: process.env.DEEPGRAM_API_KEY!, language: 'fr' }),
  tts: new DeepgramAuraTTS({ apiKey: process.env.DEEPGRAM_API_KEY!, language: 'fr' }),
  port: 3002,
});
```

## Supported capabilities

This adapter currently delivers:

- **Batch Pipeline** (Deepgram Nova STT + any OwlLayer text LLM + Deepgram Aura-2 TTS).
  Activated when a client sends `audio: { live: false }` and no `live` adapter is configured.
- **Streaming pipeline** (Deepgram Flux STT + any OwlLayer text LLM + Deepgram Aura-2 streaming
  TTS), through `StreamingPipelineLiveAdapter` from `@owllayer/server` in the `live` slot.
- **Realtime mode** (`DeepgramVoiceAgentAdapter`): the Deepgram Voice Agent listens, reasons, and
  speaks; OwlLayer keeps the tools, the HITL approvals, and the conversation.

## Batch pipeline — speech-to-text

`DeepgramNovaSTT` implements the existing `STTService` contract (`POST /v1/listen`) and drops into
the current batch pipeline with no client or server change:

```ts
import { OwlLayerServer } from '@owllayer/server';
import { DeepgramNovaSTT } from '@owllayer/adapter-deepgram';

const server = new OwlLayerServer({
  adapter, // any OwlLayer text LLM adapter
  stt: new DeepgramNovaSTT({
    apiKey: process.env.DEEPGRAM_API_KEY!,
    language: 'fr',
    // model defaults to 'nova-3'; see DEEPGRAM_NOVA_MODELS for classic and domain-specific models.
  }),
  tts, // any OwlLayer TTS service
});
```

The instance is stateless and shareable across sessions. It sends `model`, `language`,
`smart_format`, and one repeated `keyterm`/`tag` per configured entry as query parameters; for raw
PCM audio (`audio/pcm;rate=...`) it also sends `encoding=linear16` and the matching `sample_rate` —
containerized formats (wav, mp3, ...) omit both, since Deepgram reads the format from the audio
itself. The configured language is validated against the selected model's supported languages
before any request is made (`UNSUPPORTED_LANGUAGE` otherwise); the `language` query parameter itself
is resolved to the exact code Deepgram documents for the selected model when possible (sent as-is
when listed, e.g. `fr-CA`; otherwise its normalized primary subtag when that is listed, e.g.
`fr-FR` → `fr`), falling back to the requested code unchanged for an unlisted model. The key is sent
only in the `Authorization: Token <key>` header, exactly as in every other Deepgram capability of
this package.

## Batch pipeline — text-to-speech

`DeepgramAuraTTS` implements the existing `TTSService` contract (`POST /v1/speak`) and drops into
the current batch pipeline with no client or server change. The same class also implements
`StreamingTTSService` (see [Streaming text-to-speech](#streaming-text-to-speech)), sharing voice, language, and format settings:

```ts
import { OwlLayerServer } from '@owllayer/server';
import { DeepgramNovaSTT, DeepgramAuraTTS } from '@owllayer/adapter-deepgram';

const server = new OwlLayerServer({
  adapter,
  stt: new DeepgramNovaSTT({ apiKey: process.env.DEEPGRAM_API_KEY! }),
  tts: new DeepgramAuraTTS({
    apiKey: process.env.DEEPGRAM_API_KEY!,
    language: 'fr', // defaults the voice to aura-2-agathe-fr; 'en' defaults to aura-2-thalia-en
    // voice defaults from language when unset; batchOutputFormat defaults to 'pcm' at 24000 Hz.
  }),
});
```

The returned media type exactly matches the requested `batchOutputFormat`: `pcm` →
`audio/pcm;rate=<sampleRate>` (OwlLayer's own convention for headerless linear16, matching every
other adapter), `wav` → `audio/wav`, `mp3` → `audio/mpeg`, `opus` → `audio/ogg;codecs=opus`,
`flac` → `audio/flac`, `aac` → `audio/aac`. `sample_rate` is only sent for the formats where
Deepgram lets it vary (`pcm`, `wav`, `flac`); `mp3`, `opus`, and `aac` use Deepgram's fixed rate
for that codec. Input text over Deepgram's documented 2000-character limit is rejected locally,
before any request; the configured voice is validated against the configured language before any
request too (`UNSUPPORTED_LANGUAGE` otherwise). `TTSConfig.voice`, `.languageCode`, `.outputFormat`,
and `.speed` override the constructor's defaults per call. The core `TTSConfig.speed` contract
allows `[0.5, 2.0]` (the server may pass `session.context.speechSpeed` straight through), wider than
the range Deepgram Aura-2 accepts (`[0.7, 1.5]`); a per-call `speed` outside Deepgram's range is
clamped to it before being sent — never rejected — so `0.5` is sent as `0.7` and `2.0` as `1.5`.

## Streaming speech-to-text and turn detection

`DeepgramFluxSTT` implements the core `StreamingSTTService` contract (`wss://api.deepgram.com/v2/listen`)
directly — it has no batch `transcribe()` method, since Flux is turn-aware streaming only. It is a
factory: each call to `openTurnStream()` opens one `DeepgramFluxTurnStream` (one per voice session),
never reused and never reconnected internally.

```ts
import { DeepgramFluxSTT } from '@owllayer/adapter-deepgram';

const flux = new DeepgramFluxSTT({
  apiKey: process.env.DEEPGRAM_API_KEY!,
  language: 'fr', // 'flux-general-en' only accepts 'en'; every other language needs 'flux-general-multi'
  turnDetection: { endOfTurnThreshold: 0.75, tentativeEndOfTurnThreshold: 0.4, endOfTurnTimeoutMs: 5000 },
});

const stream = await flux.openTurnStream({
  mimeType: 'audio/pcm;rate=16000',
  onEvent: (event) => {
    switch (event.type) {
      case 'turn.started':
        break;
      case 'transcript.partial':
        break; // event.text
      case 'turn.tentative_end':
        break; // speculative end (event.text); the turn may still resume
      case 'turn.resumed':
        break; // the tentative end above must be discarded
      case 'turn.ended':
        break; // event.text is final for this turn
      case 'stream.error':
        break; // event.error (SpeechServiceError), event.fatal
      case 'stream.closed':
        break; // event.reason: 'client' | 'remote' | 'error' | 'timeout'
    }
  },
});

stream.sendAudio(pcmChunkBase64); // queued (bounded) until the connection reports ready, then flushed in order
await stream.endAudioTurn(); // forces the end of the current turn, same verb as LiveSession.endAudioTurn
await stream.close(); // idempotent
```

`DeepgramFluxTurnStream` also exposes `updateTurnDetection(update)`, Flux-specific and not part of the
core contract: it validates the new thresholds locally (same ranges as construction) before sending
anything, resolves once Deepgram confirms the change, and rejects with `INVALID_REQUEST` if Deepgram
refuses it (the previous configuration stays in effect). `keyterms` in an update entirely replaces the
current list — it is never merged. Deepgram's acknowledgement carries no request id, so only one update
may be pending at a time: a second call before the first is acknowledged rejects with `INVALID_REQUEST`,
and a call after `close()` rejects with `REMOTE_CLOSED` without sending anything.

```ts
import type { DeepgramFluxTurnStream } from '@owllayer/adapter-deepgram';

await (stream as DeepgramFluxTurnStream).updateTurnDetection({ tentativeEndOfTurnThreshold: 0.5, keyterms: ['OwlLayer'] });
```

There is no internal reconnection: an unexpected close surfaces as a `stream.error` (`REMOTE_CLOSED`,
retryable) followed by `stream.closed` with `reason: 'remote'`; a client-initiated `close()` sends the
provider's close frame first, and the connection close that follows it is never reported as an error.
Flux has no keepalive message: when audio stops for a while, Deepgram may close the connection, which
surfaces as the same `REMOTE_CLOSED` error; open a new stream for the next turn.
Audio queued before the connection is ready is bounded (`limits.maxQueuedAudioMs`); once the bound is
exceeded, further chunks are dropped with a non-fatal `stream.error` (`AUDIO_QUEUE_FULL`) instead of
growing the queue without limit.

## Streaming text-to-speech

`DeepgramAuraTTS` also implements the core `StreamingTTSService` contract
(`wss://api.deepgram.com/v1/speak`) via `openSpeechStream()`, on the same instance that already
implements batch `TTSService`, sharing voice/language/format settings. Unlike Flux, this websocket
sends no initial confirmation message: the stream becomes `ready` directly on socket open.

```ts
import { DeepgramAuraTTS } from '@owllayer/adapter-deepgram';

const aura = new DeepgramAuraTTS({ apiKey: process.env.DEEPGRAM_API_KEY!, language: 'fr' });

const stream = await aura.openSpeechStream({
  onAudio: (audioBase64, mimeType) => {}, // even-byte aligned PCM chunks, mimeType 'audio/pcm;rate=<sampleRate>'
  onError: (error) => {}, // SpeechServiceError; does not always mean the stream closed (e.g. TEXT_QUEUE_FULL)
});

stream.appendText('Bonjour'); // sent as a Speak message once ready; queued (bounded) before that
await stream.flush(); // sends Flush, resolves once Deepgram confirms with Flushed
await stream.interrupt(); // barge-in: sends Clear, drops queued text and in-flight audio until Cleared
await stream.close(); // idempotent; sends Close first
```

`interrupt()` closes a local output gate the instant it is called (before any acknowledgement): any
binary audio already in flight from Deepgram is dropped until `Cleared` arrives, and any text queued
locally (not yet sent because the connection was not ready) is discarded. The even-byte aligner used
for output is reset at that point too, so a byte carried over from audio now being dropped is never
glued onto the audio that follows the interruption. Like `updateTurnDetection` on Flux, `Flushed` and
`Cleared` carry no request id: only one `flush()` and one `interrupt()` may be pending at a time each
(a second concurrent call of the same kind rejects immediately with `INVALID_REQUEST`, and the
first call's own timeout is never affected by the second). A call to `flush()` or `interrupt()` made
after `close()` rejects immediately with `REMOTE_CLOSED`, without sending anything and without
waiting for the acknowledgement timeout. A provider `Warning` surfaces as an `aura.warning` event
with a redacted message (never the provider's raw description). There is no internal reconnection:
an unexpected close reports `onError` with `REMOTE_CLOSED` (retryable); a client-initiated `close()`
never reports an error.

Ordering and interruption details: a `flush()` called before the connection is ready is sent after the
`Speak` messages queued before it, never ahead of them. `interrupt()` also ends a pending `flush()`
(the segment is abandoned, not failed), and a `Flushed` received before `Cleared` is ignored. If
`Cleared` never arrives, `interrupt()` rejects with `TIMEOUT` and the output gate reopens, so later
audio is not lost.

Limits documented by Deepgram for this endpoint: at most 2000 characters per text payload (longer
`appendText()` input is split into several `Speak` messages, on a space when possible), at most 20
`Flush` messages per 60 seconds (enforced by Deepgram, not by this adapter), 2400 characters per
minute of throughput, and a 60-minute maximum connection lifetime from open
(`DEEPGRAM_AURA_STREAMING_MAX_CONNECTION_MS`). There is no `KeepAlive` message: open a new stream
after the provider closes one.

## Realtime mode — Deepgram Voice Agent

`DeepgramVoiceAgentAdapter` implements the `LiveAdapter` contract
(`wss://agent.deepgram.com/v1/agent/converse`) and goes in the `live` slot. It is the only voice mode
of the agent: do not configure `stt`/`tts` next to it.

```ts
import { OwlLayerServer } from '@owllayer/server';
import { DeepgramVoiceAgentAdapter } from '@owllayer/adapter-deepgram';

const server = new OwlLayerServer({
  adapter: myTextLLM, // text chat stays on your usual LLM adapter
  live: new DeepgramVoiceAgentAdapter({
    apiKey: process.env.DEEPGRAM_API_KEY!,
    language: 'fr',
    think: { provider: 'anthropic', model: 'claude-haiku-4-5' },
    greeting: 'Bonjour, que puis-je faire pour vous ?',
  }),
  port: 3002,
});
```

With the managed reasoning providers (`open_ai`, `anthropic`, `google`, `nvidia`) and Deepgram
voices, the Deepgram key is the only credential. Providers that run on your own account need their
credential, passed next to the settings and never stored in them:

- `groq` (API key) and `aws_bedrock` (AWS credentials) for reasoning, both with `think.endpointUrl`;
- `open_ai`, `eleven_labs`, `cartesia` (API key) and `aws_polly` (AWS credentials) for the voice,
  with `speak.endpointUrl`;
- a managed reasoning provider may also use your own key, with `think.endpointUrl`.

```ts
new DeepgramVoiceAgentAdapter({
  apiKey: process.env.DEEPGRAM_API_KEY!,
  think: { provider: 'groq', model: 'llama-3.3-70b', endpointUrl: 'https://api.groq.com/openai/v1/chat/completions' },
  thinkProviderCredential: { kind: 'api-key', apiKey: process.env.GROQ_API_KEY! },
});
```

The credential is sent only inside the Voice Agent `Settings` message, as the provider's documented
endpoint header (`authorization: Bearer`, `x-api-key` with `anthropic-version`, `x-goog-api-key`,
`xi-api-key`) or as AWS credentials (`iam`, or `sts` when a session token is given). It never
appears in settings, capabilities, events, errors, or logs.

Session behavior:

- `createSession()` resolves once Deepgram has applied the settings (`Welcome`, then `Settings`,
  then `SettingsApplied`); a failed or timed-out handshake rejects it and releases the connection.
  Audio, text, and `KeepAlive` messages are sent only while the session is active.
- The session language comes from the OwlLayer session, then from `language` (default `fr`). The
  listening model defaults to Flux for English and Nova-3 otherwise. A session voice is used only
  when it is an Aura-2 voice of that language; otherwise the configured or default voice is used.
- Tools are exposed as Voice Agent functions without any `endpoint`: every call comes back to
  OwlLayer and goes through the HITL router. `high` and `critical` tools carry `defer_until_eot`,
  so Deepgram waits for the end of the user's turn before calling them. The interim
  "pending approval" answer of the server is not forwarded; Deepgram receives the final result
  once the user approves or refuses. Calls cancelled by Deepgram are reported through
  `onToolCallCancelled` and never answered.
- Tool updates are sent as `UpdateThink`, one at a time; the latest tool list requested while an
  update is pending is sent once Deepgram acknowledges it.
- When the user starts speaking, agent audio still in flight is dropped until the agent speaks
  again, and the server is told about the interruption.
- The previous conversation (`conversationHistory`) seeds the Voice Agent context, limited to the
  last `limits.maxHistoryMessages` messages. The adapter never reconnects by itself: an unexpected
  close or a provider error is reported once through `onError` (`REMOTE_CLOSED` or
  `PROVIDER_UNAVAILABLE`), and the server creates a new session with the conversation so far.
  Provider warnings surface as `agent.warning` events and never end the session.

## Model catalog

Every model, voice, and Voice Agent reasoning provider is exported as a typed, reusable list.
Identifier types stay open (`(string & {})`) so a newer id not yet listed still type-checks.

```ts
import {
  DEEPGRAM_NOVA_MODELS,
  DEEPGRAM_FLUX_MODELS,
  DEEPGRAM_STT_MODEL_LANGUAGES,
  DEEPGRAM_AURA_VOICES_BY_LANGUAGE,
  DEEPGRAM_AURA_VOICES,
  DEEPGRAM_DEFAULT_AURA_VOICE_BY_LANGUAGE,
  DEEPGRAM_THINK_PROVIDERS,
  DEEPGRAM_THINK_MODELS,
  DEEPGRAM_CATALOG_VERIFIED_AT,
} from '@owllayer/adapter-deepgram';

// Conversational (Flux) and classic (Nova) STT models, each with its supported languages.
DEEPGRAM_STT_MODEL_LANGUAGES['flux-general-multi']; // ['en', 'es', 'fr', 'de', 'hi', 'ru', 'pt', 'ja', 'it', 'nl']

// Aura-2 voices grouped by language, with gender.
DEEPGRAM_AURA_VOICES_BY_LANGUAGE['fr']; // [{ id: 'aura-2-agathe-fr', gender: 'female' }, ...]

// Reasoning models Deepgram manages for the Voice Agent, grouped by provider and pricing tier.
DEEPGRAM_THINK_MODELS['open_ai']; // [{ id: 'gpt-5.4-mini', tier: 'standard' }, ...]

DEEPGRAM_CATALOG_VERIFIED_AT; // ISO date this catalog was last checked against Deepgram's docs
```

`getDeepgramNovaSTTCapabilities()`, `getDeepgramFluxSTTCapabilities()`,
`getDeepgramAuraTTSCapabilities()`, and `getDeepgramVoiceAgentCapabilities()` build a
`SpeechCapabilities` / `LLMAdapterCapabilities` report directly from these lists, and always
include the catalog's `verifiedAt` date.

Language validation is centralized internally (language normalization, model/voice-language
coherence, and language-aware defaults are package-internal utilities, not part of the public API):
a language configured for a listed model is checked against that model's supported languages before
any provider connection; an unlisted identifier skips the local check (the provider surfaces a
rejection instead).

## Settings for storage and configuration

Every capability's configuration is split into a serializable `*Settings` object (safe to store and edit in a configuration UI,
validated by an exported strict Zod schema — unknown fields are rejected) and a `*Options` object
that is the constructor input: `*Options = *Settings & { apiKey: string }`. The key is **never**
part of a `*Settings` value, and never appears in capability reports, errors, or logs — it is
supplied separately, only at construction, and only travels to Deepgram in the
`Authorization: Token <key>` header.

```ts
import {
  deepgramFluxSTTSettingsSchema,
  parseDeepgramFluxSTTSettings,
  type DeepgramFluxSTTSettings,
  type DeepgramFluxSTTOptions,
} from '@owllayer/adapter-deepgram';

// Validate a stored configuration before using or saving it.
const settings: DeepgramFluxSTTSettings = parseDeepgramFluxSTTSettings({
  language: 'fr',
  turnDetection: { endOfTurnThreshold: 0.75 },
});

// At session start: settings (no key) + a key supplied separately = constructor options.
const options: DeepgramFluxSTTOptions = { ...settings, apiKey: process.env.DEEPGRAM_API_KEY! };
```

`parseDeepgramNovaSTTSettings()`, `parseDeepgramFluxSTTSettings()`,
`parseDeepgramAuraTTSSettings()`, and `parseDeepgramVoiceAgentSettings()` validate a stored
configuration and throw a `SpeechServiceError` (`provider: 'deepgram'`) with a stable code —
`INVALID_SETTINGS` for out-of-range or inconsistent values (e.g. unknown fields, a tentative
end-of-turn threshold above the end-of-turn threshold, or a custom `think`/`speak` provider missing
its required `https://` `endpointUrl`), or `UNSUPPORTED_PROVIDER` when `think.provider` or
`speak.provider` names something outside the closed catalog below. Each capability instance is
created for one session and released with it — nothing here is shared mutable state.

### Voice Agent provider credential policy

`DEEPGRAM_THINK_PROVIDERS` and `DEEPGRAM_SPEAK_PROVIDERS` (exported from `@owllayer/adapter-deepgram`)
are the closed catalogs of `think`/`speak` providers, each mapped to a
`DeepgramProviderCredentialPolicy`:

```ts
import { DEEPGRAM_THINK_PROVIDERS, DEEPGRAM_SPEAK_PROVIDERS } from '@owllayer/adapter-deepgram';

DEEPGRAM_THINK_PROVIDERS.open_ai; // { deepgramManaged: true,  providerCredential: 'optional', credentialKind: 'api-key' }
DEEPGRAM_THINK_PROVIDERS.groq; //    { deepgramManaged: false, providerCredential: 'required', credentialKind: 'api-key' }
DEEPGRAM_THINK_PROVIDERS.aws_bedrock; // { deepgramManaged: false, providerCredential: 'required', credentialKind: 'aws' }
DEEPGRAM_SPEAK_PROVIDERS.deepgram; // { deepgramManaged: true, providerCredential: 'none' }
```

- `open_ai`, `anthropic`, `google`, and `nvidia` are Deepgram-managed think providers: the Deepgram
  key alone is enough, and a provider credential is accepted but optional.
- `groq` and `aws_bedrock` are think providers that route through the integrator's own deployment:
  a `thinkProviderCredential` is **required**, and `think.endpointUrl` (`https://` only) must name
  that deployment.
- `deepgram` is the only Deepgram-managed speak provider (`providerCredential: 'none'` — supplying a
  `speakProviderCredential` for it is rejected). Every other speak provider (`open_ai`, `eleven_labs`,
  `cartesia`, `aws_polly`) requires both a `speakProviderCredential` and a `speak.endpointUrl`.

`validateDeepgramVoiceAgentOptions(options)` validates a full `DeepgramVoiceAgentOptions` — settings
structure/coherence (via `parseDeepgramVoiceAgentSettings`) plus this credential policy — and throws
`PROVIDER_CREDENTIAL_REQUIRED` when a required `thinkProviderCredential`/`speakProviderCredential` is
missing, or `INVALID_SETTINGS` when one is supplied for a `'none'` policy or of the wrong
`DeepgramProviderCredential` kind (`'api-key'` vs `'aws'`). Credentials are never part of
`DeepgramVoiceAgentSettings` (never persisted) and never appear in the thrown error message.

```ts
import { validateDeepgramVoiceAgentOptions, type DeepgramVoiceAgentOptions } from '@owllayer/adapter-deepgram';

const options: DeepgramVoiceAgentOptions = {
  apiKey: process.env.DEEPGRAM_API_KEY!,
  think: { provider: 'groq', model: 'llama-3.3-70b', endpointUrl: 'https://api.groq.example/v1' },
  thinkProviderCredential: { kind: 'api-key', apiKey: process.env.GROQ_API_KEY! },
};
const settings = validateDeepgramVoiceAgentOptions(options); // throws PROVIDER_CREDENTIAL_REQUIRED without a key
```

## Errors

Provider failures map to a stable, documented `SpeechServiceError` code (`AUTH_FAILED`,
`QUOTA_EXCEEDED`, `RATE_LIMITED`, `INVALID_REQUEST`, `PAYLOAD_TOO_LARGE`, `PROVIDER_UNAVAILABLE`,
`TIMEOUT`, `REMOTE_CLOSED`, `INVALID_SETTINGS`, `UNSUPPORTED_LANGUAGE`, `UNSUPPORTED_PROVIDER`,
`PROVIDER_CREDENTIAL_REQUIRED`, `AUDIO_QUEUE_FULL`, `TEXT_QUEUE_FULL`). `getDeepgramErrorDetails(error)`
returns `{ retryable, requestId? }` for a `SpeechServiceError` produced by this package —
`PROVIDER_CREDENTIAL_REQUIRED` is not retryable. Error messages never include a provider response
body, a transcript, or an API key (Deepgram's or a third-party provider's).
