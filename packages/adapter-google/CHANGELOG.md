# @owllayer/adapter-google

## 0.4.0

### Minor Changes

- f128105: Typed catalogs for models, voices and languages (#163), aligned on `@owllayer/adapter-deepgram`.

  - New exports: `GOOGLE_TEXT_MODELS`, `GOOGLE_LIVE_MODELS`, `GOOGLE_STT_MODELS`, `GOOGLE_TTS_MODELS`, `GEMINI_VOICES` (30 documented voices with gender and language), `GOOGLE_TTS_VOICES` (Cloud Text-to-Speech, 9 locales, documented voice families), `GOOGLE_STT_LANGUAGES`, `GOOGLE_TTS_LANGUAGES`, defaults (`GOOGLE_DEFAULT_TEXT_MODEL`, `GOOGLE_DEFAULT_LIVE_MODEL`, `GOOGLE_DEFAULT_LIVE_VOICE`, `GOOGLE_DEFAULT_STT_MODEL`, `GOOGLE_DEFAULT_TTS_VOICE_BY_LANGUAGE`), validation helpers (`isKnownGoogleModel`, `isKnownGoogleVoice`, `googleSupportsLanguage`, `getGoogleDefaultTTSVoice`), a deprecated-model catalog (`GOOGLE_DEPRECATED_MODELS`, `getGoogleDeprecatedModel`) and `GOOGLE_CATALOG_VERIFIED_AT`.
  - `model`/`voice` options on `GoogleAdapter`, `GoogleLiveAdapter`, `GoogleSTT` and `GoogleTTS` widen from `string` to a catalog id or any string; every value accepted before this change is still accepted.
  - **Breaking default change**: `GoogleAdapter`'s default model changes from `gemini-2.0-flash` (retired by Google on 2026-06-01) to `gemini-3.6-flash`. `GoogleLiveAdapter` keeps `gemini-2.5-flash-native-audio-preview-12-2025` as its default model: it is listed in `GOOGLE_LIVE_MODELS` with the Gemini 3.x Live models, and it is the only one that takes new tools during a session (see the Live tool update changeset).
  - Constructing an adapter with a deprecated or retired model (constant or free string) now logs one warning naming the replacement; the configured value is still used. The same applies when a listed voice does not support the configured language.
  - `getCapabilities()` of every class in this package is now built from the exported catalog instead of an inline list; corrected the Gemini voice list (removed undocumented `Orbit`, `Vega`, `Sirius`, added the 24 missing documented voices with their Chirp 3 HD gender).
  - Documented, but not yet selectable through this package's options: Google's Gemini API speech models (`gemini-3.8-flash-tts`, `gemini-3.8-flash-lite-tts`, `gemini-3.5-transcribe`) are listed in `GOOGLE_TTS_MODELS` / `GOOGLE_STT_MODELS` for reference; `GoogleTTS`/`GoogleSTT` call Cloud Text-to-Speech / Cloud Speech-to-Text v1, not the Gemini API, so these ids are not wired into their `voice`/`model` options yet.

### Patch Changes

- df01c65: Gemini Live sessions follow the tools of the current page with the default model (#175).

  - Gemini Live reads its tools only when the connection opens. Verified on the live API: `gemini-2.5-flash-native-audio-preview-12-2025` takes a new tool list when the session is resumed with its handle, while `gemini-3.8-live` keeps the tools of the opening.
  - With the default model, `GoogleLiveAdapter` sessions implement `updateTools()`: at the end of the current turn (no model answer, user turn or tool call in progress), the session resumes with its last handle and the new tools. Google keeps the conversation, so nothing is replayed. Without a handle yet, it falls back to a new connection with the replayed transcript (last 40 turns).
  - New exports: `GOOGLE_LIVE_TOOL_RESUME_MODELS` and `supportsLiveToolResume(model)`.
  - New option `reconnectOnToolsChange` (default `false`) for the other Live models (Gemini 3.x): a new connection opens with the new tools and the transcript history is replayed with `sendClientContent`. When it is off, those sessions have no `updateTools()` and keep the tools they were opened with.
  - The reconnection waits until the previous connection is closed, and a connection that closes before opening no longer blocks the audio, text and tool responses waiting for it: the session closes and reports it through `onClose`. Error logs show the error message instead of `[object Object]`.
  - The conversation passed at opening (`conversationHistory`, text then voice) is replayed for every model.

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
