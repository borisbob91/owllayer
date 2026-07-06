# Sprint LK-02 progress - Gemini TTS Service

Date prepared: 2026-07-06  
Branch: `feat/feature-35-livekit-optional-runtime`  
Base sprint: `sprints/livekit/SPRINT-LK-01-package-foundation.md` closed on 2026-07-06  
Active sprint file: `sprints/livekit/SPRINT-LK-02-gemini-tts-service.md`

## Objective

Implement only a Gemini TTS service inside `@domos/adapter-livekit` that satisfies the existing DomOS `TTSService` contract from `@domos/core`.

LK-02 must deliver a useful low-risk voice provider without touching DomOS live routing, rooms, AgentSession, dashboard endpoints, client SDKs or server runtime wiring.

## Current-state evidence

- `@domos/adapter-livekit` exists and builds after LK-01.
- `packages/adapter-livekit/src/index.ts` currently exports foundation config/types/errors only.
- `packages/core/src/voice/contracts.ts` already owns `TTSService`, `TTSConfig`, `TTSResult`, `Voice` and `SpeechCapabilities`.
- `packages/adapter-google/src/GoogleTTS.ts` is the local reference for a `BaseTTSService` implementation and provider capability shape.
- Official LiveKit docs checked on 2026-07-06: `https://docs.livekit.io/agents/models/tts/gemini/`.
- Current LiveKit docs indicate Node usage through `@livekit/agents-plugin-google@1.x`, `google.beta.TTS`, and parameters including `model`, `voiceName`, `instructions` and `customPronunciations`.
- The sprint draft uses `defaultVoice` and `customPronunciations`; implementation must map these safely to the current LiveKit Node API instead of assuming stale names.

## Scope allowed in LK-02

- `packages/adapter-livekit/package.json`
- `pnpm-lock.yaml`
- `packages/adapter-livekit/src/tts/**`
- `packages/adapter-livekit/src/index.ts`
- `packages/adapter-livekit/tests/GeminiTTSService.test.ts`
- `packages/adapter-livekit/README.md` for usage and secret notes
- `sprints/livekit/progress/SPRINT-LK-02-progress.md`

## Scope read-only in LK-02

- `packages/core/src/voice/contracts.ts`
- `packages/adapter-google/src/GoogleTTS.ts`
- `packages/server/src/speech/types.ts`
- `packages/ui/src/dashboard/pages/CapabilitiesPage.tsx`

## Scope forbidden in LK-02

- No `packages/server/src/core/DomOSServer.ts` runtime change.
- No `packages/core/src/voice/contracts.ts` contract change unless a blocker is documented first.
- No LiveAdapter implementation.
- No Gemini Live implementation.
- No AgentSession bridge.
- No room or token endpoint.
- No frontend room client.
- No dashboard page change unless standard capabilities are proven insufficient and the sprint is expanded explicitly.
- No telephony or deployment work.

## Decisions

1. `GeminiTTSService` must implement the existing `TTSService`; no new DomOS speech contract is allowed in LK-02.
2. The first runtime dependency should be `@livekit/agents-plugin-google@1.x` only if the implementation imports `google.beta.TTS`.
3. `@livekit/agents` and `@livekit/rtc-node` are explicit adapter dependencies because `@livekit/agents-plugin-google` declares them as peer dependencies and `google.beta.TTS` extends the LiveKit TTS base class.
4. Provider errors must never include API keys, service account paths or full request payloads containing secrets.
5. `listVoices()` may return curated Gemini voice presets first, because dynamic provider voice listing is not required by the sprint.
6. `isAvailable()` should validate local configuration conservatively without making expensive or noisy network calls unless the provider SDK exposes a cheap supported check.
7. If LiveKit's Node TTS output type is not stable, write tests around DomOS mapping boundaries and mock the provider object.
8. LiveKit package metadata was checked: latest 1.x for `@livekit/agents-plugin-google` is `1.5.0`; LK-02 pins `1.5.0` instead of floating `1.x`.
9. `GeminiTTSService` uses a dynamic import of `@livekit/agents-plugin-google` and an internal client interface so DomOS public types remain based on `@domos/core`.
10. The output exposed to DomOS is PCM 16-bit base64 with `audio/pcm;rate=<sampleRate>` because LiveKit Gemini TTS yields `AudioFrame` objects, not MP3/WAV blobs.

## TODO

- [x] Re-open the official LiveKit Gemini TTS docs immediately before implementation and verify the current Node package/API.
- [x] Inspect installed package types after adding the dependency.
- [x] Add the minimal runtime dependency needed for Gemini TTS.
- [x] Create `packages/adapter-livekit/src/tts/GeminiTTSService.ts`.
- [x] Create `packages/adapter-livekit/src/tts/geminiVoices.ts`.
- [x] Create `packages/adapter-livekit/src/tts/index.ts`.
- [x] Export `GeminiTTSService` and related types from `packages/adapter-livekit/src/index.ts`.
- [x] Add tests with provider/client mock proving text, voice, instructions, errors and output mapping.
- [x] Update README usage without exposing secrets.
- [x] Run package build/test/lint.
- [x] Request `code_reviewer_54` before closing LK-02.

## Definition of Done

- [x] `GeminiTTSService` compiles and implements `TTSService`.
- [x] `synthesize()` maps `TTSConfig` to Gemini TTS and returns `TTSResult` with base64 audio and MIME type.
- [x] `listVoices()` returns usable Gemini voices.
- [x] `getCapabilities()` returns provider, model, current voice and available voices.
- [x] Missing API key or provider configuration fails safely.
- [x] Provider errors do not leak secrets.
- [x] Tests cover successful synthesis, voice mapping, capabilities, sanitized failures, empty audio and the dynamic import constructor boundary.
- [x] `pnpm --filter @domos/adapter-livekit build` passes.
- [x] `pnpm --filter @domos/adapter-livekit test` passes.
- [x] `pnpm --filter @domos/adapter-livekit lint` passes.
- [x] `code_reviewer_54` validates the sprint before closure.

## Validation plan

- [x] Run `pnpm --filter @domos/adapter-livekit build` - passed.
- [x] Run `pnpm --filter @domos/adapter-livekit test` - passed, 2 test files and 14 tests.
- [x] Run `pnpm --filter @domos/adapter-livekit lint` - passed.
- [x] Run source search to prove LK-02 did not add LiveKit imports to `packages/server` - `rg -n "livekit|@livekit|livekit-server-sdk" packages/server/src packages/server/package.json` returned no matches.
- [x] Run `pnpm --filter @domos/server build` - passed.
- [x] Run `git diff --stat` before review to verify the sprint stayed scoped.

## Agent registry

### code_reviewer_54 LK-02 pass

- agent id: `019f3874-0a50-7971-a7eb-af1f2f85f9b4`
- nickname: Verifier the 2nd
- custom agent type: `code_reviewer_54`
- mission: read-only closure review for LK-02 Gemini TTS Service.
- allowed scope: `packages/adapter-livekit/**`, `sprints/livekit/SPRINT-LK-02-gemini-tts-service.md`, `sprints/livekit/progress/SPRINT-LK-02-progress.md`, `pnpm-lock.yaml`, `packages/core/src/voice/contracts.ts`, `packages/core/src/voice/BaseTTSService.ts`, `packages/server/package.json`, `packages/server/src/**` only for direct LiveKit import verification.
- forbidden scope: source edits, package installs, commits, branch changes, server runtime changes, core contract changes, LiveAdapter implementation, AgentSession bridge, dashboard endpoints, frontend room code, telephony.
- status: completed and closed
- created at: 2026-07-06
- last update: 2026-07-06 - reviewer completed; no blocking findings.
- expected output: findings first by severity, file/line evidence, missing tests or scope leaks, final close/no-close recommendation.
- close/result: no blocking finding. Recommendation: close LK-02.

## Reviewer findings handled

- [x] Low: `EMPTY_AUDIO` branch lacked coverage. Added a no-network regression test.
- [x] Low: dynamic import constructor boundary lacked coverage. Added a no-network mock test around `@livekit/agents-plugin-google` and `google.beta.TTS`.
- [x] Re-ran `pnpm --filter @domos/adapter-livekit test` - passed, 14 tests.
- [x] Re-ran `pnpm --filter @domos/adapter-livekit lint` - passed.
- [x] Re-ran `pnpm --filter @domos/adapter-livekit build` - passed.

## Status

Closed on 2026-07-06.

## Next step persisted

Next step: start LK-03 Realtime Live Adapters. LK-03 may implement `LiveAdapter`/`LiveSession` inside `packages/adapter-livekit/src/live/**` only. It must not implement AgentSession bridge, frontend rooms, dashboard endpoints, token endpoints or server runtime changes.
