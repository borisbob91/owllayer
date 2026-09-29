---
"@owllayer/server": minor
---

Provider-neutral streaming voice pipeline, live tool-call cancellation, and voice-mode validation (#112).

- New `StreamingPipelineLiveAdapter` (`packages/server/src/voice/`): a `LiveAdapter` composite over any `StreamingSTTService` + `LLMAdapter` + `StreamingTTSService` from `@owllayer/core`. Plugs into the existing `live` option with no AITP change — turn-based state machine (speculative replies held until confirmed, sequential tool calls up to `maxToolCallsPerTurn`, prompt barge-in), and transparent STT stream re-opening when a provider without a keepalive closes its stream during a silence.
- `OwlLayerServer` now passes `conversationHistory` when creating or re-creating a live session, and tracks tool calls cancelled by the live provider (`onToolCallCancelled`): the matching pending server approval is withdrawn, no response is ever sent to the provider for that call, and a late `TOOL_RESULT` is dropped.
- New `validateVoiceRuntimeDefinition()` (exported): a pure, provider-neutral check for a voice configuration (`VOICE_MODE_CONFLICT`, `VOICE_PIPELINE_INCOMPLETE`, `VOICE_REALTIME_INCOMPLETE`).
- When both `live` and `stt`/`tts` are configured, `live` keeps its existing precedence; the server now logs exactly one warning about it instead of staying silent. No breaking change: the constructor's existing behavior is unchanged.
