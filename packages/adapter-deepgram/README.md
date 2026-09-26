# @owllayer/adapter-deepgram

OwlLayer AI adapter for [Deepgram](https://deepgram.com): Nova batch speech-to-text, Flux
streaming speech-to-text, Aura-2 text-to-speech (batch and streaming), and the Deepgram Voice
Agent as a realtime model. Part of the OwlLayer AI Runtime, communicating with clients over AITP.

## Installation

```bash
pnpm add @owllayer/adapter-deepgram
```

The package depends only on `@owllayer/core` (workspace), `ws`, and `zod`. It never imports
`@owllayer/server`.

## Voice modes

Deepgram supports OwlLayer's two first-class voice modes:

- **Pipeline** (Deepgram STT + any OwlLayer text LLM + Deepgram TTS, batch or streaming).
- **Realtime** (the Deepgram Voice Agent as the live model, with OwlLayer keeping authority over
  tools, context, and human approvals).

## Status per delivery lot

| Lot | Content | Status |
| --- | --- | --- |
| DG-0 | Package foundation: typed model catalog, language rules, audio helpers, error mapping, connection transport, capabilities, event maps, Studio-ready settings schemas | Delivered |
| DG-1 | `DeepgramNovaSTT` (batch STT) | Not started |
| DG-2 | `DeepgramAuraTTS` batch (`TTSService`) | Not started |
| DG-4 | `DeepgramFluxSTT` (streaming STT) | Not started |
| DG-5 | `DeepgramAuraTTS` streaming (`StreamingTTSService`) | Not started |
| DG-7 | `DeepgramVoiceAgentAdapter` (realtime) | Not started |

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

Language validation is centralized in `normalizeLanguageCode()`, `assertModelSupportsLanguage()`,
and `resolveLanguageDefaults()`: a language configured for a listed model is checked against that
model's supported languages before any provider connection; an unlisted identifier skips the local
check (the provider surfaces a rejection instead).

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
`INVALID_SETTINGS` for out-of-range or inconsistent values (e.g. unknown fields, or a tentative
end-of-turn threshold above the end-of-turn threshold), or `UNSUPPORTED_PROVIDER` when the Voice
Agent's reasoning provider needs a third-party credential Deepgram would have to forward (only
`open_ai`, `anthropic`, and `google`, Deepgram-managed, are accepted). Each capability instance is
created for one session and released with it — nothing here is shared mutable state.

## Errors

Provider failures map to a stable, documented `SpeechServiceError` code (`AUTH_FAILED`,
`QUOTA_EXCEEDED`, `RATE_LIMITED`, `INVALID_REQUEST`, `PAYLOAD_TOO_LARGE`, `PROVIDER_UNAVAILABLE`,
`TIMEOUT`, `REMOTE_CLOSED`, `INVALID_SETTINGS`, `UNSUPPORTED_LANGUAGE`, `UNSUPPORTED_PROVIDER`,
`AUDIO_QUEUE_FULL`, `TEXT_QUEUE_FULL`). `getDeepgramErrorDetails(error)` returns
`{ retryable, requestId? }` for a `SpeechServiceError` produced by this package. Error messages
never include a provider response body, a transcript, or the API key.
