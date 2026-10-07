# @owllayer/adapter-deepgram

## 0.1.0

### Minor Changes

- 1cb0245: `DeepgramAuraTTS`: streaming text-to-speech (#111).

  - `DeepgramAuraTTS` now also implements the core `StreamingTTSService` contract via a new `openSpeechStream()` method (`wss://api.deepgram.com/v1/speak`), on the same instance that already implements batch `TTSService`, sharing voice/language/format settings.
  - New `DeepgramAuraSpeechStream` (`TTSSpeechStream`): `appendText()` sends `Speak` immediately once ready, queuing (bounded by `limits.maxQueuedTextSegments`, `TEXT_QUEUE_FULL` past the bound) before that; `flush()` sends `Flush` and resolves on `Flushed`; `interrupt()` sends `Clear`, immediately closes a local output gate that drops in-flight binary audio until `Cleared` arrives, and discards queued text; `close()` sends `Close` and is idempotent. Output audio is even-byte aligned, with the aligner reset on `interrupt()` so a byte carried over from discarded audio is never glued to the audio that follows.
  - `Flushed` and `Cleared` carry no request id from Deepgram: only one `flush()` and one `interrupt()` may be pending at a time each; a second concurrent call of the same kind rejects immediately with `INVALID_REQUEST` without disturbing the first call's own pending acknowledgement and its timeout. A call to `flush()` or `interrupt()` after `close()` rejects immediately with `REMOTE_CLOSED`, never sending anything and never waiting for the acknowledgement timeout.
  - A provider `Warning` surfaces as a redacted `aura.warning` event (never the provider's raw description); a `Metadata` message's `request_id` is kept and attached to a later unexpected-close error. No internal reconnection: an unexpected close reports `onError` with `REMOTE_CLOSED` (retryable); a client-initiated `close()` never reports an error. The API key is sent only in the `Authorization: Token` header, never in the connection URL.
  - Verified against the official Deepgram TTS websocket documentation: at most 2000 characters per text payload (longer `appendText` input is split into several `Speak` messages), at most 20 `Flush` messages per 60 seconds (`DEEPGRAM_AURA_STREAMING_FLUSH_RATE_LIMIT`, provider-enforced), 2400 characters per minute of throughput, and a 60-minute maximum connection lifetime from open (`DEEPGRAM_AURA_STREAMING_MAX_CONNECTION_MS`); this websocket has no documented `KeepAlive` message and sends no initial confirmation message (the stream becomes `ready` directly on socket open).

- d31286f: `DeepgramAuraTTS`: Deepgram Aura-2 batch text-to-speech for the existing pipeline mode (#108).

  - New `DeepgramAuraTTS` class implementing `TTSService` (`POST /v1/speak`), stateless and shareable across sessions, drop-in for the existing batch pipeline with no client change. Designed to also implement `StreamingTTSService` starting DG-5 on the same class.
  - Sends `model` (voice), `encoding`, `container`, `sample_rate` (only where Deepgram allows it to vary), `speed`, and `mip_opt_out` as documented; returns the exact MIME per `batchOutputFormat` (`pcm` → `audio/pcm;rate=<sampleRate>`, `wav` → `audio/wav`, `mp3` → `audio/mpeg`, `opus` → `audio/ogg;codecs=opus`, `flac` → `audio/flac`, `aac` → `audio/aac`).
  - Validates the configured voice against the configured language before any request (`UNSUPPORTED_LANGUAGE`), and rejects input text over Deepgram's documented 2000-character limit locally (`PAYLOAD_TOO_LARGE`) before any request.
  - `TTSConfig.voice`, `.languageCode`, and `.outputFormat` override the constructor defaults per call; provider failures map to stable `SpeechServiceError` codes; `getCapabilities()` derived from the Aura catalog.

- 2f28f1c: `DeepgramFluxSTT`: turn-aware streaming speech-to-text (#110).

  - New `DeepgramFluxSTT` class implementing the core `StreamingSTTService` contract (`wss://api.deepgram.com/v2/listen`) directly, with no batch method; a factory that opens one `DeepgramFluxTurnStream` per call to `openTurnStream()`.
  - `DeepgramFluxTurnStream` (`STTTurnStream`): queues audio (bounded by `limits.maxQueuedAudioMs`) until the connection reports ready, then flushes it in order; maps every documented `TurnInfo` event (`StartOfTurn`, `Update`, `EagerEndOfTurn`, `TurnResumed`, `EndOfTurn`) to the matching `STTTurnEvent`; `endAudioTurn()` sends `ForceEndTurn`; `close()` sends `CloseStream` and is idempotent.
  - Adds `updateTurnDetection(update)` (Flux-specific, not part of the core contract): validates new thresholds locally before sending `Configure`, resolves on `ConfigureSuccess`, rejects with `INVALID_REQUEST` on `ConfigureFailure`; `keyterms` in an update entirely replaces the current list; only one update may be pending at a time, and an update after `close()` rejects with `REMOTE_CLOSED`.
  - No internal reconnection: an unexpected close maps to `stream.error` (`REMOTE_CLOSED`, retryable) then `stream.closed`; a fatal provider error closes the stream after reporting it. The API key is sent only in the `Authorization: Token` header, never in the connection URL.

- b8f0bf2: New package `@owllayer/adapter-deepgram`: package foundation, typed model catalog, and Studio-ready settings (#106).

  - Typed, reusable catalog of Nova/Flux STT models, Aura-2 voices by language, and Deepgram-managed Voice Agent reasoning models (`open_ai`, `anthropic`, `google`), each with a catalog verification date.
  - Language normalization and validation (`normalizeLanguageCode`, `assertModelSupportsLanguage`, `resolveLanguageDefaults`) with language-aware defaults.
  - Strict, serializable Zod settings schemas and `*Options` types for Nova, Flux, Aura, and Voice Agent, with the API key always supplied separately from settings.
  - Stable `SpeechServiceError` codes (`toSpeechServiceError`, `getDeepgramErrorDetails`) and a shared internal WebSocket connection transport (open timeout, bounded send queue, keepalive, idempotent close).
  - PCM audio helpers (`mimeTypeToDeepgramEncoding`, `createEvenByteAligner`) and observability event maps for Flux, Aura, and the Voice Agent.

- ce4fc62: `DeepgramNovaSTT`: Deepgram Nova batch speech-to-text for the existing pipeline mode (#107).

  - New `DeepgramNovaSTT` class implementing `STTService` (`POST /v1/listen`), stateless and shareable across sessions, drop-in for the existing batch pipeline with no client change.
  - Sends `model`, `language`, `smart_format`, repeated `keyterm`/`tag`, and `mip_opt_out` as documented; adds `encoding=linear16` + `sample_rate` only for raw PCM audio, omitted for containerized formats.
  - Validates the configured language against the selected model's supported languages before any request (`UNSUPPORTED_LANGUAGE`), and maps provider failures to stable `SpeechServiceError` codes (`AUTH_FAILED`, `QUOTA_EXCEEDED`, `RATE_LIMITED`, `INVALID_REQUEST`, `PAYLOAD_TOO_LARGE`, `PROVIDER_UNAVAILABLE`, `TIMEOUT`).
  - `getCapabilities()` derived from the Nova catalog; re-verified and expanded the Nova-3 supported-language list against the official Deepgram documentation.

- 0eb494c: `DeepgramVoiceAgentAdapter` settings: revised Voice Agent `think`/`speak` provider credential policy (research R6, revised).

  - `DEEPGRAM_THINK_PROVIDERS` and `DEEPGRAM_SPEAK_PROVIDERS` are now closed catalogs mapping each provider to a `DeepgramProviderCredentialPolicy` (`deepgramManaged`, `providerCredential: 'none' | 'optional' | 'required'`, `credentialKind?: 'api-key' | 'aws'`) instead of a plain id list — both cases are now supported explicitly: Deepgram-managed providers (`open_ai`, `anthropic`, `google`, and now `nvidia`, catalog model `nemotron-3-nano-30B-A3B`) accept an optional provider credential, and third-party providers routed through the integrator's own deployment (`groq`, `aws_bedrock` for `think`; `open_ai`, `eleven_labs`, `cartesia`, `aws_polly` for `speak`) require one.
  - `think.provider` and `speak.provider` are closed Zod enums (an unlisted value fails `deepgramVoiceAgentSettingsSchema.safeParse` itself, translated to `UNSUPPORTED_PROVIDER`); added `think.endpointUrl` and `speak.provider`/`speak.model`/`speak.endpointUrl` (all `https://`-only when set, required for any non-Deepgram-managed provider).
  - New `validateDeepgramVoiceAgentOptions(options)` validates a full `DeepgramVoiceAgentOptions` (settings + optional `thinkProviderCredential`/`speakProviderCredential`, typed `DeepgramProviderCredential`) against this policy and throws the new non-retryable `PROVIDER_CREDENTIAL_REQUIRED` code when a required credential is missing, or `INVALID_SETTINGS` when one is supplied for a `'none'` policy or of the wrong kind. Credentials are never part of `DeepgramVoiceAgentSettings` and never appear in a thrown error message.
  - Fixed `DeepgramAuraVoice` to stay a true literal union derived from `DEEPGRAM_AURA_VOICES_BY_LANGUAGE` (was silently widened to `string`), and the `speak.voice`/language coherence check to only apply to the Deepgram-managed speak provider.

- afd386d: `DeepgramVoiceAgentAdapter`: Deepgram Voice Agent realtime mode (#113).

  - New `DeepgramVoiceAgentAdapter` implementing the core `LiveAdapter` contract (`wss://agent.deepgram.com/v1/agent/converse`); `createSession()` resolves once Deepgram applies the settings and rejects, releasing the connection, when the handshake fails or times out.
  - The `Settings` message carries the audio formats, the session language, the listening model (Flux for English, Nova-3 otherwise), the reasoning provider, the system prompt, the OwlLayer tools as functions without any `endpoint` (`defer_until_eot` for `high` and `critical` tools), the voice, the greeting, and the last `limits.maxHistoryMessages` messages of `conversationHistory`.
  - Third-party provider credentials (`groq`, `aws_bedrock`, and non-Deepgram voices; optional own key for managed providers) are sent only inside `Settings`, as the documented endpoint header or as AWS credentials.
  - Function calls become OwlLayer tool calls, answered once with `FunctionCallResponse`; the interim pending-approval answer is held until the final result; `FunctionCallCancelled` is reported through `onToolCallCancelled`; invalid JSON arguments are answered with an error and never executed.
  - Barge-in drops in-flight agent audio until the agent speaks again; `UpdateThink` updates are sent one at a time; `KeepAlive` is sent only while the session is active.
  - No internal reconnection: an unexpected close or a provider error is reported once through `onError` and releases everything; warnings are `agent.warning` events.
  - `think.endpointUrl` is now required for `aws_bedrock`, as documented by Deepgram.

### Patch Changes

- 4ff1b68: Audit fixes for #106, #107 and #108 (no public behavior change beyond the two defects below).

  - Nova STT (#107, defect): the `language` query parameter now resolves to the exact code Deepgram documents for the selected model (sent as-is when listed, e.g. `fr-CA`; otherwise its normalized primary subtag when that is listed, e.g. `fr-FR` → `fr`), instead of always forwarding the requested code unchanged.
  - Aura TTS (#108, defect): a per-call `TTSConfig.speed` (core contract range `[0.5, 2.0]`) is now clamped to the Deepgram Aura-2 documented range `[0.7, 1.5]` before being sent, instead of being forwarded unclamped and potentially rejected by the provider.
  - (#106) Trimmed the package's public export surface: `toSpeechServiceError`, `normalizeLanguageCode`, `assertModelSupportsLanguage`, `resolveLanguageDefaults`, `mimeTypeToDeepgramEncoding`, `createEvenByteAligner`, and their associated types are internal utilities and are no longer exported from `@owllayer/adapter-deepgram` (`getDeepgramErrorDetails` and `DeepgramErrorCode` remain public).
  - Added missing test coverage: `DeepgramWebSocketConnection.close()` stops the keepalive timer synchronously even when the socket never confirms with a `close` event, and two `close` events from the socket collapse into exactly one `onClose` call; Nova STT rejects a per-call `languageCode` unsupported by the model before any fetch, makes the provider `request_id` retrievable via `getDeepgramErrorDetails`, and leaves no active timer after a successful or failed request; Aura TTS covers per-call `speed`/`outputFormat` overrides and leaves no active timer after a successful or failed request.

  (The `DeepgramAuraVoice` literal-type fix and the Voice Agent `speak.voice`/language test gap, both also findings under #106, were already fixed in the preceding `feat(adapter-deepgram)` Voice Agent provider credential policy commit — see its changeset.)

- 64f1635: A Deepgram key refused when a websocket opens (Flux, Aura streaming, Voice Agent) is now reported with its HTTP status (`AUTH_FAILED` for 401/403, `QUOTA_EXCEEDED` for 402, and so on) instead of `REMOTE_CLOSED`, so callers do not retry a connection that cannot succeed.
- 3b6a856: Require `ws` ^8.22, the version the rest of the workspace moved to for the dependency security update (#135).
- c6fde63: Deepgram Voice Agent: the agent's voice reaches the client again.

  - `@owllayer/adapter-deepgram`: after a barge-in (`UserStartedSpeaking`), the session dropped agent audio until `AgentStartedSpeaking`, which the current Voice Agent API no longer sends, so every reply was silent. The output gate now reopens once the user turn is understood (final `ConversationText` from the user, `AgentThinking` or `EndOfTurn`); `AgentStartedSpeaking` is still handled.
  - Widgets (React, Vue, Svelte): in voice mode the agent's text comes from its transcription only, so a reply is no longer shown twice or replaced sentence by sentence.

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
