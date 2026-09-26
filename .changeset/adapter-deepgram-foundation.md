---
"@owllayer/adapter-deepgram": minor
---

New package `@owllayer/adapter-deepgram`: package foundation, typed model catalog, and Studio-ready settings (#106).

- Typed, reusable catalog of Nova/Flux STT models, Aura-2 voices by language, and Deepgram-managed Voice Agent reasoning models (`open_ai`, `anthropic`, `google`), each with a catalog verification date.
- Language normalization and validation (`normalizeLanguageCode`, `assertModelSupportsLanguage`, `resolveLanguageDefaults`) with language-aware defaults.
- Strict, serializable Zod settings schemas and `*Options` types for Nova, Flux, Aura, and Voice Agent, with the API key always supplied separately from settings.
- Stable `SpeechServiceError` codes (`toSpeechServiceError`, `getDeepgramErrorDetails`) and a shared internal WebSocket connection transport (open timeout, bounded send queue, keepalive, idempotent close).
- PCM audio helpers (`mimeTypeToDeepgramEncoding`, `createEvenByteAligner`) and observability event maps for Flux, Aura, and the Voice Agent.
