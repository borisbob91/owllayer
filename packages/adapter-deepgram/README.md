# @owllayer/adapter-deepgram

[![npm version](https://img.shields.io/npm/v/@owllayer/adapter-deepgram?color=2563eb)](https://www.npmjs.com/package/@owllayer/adapter-deepgram)
[![License: MIT](https://img.shields.io/badge/license-MIT-2563eb.svg)](./LICENSE)
[![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](https://www.typescriptlang.org/docs/handbook/tsconfig.json#strict)
[![Node.js 22](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)

OwlLayer AI adapter for [Deepgram](https://deepgram.com): delivers **batch speech-to-text** (Nova
models), **batch text-to-speech** (Aura-2 voices), complete typed model catalog, and strict
settings schemas for the OwlLayer AI Runtime.

**Coming next** (issues #110–#113): streaming STT (Flux), streaming TTS (Aura-2), server-side
streaming pipeline, and Deepgram Voice Agent realtime mode.

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

## Status per delivery lot

| Lot | Content | Status | Issue |
| --- | --- | --- | --- |
| DG-0 | Package foundation: typed model catalog, language rules, audio helpers, error mapping, connection transport, capabilities, event maps, Studio-ready settings schemas | Delivered | #106 |
| DG-1 | `DeepgramNovaSTT` (batch STT) | Delivered | #107 |
| DG-2 | `DeepgramAuraTTS` batch (`TTSService`) | Delivered | #108 |
| DG-4 | `DeepgramFluxSTT` (streaming STT) | Coming next | #110 |
| DG-5 | `DeepgramAuraTTS` streaming (`StreamingTTSService`) | Coming next | #111 |
| DG-6 | Server-side streaming pipeline (LLM + Deepgram Flux + Aura) | Coming next | #112 |
| DG-7 | `DeepgramVoiceAgentAdapter` (realtime) | Coming next | #113 |

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
the current batch pipeline with no client or server change. It will also implement
`StreamingTTSService` starting DG-5, on the same class, sharing voice/language/format settings:

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

## Settings for the runtime and Studio

Every capability's configuration is split into a serializable `*Settings` object (Studio-editable,
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

// Validate a configuration stored by the Studio before saving it.
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
