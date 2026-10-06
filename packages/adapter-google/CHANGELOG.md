# @owllayer/adapter-google

## 0.4.0

### Minor Changes

- f128105: Typed catalogs for models, voices and languages (#163), aligned on `@owllayer/adapter-deepgram`.

  - New exports: `GOOGLE_TEXT_MODELS`, `GOOGLE_LIVE_MODELS`, `GOOGLE_STT_MODELS`, `GOOGLE_TTS_MODELS`, `GEMINI_VOICES` (30 documented voices with gender and language), `GOOGLE_TTS_VOICES` (Cloud Text-to-Speech, 9 locales, documented voice families), `GOOGLE_STT_LANGUAGES`, `GOOGLE_TTS_LANGUAGES`, defaults (`GOOGLE_DEFAULT_TEXT_MODEL`, `GOOGLE_DEFAULT_LIVE_MODEL`, `GOOGLE_DEFAULT_LIVE_VOICE`, `GOOGLE_DEFAULT_STT_MODEL`, `GOOGLE_DEFAULT_TTS_VOICE_BY_LANGUAGE`), validation helpers (`isKnownGoogleModel`, `isKnownGoogleVoice`, `googleSupportsLanguage`, `getGoogleDefaultTTSVoice`), a deprecated-model catalog (`GOOGLE_DEPRECATED_MODELS`, `getGoogleDeprecatedModel`) and `GOOGLE_CATALOG_VERIFIED_AT`.
  - `model`/`voice` options on `GoogleAdapter`, `GoogleLiveAdapter`, `GoogleSTT` and `GoogleTTS` widen from `string` to a catalog id or any string; every value accepted before this change is still accepted.
  - **Breaking default change**: `GoogleAdapter`'s default model changes from `gemini-2.0-flash` (retired by Google on 2026-06-01) to `gemini-3.6-flash`. `GoogleLiveAdapter`'s default model changes from `gemini-2.5-flash-native-audio-preview-12-2025` (undocumented today) to `gemini-3.8-live`.
  - Constructing an adapter with a deprecated or retired model (constant or free string) now logs one warning naming the replacement; the configured value is still used. The same applies when a listed voice does not support the configured language.
  - `getCapabilities()` of every class in this package is now built from the exported catalog instead of an inline list; corrected the Gemini voice list (removed undocumented `Orbit`, `Vega`, `Sirius`, added the 24 missing documented voices with their Chirp 3 HD gender).
  - Documented, but not yet selectable through this package's options: Google's Gemini API speech models (`gemini-3.8-flash-tts`, `gemini-3.8-flash-lite-tts`, `gemini-3.5-transcribe`) are listed in `GOOGLE_TTS_MODELS` / `GOOGLE_STT_MODELS` for reference; `GoogleTTS`/`GoogleSTT` call Cloud Text-to-Speech / Cloud Speech-to-Text v1, not the Gemini API, so these ids are not wired into their `voice`/`model` options yet.

### Patch Changes

- df01c65: Gemini Live sessions now follow the tools of the current page (#175).

  - `GoogleLiveAdapter` sessions implement `updateTools()`. The server already calls it after each `CONTEXT_UPDATE`; before this change the call was skipped and the session kept the tools of the page where voice started, so the agent could not use the tools of the pages it navigated to (checkout form, order confirmation).
  - Gemini Live reads its tools only when the connection opens, and a session resumed with a `sessionResumption` handle keeps its original tools. When the tool list changes, the session opens a new connection with the new tools at the end of the current turn (no model answer, user turn or tool call in progress) and replays the transcript history (last 40 turns) with `sendClientContent`, so the conversation continues.
  - Audio, text and tool responses sent during the reconnection go to the new connection. If the reconnection fails, the session closes and reports the error through `onError`, and the server opens a new session on the next audio.

- 135ee94: Security: the Google adapter no longer installs a vulnerable `protobufjs` (#137).

  - `@google/genai` 1.52 minimum.
  - Lockfile refresh: `protobufjs` 7.6.6 (fixes a critical arbitrary code execution), `minimatch` and `brace-expansion` patched versions.

- de657a8: The agent can now chain tools without a new user message, for example navigate to checkout and then fill the address (#76).

  - After a tool result, the LLM receives the tools currently available, including those of a page it just opened.
  - Up to 5 tool calls can follow each other in one turn.
  - The Google adapter uses these current tools in its follow-up request.

- 6e62051: Redesigned chat and voice widget, shared by React, Vue and Svelte, with the conversation kept between text and voice.

  - `@owllayer/core`: new stylesheet for the `call`, `chat` and `travel` presets (compact call card in voice mode, conversation panel in text mode, launcher, empty state, typing indicator, voice visualizer for listening, thinking, speaking and error, reduced motion, small screens). Each preset has its own palette (`PRESET_THEMES`), overridden by `theme`. New `WidgetLabels` keys (`switchToText`, `switchToVoice`, `close`, `muteMic`, `unmuteMic`, `emptyTitle`, `emptyText`, `linesWaitingTitle`, `linesWaitingText`, `linesBusyTitle`, `linesBusyText`); default status labels in sentence case. New `transcript` system event kind and `transcript.delta` client event.
  - `@owllayer/react`, `@owllayer/vue`, `@owllayer/svelte`: the widget uses the shared markup: header with agent state, mode switch and close button, voice controls (mute, hang up, switch to text), last transcript lines in voice mode, the same conversation in both modes. Labels replace the texts that were hard-coded in French. The microphone level drives the visualizer in every preset. `travel` opens bottom left only when no `position` is given. Svelte now scopes the widget styles under `.owllayer-widget-root`.
  - `@owllayer/server`: voice transcriptions are sent to the client (`SYSTEM_EVENT` `transcript`) and stored as one history message per spoken turn, so the conversation continues in text mode.
  - `@owllayer/adapter-google`: a Gemini Live session starts with the conversation the server passes (`conversationHistory`), so switching from text to voice keeps the context.
  - `end_call` in every SDK: the declaration is shared in `@owllayer/core` (`END_CALL_TOOL`); React, Vue and Svelte register it while the panel is open and close the panel once the agent has finished speaking (`END_CALL_TIMING`), instead of cutting its last words. Vue and Svelte did not register it before.
  - `@owllayer/ui`: DevTools `placement` option (`bottom-left` by default, away from chat widgets); `useDevTools({ placement })` in React.

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

- dc67452: Restore i18n support for Google adapter with complete translation catalog integration

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
