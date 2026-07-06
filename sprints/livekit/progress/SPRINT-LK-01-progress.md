# Sprint LK-01 progress - LiveKit package foundation

Date prepared: 2026-07-06  
Branch: `feat/feature-35-livekit-optional-runtime`  
Base sprint: `sprints/livekit/SPRINT-LK-00-architecture-contract.md` closed on 2026-07-06  
Active sprint file: `sprints/livekit/SPRINT-LK-01-package-foundation.md`

## Objective

Create the optional `@domos/adapter-livekit` package foundation without changing DomOS server runtime behavior.

The sprint prepares the package boundary, public exports, configuration types and build wiring needed for later LiveKit work. It must keep LiveKit out of `@domos/server` and reuse the existing contracts from `@domos/core`.

## Current-state evidence

- Workspace discovery: `pnpm-workspace.yaml` already includes `packages/*`, so `packages/adapter-livekit` should be picked up automatically.
- Existing adapter pattern: `packages/adapter-google` and `packages/adapter-openai` are the references for package naming, build shape and public exports.
- Existing core contracts: `packages/core/src/voice/contracts.ts` owns `LiveAdapter`, `LiveSession`, `LiveSessionConfig`, `TTSService` and `STTService`.
- Server aliasing: `packages/server/src/llm/types.ts` and `packages/server/src/speech/types.ts` reexport the relevant contracts from `@domos/core`.
- Existing server wiring: `packages/server/src/core/DomOSServer.ts` already receives `live`, `tts`, `stt` and `llm` adapters through options.

## Scope allowed in LK-01

- `packages/adapter-livekit/**`
- `sprints/livekit/progress/SPRINT-LK-01-progress.md`
- `pnpm-workspace.yaml` only if workspace inclusion fails, which is not expected because `packages/*` already exists.
- Minimal docs in `sprints/livekit/**` only if a package decision must be captured.

## Scope forbidden in LK-01

- No `packages/server/src/core/DomOSServer.ts` runtime change.
- No `packages/core/src/voice/contracts.ts` contract change unless an explicit blocker is found and documented first.
- No Gemini TTS implementation.
- No Gemini Live implementation.
- No AgentSession bridge.
- No frontend room client.
- No dashboard endpoint.
- No LiveKit token endpoint.
- No telephony or deployment work.

## Decisions

1. The package name is `@domos/adapter-livekit`.
2. LiveKit dependencies belong in `packages/adapter-livekit`, not in `packages/server`.
3. The first package foundation must stay provider-neutral; Gemini, OpenAI and LiveKit Inference are provider options, not hard requirements.
4. Secrets such as `LIVEKIT_API_SECRET` and provider API keys must never be exported to browser-facing packages.
5. Public exports should be minimal: config/types/errors first, runtime classes only when their sprint implements them.
6. The package must build in isolation before any later sprint depends on it.

## TODO

- [ ] Inspect `packages/adapter-google` and `packages/adapter-openai` package/build shape before creating files.
- [ ] Create `packages/adapter-livekit/package.json`.
- [ ] Create `packages/adapter-livekit/tsconfig.json`.
- [ ] Create `packages/adapter-livekit/tsup.config.ts` or reuse the repo's established build pattern.
- [ ] Create `packages/adapter-livekit/src/index.ts`.
- [ ] Create `packages/adapter-livekit/src/types.ts`.
- [ ] Create `packages/adapter-livekit/src/LiveKitRuntimeConfig.ts`.
- [ ] Create `packages/adapter-livekit/src/errors.ts`.
- [ ] Document required server-only environment variables in the package README or source comments.
- [ ] Run the package build in isolation.
- [ ] Request `code_reviewer_54` review before closing LK-01.

## Definition of Done

- [ ] `@domos/adapter-livekit` exists as an optional package.
- [ ] The package builds in isolation.
- [ ] The package exports only foundation types/config/errors needed by later sprints.
- [ ] `@domos/server` does not import LiveKit directly.
- [ ] Gemini is not mandatory.
- [ ] Secrets remain documented as server-only values.
- [ ] No runtime room, TTS, LiveAdapter, AgentSession, dashboard or telephony feature is implemented in LK-01.
- [ ] `code_reviewer_54` validates the sprint before closure.

## Validation plan

- Run `pnpm --filter @domos/adapter-livekit build`.
- Run targeted source searches proving `packages/server` has no direct LiveKit import.
- Inspect public exports from `packages/adapter-livekit/src/index.ts`.
- Run `git diff --stat` before review to confirm the sprint stayed in scope.

## Next step persisted

Next step: implement only the LK-01 package skeleton and run `pnpm --filter @domos/adapter-livekit build`. After implementation, request `code_reviewer_54` for the LK-01 closure gate before preparing LK-02.
