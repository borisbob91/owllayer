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

## TODO

- [ ] Inspect current server session/tool pipeline before implementation.
- [ ] Inspect installed LiveKit `AgentSession` Node API and official docs before implementation.
- [ ] Define bridge event types in `packages/adapter-livekit/src/bridge/events.ts`.
- [ ] Design `DomOSToolBridge` around DomOS tool call/result ownership.
- [ ] Design `DomOSContextBridge` for compact Shadow Context injection.
- [ ] Design `LiveKitRoomManager` boundaries without frontend tokens yet.
- [ ] Implement `DomOSLiveKitAgentBridge` only after the above mappings are clear.
- [ ] Add no-network tests for tool call, tool result, tool error, context update and close.
- [ ] Request `code_reviewer_54` before LK-04 closure.

## Definition of Done

- [ ] A bridge can start a mocked LiveKit AgentSession for a DomOS session.
- [ ] A LiveKit tool call returns to the DomOS tool pipeline.
- [ ] Client tools still execute on the DomOS client side through ADTP.
- [ ] Server tools still execute on the DomOS server side.
- [ ] Context updates refresh the effective tool/context surface exposed to the bridge.
- [ ] Bridge close cleans up AgentSession/room resources when the DomOS session closes.
- [ ] Tests cover tool call, tool result, tool error, session close and context update.
- [ ] `pnpm --filter @domos/adapter-livekit test` passes.
- [ ] `pnpm --filter @domos/adapter-livekit lint` passes.
- [ ] `pnpm --filter @domos/adapter-livekit build` passes.
- [ ] Any server touch has `pnpm --filter @domos/server build` and targeted tests.
- [ ] `code_reviewer_54` validates the sprint before closure.

## Validation plan

- Run `pnpm --filter @domos/adapter-livekit test`.
- Run `pnpm --filter @domos/adapter-livekit lint`.
- Run `pnpm --filter @domos/adapter-livekit build`.
- If server files are touched, run `pnpm --filter @domos/server build` and targeted server tests.
- Run `rg -n "livekit|@livekit|livekit-server-sdk" packages/server/src packages/server/package.json` and document any intentional matches.

## Next step persisted

Next step: inspect the current DomOS server session/tool pipeline and the installed LiveKit `AgentSession` Node API. Do not write bridge code until the exact mapping between DomOS session/tool lifecycle and LiveKit AgentSession lifecycle is documented in this file.
