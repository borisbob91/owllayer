---
"@owllayer/adapter-deepgram": minor
---

`DeepgramAuraTTS`: Deepgram Aura-2 batch text-to-speech for the existing pipeline mode (#108).

- New `DeepgramAuraTTS` class implementing `TTSService` (`POST /v1/speak`), stateless and shareable across sessions, drop-in for the existing batch pipeline with no client change. Designed to also implement `StreamingTTSService` starting DG-5 on the same class.
- Sends `model` (voice), `encoding`, `container`, `sample_rate` (only where Deepgram allows it to vary), `speed`, and `mip_opt_out` as documented; returns the exact MIME per `batchOutputFormat` (`pcm` → `audio/pcm;rate=<sampleRate>`, `wav` → `audio/wav`, `mp3` → `audio/mpeg`, `opus` → `audio/ogg;codecs=opus`, `flac` → `audio/flac`, `aac` → `audio/aac`).
- Validates the configured voice against the configured language before any request (`UNSUPPORTED_LANGUAGE`), and rejects input text over Deepgram's documented 2000-character limit locally (`PAYLOAD_TOO_LARGE`) before any request.
- `TTSConfig.voice`, `.languageCode`, and `.outputFormat` override the constructor defaults per call; provider failures map to stable `SpeechServiceError` codes; `getCapabilities()` derived from the Aura catalog.
