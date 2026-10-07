---
"@owllayer/adapter-google": minor
---

Typed catalogs for models, voices and languages (#163), aligned on `@owllayer/adapter-deepgram`.

- New exports: `GOOGLE_TEXT_MODELS`, `GOOGLE_LIVE_MODELS`, `GOOGLE_STT_MODELS`, `GOOGLE_TTS_MODELS`, `GEMINI_VOICES` (30 documented voices with gender and language), `GOOGLE_TTS_VOICES` (Cloud Text-to-Speech, 9 locales, documented voice families), `GOOGLE_STT_LANGUAGES`, `GOOGLE_TTS_LANGUAGES`, defaults (`GOOGLE_DEFAULT_TEXT_MODEL`, `GOOGLE_DEFAULT_LIVE_MODEL`, `GOOGLE_DEFAULT_LIVE_VOICE`, `GOOGLE_DEFAULT_STT_MODEL`, `GOOGLE_DEFAULT_TTS_VOICE_BY_LANGUAGE`), validation helpers (`isKnownGoogleModel`, `isKnownGoogleVoice`, `googleSupportsLanguage`, `getGoogleDefaultTTSVoice`), a deprecated-model catalog (`GOOGLE_DEPRECATED_MODELS`, `getGoogleDeprecatedModel`) and `GOOGLE_CATALOG_VERIFIED_AT`.
- `model`/`voice` options on `GoogleAdapter`, `GoogleLiveAdapter`, `GoogleSTT` and `GoogleTTS` widen from `string` to a catalog id or any string; every value accepted before this change is still accepted.
- **Breaking default change**: `GoogleAdapter`'s default model changes from `gemini-2.0-flash` (retired by Google on 2026-06-01) to `gemini-3.6-flash`. `GoogleLiveAdapter` keeps `gemini-2.5-flash-native-audio-preview-12-2025` as its default model: it is listed in `GOOGLE_LIVE_MODELS` with the Gemini 3.x Live models, and it is the only one that takes new tools during a session (see the Live tool update changeset).
- Constructing an adapter with a deprecated or retired model (constant or free string) now logs one warning naming the replacement; the configured value is still used. The same applies when a listed voice does not support the configured language.
- `getCapabilities()` of every class in this package is now built from the exported catalog instead of an inline list; corrected the Gemini voice list (removed undocumented `Orbit`, `Vega`, `Sirius`, added the 24 missing documented voices with their Chirp 3 HD gender).
- Documented, but not yet selectable through this package's options: Google's Gemini API speech models (`gemini-3.8-flash-tts`, `gemini-3.8-flash-lite-tts`, `gemini-3.5-transcribe`) are listed in `GOOGLE_TTS_MODELS` / `GOOGLE_STT_MODELS` for reference; `GoogleTTS`/`GoogleSTT` call Cloud Text-to-Speech / Cloud Speech-to-Text v1, not the Gemini API, so these ids are not wired into their `voice`/`model` options yet.
