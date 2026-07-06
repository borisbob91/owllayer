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

- [ ] Inspect actual client packages and demo apps before writing code.
- [ ] Decide first frontend target: React, Angular, browser/base, or demo-only.
- [ ] Map existing `DomOSClient` lifecycle to proposed room connect/disconnect lifecycle.
- [ ] Define shared room token/request/response types only if needed.
- [ ] Add a secure demo token endpoint with no LiveKit secret leakage.
- [ ] Add frontend room connect/disconnect/mute state wrapper.
- [ ] Prove Shadow Context and mounted tools still use ADTP after room connect.
- [ ] Add no-network tests for token endpoint and frontend room lifecycle.
- [ ] Request `code_reviewer_54` before LK-05 closure.

## Definition of Done

- [ ] A demo client can request a server-generated LiveKit room token.
- [ ] No LiveKit secret is present in frontend bundles or public config.
- [ ] The frontend can connect/disconnect a room without replacing `DomOSClient`.
- [ ] Microphone mute/unmute and room state are observable through the SDK wrapper.
- [ ] DomOS Shadow Context still updates through ADTP while the room is connected.
- [ ] Mounted client tools remain registered/unregistered through the existing DomOS lifecycle.
- [ ] Room disconnect does not destroy the DomOS text/session channel by default.
- [ ] DomOS session close can close the linked room when configured.
- [ ] Tests cover token endpoint behavior and no-network room lifecycle.
- [ ] Targeted builds/tests pass for every touched package/app.
- [ ] `code_reviewer_54` validates the sprint before closure.

## Validation plan

- Run package-specific tests for touched client packages.
- Run package-specific builds for touched client packages.
- Run targeted demo-server tests or typecheck if a token endpoint is added.
- Run `rg -n "LIVEKIT_API_SECRET|apiSecret|secret" packages apps` and document expected server-only matches.
- Run `rg -n "TOOL_CALL|TOOL_RESULT|CONTEXT_UPDATE|registerTool|unregisterTool" touched client files` to prove ADTP ownership remains visible.

## Next step persisted

Next step: inspect actual client package layouts and demos, then choose the smallest first LK-05 target that proves room join without disrupting DomOS ADTP.
