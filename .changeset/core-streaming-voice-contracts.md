---
"@owllayer/core": minor
---

Provider-neutral streaming speech contracts and live session history (#109).

- New, additive `packages/core/src/voice/streaming.ts`: `StreamingSTTService`/`StreamingTTSService` with `openTurnStream()`/`openSpeechStream()`, independent from the existing batch `STTService`/`TTSService` (a streaming-only provider never fakes a batch `transcribe()`/`synthesize()`), plus `STTTurnEvent`, `SpeechStreamState`, and the runtime guards `isStreamingSTTService`/`isStreamingTTSService`.
- `LiveSessionConfig` gains two optional fields: `conversationHistory` (prior messages, supplied on session creation and re-creation) and `onToolCallCancelled` (ids of provider-cancelled tool calls). Purely additive — every existing `STTService`, `TTSService`, `LiveAdapter`, and `LiveSession` implementation compiles and behaves unchanged.
- Exported from the package root (`@owllayer/core`).
