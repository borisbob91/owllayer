# Sprint LK-08 progress - Telephony Deploy

Date prepared: 2026-07-10
Branch: `feat/feature-35-livekit-optional-runtime`
Base sprint: `sprints/livekit/SPRINT-LK-08-telephony-deploy.md`
Status: prepared; implementation not started.

## Objective

Prepare the production, telephony, scaling and observability layer for the optional LiveKit runtime.

LK-08 must not implement telephony until its scope is explicitly started. The sprint file itself says: `PS: ne pas implmeter se la feature telephony!`

## Sprint boundary

- Do not replace DomOS ADTP, Shadow Context, ToolRouter/HITL or DomOSClient.
- Do not add LiveKit dependencies to `@domos/server`.
- Do not expose LiveKit/API/provider secrets to the dashboard or client.
- Do not make phone/SIP behavior look delivered before it is implemented and verified.
- Keep `@domos/audio` as codec/format utility only, not a room runtime or bridge owner.

## Package cartography to preserve

- `packages/adapter-livekit`: only package allowed to own LiveKit runtime, SIP/telephony helpers, deployment helpers and provider mappings.
- `packages/server`: generic DomOS sessions, bridge snapshots, bridge tool routing and admin endpoints. No direct LiveKit imports.
- `packages/ui`: operations dashboard. It can show safe room/call/session state, not raw context, tokens or tool payloads.
- `packages/react`: optional LiveKit room client hook for web demo/client usage.
- `packages/audio`: PCM/base64, WAV, Opus and MIME/format utilities reused by adapter/client code.
- `apps/demo-server`: self-host wiring reference for token endpoint, bridge startup and future deploy docs.
- `apps/demo`: browser usage reference for DomOSClient + optional LiveKit room flow.

## Target files from sprint brief

- `packages/adapter-livekit/src/telephony/*`
- `packages/adapter-livekit/src/deploy/*`
- `packages/adapter-livekit/src/observability/*`
- `packages/server/src/admin/AdminAPI.ts`
- `packages/ui/src/dashboard/pages/StatusPage.tsx`
- `packages/ui/src/dashboard/pages/SessionDetailPage.tsx`
- `apps/demo-server/src/server.ts`
- `docs/livekit/telephony.md` or docs-site equivalent

## TODO

- [ ] Decide whether LK-08 is documentation/planning only or starts a minimal non-SIP deploy/observability slice.
- [ ] Define the room/call/session data model without leaking secrets.
- [ ] Define how a phone call creates or attaches to a DomOS session.
- [ ] Define tool exposure rules for sessions without UI clients.
- [ ] Define dashboard fields for rooms/calls/transcripts with redaction rules.
- [ ] Define retention/export policy for transcripts and traces.
- [ ] Define self-host vs LiveKit Cloud deploy differences.
- [ ] Request `code_reviewer_54` once a concrete LK-08 slice is implemented.

## Definition of Done

- [ ] An incoming/outgoing call or room can be linked to a DomOS session, or the gap is explicitly documented.
- [ ] Sessions without UI expose only server tools.
- [ ] Sessions with UI expose mounted client tools and remove them on component unmount.
- [ ] Dashboard shows call/room/session state without secrets.
- [ ] Transcript and trace retention policy is explicit.
- [ ] Self-host and LiveKit Cloud deployment are documented separately.
- [ ] No direct LiveKit imports are introduced in `@domos/server`.

## Next step persisted

Next step: choose the first LK-08 slice. Recommended first slice is planning/docs for deployment and observability contracts, not SIP implementation.
