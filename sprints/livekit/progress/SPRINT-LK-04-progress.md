# Sprint LK-04 progress - AgentSession Bridge

Date prepared: 2026-07-06  
Branch: `feat/feature-35-livekit-optional-runtime`  
Base sprint: `sprints/livekit/SPRINT-LK-03-realtime-live-adapters.md` closed on 2026-07-06  
Active sprint file: `sprints/livekit/SPRINT-LK-04-agent-session-bridge.md`

## Objective

Prepare the bridge between DomOS sessions/tools/context and LiveKit `AgentSession`.

LK-04 must connect LiveKit AgentSession to the existing DomOS session and tool pipeline without moving tool execution into LiveKit provider code and without weakening Neural-DOM Binding.

## Current-state evidence

- LK-03 introduced `@domos/adapter-livekit` realtime adapter support and closed with `code_reviewer_54` approval.
- `packages/adapter-livekit/src/live/**` already maps provider realtime sessions to the DomOS `LiveAdapter` and `LiveSession` contracts.
- `packages/audio` was inspected and is now reused by `@domos/adapter-livekit` for base64 PCM decoding and PCM MIME generation.
- The server still has no LiveKit imports in `packages/server/src` or `packages/server/package.json`.
- LK-04 source sprint identifies bridge targets under `packages/adapter-livekit/src/bridge/**`, with server wiring only if proven necessary.

## Exploration evidence - 2026-07-06

### DomOS audio package

- Verification source: `mcp__local_workspace` tree/read on `packages/audio` and `packages/adapter-livekit/src/live/audioMapping.ts`.
- `packages/audio` exposes PCM base64 helpers (`base64EncodeAudio`, `decodeAudio`, `decodeAudioToFloat32`), WAV/Opus decoders, format detection and MIME conversion.
- `base64EncodeAudio` / `decodeAudio` are documented as production-compatible code and must not be rewritten inside `adapter-livekit`.
- `getFormatFromMimeType()` intentionally treats any MIME containing `pcm` as PCM, so LiveKit input must keep the stricter adapter-side guard: accept only `audio/pcm...`.
- LK-03 already uses `@domos/audio` in `packages/adapter-livekit/src/live/audioMapping.ts`; LK-04 must keep that dependency and avoid a second audio utility layer.

### DomOS session and tool lifecycle

- `DomOSClient.registerTool()` and `unregisterTool()` immediately call `syncToolsWithServer()` when connected.
- `DomOSClient.unregisterToolsByComponent()` removes only non-global component tools, then resends `CONTEXT_UPDATE`.
- React `useAgentTool()` registers on mount and unregisters on unmount; `useAgentToolResolver()` unregisters the resolver component tools unless `global: true`.
- `DomOSServer.handleContextUpdate()` updates `SessionManager.context`, replaces the session client tool registry, builds the effective surface and sends `tools_effective` back to the client.
- `DomOSServer.buildEffectiveToolsPayload()` gives server tools priority over client tools and records ignored client collisions.
- If a DomOS `LiveSession` is already active, `handleContextUpdate()` calls `liveSession.updateTools(effectiveTools)`.
- `ToolRouter.route()` executes server tools locally, but client tools are still executed by sending `TOOL_CALL` to the browser and waiting for `TOOL_RESULT`.
- `DomOSServer.handleLiveToolCall()` already routes live model tool calls through `ToolRouter`, HITL and `sendToolResponse()`; the LiveKit bridge must reuse this ownership model rather than execute client tools inside LiveKit.

### Installed LiveKit API

- Installed version inspected: `@livekit/agents@1.5.0`.
- Official docs describe `AgentSession` as the orchestrator for user input, voice pipeline, LLM/tool invocation and output; it transitions through initializing, starting, running and closing.
- Official Gemini Live docs show the Node integration through `new voice.AgentSession({ llm: new google.beta.realtime.RealtimeModel(...) })`.
- Local `AgentSessionOptions` accepts `stt`, `vad`, `llm`, `tts`, `tools`, `toolHandling`, `turnHandling` and `userData`.
- `AgentSession.start()` accepts an `Agent` and optional `room`, `inputOptions`, `outputOptions`.
- `RealtimeSession` exposes `updateChatCtx()`, `updateTools()`, `pushAudio()`, `generateReply()`, `commitAudio()`, `interrupt()` and `close()`.
- LiveKit `ToolContext` can be updated as a whole. Current LK-03 helpers create tools whose `execute` throws because DomOS owns the real execution.
- `AudioOutput` is exported by `@livekit/agents`, but `AudioInput` is not exported from the public root/voice index. LK-04 must not rely on fragile internal subpath imports for custom DomOS audio input.

## Mapping LK-04

| DomOS concept | Current owner | LiveKit bridge mapping |
| --- | --- | --- |
| API key/session validity | `DomOSServer`, `ClientAuthManager`, `SessionManager` | Bridge receives an already accepted DomOS session snapshot; it does not authenticate clients directly. |
| Shadow Context | `DomOSClient` + `SessionManager.updateContext()` | Bridge builds compact instructions/context from URL, title, selected `context.data` and effective tools. No full DOM dump. |
| Tool lifecycle | Client SDK hooks + `CONTEXT_UPDATE` | Bridge receives effective tool snapshots and updates the LiveKit-visible tool context when provider/session supports it; otherwise it records deferral. |
| Tool execution | `ToolRouter` + ADTP + HITL | Bridge forwards LiveKit/AgentSession tool calls to a DomOS callback. Client tools still execute in the browser via `TOOL_CALL`/`TOOL_RESULT`. |
| Audio codec boundary | `@domos/audio` + LiveKit RTC frames | Bridge reuses existing audio mapping and does not duplicate PCM/base64 code. |
| Realtime provider session | LK-03 `LiveKitLiveSession` | Remains the provider-level path for current DomOS live audio over ADTP. |
| Room-based AgentSession | LiveKit `AgentSession` + RoomIO | LK-04 bridge prepares an optional room/session bridge. Actual frontend room join is LK-05. |
| Cleanup | `SessionManager.destroy()` / `DomOSServer.handleClose()` | Bridge close must close AgentSession/room handles and clear internal maps when DomOS session closes. |

## LK-04 implementation stance

- Implement the bridge as adapter-local orchestration primitives first.
- Do not import LiveKit from `@domos/server`.
- Do not require frontend room tokens in LK-04; expose a room manager boundary that can be wired in LK-05.
- Do not use LiveKit internal subpath imports for `AudioInput`.
- Start with no-network mocks: mocked AgentSession, room handle and DomOS tool executor.
- Server integration must stay generic: `@domos/server` may expose DomOS bridge hooks, but must not import LiveKit.

## Implementation delivered - 2026-07-06

- Added `packages/adapter-livekit/src/bridge/events.ts` for typed bridge lifecycle, tool, context and error events.
- Added `packages/adapter-livekit/src/bridge/DomOSContextBridge.ts` to build compact Shadow Context instructions for AgentSession without dumping the DOM.
- Added `packages/adapter-livekit/src/bridge/DomOSToolBridge.ts` to route AgentSession tool calls through an injected DomOS executor and optional tool response target.
- Added `packages/adapter-livekit/src/bridge/LiveKitRoomManager.ts` as a room handle/provisioning boundary without frontend tokens.
- Added `packages/adapter-livekit/src/bridge/DomOSLiveKitAgentBridge.ts` with an injectable no-network factory and a default public LiveKit `AgentSession` factory.
- Exported the bridge API from `packages/adapter-livekit/src/index.ts`.
- Added no-network bridge tests in `packages/adapter-livekit/tests/DomOSLiveKitAgentBridge.test.ts`.
- Added generic server hooks in `packages/server/src/core/DomOSServer.ts`:
  - `getAgentBridgeSessionSnapshot(sessionId)` exposes accepted session/context/effective tools/prompt without raw API key leakage.
  - `routeAgentBridgeToolCall(sessionId, toolCall)` routes server tools locally and client tools through `ToolRouter` / ADTP.
- Added a targeted server test in `packages/server/tests/DomOSServer.server-tools.test.ts` proving snapshot + server/client tool routing.

## Scope allowed in LK-04

- `packages/adapter-livekit/src/bridge/**`
- `packages/adapter-livekit/src/index.ts`
- `packages/adapter-livekit/tests/DomOSLiveKitAgentBridge.test.ts`
- `packages/adapter-livekit/README.md`
- `sprints/livekit/progress/SPRINT-LK-04-progress.md`
- `packages/adapter-livekit/package.json` and `pnpm-lock.yaml` only if a bridge-local dependency is proven necessary.
- `packages/server/src/core/DomOSServer.ts` only for minimal optional bridge wiring, after documenting why adapter-only wiring is insufficient.
- `packages/server/src/admin/AdminAPI.ts` only for read-only capabilities/stat exposure, not dashboard implementation.

## Scope read-only in LK-04

- `packages/server/src/sessions/**`
- `packages/server/src/tools/**`
- `packages/server/src/core/DomOSServer.ts`
- `packages/server/src/admin/AdminAPI.ts`
- `packages/core/src/voice/contracts.ts`
- `packages/core/src/client/DomOSClient.ts`
- `packages/adapter-livekit/src/live/**`
- `packages/audio/src/**`

## Scope forbidden in LK-04

- No frontend room client.
- No dashboard UI.
- No telephony/SIP/deployment.
- No broad `@domos/core` contract changes unless a blocker is documented first.
- No direct execution of client tools inside LiveKit provider/model code.
- No bypass of DomOS API key/session validation.
- No dumping full Shadow DOM into LiveKit context.

## Decisions

1. The bridge must treat DomOS as source of truth for sessions, API key permissions, effective tools, HITL, server/client tool collisions and tool results.
2. LiveKit may own room media orchestration, but not DomOS tool execution policy.
3. Tool calls from AgentSession must route back into the existing DomOS ToolRouter or equivalent session pipeline.
4. Client tools remain executed by the browser/client SDK through ADTP.
5. Shadow Context passed to LiveKit must be compact: URL, title, selected data, prompt and effective tool descriptions only.
6. Server changes are not assumed. Adapter-only bridge design must be attempted and documented before touching `@domos/server`.
7. Tests must use no-network mocks for LiveKit room/session behavior.
8. `@domos/audio` remains the single source for PCM/base64 helpers used by LiveKit integration.
9. LK-04 will expose a bridge API that can run with injected factories/mocks; concrete token endpoints and SDK room joins remain LK-05.
10. Bridge snapshots must not expose the raw DomOS API key to LiveKit orchestration; the session is already accepted by `@domos/server`.
11. Default Shadow Context transfer must fail closed: only allow-listed `context.data` keys are sent to LiveKit orchestration unless the caller explicitly opts into `dataAllowList: ['*']`.
12. If AgentSession startup fails after room allocation, the room handle must be closed and evicted before the error is rethrown.

## TODO

- [x] Inspect current server session/tool pipeline before implementation.
- [x] Inspect installed LiveKit `AgentSession` Node API and official docs before implementation.
- [x] Define bridge event types in `packages/adapter-livekit/src/bridge/events.ts`.
- [x] Design `DomOSToolBridge` around DomOS tool call/result ownership.
- [x] Design `DomOSContextBridge` for compact Shadow Context injection.
- [x] Design `LiveKitRoomManager` boundaries without frontend tokens yet.
- [x] Implement `DomOSLiveKitAgentBridge` only after the above mappings are clear.
- [x] Add no-network tests for tool call, tool result, tool error, context update and close.
- [x] Add minimal server hook tests for snapshot + server/client tool routing.
- [x] Fix `code_reviewer_54` blocker: close/evict provisioned room when AgentSession startup fails.
- [x] Fix `code_reviewer_54` high finding: default context bridge no longer forwards arbitrary `context.data`.
- [x] Request `code_reviewer_54` before LK-04 closure.

## Definition of Done

- [x] A bridge can start a mocked LiveKit AgentSession for a DomOS session.
- [x] A LiveKit tool call returns to the DomOS tool pipeline.
- [x] Client tools still execute on the DomOS client side through ADTP.
- [x] Server tools still execute on the DomOS server side.
- [x] Context updates refresh the effective tool/context surface exposed to the bridge.
- [x] Bridge close cleans up AgentSession/room resources when the DomOS session closes.
- [x] Tests cover tool call, tool result, tool error, session close and context update.
- [x] `pnpm --filter @domos/adapter-livekit test` passes.
- [x] `pnpm --filter @domos/adapter-livekit lint` passes.
- [x] `pnpm --filter @domos/adapter-livekit build` passes.
- [x] Any server touch has `pnpm --filter @domos/server build` and targeted tests.
- [x] `code_reviewer_54` validates the sprint before closure.

## Validation plan

- Run `pnpm --filter @domos/adapter-livekit test`.
- Run `pnpm --filter @domos/adapter-livekit lint`.
- Run `pnpm --filter @domos/adapter-livekit build`.
- If server files are touched, run `pnpm --filter @domos/server build` and targeted server tests.
- Run `rg -n "livekit|@livekit|livekit-server-sdk" packages/server/src packages/server/package.json` and document any intentional matches.

## Validation results - 2026-07-06

- PASS `pnpm --filter @domos/adapter-livekit test` - 4 files, 34 tests.
- PASS `pnpm --filter @domos/adapter-livekit lint`.
- PASS `pnpm --filter @domos/adapter-livekit build`.
- PASS `pnpm --filter @domos/server build`.
- PASS `pnpm --filter @domos/server test -- tests/DomOSServer.server-tools.test.ts tests/DomOSServer.hitl.test.ts` - 2 files, 11 tests.
- PASS `pnpm --filter @domos/audio test` - 2 files, 26 tests.
- PASS `rg -n --glob '!dist/**' --glob '!node_modules/**' --glob '!*tsbuildinfo' "livekit|@livekit|livekit-server-sdk" packages/server/src packages/server/package.json` - no matches.
- NOTE `pnpm --filter @domos/server test -- tests/DomOSServer.lifecycle.test.ts tests/DomOSServer.server-tools.test.ts tests/DomOSServer.hitl.test.ts` has one unrelated existing failure in `DomOSServer.lifecycle.test.ts`: expected raw `apiKey` but AdminAPI now returns the redacted key `pk_***nes`.

## Code review - 2026-07-06

Reviewer: `code_reviewer_54`

Initial recommendation: BLOCK before closure.

Findings:

- BLOCKER: `DomOSLiveKitAgentBridge.start()` allocated and cached a room before `agentSessionFactory.create()` succeeded. A failed startup could leak room resources and poison retries.
- HIGH: `DomOSContextBridge` defaulted to forwarding all `context.data` when no allow-list was provided, which violated the selected Shadow Context boundary.

Actions applied:

- Added startup failure cleanup: room is closed and evicted, an error event is emitted, and the original startup error is rethrown.
- Added regression test `closes and evicts the room when AgentSession startup fails`.
- Changed the default context data policy to a small allow-list (`route`, `page`, `view`, `role`, `step`, `locale`, `language`, `voice`).
- Added explicit opt-in `dataAllowList: ['*']` for callers that intentionally want full context data.
- Added regression test `does not forward arbitrary context data by default`.

Re-review recommendation: APPROVE LK-04 for closure.

Re-review outcome:

- Previous BLOCKER resolved: startup failure now closes and evicts the room, emits an error event and rethrows the original error.
- Previous HIGH resolved: default context transfer now forwards only allow-listed keys unless explicitly configured with `dataAllowList: ['*']`.
- No remaining scoped findings.

## Next step persisted

Next step: commit LK-04, then prepare LK-05. LK-05 must focus on client room frontends and token endpoints; do not start implementation before the LK-05 scope, DoD and TODO are persisted.
