---
"@owllayer/adapter-deepgram": minor
---

`DeepgramNovaSTT`: Deepgram Nova batch speech-to-text for the existing pipeline mode (#107).

- New `DeepgramNovaSTT` class implementing `STTService` (`POST /v1/listen`), stateless and shareable across sessions, drop-in for the existing batch pipeline with no client change.
- Sends `model`, `language`, `smart_format`, repeated `keyterm`/`tag`, and `mip_opt_out` as documented; adds `encoding=linear16` + `sample_rate` only for raw PCM audio, omitted for containerized formats.
- Validates the configured language against the selected model's supported languages before any request (`UNSUPPORTED_LANGUAGE`), and maps provider failures to stable `SpeechServiceError` codes (`AUTH_FAILED`, `QUOTA_EXCEEDED`, `RATE_LIMITED`, `INVALID_REQUEST`, `PAYLOAD_TOO_LARGE`, `PROVIDER_UNAVAILABLE`, `TIMEOUT`).
- `getCapabilities()` derived from the Nova catalog; re-verified and expanded the Nova-3 supported-language list against the official Deepgram documentation.
