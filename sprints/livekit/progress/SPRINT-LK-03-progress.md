# Sprint LK-03 progress - Realtime Live Adapters

Date prepared: 2026-07-06  
Branch: `feat/feature-35-livekit-optional-runtime`  
Base sprint: `sprints/livekit/SPRINT-LK-02-gemini-tts-service.md` closed on 2026-07-06  
Active sprint file: `sprints/livekit/SPRINT-LK-03-realtime-live-adapters.md`

## Objective

Implement only realtime `LiveAdapter` and `LiveSession` support inside `@domos/adapter-livekit`, starting with Gemini Live.

LK-03 must map provider realtime sessions to the existing DomOS contracts without changing `@domos/server`, `@domos/core`, client SDKs, dashboard, room token endpoints or AgentSession bridge.

## Current-state evidence

- `packages/core/src/voice/contracts.ts` already owns `LiveAdapter`, `LiveSession`, `LiveSessionConfig`, `LLMToolCall` and `LLMAdapterCapabilities`.
- `packages/adapter-google/src/GoogleLiveAdapter.ts` and `packages/adapter-openai/src/OpenAILiveAdapter.ts` are local references for live adapter event mapping, audio callbacks, text callbacks and tool call callback behavior.
- `@domos/adapter-livekit` now depends on `@livekit/agents-plugin-google@1.5.0`, `@livekit/agents@1.5.0` and `@livekit/rtc-node@0.13.30`.
- Official LiveKit Gemini Live docs checked on 2026-07-06: `https://docs.livekit.io/agents/models/realtime/plugins/gemini/`.
- Current LiveKit Node docs use `@livekit/agents-plugin-google@1.x` and `google.beta.realtime.RealtimeModel` within `voice.AgentSession`.
- Gemini 3.1 Live has compatibility limitations in LiveKit Agents: mid-session `send_client_content`/`update_instructions`/`update_chat_ctx` style updates are not compatible, async function calling is not supported, while basic voice conversations, tool calling and audio I/O work.

## Scope allowed in LK-03

- `packages/adapter-livekit/src/live/**`
- `packages/adapter-livekit/src/index.ts`
- `packages/adapter-livekit/tests/GeminiLiveAdapter.test.ts`
- `packages/adapter-livekit/README.md` for realtime usage notes and limitations
- `sprints/livekit/progress/SPRINT-LK-03-progress.md`
- `packages/adapter-livekit/package.json` and `pnpm-lock.yaml` only if an additional adapter-local dependency is proven necessary.

## Scope read-only in LK-03

- `packages/core/src/voice/contracts.ts`
- `packages/adapter-google/src/GoogleLiveAdapter.ts`
- `packages/adapter-google/src/toolConverter.ts`
- `packages/adapter-openai/src/OpenAILiveAdapter.ts`
- `packages/adapter-openai/src/toolConverter.ts`
- `packages/server/src/core/DomOSServer.ts`

## Scope forbidden in LK-03

- No `@domos/server` runtime change.
- No `@domos/core` contract change unless a blocker is documented first.
- No AgentSession bridge.
- No LiveKit room manager or token endpoint.
- No frontend room client.
- No dashboard endpoint.
- No telephony or deployment work.
- No direct execution of DomOS client tools inside LiveKit/provider code.

## Decisions

1. LK-03 will implement a pure adapter package surface first; `DomOSServer` should be able to consume it later through the existing `live` option.
2. Tool calls must be converted to DomOS `LLMToolCall` and returned via `LiveSessionConfig.onToolCall`; provider code must not execute client tools directly.
3. `updateTools()` must either call a provider-supported update path or safely expose a limitation. For Gemini 3.1 Live, limitations must be represented in capabilities/metadata or documented clearly.
4. Capabilities should remain compatible with existing `LLMAdapterCapabilities`; additional provider limitations may be placed in model descriptions or adapter-specific exported helpers until a dedicated core type extension sprint is justified.
5. Tests must use mocks/no network for provider realtime model/session behavior.
6. LK-03 must not wire rooms, AgentSession dispatch, token generation or dashboard visibility; those belong to later sprints.
7. The adapter uses internal structural interfaces for LiveKit model/session/stream helpers so public DomOS exports remain provider-light and tests stay no-network.
8. DomOS tool declarations are converted from ADTP uppercase schema types to JSON Schema lowercase types before creating LiveKit function tools.
9. LiveKit function tool `execute` intentionally throws because DomOS must execute tools through ADTP/ToolRouter and return the result with `sendToolResponse()`.
10. Because LiveKit Gemini Agents 1.5 declares `midSessionToolsUpdate: false`, `LiveKitLiveSession.updateTools()` records `deferred_until_next_session` instead of pretending the mounted/unmounted tool set was applied to the active provider session.
11. `sendToolResponse()` triggers a follow-up `generateReply()` when the realtime model supports mid-session chat context updates, so manual DomOS tool execution does not dead-end after returning a result.
12. Provider errors are surfaced without the original provider error as `cause`; this avoids leaking secrets through downstream structured logging of error cause chains.
13. `LiveKitLiveSessionConfig.onToolsUpdateStatus` exposes provider tool-update limitations through an adapter-specific optional callback without changing `@domos/core`.
14. `packages/audio` was inspected with MCP workspace before closure. LK-03 now reuses `@domos/audio` for base64 PCM decoding and PCM MIME generation, keeping only LiveKit-specific validation/conversion in `audioMapping.ts`.

## TODO

- [x] Re-open the installed `@livekit/agents-plugin-google` realtime types before implementation.
- [x] Re-check official LiveKit Gemini Live docs/package API via installed package source before coding.
- [x] Create `packages/adapter-livekit/src/live/toolMapping.ts`.
- [x] Create `packages/adapter-livekit/src/live/audioMapping.ts`.
- [x] Create `packages/adapter-livekit/src/live/capabilities.ts`.
- [x] Create `packages/adapter-livekit/src/live/LiveKitLiveSession.ts`.
- [x] Create `packages/adapter-livekit/src/live/LiveKitRealtimeAdapter.ts`.
- [x] Create `packages/adapter-livekit/src/live/GeminiLiveAdapter.ts`.
- [x] Export live adapter APIs from `packages/adapter-livekit/src/index.ts`.
- [x] Add no-network tests for audio/text/tool/error/close mapping and `updateTools()` behavior.
- [x] Inspect `packages/audio` with MCP workspace and avoid duplicating its PCM helpers.
- [x] Run package build/test/lint.
- [x] Run source search proving no LiveKit imports in `packages/server`.
- [x] Request `code_reviewer_54` before closing LK-03.
- [x] Receive final `code_reviewer_54` re-review verdict after rework.

## Definition of Done

- [x] `GeminiLiveAdapter` implements the existing `LiveAdapter` contract.
- [x] `LiveKitLiveSession` implements the existing `LiveSession` contract.
- [x] Audio input/output mapping preserves base64 PCM MIME information.
- [x] Text output and transcripts call the DomOS callbacks.
- [x] Provider tool calls become DomOS `LLMToolCall` objects and go through `onToolCall`.
- [x] Tool responses are sent back to the provider through `sendToolResponse()`.
- [x] `updateTools()` respects provider capabilities or documents a safe limitation.
- [x] `getCapabilities()` exposes current model, current voice, voice presets and limitations.
- [x] Tests are no-network and cover success, errors, close, tool mapping and limitation behavior.
- [x] `pnpm --filter @domos/adapter-livekit build` passes.
- [x] `pnpm --filter @domos/adapter-livekit test` passes.
- [x] `pnpm --filter @domos/adapter-livekit lint` passes.
- [x] `code_reviewer_54` validates the sprint before closure.

## Implementation evidence

- Added `GeminiLiveAdapter`, `LiveKitLiveSession`, runtime helpers, audio mapping, tool mapping and Gemini Live capabilities under `packages/adapter-livekit/src/live/**`.
- Added `tests/GeminiLiveAdapter.test.ts` with no-network mocks for runtime dynamic-import boundary, session creation, PCM audio, generation stream callbacks, tool call conversion, post-tool generation resume, tool response updates, sanitized errors/cause handling, text input, close handling and mid-session tool update status callbacks.
- Added `@domos/audio` as an adapter-local dependency and reused `decodeAudio`, `getFormatFromMimeType` and `getMimeType` in `audioMapping.ts`.
- Updated `packages/adapter-livekit/README.md` with Gemini Live usage and current limitation notes.

## Reviewer findings and rework

Initial reviewer: `code_reviewer_54` / `Sentinel the 2nd` / `019f3894-1db4-7450-bbdf-4190bf8c30c0`.

- High finding fixed: `sendToolResponse()` previously updated chat context without resuming generation. It now calls `generateReply()` and consumes the resulting generation when the provider supports mid-session chat context updates.
- Medium finding fixed: sanitized errors no longer attach the original unredacted provider error as `cause`.
- Medium finding fixed: unsupported `updateTools()` is now observable through `LiveKitLiveSessionConfig.onToolsUpdateStatus`, not only through a concrete-class getter.

Re-review requested from the same reviewer after these fixes.

After the reviewer close recommendation, `packages/audio` was inspected on user request and LK-03 was adjusted to reuse it. A final targeted re-review is required before closing.

Targeted audio-reuse reviewer blocker fixed:

- Blocker fixed: `@domos/audio` MIME detection alone was too permissive for the LiveKit input contract. `parsePCMMimeType()` now requires both `audio/pcm` prefix and `getFormatFromMimeType(...) === 'pcm'`.
- Regression tests added for `video/pcm`, `application/pcm`, `audio/x-pcm` and `audio/wav`.

## Validation results

- `pnpm --filter @domos/adapter-livekit test` passed: 3 files, 25 tests.
- `pnpm --filter @domos/audio test` passed: 2 files, 26 tests.
- `pnpm --filter @domos/adapter-livekit lint` passed.
- `pnpm --filter @domos/audio build` passed.
- `pnpm --filter @domos/adapter-livekit build` passed.
- `rg -n "livekit|@livekit|livekit-server-sdk" packages/server/src packages/server/package.json` returned no matches.
- `pnpm --filter @domos/server build` passed.

## Review status

- Closed by `code_reviewer_54` after targeted `@domos/audio` rework.
- Final reviewer verdict: no remaining blockers; recommendation to close LK-03.

## Validation plan

- Run `pnpm --filter @domos/adapter-livekit build`.
- Run `pnpm --filter @domos/adapter-livekit test`.
- Run `pnpm --filter @domos/adapter-livekit lint`.
- Run `rg -n "livekit|@livekit|livekit-server-sdk" packages/server/src packages/server/package.json` and expect no matches.
- Run `pnpm --filter @domos/server build` if package exports or dependencies could affect workspace resolution.
- Run `git diff --stat` before review to verify the sprint stayed scoped.

## Next step persisted

Next step: commit LK-03, then prepare LK-04 AgentSession bridge without implementing it yet. LK-04 must define its objective, scope, DoD and validation plan before any server bridge code is written.
