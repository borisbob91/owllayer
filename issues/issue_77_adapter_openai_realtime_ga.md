# GitHub issue #77: OpenAI adapter — Realtime GA, audio rate, typed model catalog

**GitHub issue**: https://github.com/borisbob91/owllayer/issues/77
**Status**: Fix implemented — awaiting review
**Domain**: Server adapters (`packages/adapter-openai`)

## Objective

Make `@owllayer/adapter-openai` work with the current OpenAI API on every mode
(text, realtime, TTS, STT), keep OpenAI-compatible providers (DeepSeek) working,
and expose typed model/voice lists.

## Findings (verified against the `openai` SDK 7.23 type definitions)

| # | Area | Problem | Impact |
|---|---|---|---|
| 1 | Realtime | Beta interface (`OpenAI-Beta: realtime=v1`, beta session shape, `response.audio.*`) and `gpt-4o-realtime-preview` default | Removed from the API in May 2026: sessions fail |
| 2 | Realtime | 16 kHz client PCM appended to a 24 kHz buffer | Audio read 1.5x too fast: poor VAD/transcription |
| 3 | Realtime | No `interrupt()` / `updateTools()` | No barge-in, stale tools after navigation |
| 4 | Realtime | Voice list includes unsupported `fable`/`onyx`/`nova` | Invalid voice selection |
| 5 | Text | `temperature` always sent | Reasoning models (o*, gpt-5*) rejected |
| 6 | Text | Parallel tool calls resumed from the same history | Results overwrite each other |
| 7 | Text | `JSON.parse` of tool arguments unguarded | Whole turn throws |
| 8 | Text | Outdated catalog | Dashboard proposes obsolete models |
| 9 | TTS | Only `tts-1*`, 6 voices | No `gpt-4o-mini-tts`, no `instructions` |
| 10 | STT | `verbose_json` default for every model | `gpt-4o-*-transcribe` reject it |
| 11 | Typing | Models/voices are plain strings | No autocompletion, no shared catalog |

## Implementation

- `src/models.ts`: `as const` lists (chat, realtime, TTS, STT models; TTS and
  realtime voices) with derived union types open to custom ids
  (`(string & {})`), and `isOpenAIReasoningModel()`.
- `OpenAILiveAdapter`: GA `session.update` (`type: 'realtime'`, `audio.input` /
  `audio.output`), no beta header, GA event names (beta names kept as fallback
  for Azure preview deployments), default `gpt-realtime-1.5` (fast,
  non-reasoning), `reasoningEffort` sent as `reasoning.effort` with `low` by
  default on `gpt-realtime-2*` (OpenAI Realtime 2 prompting guidance), linear resampling to
  24 kHz, `interrupt()` (`response.cancel`), `updateTools()`, push-to-talk
  `endAudioTurn()`, barge-in via `input_audio_buffer.speech_started`,
  configurable `inputTranscriptionModel` and `turnDetection`, tool outputs always
  sent as JSON objects (raw strings wrapped as `{ response_text }`, per the
  Realtime 1.5 guidance on tool output formatting).
- `OpenAIAdapter`: no `temperature` for reasoning models unless explicit,
  `parallel_tool_calls: false` on official OpenAI, first tool call only per
  turn, guarded argument parsing, timeout on follow-up requests, catalog from
  the typed list. Includes the adapter-level DeepSeek work from branch
  `fix/adapter-openai-issues-with-demos-react-deepseek` (DSML parsing,
  `thinking`, schema normalization) with its failing test fixed.
- `OpenAITTS`: current models/voices, `instructions` for `gpt-4o-mini-tts`.
- `WhisperSTT`: current models, `json` default for non-whisper models,
  `isAvailable()` checks the configured model.

## Review of the Gemini proposal

Kept: typed models/voices, configurable VAD, tool serialization for Realtime,
unit tests. Not kept: TypeScript `enum`s (string-literal lists are idiomatic,
tree-shakable and stay open to custom ids), preview model names (removed from
the API), `pcm16`/`g711_*` formats (beta names), and a new
`OpenAIAudioAdapter` class (existing classes already cover each mode).

## Out of scope

- Core/Server `handleToolResult(tools)` contract (#76). Until it lands, the
  follow-up turn cannot re-issue the remaining tool calls.
- Responses API, WebRTC transport (epic #35), `openai` SDK major upgrade.

## Validation

- 66 adapter tests (new: Realtime GA payload/events/resampling/barge-in,
  reasoning parameters, tool calls, TTS/STT models).
- `@owllayer/adapter-openai` build and lint.
- Manual checks with real OpenAI and DeepSeek keys still required.

## Closure condition

The focused pull request closes #77 with tests and CI green, and the manual
Realtime and text checks confirmed.
