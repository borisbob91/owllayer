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

## TODO

- [ ] Re-open the installed `@livekit/agents-plugin-google` realtime types before implementation.
- [ ] Re-check official LiveKit Gemini Live docs immediately before coding if package API has changed.
- [ ] Create `packages/adapter-livekit/src/live/toolMapping.ts`.
- [ ] Create `packages/adapter-livekit/src/live/audioMapping.ts`.
- [ ] Create `packages/adapter-livekit/src/live/capabilities.ts`.
- [ ] Create `packages/adapter-livekit/src/live/LiveKitLiveSession.ts`.
- [ ] Create `packages/adapter-livekit/src/live/LiveKitRealtimeAdapter.ts`.
- [ ] Create `packages/adapter-livekit/src/live/GeminiLiveAdapter.ts`.
- [ ] Export live adapter APIs from `packages/adapter-livekit/src/index.ts`.
- [ ] Add no-network tests for audio/text/tool/error/close mapping and `updateTools()` behavior.
- [ ] Run package build/test/lint.
- [ ] Run source search proving no LiveKit imports in `packages/server`.
- [ ] Request `code_reviewer_54` before closing LK-03.

## Definition of Done

- [ ] `GeminiLiveAdapter` implements the existing `LiveAdapter` contract.
- [ ] `LiveKitLiveSession` implements the existing `LiveSession` contract.
- [ ] Audio input/output mapping preserves base64 PCM MIME information.
- [ ] Text output and transcripts call the DomOS callbacks.
- [ ] Provider tool calls become DomOS `LLMToolCall` objects and go through `onToolCall`.
- [ ] Tool responses are sent back to the provider through `sendToolResponse()`.
- [ ] `updateTools()` respects provider capabilities or documents a safe limitation.
- [ ] `getCapabilities()` exposes current model, current voice, voice presets and limitations.
- [ ] Tests are no-network and cover success, errors, close, tool mapping and limitation behavior.
- [ ] `pnpm --filter @domos/adapter-livekit build` passes.
- [ ] `pnpm --filter @domos/adapter-livekit test` passes.
- [ ] `pnpm --filter @domos/adapter-livekit lint` passes.
- [ ] `code_reviewer_54` validates the sprint before closure.

## Validation plan

- Run `pnpm --filter @domos/adapter-livekit build`.
- Run `pnpm --filter @domos/adapter-livekit test`.
- Run `pnpm --filter @domos/adapter-livekit lint`.
- Run `rg -n "livekit|@livekit|livekit-server-sdk" packages/server/src packages/server/package.json` and expect no matches.
- Run `pnpm --filter @domos/server build` if package exports or dependencies could affect workspace resolution.
- Run `git diff --stat` before review to verify the sprint stayed scoped.

## Next step persisted

Next step: implement only LK-03 realtime live adapter files in `packages/adapter-livekit/src/live/**`, using mocks and the current installed LiveKit Google plugin realtime API. Do not start LK-04 AgentSession bridge until LK-03 has a reviewer verdict.
