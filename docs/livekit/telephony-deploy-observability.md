# LiveKit deployment, observability and telephony contracts

Date: 2026-07-10
Status: LK-08 planning contract. Telephony/SIP is not implemented.

This document defines the production contract DomOS should keep while extending the optional LiveKit runtime toward deployment, observability and future telephony.

LiveKit remains the media and agent runtime layer. DomOS remains the owner of ADTP, Shadow Context, mounted client tools, server tools, HITL and dashboard policy.

## Current boundary

| Layer | DomOS owner | LiveKit owner |
| --- | --- | --- |
| Browser UI | `DomOSClient`, framework SDKs, mounted tools, Shadow Context | Optional room participant and media tracks |
| Server session | `DomOSServer`, API keys, `ToolRouter`, HITL, bridge snapshots | None directly; `@domos/server` must not import LiveKit |
| Adapter runtime | `@domos/adapter-livekit` | LiveKit config, room tokens, AgentSession bridge, provider mappings |
| Audio utilities | `@domos/audio` | None; codec/format utility only |
| Dashboard | `@domos/ui` + `AdminAPI` safe summaries | No raw room handles, tokens or provider payloads |

## Deployment modes

### LiveKit Cloud

Use LiveKit Cloud when the team wants managed media infrastructure, agent deployment, built-in scaling, logs, log drains, secrets injection and agent observability.

DomOS responsibilities in this mode:

- keep DomOS API keys and WebSocket/ADTP authorization in DomOS;
- generate room tokens from a server endpoint;
- configure allowed origins without rebuilding the client;
- keep provider secrets and LiveKit secrets server-side;
- expose only redacted bridge state to the DomOS dashboard;
- enforce DomOS-specific quotas near the token endpoint or bridge provisioner.

### Self-hosted LiveKit

Use self-hosted LiveKit when the deployment owns the media server and network path.

DomOS responsibilities in this mode:

- keep `LIVEKIT_URL`, `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` in server runtime config;
- document WebRTC networking prerequisites: TLS domain, public endpoint, TURN strategy, UDP/TCP ports and load balancer behavior;
- keep Redis and multi-node LiveKit concerns outside `@domos/server`;
- keep LiveKit process metrics separate from DomOS bridge metrics;
- preserve the same token endpoint and session ownership checks as LiveKit Cloud.

## Agent worker contract

A future production deployment should treat the LiveKit agent worker as a separate runtime boundary:

1. DomOS session is created or resolved.
2. The adapter bridge receives a safe `DomOSBridgeSessionSnapshot`.
3. The LiveKit agent joins a room as an agent participant.
4. Any tool call returns to `DomOSServer.routeAgentBridgeToolCall()`.
5. Client tools execute only through ADTP on the browser client.
6. Bridge events are summarized before reaching `AdminAPI`.

The worker may be deployed on LiveKit Cloud or custom infrastructure. The contract is the same: no raw DomOS API key, no room token, no full Shadow Context payload and no raw tool args/results in dashboard payloads.

## Observability contract

DomOS should classify LiveKit observability data before storing or displaying it.

| Event | Keep | Redact or avoid |
| --- | --- | --- |
| `room.created` | roomName, sessionId, agentIdentity, deployment target | room handle, token, API secret |
| `room.closed` | roomName, sessionId, reason, durationMs | raw provider error |
| `participant.joined` | participant kind, identity hash or safe identity | phone number unless policy allows it |
| `agent.state_changed` | state, sessionId, timestamp | model internal trace payload |
| `tool.requested` | toolName, risk level, sessionId | tool arguments |
| `tool.result` | success/error class, latencyMs | raw result payload |
| `transcript.turn` | role, text if retention policy allows it | payment data, secrets, raw PII without policy |
| `provider.error` | provider, error class, redacted message | stack trace, API key, prompt/context dump |

### Retention policy

Before broad production rollout, define:

- whether transcripts are stored at all;
- retention duration per environment;
- whether audio recordings are enabled;
- who can export transcripts;
- whether users can request deletion;
- whether tool arguments/results are ever persisted;
- how phone numbers are hashed or masked.

Default recommendation: dashboard summaries should be safe by default and transcript/audio retention should be opt-in.

## Quotas and abuse controls

Room tokens are short-lived, but production still needs abuse controls.

Enforce near the token endpoint or room provisioner:

- max rooms per DomOS session;
- max active rooms per API key;
- max token requests per API key and origin;
- max room duration;
- max agent sessions per deployment;
- max observability events per session;
- max transcript/audio retention volume;
- outbound call allowlist and per-tenant call budget before telephony is enabled.

The browser must not decide these limits. They are deployment policy.

## Future telephony contract

Telephony is future work. No SIP trunk, phone-number API, outbound call API or phone participant lifecycle is implemented in LK-08 yet.

When it starts, the DomOS contract should be:

### Inbound call

1. LiveKit SIP trunk and dispatch rule place the caller into a room.
2. The adapter creates or attaches a DomOS session.
3. If no UI client is attached, only server tools are exposed.
4. If a browser UI joins later, its mounted tools become available through the normal `CONTEXT_UPDATE` lifecycle.
5. Call metadata is summarized for the dashboard with phone numbers masked by policy.

### Outbound call

1. A trusted server-side DomOS action requests an outbound call.
2. Backend authorization, quota and destination allowlist checks run before LiveKit SIP participant creation.
3. The call is linked to a DomOS session and room.
4. Tool calls still return through `ToolRouter` and HITL.
5. Dashboard shows safe call state, not SIP credentials or raw phone metadata.

## Dashboard fields

Allowed fields:

- deployment target: `cloud` or `self_hosted`;
- bridge enabled/configured;
- room count and session links;
- agent participant identity;
- call direction and masked call state when telephony exists;
- provider/model/voice names;
- safe recent events;
- redacted error class;
- quotas used vs configured limits.

Forbidden fields:

- `LIVEKIT_API_SECRET`;
- provider API keys;
- room tokens;
- SIP trunk credentials;
- full Shadow Context;
- raw tool arguments or results;
- raw transcript/audio unless explicit retention and access policy is implemented.

## Future file targets

If LK-08 implementation starts later, keep writes scoped:

- `packages/adapter-livekit/src/deploy/**` for deploy config helpers;
- `packages/adapter-livekit/src/observability/**` for event classification and redaction helpers;
- `packages/adapter-livekit/src/telephony/**` only when telephony implementation is explicitly started;
- `packages/server/src/admin/AdminAPI.ts` only for generic safe summaries;
- `packages/ui/src/dashboard/**` only for operational display;
- docs-site pages under `apps/docs-site/src/content/docs/livekit/**`.

Do not add LiveKit imports to `@domos/server`.

## Sources checked

- LiveKit Agents overview: https://docs.livekit.io/agents/
- LiveKit agent deployment overview: https://docs.livekit.io/deploy/agents/
- LiveKit observability overview: https://docs.livekit.io/deploy/observability/
- LiveKit telephony overview: https://docs.livekit.io/telephony/
- LiveKit self-host deployment: https://docs.livekit.io/transport/self-hosting/deployment/
