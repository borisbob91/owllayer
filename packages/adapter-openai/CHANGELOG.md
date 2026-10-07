# @owllayer/adapter-openai

## 0.4.0

### Minor Changes

- 594f168: Complete the model and voice catalog with roles, statuses, languages, defaults, validation helpers and a deprecated-model catalog (#165), aligned on `@owllayer/adapter-deepgram`.

  - New exports: `OPENAI_CATALOG_VERIFIED_AT`, `OPENAI_MODEL_CATALOG` (role and status for every chat, realtime, TTS and STT model), `OPENAI_VOICE_CATALOG` (the 13 TTS voices, each stating Realtime availability; gender left unset, not documented by OpenAI), `OPENAI_LANGUAGES`, `OPENAI_DEFAULT_CHAT_MODEL`, `OPENAI_DEFAULT_REALTIME_MODEL`, `OPENAI_DEFAULT_REALTIME_VOICE`, `OPENAI_DEFAULT_TTS_MODEL`, `OPENAI_DEFAULT_TTS_VOICE`, `OPENAI_DEFAULT_STT_MODEL`, `isKnownOpenAIModel`, `isKnownOpenAIVoice`, `openAISupportsLanguage`, `OPENAI_DEPRECATED_MODELS`, `getOpenAIDeprecatedModel`.
  - Every existing export and type (`OPENAI_CHAT_MODELS`, `OPENAI_REALTIME_MODELS`, `OPENAI_TTS_MODELS`, `OPENAI_STT_MODELS`, `OPENAI_TTS_VOICES`, `OPENAI_REALTIME_VOICES` and their types) is unchanged.
  - **Breaking default change**: `whisper-1` is deprecated by OpenAI (announced shutdown 2027-02-26, replacement `gpt-transcribe`). `WhisperSTT`'s default `model` and `OpenAILiveAdapter`'s default `inputTranscriptionModel` change from `'whisper-1'` to `OPENAI_DEFAULT_STT_MODEL` (`'gpt-transcribe'`). `whisper-1` is still accepted and now logs a deprecation warning.
  - `gpt-5-chat-latest` and `gpt-5.2-chat-latest` (in `OPENAI_CHAT_MODELS`, kept for compatibility) are retired by OpenAI: excluded from `OPENAI_MODEL_CATALOG` and `OpenAIAdapter.getCapabilities()`, listed in `OPENAI_DEPRECATED_MODELS` with their replacement `gpt-5.6-sol`. `gpt-4o-transcribe` and `gpt-4o-mini-transcribe` (in `OPENAI_STT_MODELS`, kept for compatibility) are deprecated the same way.
  - Also deprecated by OpenAI and moved out of `OPENAI_MODEL_CATALOG` and `getCapabilities()` (still accepted, with a warning): `gpt-5`, `gpt-5-mini`, `gpt-5-nano` and `o3` (shutdown 2026-12-11), `o4-mini` and `gpt-4.1-nano` (2026-10-23), `gpt-5.1` and `gpt-5.2` (no date announced), `gpt-realtime` and `gpt-realtime-mini` (2027-01-20). Replacements (`gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-realtime-2.1`, `gpt-realtime-2.1-mini`) are listed, with `gpt-live-1` and `gpt-realtime-whisper`.
  - `isKnownOpenAIVoice(id, 'live')` only accepts Realtime voices.
  - Constructing `OpenAIAdapter`, `OpenAILiveAdapter`, `OpenAITTS` or `WhisperSTT` with a deprecated or retired model (constant or free string) now logs one warning naming the replacement; an unlisted model (for example a DeepSeek-style id) never warns.
  - `getCapabilities()` of `OpenAIAdapter`, `OpenAILiveAdapter` and `OpenAITTS` is now built from the exported catalog; `OpenAILiveAdapter`'s realtime voice list no longer guesses undocumented genders (`alloy`, `ash`, `coral`, `echo`, `sage`, `shimmer` previously had inline, unverified genders — left unset like every other OpenAI voice).

- 9c02041: The OpenAI adapters now work with the current OpenAI API, including the Realtime GA voice interface (#77).

  - Realtime voice uses the GA interface. The default model is `gpt-realtime-1.5`, and `reasoningEffort` defaults to `low` on `gpt-realtime-2*` models.
  - Microphone audio is resampled from 16 kHz to the 24 kHz the API expects. Before, it was played 1.5x too fast, which hurt voice detection and transcription.
  - New Realtime methods: `interrupt()` (barge-in), `updateTools()` (tools of the new page after a navigation) and `endAudioTurn()` (push-to-talk).
  - Realtime tool results are sent as JSON objects. Plain strings are wrapped as `{ response_text }`.
  - Text chat: `temperature` is no longer sent to reasoning models unless you set it, one tool call is handled per turn, and malformed tool arguments no longer break the turn.
  - `gpt-4o-mini-tts` (with `instructions`) and `gpt-4o-transcribe` models are supported.
  - Typed lists of models and voices are exported.

- 9c02041: Add an optional thinking mode toggle for DeepSeek-compatible chat APIs.

### Patch Changes

- 1f9d37e: Security: the OpenAI adapter now requires `ws` 8.22 or later (#139).

  - `ws` 8.19 had two advisories (GHSA-96hv-2xvq-fx4p, GHSA-58qx-3vcg-4xpx).

- Updated dependencies [6da45e1]
- Updated dependencies [3a3a4bc]
- Updated dependencies [64281fc]
- Updated dependencies [dd0bdd7]
- Updated dependencies [5585c15]
- Updated dependencies [21f1410]
- Updated dependencies [ba6bc1b]
- Updated dependencies [5a215ef]
- Updated dependencies [6e62051]
  - @owllayer/core@0.5.0

## 0.3.0

### Minor Changes

- dc67452: Restore i18n support for OpenAI adapter with complete translation catalog integration

### Patch Changes

- d5b4ecf: Exclure les source maps (`.map`) des tarballs npm publies via le champ `files`, et verifier l'absence de `.map` dans `verify-packages`.
- Updated dependencies [d5b4ecf]
- Updated dependencies [dc67452]
  - @owllayer/core@0.4.0

## 0.2.0

### Minor Changes

- 6a9a96b: Migrate adapters to the canonical `@owllayer/*` naming as part of the final pre-publication cutover.

### Patch Changes

- Updated dependencies [1ee6cff]
  - @owllayer/core@0.3.0

## 0.1.1

### Patch Changes

- Updated dependencies [17d76b3]
  - @owllayer/core@0.1.1
