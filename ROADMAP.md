# OwlLayer AI Roadmap

This document summarizes the public roadmap of **OwlLayer AI**, the Agentic UI SDK built on the **OwlLayer AI Runtime** and the **AITP** (Agent-to-Interface Transfer Protocol).

GitHub Issues remain the source of truth for status, scope, decisions, and acceptance. This file mirrors the public roadmap issue [#31](https://github.com/borisbob91/owllayer/issues/31) and the [OwlLayer AI Roadmap project board](https://github.com/users/borisbob91/projects/1). When this file and GitHub disagree, GitHub wins.

## Delivery model

`public roadmap → domain epic → focused implementation issue → one branch and one pull request per issue`

- The roadmap owns epics and governance outcomes; it does not own implementation pull requests.
- Each epic owns one coherent product domain and publishes only outcome-level information.
- Each implementation issue covers one domain or one public package and closes through a focused pull request.
- Implementation issues are created and linked only when their dependencies are close to completion.
- Private implementation plans stay local and are never copied into public issues.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full issue-driven workflow.

## Ordered layers

Work is delivered in dependency order:

1. Governance, issue workflow, canonical terminology, and package/release migration.
2. AITP and Core Media foundations.
3. Provider-neutral server runtime.
4. OpenAI reference integration and Client Media.
5. Deepgram voice capabilities.
6. Agent Studio.
7. LiveKit provider-neutral realignment, after its explicit unblock gates.

## Status overview

| Layer | Epic | Status |
| --- | --- | --- |
| 1 | [#13](https://github.com/borisbob91/owllayer/issues/13) Issue-driven workflow | ✅ Done |
| 1 | [#29](https://github.com/borisbob91/owllayer/issues/29) Engineering constitution | ✅ Done |
| 1 | [#40](https://github.com/borisbob91/owllayer/issues/40) Repository CODEOWNERS | ✅ Done |
| 1 | [#14](https://github.com/borisbob91/owllayer/issues/14) Migrate DomOS to OwlLayer AI | 🟡 All child issues done, final completion criteria open |
| 2 | [#30](https://github.com/borisbob91/owllayer/issues/30) Consolidate audio into Core Media | ✅ Done |
| 2 | [#32](https://github.com/borisbob91/owllayer/issues/32) Evolve AITP negotiation, media, and tool lifecycle | ⏳ Planned |
| 3 | [#33](https://github.com/borisbob91/owllayer/issues/33) Provider-neutral OwlLayer AI Runtime | ⏳ Planned |
| 4 | [#35](https://github.com/borisbob91/owllayer/issues/35) OpenAI reference text and realtime integration | ⏳ Planned |
| 4 | [#34](https://github.com/borisbob91/owllayer/issues/34) Provider-neutral Client Media runtime | ⏳ Planned |
| 5 | [#36](https://github.com/borisbob91/owllayer/issues/36) Deepgram STT, TTS, and streaming | ⏳ Planned |
| 6 | [#37](https://github.com/borisbob91/owllayer/issues/37) Agent Studio | ⏳ Planned |
| 7 | [#38](https://github.com/borisbob91/owllayer/issues/38) LiveKit realignment | ⛔ Blocked intentionally |

---

## Layer 1 — Governance and migration

### Governance — done

- [x] [#13](https://github.com/borisbob91/owllayer/issues/13) Establish the GitHub issue-driven workflow.
- [x] [#15](https://github.com/borisbob91/owllayer/issues/15) Establish OwlLayer AI naming and the AITP migration guide.
- [x] [#29](https://github.com/borisbob91/owllayer/issues/29) Ratify the OwlLayer AI engineering constitution.
- [x] [#40](https://github.com/borisbob91/owllayer/issues/40) Configure repository CODEOWNERS.

### [#14](https://github.com/borisbob91/owllayer/issues/14) — Migrate DomOS to OwlLayer AI

Migrate the legacy DomOS identity to **OwlLayer AI** and ADTP to **AITP** without changing wire semantics, ordering, transport behavior, or security rules.

Canonical naming: **OwlLayer AI** (brand), **Agentic UI SDK** (developer category), **OwlLayer AI Runtime** (execution layer), `@owllayer` / `owllayer` (npm scope and slug), **AITP** (protocol).

Delivered:

- [x] Documentation and governance: [#15](https://github.com/borisbob91/owllayer/issues/15), [#29](https://github.com/borisbob91/owllayer/issues/29), [#42](https://github.com/borisbob91/owllayer/issues/42) documentation site.
- [x] Foundation: [#16](https://github.com/borisbob91/owllayer/issues/16) Core and AITP, [#18](https://github.com/borisbob91/owllayer/issues/18) UI, [#30](https://github.com/borisbob91/owllayer/issues/30) Core Media audio.
- [x] Package cutover: [#19](https://github.com/borisbob91/owllayer/issues/19) Browser, [#20](https://github.com/borisbob91/owllayer/issues/20) OpenAI, [#21](https://github.com/borisbob91/owllayer/issues/21) Google, [#22](https://github.com/borisbob91/owllayer/issues/22) Anthropic, [#23](https://github.com/borisbob91/owllayer/issues/23) LiveKit, [#24](https://github.com/borisbob91/owllayer/issues/24) React, [#25](https://github.com/borisbob91/owllayer/issues/25) Vue, [#26](https://github.com/borisbob91/owllayer/issues/26) Svelte, [#27](https://github.com/borisbob91/owllayer/issues/27) Angular, [#28](https://github.com/borisbob91/owllayer/issues/28) Server.

Remaining completion criteria (tracked in #14):

- [ ] All retained public packages install from the registry outside the monorepo.
- [ ] Trusted Publishing and provenance are verified for every public package.
- [ ] Historical records remain intact and are marked as legacy where appropriate.

## Layer 2 — AITP and Core Media foundations

### [#30](https://github.com/borisbob91/owllayer/issues/30) — Consolidate audio into Core — done

- [x] [#46](https://github.com/borisbob91/owllayer/issues/46) Expose provider-neutral audio from `@owllayer/core/media/audio`.
- [x] [#47](https://github.com/borisbob91/owllayer/issues/47) Migrate Angular audio utilities to Core Media.
- [x] [#48](https://github.com/borisbob91/owllayer/issues/48) Remove the standalone audio dependency from the LiveKit adapter.
- [x] [#49](https://github.com/borisbob91/owllayer/issues/49) Retire the standalone audio workspace.

### [#32](https://github.com/borisbob91/owllayer/issues/32) — Evolve AITP negotiation, media, and tool lifecycle

Evolve AITP into the provider-neutral control protocol for text, tools, streaming voice, media negotiation, and Neural-DOM Binding while keeping existing clients and servers compatible.

Planned sequence:

1. Version and capability negotiation.
2. Provider-neutral media transport negotiation.
3. Streaming audio, transcription, and turn lifecycle contracts.
4. Versioned tool-surface lifecycle for Neural-DOM Binding.
5. Conformance, compatibility, migration guidance, and release gates.

Depends on: canonical terminology, Core package migration and compatibility policy.
Out of scope: provider-specific event names or credentials in Core, replacing AITP with a generic RPC protocol.

## Layer 3 — Provider-neutral server runtime

### [#33](https://github.com/borisbob91/owllayer/issues/33) — Build the provider-neutral OwlLayer AI Runtime

Resolve one immutable agent definition per authenticated session, compose registered adapters safely, coordinate text and voice execution, and expose bounded administration contracts.

Planned sequence:

1. Agent identity and immutable runtime definitions.
2. Behavior-preserving decomposition of the administration API.
3. Adapter factory registry and server-side credential resolution.
4. Isolated per-session runtime coordination.
5. Safe runtime administration and operational status contracts.

Depends on: AITP compatibility and tool lifecycle, Server package migration, Core Media (before the streaming voice pipeline).
Out of scope: provider-specific UI editors, client microphone or playback, LiveKit types inside Server.

## Layer 4 — OpenAI reference integration and Client Media

### [#35](https://github.com/borisbob91/owllayer/issues/35) — OpenAI reference text and realtime integration

Planned sequence:

1. Current-state contract and compatibility baseline.
2. Responses API text and tool continuation support.
3. GA realtime sessions over server WebSocket.
4. Negotiated WebRTC media with server-side control.
5. Publication validation, examples, and documentation.

Depends on: AITP media negotiation, provider-neutral Server Runtime, Client Media (before browser WebRTC).
Out of scope: OpenAI-specific fields in AITP or framework SDKs, WebRTC as a silent default, preview models as permanent defaults.

### [#34](https://github.com/borisbob91/owllayer/issues/34) — Provider-neutral Client Media runtime

Provide a common media lifecycle for OwlLayer AI clients, integrated one framework at a time.

Planned sequence:

1. Shared client media policy, state, negotiation, events, and cleanup.
2. React pilot integration.
3. Angular integration.
4. Vue integration.
5. Svelte integration.
6. Browser integration.
7. DevTools, end-to-end validation, and public documentation.

Principles: WebSocket stays the safe default, WebRTC is explicit or capability-negotiated, one effective media producer per session, no provider-specific type in Core or a framework SDK.
Depends on: AITP media and streaming contracts, Core Media, at least one validated realtime provider path.

## Layer 5 — Deepgram voice capabilities

### [#36](https://github.com/borisbob91/owllayer/issues/36) — Deepgram STT, TTS, and streaming

Planned sequence:

1. Provider contract, configuration, capabilities, and packaging decision.
2. Streaming speech-to-text.
3. Text-to-speech.
4. Composable streaming voice pipeline.
5. Optional live-agent mode.
6. Safe administration, observability, validation, and documentation.

Depends on: Core Media, provider-neutral Server Runtime and session coordinator, AITP streaming and tool lifecycle.
Out of scope: a separate public Deepgram package, a provider-owned agent loop replacing the runtime.

## Layer 6 — Agent Studio

### [#37](https://github.com/borisbob91/owllayer/issues/37) — Agent configuration, voice testing, and observability

Planned sequence:

1. Product journey and public contracts.
2. Versioned server model and runtime resolution.
3. Agent configuration interface.
4. Isolated ephemeral voice test sessions.
5. Session history and usage observability.
6. End-to-end validation and documentation.

Depends on: Server adapter registry, session coordinator and administration contracts, Core and Client Media, at least one production-ready voice path.
Out of scope: a provider playground, a visual pipeline builder, replacing client DevTools.

## Layer 7 — LiveKit realignment

### [#38](https://github.com/borisbob91/owllayer/issues/38) — Realign the LiveKit adapter on provider-neutral foundations

**Blocked intentionally.** No LiveKit implementation issue starts until these gates are validated:

- [ ] AITP compatibility, media, streaming, and tool lifecycle are stable.
- [ ] Core Media consolidation is complete.
- [ ] The provider-neutral Server Runtime and adapter registry are complete.
- [ ] At least one OpenAI or Deepgram path validates the common contracts.
- [ ] Client Media is available for SDK room integration.
- [ ] A fresh audit decides what existing LiveKit code is retained, rewritten, or removed.
- [ ] The maintainer explicitly approves resuming implementation.

LiveKit stays an optional package: it never becomes a dependency of Core or Server, and telephony remains a separate optional backlog.

---

## Roadmap-wide acceptance criteria

From [#31](https://github.com/borisbob91/owllayer/issues/31):

- [ ] Every active domain is represented by a linked epic.
- [ ] Existing governance and migration issues are linked to this roadmap.
- [ ] Each epic documents dependencies, public outcomes, acceptance criteria, and out-of-scope work.
- [ ] Cross-package delivery is decomposed into one-package or one-domain implementation issues.
- [ ] Public issues contain no private implementation plans or sensitive operational information.
- [ ] Epics close only after all required child issues are completed.

## Contributing to the roadmap

- Pick or discuss work on an existing issue before opening a pull request.
- Propose new directions through a feature request; maintainers link accepted work to the relevant epic.
- Never report vulnerabilities in public issues; follow the [Security Policy](./SECURITY.md).
