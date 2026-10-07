# @owllayer/adapter-livekit

## 0.4.0

### Minor Changes

- 9af2c2f: Corrected genders and voice set, typed model catalog, deprecated models and warnings (#166), aligned on `@owllayer/adapter-google` (FR-009) and `@owllayer/adapter-deepgram`.

  - **Corrected data**: `GEMINI_LIVE_VOICES` now lists the 30 documented Gemini voices (was 8) with the genders confirmed by Google Cloud's Chirp 3 HD page — `Puck` was incorrectly marked `neutral`, it is documented `male`. `GEMINI_TTS_VOICES` / `GEMINI_TTS_VOICE_INFOS` keep their 30 names but every voice was previously marked `neutral`; genders are now correct and identical to `@owllayer/adapter-google`'s `GEMINI_VOICES`.
  - New exports: `GEMINI_CATALOG_VERIFIED_AT`, `GEMINI_LIVE_MODELS` (role and status), `GEMINI_LANGUAGES`, `isKnownGeminiModel`, `isKnownGeminiVoice`, `geminiSupportsLanguage`, `GEMINI_DEPRECATED_MODELS`, `getGeminiDeprecatedModel`, and the `GeminiLiveModel` / `GeminiVoice` types.
  - Every existing export and type (`DEFAULT_GEMINI_LIVE_MODEL`, `DEFAULT_GEMINI_LIVE_VERTEX_MODEL`, `DEFAULT_GEMINI_LIVE_VOICE`, `GEMINI_LIVE_VOICES`, `buildGeminiLiveCapabilities`, `DEFAULT_GEMINI_TTS_MODEL`, `DEFAULT_GEMINI_TTS_VOICE`, `GEMINI_TTS_MODELS`, `GEMINI_TTS_VOICE_INFOS`, `GEMINI_TTS_VOICES`, `buildGeminiTTSCapabilities`, `GeminiTTSModelName`, `GeminiTTSVoiceName`) keeps its name; `GeminiLiveAdapterOptions.model`/`.voice` and `GeminiTTSServiceOptions.model`/`.defaultVoice` widen to a catalog id or any string.
  - `DEFAULT_GEMINI_LIVE_MODEL` stays `gemini-2.5-flash-native-audio-preview-12-2025`, matching `@owllayer/adapter-google`'s `GOOGLE_DEFAULT_LIVE_MODEL`: the LiveKit Google plugin applies new tools by resuming the session, and Gemini 2.5 takes them while Gemini 3.x Live keeps the tools of the opening (verified on the live API). It is listed in `GEMINI_LIVE_MODELS`; the undated alias `gemini-2.5-flash-native-audio-preview` is deprecated in its favor. `DEFAULT_GEMINI_TTS_MODEL` is unchanged (still preview, not deprecated).
  - `GEMINI_TTS_MODELS` content corrected: `gemini-2.5-flash-tts`, `gemini-2.5-flash-lite-preview-tts` and `gemini-2.5-pro-tts` are not documented under these ids by Google; moved to `GEMINI_DEPRECATED_MODELS` (deprecated, with a documented replacement) and replaced by the verified `gemini-3.8-flash-tts` / `gemini-3.8-flash-lite-tts`. The undocumented Live model id `gemini-3.1-live-preview` is likewise replaced by the correctly documented `gemini-3.1-flash-live-preview`.
  - Constructing `GeminiLiveAdapter` or `GeminiTTSService` with a deprecated or retired model (constant or free string) now logs one warning naming the replacement; the configured value is still used.
  - `buildGeminiLiveCapabilities()` / `buildGeminiTTSCapabilities()` are now built from the exported catalogs.

### Patch Changes

- 604b211: Security: the LiveKit adapter no longer installs vulnerable `sharp`, OpenTelemetry and `protobufjs` versions (#138).

  - `@livekit/agents` and `@livekit/agents-plugin-google` 1.9.0 (were 1.5.0), `@livekit/rtc-node` 0.13.35.
  - Brings `sharp` 0.35.4 (libvips and libheif fixes) and OpenTelemetry 2.8+.

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

- d48199c: Restore i18n support for LiveKit adapter with complete translation catalog integration

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

## 0.1.2

### Patch Changes

- 61238a9: Migrate the LiveKit adapter's internal PCM utility dependency from the standalone
  `@owllayer/audio` workspace to `@owllayer/core/media/audio`.

## 0.1.1

### Patch Changes

- Updated dependencies [c5a7134]
- Updated dependencies [17d76b3]
  - @owllayer/audio@0.1.1
  - @owllayer/core@0.1.1
