---
"@owllayer/adapter-deepgram": minor
---

`DeepgramFluxSTT`: turn-aware streaming speech-to-text (#110).

- New `DeepgramFluxSTT` class implementing the core `StreamingSTTService` contract (`wss://api.deepgram.com/v2/listen`) directly, with no batch method; a factory that opens one `DeepgramFluxTurnStream` per call to `openTurnStream()`.
- `DeepgramFluxTurnStream` (`STTTurnStream`): queues audio (bounded by `limits.maxQueuedAudioMs`) until the connection reports ready, then flushes it in order; maps every documented `TurnInfo` event (`StartOfTurn`, `Update`, `EagerEndOfTurn`, `TurnResumed`, `EndOfTurn`) to the matching `STTTurnEvent`; `endAudioTurn()` sends `ForceEndTurn`; `close()` sends `CloseStream` and is idempotent.
- Adds `updateTurnDetection(update)` (Flux-specific, not part of the core contract): validates new thresholds locally before sending `Configure`, resolves on `ConfigureSuccess`, rejects with `INVALID_REQUEST` on `ConfigureFailure`; `keyterms` in an update entirely replaces the current list; only one update may be pending at a time, and an update after `close()` rejects with `REMOTE_CLOSED`.
- No internal reconnection: an unexpected close maps to `stream.error` (`REMOTE_CLOSED`, retryable) then `stream.closed`; a fatal provider error closes the stream after reporting it. The API key is sent only in the `Authorization: Token` header, never in the connection URL.
