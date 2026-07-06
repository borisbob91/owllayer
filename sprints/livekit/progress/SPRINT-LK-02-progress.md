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
3. `@livekit/agents` is not automatically added in LK-02 unless TypeScript/runtime proves the TTS plugin needs it directly.
4. Provider errors must never include API keys, service account paths or full request payloads containing secrets.
5. `listVoices()` may return curated Gemini voice presets first, because dynamic provider voice listing is not required by the sprint.
6. `isAvailable()` should validate local configuration conservatively without making expensive or noisy network calls unless the provider SDK exposes a cheap supported check.
7. If LiveKit's Node TTS output type is not stable, write tests around DomOS mapping boundaries and mock the provider object.

## TODO

- [ ] Re-open the official LiveKit Gemini TTS docs immediately before implementation and verify the current Node package/API.
- [ ] Inspect installed package types after adding the dependency.
- [ ] Add the minimal runtime dependency needed for Gemini TTS.
- [ ] Create `packages/adapter-livekit/src/tts/GeminiTTSService.ts`.
- [ ] Create `packages/adapter-livekit/src/tts/geminiVoices.ts`.
- [ ] Create `packages/adapter-livekit/src/tts/index.ts`.
- [ ] Export `GeminiTTSService` and related types from `packages/adapter-livekit/src/index.ts`.
- [ ] Add tests with provider/client mock proving text, voice, instructions, errors and output mapping.
- [ ] Update README usage without exposing secrets.
- [ ] Run package build/test/lint.
- [ ] Request `code_reviewer_54` before closing LK-02.

## Definition of Done

- [ ] `GeminiTTSService` compiles and implements `TTSService`.
- [ ] `synthesize()` maps `TTSConfig` to Gemini TTS and returns `TTSResult` with base64 audio and MIME type.
- [ ] `listVoices()` returns usable Gemini voices.
- [ ] `getCapabilities()` returns provider, model, current voice and available voices.
- [ ] Missing API key or provider configuration fails safely.
- [ ] Provider errors do not leak secrets.
- [ ] Tests cover successful synthesis, voice mapping, capabilities and sanitized failures.
- [ ] `pnpm --filter @domos/adapter-livekit build` passes.
- [ ] `pnpm --filter @domos/adapter-livekit test` passes.
- [ ] `pnpm --filter @domos/adapter-livekit lint` passes.
- [ ] `code_reviewer_54` validates the sprint before closure.

## Validation plan

- Run `pnpm --filter @domos/adapter-livekit build`.
- Run `pnpm --filter @domos/adapter-livekit test`.
- Run `pnpm --filter @domos/adapter-livekit lint`.
- Run source search to prove LK-02 did not add LiveKit imports to `packages/server`.
- Run `git diff --stat` before review to verify the sprint stayed scoped.

## Next step persisted

Next step: implement only LK-02 Gemini TTS Service in `packages/adapter-livekit/src/tts/**`, using the current LiveKit Node plugin API and tests with mocks. Do not start LK-03 Realtime Live adapters until LK-02 has a reviewer verdict.
