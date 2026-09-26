---
"@owllayer/adapter-deepgram": patch
---

Audit fixes for #106, #107 and #108 (no public behavior change beyond the two defects below).

- Nova STT (#107, defect): the `language` query parameter now resolves to the exact code Deepgram documents for the selected model (sent as-is when listed, e.g. `fr-CA`; otherwise its normalized primary subtag when that is listed, e.g. `fr-FR` → `fr`), instead of always forwarding the requested code unchanged.
- Aura TTS (#108, defect): a per-call `TTSConfig.speed` (core contract range `[0.5, 2.0]`) is now clamped to the Deepgram Aura-2 documented range `[0.7, 1.5]` before being sent, instead of being forwarded unclamped and potentially rejected by the provider.
- (#106) Trimmed the package's public export surface: `toSpeechServiceError`, `normalizeLanguageCode`, `assertModelSupportsLanguage`, `resolveLanguageDefaults`, `mimeTypeToDeepgramEncoding`, `createEvenByteAligner`, and their associated types are internal utilities and are no longer exported from `@owllayer/adapter-deepgram` (`getDeepgramErrorDetails` and `DeepgramErrorCode` remain public).
- Added missing test coverage: `DeepgramWebSocketConnection.close()` stops the keepalive timer synchronously even when the socket never confirms with a `close` event, and two `close` events from the socket collapse into exactly one `onClose` call; Nova STT rejects a per-call `languageCode` unsupported by the model before any fetch, makes the provider `request_id` retrievable via `getDeepgramErrorDetails`, and leaves no active timer after a successful or failed request; Aura TTS covers per-call `speed`/`outputFormat` overrides and leaves no active timer after a successful or failed request.

(The `DeepgramAuraVoice` literal-type fix and the Voice Agent `speak.voice`/language test gap, both also findings under #106, were already fixed in the preceding `feat(adapter-deepgram)` Voice Agent provider credential policy commit — see its changeset.)
