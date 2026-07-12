# Sprint LK-05 progress - Client Room Frontends

Date prepared: 2026-07-06  
Branch: `feat/feature-35-livekit-optional-runtime`  
Base sprint: `sprints/livekit/SPRINT-LK-04-agent-session-bridge.md` closed on 2026-07-06  
Active sprint file: `sprints/livekit/SPRINT-LK-05-client-room-frontends.md`

## Objective

Prepare the optional frontend room integration that lets a DomOS app join a LiveKit room while keeping DomOS ADTP as the owner of Shadow Context, mounted tools, HITL and tool execution.

LK-05 must not replace `DomOSClient`. It adds room media controls around the existing DomOS session.

## Current-state evidence

- LK-04 added the adapter-side AgentSession bridge and generic server hooks:
  - `DomOSServer.getAgentBridgeSessionSnapshot(sessionId)`
  - `DomOSServer.routeAgentBridgeToolCall(sessionId, toolCall)`
- LK-04 was approved by `code_reviewer_54` after lifecycle cleanup and context minimization fixes.
- `@domos/server` still has no LiveKit runtime import.
- `packages/audio` remains the source of truth for PCM/base64 helpers.
- `packages/audio` exposes PCM/WAV/Opus encode/decode and format detection. It must stay unchanged in LK-05 because LiveKit browser media uses WebRTC tracks while DomOS ADTP audio still uses the existing PCM/base64 path.
- `packages/adapter-livekit` already owns server-side LiveKit runtime config and redaction.
- `livekit-server-sdk` is currently only transitive through `@livekit/agents`; token signing needs a direct dependency if imported by `@domos/adapter-livekit`.
- `apps/demo-server` can host a token endpoint without changing `@domos/server`: `ADTPTransport` supports an injected HTTP server and does not overwrite non-DomOS routes.
- The first client target is React because `apps/demo` is the main usage reference and already consumes `@domos/react`.

## LK-05 implementation decision

1. Keep `@domos/server` free of direct LiveKit imports.
2. Add server-side room token creation in `@domos/adapter-livekit`.
3. Expose a demo-only HTTP token endpoint from `apps/demo-server`.
4. Add React room lifecycle helpers only after token generation and endpoint behavior are covered.
5. Do not modify `packages/audio` in this sprint; document its boundary instead.

## Scope allowed in LK-05

- `packages/browser/src/livekit/**` or equivalent client package path if the browser package uses a different layout.
- `packages/react/src/livekit/useDomOSLiveKitRoom.ts` if React is the first client target.
- `packages/angular/src/lib/services/livekit/**` if Angular is prioritized.
- `packages/vue/src/composables/useDomOSLiveKitRoom.ts` if Vue is present and low-cost.
- `packages/core/src/livekit/types.ts` only if shared room/token types are justified.
- `apps/demo-server/src/server.ts` for a demo token endpoint.
- Existing demo app files only to show a minimal room join flow.
- `sprints/livekit/progress/SPRINT-LK-05-progress.md`.

## Scope read-only first

- `packages/browser/**`
- `packages/react/**`
- `packages/angular/**`
- `packages/vue/**`
- `packages/core/src/**`
- `apps/demo-server/**`
- `apps/demo/**`
- `apps/demo-angular/**`

## Scope forbidden in LK-05

- No dashboard ops implementation; LK-06 owns dashboard surfaces.
- No telephony/SIP/deployment work; LK-08 owns it.
- No direct execution of client tools inside LiveKit room client code.
- No LiveKit secret in frontend code.
- No replacement of ADTP context/tool sync with LiveKit data messages unless a blocker is documented and reviewed first.
- No broad server auth redesign.

## Decisions to validate before implementation

1. Identify the actual client package names and their current build conventions before adding files.
2. Choose the first frontend target based on existing demo readiness, not preference.
3. Token generation must happen server-side and return only a short-lived room token plus public connection metadata.
4. Room lifecycle must be linked to DomOS session lifecycle without making room disconnect destroy the text/ADTP session by default.
5. Room participant identity must be traceable to the DomOS session id without exposing API keys.
6. Mounted/unmounted tools remain synchronized through `DomOSClient.registerTool()` / `unregisterTool()` and `CONTEXT_UPDATE`.
7. Tests must use mocks/no network for LiveKit room behavior.

## TODO

- [x] Inspect actual client packages and demo apps before writing code.
- [x] Decide first frontend target: React, Angular, browser/base, or demo-only.
- [x] Map existing `DomOSClient` lifecycle to proposed room connect/disconnect lifecycle.
- [x] Define shared room token/request/response types only if needed.
- [x] Add a secure demo token endpoint with no LiveKit secret leakage.
- [x] Add frontend room connect/disconnect/mute state wrapper.
- [x] Prove Shadow Context and mounted tools still use ADTP after room connect.
- [x] Add no-network tests for token endpoint and frontend room lifecycle.
- [x] Request `code_reviewer_54` before LK-05 closure.

## Definition of Done

- [x] A demo client can request a server-generated LiveKit room token.
- [x] No LiveKit secret is present in frontend bundles or public config.
- [x] The frontend can connect/disconnect a room without replacing `DomOSClient`.
- [x] Microphone mute/unmute and room state are observable through the SDK wrapper.
- [x] DomOS Shadow Context still updates through ADTP while the room is connected.
- [x] Mounted client tools remain registered/unregistered through the existing DomOS lifecycle.
- [x] Room disconnect does not destroy the DomOS text/session channel by default.
- [x] DomOS session close can close the linked room when configured.
- [x] Tests cover token endpoint behavior and no-network room lifecycle.
- [x] Targeted builds/tests pass for every touched package/app.
- [x] `code_reviewer_54` validates the sprint before closure.

## Implementation delivered - 2026-07-06

- Added `LiveKitRoomTokenService` in `@domos/adapter-livekit` with direct `livekit-server-sdk` dependency, short-lived scoped room tokens, metadata size guard and no secret exposure in returned payloads.
- Added `POST /domos/livekit/token` in `apps/demo-server`, guarded by the same client API keys when `DOMOS_REQUIRE_API_KEY` is enabled.
- Added `useDomOSLiveKitRoom` in `@domos/react` with optional `livekit-client` peer dependency, token fetch, room connect/disconnect, state tracking, microphone enable/disable and opt-in DomOS disconnect cleanup.
- Kept `packages/audio` unchanged: ADTP PCM/base64 audio remains owned by `@domos/audio`; LiveKit media is an optional WebRTC room path.
- Removed the stale `rateLimit` demo-server option because it is not part of `DomOSServerOptions` and blocked the demo-server build.

## Demo React integration - 2026-07-08

- Added `agentSpeaking` and `participantIdentity` states to `useDomOSLiveKitRoom` hook, resolving naming conflict with `optParticipantIdentity`.
- Added `activeSpeakersChanged` event to `DomOSLiveKitRoomRuntime` and registered `ActiveSpeakersChanged` from `RoomEvent` in `createDefaultLiveKitRoom()`.
- Exposed `agentSpeaking: boolean` and `participantIdentity: string | null` in `UseDomOSLiveKitRoomResult`.
- Added `livekit-client` as dependency in `apps/demo/package.json` (required by the dynamic import in the default room factory).
- Created `apps/demo/src/components/LiveKitRoomButton.tsx` — floating control that demonstrates:
  - `connect()` / `disconnect()` room lifecycle
  - `toggleMicrophone()` mute/unmute
  - Status display: idle, requesting-token, connecting, connected, disconnecting, disconnected, error
  - `agentSpeaking` indicator when agent audio is active
  - `participantIdentity` display (truncated)
  - Hidden when DomOS is not connected (uses `useAgent().isConnected`)
- Integrated `<LiveKitRoomButton />` in `apps/demo/src/App.tsx` alongside `<ChatPanel />` and `<AgentToolbar />`.
- Contract frontend complet : `connectRoom`, `disconnectRoom`, `muteMicrophone`, `unmuteMicrophone`, `roomState`, `agentSpeaking`, `participantIdentity`.

## Audio package review - 2026-07-10

- Re-read `packages/audio` through MCP workspace as requested.
- Confirmed package role: centralized DomOS PCM/base64 encode/decode, WAV decode, Opus decode, audio format detection and MIME helpers.
- Confirmed LK-05 must not modify it: ADTP audio keeps using `@domos/audio`; LiveKit room audio is transported by WebRTC tracks through `livekit-client`.
- `git diff --name-only -- packages/audio` returned no source changes.
- `pnpm --filter @domos/audio test` passed: 2 files, 26 tests.
- `pnpm --filter @domos/audio build` passed.

## Local review fixes - 2026-07-10

- `code_reviewer_54` was requested for LK-05, but the subagent failed with the account usage limit before returning findings. LK-05 remains not formally closed by reviewer.
- Performed local code-review fallback and fixed:
  - `useDomOSLiveKitRoom` now passes the actual active-speakers array to the listener instead of nesting event args.
  - Manual room disconnect and connection failure reset `agentSpeaking` and `participantIdentity`.
  - `LiveKitRoomButton` reads `VITE_DOMOS_API_KEY` instead of the typo `VITE_DEMOS_API_KEY`.
  - `LiveKitRoomButton` stays visible while the DomOS agent is thinking/listening/speaking, not only in the strict `connected` state.
  - Existing bridge-stats worktree change now compiles: `AdminAPI.getBridgeStats()` returns disabled stats when no bridge is injected, and `DomOSLiveKitAgentBridge` keeps a bounded event log without mutating `options.onEvent`.

## Reviewer findings and fixes - 2026-07-10

- `code_reviewer_54` reviewed commit `029f18f` and did not approve LK-05 as-is.
- Medium finding fixed: manual `DomOSLiveKitAgentBridge.close()` no longer duplicates room cleanup or `agent_session.closed` events when `AgentSession.close()` also emits `close`.
- Medium finding fixed: `useDomOSLiveKitRoom.connect()` now deduplicates concurrent connect attempts with an in-flight promise guard.
- Medium finding fixed: `LiveKitRoomButton` renders only after a DomOS `sessionId` exists and disables the join button while token request, room connection or disconnection is in progress.
- Low finding fixed: `BridgeStatsSnapshot.startedAt` is now a stable bridge start timestamp, not the mutable Shadow Context `updatedAt`.
- Missing test fixed: bridge test covers the real-world combined path where manual close triggers an AgentSession `close` event.
- Missing test fixed: React hook test covers concurrent `connect()` calls and verifies a single token request and room connection.
- Missing test fixed: AdminAPI dashboard tests cover `/admin/bridge`, `status.bridge`, `enabled=true` mock stats and `enabled=false` fallback.

## Validation run - 2026-07-10 reviewer fixes

- `pnpm --filter @domos/adapter-livekit test -- DomOSLiveKitAgentBridge.test.ts` passed with 10 tests.
- `pnpm --filter @domos/react test -- useDomOSLiveKitRoom.test.tsx` passed with 7 tests.
- `pnpm --filter @domos/server test -- AdminAPI.dashboard.test.ts` passed with 7 tests.
- `pnpm --filter @domos/react lint` passed.
- `pnpm --filter @domos/adapter-livekit build` passed.
- `pnpm --filter @domos/server build` passed.
- `pnpm --filter @domos/react build` passed.
- `pnpm --filter @domos/demo build` passed, with the expected Vite chunk-size warning for `livekit-client`.
- `rg -n "LIVEKIT_API_SECRET|apiSecret|server-secret|server-key" packages/react apps/demo packages/browser --glob '!dist/**' --glob '!node_modules/**'` returned no client-side matches.
- `rg -n "@livekit|livekit-server-sdk|livekit-client" packages/server/src packages/server/package.json --glob '!dist/**' --glob '!node_modules/**'` returned no matches.
- `code_reviewer_54` re-reviewed the fix diff and approved LK-05 with no remaining blockers.

## Validation run - 2026-07-06

- `pnpm --filter @domos/adapter-livekit test -- LiveKitRoomTokenService.test.ts` passed.
- `pnpm --filter @domos/adapter-livekit lint` passed.
- `pnpm --filter @domos/adapter-livekit build` passed.
- `pnpm --filter @domos/demo-server build` passed.
- `pnpm --filter @domos/react test -- useDomOSLiveKitRoom.test.tsx` passed with 5 tests.
- `pnpm --filter @domos/react lint` passed.
- `pnpm --filter @domos/react build` passed.
- `rg -n "LIVEKIT_API_SECRET|apiSecret|server-secret|server-key" packages/react apps/demo packages/browser --glob '!dist/**' --glob '!node_modules/**'` returned no client-side matches.
- `rg -n "livekit|@livekit|livekit-server-sdk" packages/server/src packages/server/package.json --glob '!dist/**' --glob '!node_modules/**'` returned no matches, preserving the `@domos/server` boundary.

## Validation run - 2026-07-10

- `pnpm --filter @domos/audio test` passed.
- `pnpm --filter @domos/audio build` passed.
- `pnpm --filter @domos/react test -- useDomOSLiveKitRoom.test.tsx` passed with 6 tests.
- `pnpm --filter @domos/react lint` passed.
- `pnpm --filter @domos/react build` passed.
- `pnpm --filter @domos/demo build` passed, with an expected Vite chunk-size warning for the separate `livekit-client` chunk.
- `pnpm --filter @domos/adapter-livekit test -- LiveKitRoomTokenService.test.ts DomOSLiveKitAgentBridge.test.ts` passed: 13 tests.
- `pnpm --filter @domos/adapter-livekit build` passed.
- `pnpm --filter @domos/server build` passed.
- `pnpm --filter @domos/demo-server build` passed.
- `rg -n "LIVEKIT_API_SECRET|apiSecret|server-secret|server-key" packages/react apps/demo packages/browser --glob '!dist/**' --glob '!node_modules/**'` returned no client-side matches.
- `rg -n "@livekit|livekit-server-sdk|livekit-client" packages/server/src packages/server/package.json --glob '!dist/**' --glob '!node_modules/**'` returned no matches.

## Validation plan

- Run package-specific tests for touched client packages.
- Run package-specific builds for touched client packages.
- Run targeted demo-server tests or typecheck if a token endpoint is added.
- Run `rg -n "LIVEKIT_API_SECRET|apiSecret|secret" packages apps` and document expected server-only matches.
- Run `rg -n "TOOL_CALL|TOOL_RESULT|CONTEXT_UPDATE|registerTool|unregisterTool" touched client files` to prove ADTP ownership remains visible.

## Next step persisted

Next step: LK-05 is closed. Start LK-06 dashboard ops from `sprints/livekit/progress/SPRINT-LK-06-progress.md`, beginning with endpoint strategy and AdminAPI dashboard tests.
