---
"@owllayer/adapter-livekit": minor
---

Corrected genders and voice set, typed model catalog, deprecated models and warnings (#166), aligned on `@owllayer/adapter-google` (FR-009) and `@owllayer/adapter-deepgram`.

- **Corrected data**: `GEMINI_LIVE_VOICES` now lists the 30 documented Gemini voices (was 8) with the genders confirmed by Google Cloud's Chirp 3 HD page — `Puck` was incorrectly marked `neutral`, it is documented `male`. `GEMINI_TTS_VOICES` / `GEMINI_TTS_VOICE_INFOS` keep their 30 names but every voice was previously marked `neutral`; genders are now correct and identical to `@owllayer/adapter-google`'s `GEMINI_VOICES`.
- New exports: `GEMINI_CATALOG_VERIFIED_AT`, `GEMINI_LIVE_MODELS` (role and status), `GEMINI_LANGUAGES`, `isKnownGeminiModel`, `isKnownGeminiVoice`, `geminiSupportsLanguage`, `GEMINI_DEPRECATED_MODELS`, `getGeminiDeprecatedModel`, and the `GeminiLiveModel` / `GeminiVoice` types.
- Every existing export and type (`DEFAULT_GEMINI_LIVE_MODEL`, `DEFAULT_GEMINI_LIVE_VERTEX_MODEL`, `DEFAULT_GEMINI_LIVE_VOICE`, `GEMINI_LIVE_VOICES`, `buildGeminiLiveCapabilities`, `DEFAULT_GEMINI_TTS_MODEL`, `DEFAULT_GEMINI_TTS_VOICE`, `GEMINI_TTS_MODELS`, `GEMINI_TTS_VOICE_INFOS`, `GEMINI_TTS_VOICES`, `buildGeminiTTSCapabilities`, `GeminiTTSModelName`, `GeminiTTSVoiceName`) keeps its name; `GeminiLiveAdapterOptions.model`/`.voice` and `GeminiTTSServiceOptions.model`/`.defaultVoice` widen to a catalog id or any string.
- **Breaking default change**: `DEFAULT_GEMINI_LIVE_MODEL` changes from `gemini-2.5-flash-native-audio-preview-12-2025` (undocumented today) to `gemini-3.8-live`, matching `@owllayer/adapter-google`'s `GOOGLE_DEFAULT_LIVE_MODEL`. `DEFAULT_GEMINI_TTS_MODEL` is unchanged (still preview, not deprecated).
- `GEMINI_TTS_MODELS` content corrected: `gemini-2.5-flash-tts`, `gemini-2.5-flash-lite-preview-tts` and `gemini-2.5-pro-tts` are not documented under these ids by Google; moved to `GEMINI_DEPRECATED_MODELS` (deprecated, with a documented replacement) and replaced by the verified `gemini-3.8-flash-tts` / `gemini-3.8-flash-lite-tts`. The undocumented Live model id `gemini-3.1-live-preview` is likewise replaced by the correctly documented `gemini-3.1-flash-live-preview`.
- Constructing `GeminiLiveAdapter` or `GeminiTTSService` with a deprecated or retired model (constant or free string) now logs one warning naming the replacement; the configured value is still used.
- `buildGeminiLiveCapabilities()` / `buildGeminiTTSCapabilities()` are now built from the exported catalogs.
