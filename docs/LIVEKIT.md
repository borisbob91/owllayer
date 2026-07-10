# LiveKit optional runtime

LiveKit is an optional media runtime for DomOS. It can provide WebRTC rooms, realtime audio/video transport, `AgentSession`, provider pipelines and later telephony.

It does not replace the DomOS core:

- `DomOSClient` owns the client tool registry, Shadow Context and `TOOL_RESULT` messages.
- `DomOSServer` owns sessions, API keys, effective tools, HITL and `ToolRouter`.
- ADTP remains the canonical channel for context, tools and tool results.
- `@domos/audio` remains a codec/format utility for PCM/base64, WAV, Opus and MIME detection.
- `@domos/adapter-livekit` owns LiveKit-specific dependencies and provider mappings.

## Current package responsibilities

| Package | Responsibility |
| --- | --- |
| `@domos/adapter-livekit` | LiveKit runtime config, Gemini TTS, Gemini Live, room token service and AgentSession bridge. |
| `@domos/server` | Generic DomOS sessions, bridge snapshots, bridge tool routing and admin dashboard endpoints. It must not import LiveKit directly. |
| `@domos/react` | Optional room hook for the demo/frontend. It does not replace `DomOSClient`. |
| `@domos/audio` | Shared PCM/base64 and format utilities reused by adapters and clients. |

## Environment variables

These values stay server-side:

```env
LIVEKIT_URL=wss://your-livekit-host
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

# Gemini provider for the current adapter implementation.
GOOGLE_API_KEY=
GOOGLE_APPLICATION_CREDENTIALS=
GOOGLE_CLOUD_PROJECT=
GOOGLE_CLOUD_LOCATION=

# Demo token endpoint CORS allowlist, comma-separated.
DOMOS_LIVEKIT_ALLOWED_ORIGINS=https://app.example.com
```

Never expose `LIVEKIT_API_SECRET`, `LIVEKIT_API_KEY`, provider API keys, service-account paths or raw DomOS API keys in client code, dashboard payloads, logs or LiveKit metadata.

## Room tokens

Room tokens are generated server-side through `LiveKitRoomTokenService`.

- default TTL: 300 seconds;
- max TTL: 900 seconds;
- bound to a DomOS session id in metadata/attributes;
- returned payload: token, LiveKit URL, room name, participant identity and expiration timestamp.

For deployed apps, the browser should call a server token endpoint. Changing token TTL or allowed origins should be a server configuration change, not a client rebuild.

## Quotas and origins

The token endpoint must be protected by the same DomOS client authorization policy as the WebSocket session. It must also verify that the authenticated DomOS API key owns the requested session before minting a room token.

Current demo-server behavior:

- localhost Vite origins are allowed by default for development;
- deployed origins are configured with `DOMOS_LIVEKIT_ALLOWED_ORIGINS`;
- unknown browser origins receive `origin_not_allowed`;
- a valid API key for another session receives the same not-found response as an unknown session;
- room/session quotas are deployment policy for now and should be enforced near the token endpoint or the LiveKit room provisioner before broad production rollout.

## AgentSession bridge

A LiveKit tool call must return to the DomOS pipeline:

1. `AgentSession` requests a tool.
2. `DomOSLiveKitAgentBridge` converts it to a DomOS tool call.
3. `DomOSServer` routes it through `ToolRouter` and HITL.
4. If the tool is client-side, `DomOSClient` executes it in the mounted UI context.
5. The result returns through DomOS, then back to the provider session.

This keeps the component mount/unmount lifecycle intact. When a component disappears, its tools are removed from `DomOSClient`, the server receives a `CONTEXT_UPDATE`, and the bridge must no longer expose that tool as available for the active session.

## Dashboard

The DomOS dashboard is an operations dashboard, not a LiveKit lab.

It can show:

- whether the bridge is enabled;
- active rooms and linked DomOS sessions;
- agent participant identity;
- provider/model/voice information when available;
- recent safe bridge events;
- redacted errors.

It must not show room tokens, API keys, raw provider errors, room handles, Shadow Context payloads, tool arguments or tool results.

## Known limitations

- Gemini is the first implemented provider through LiveKit; the architecture remains provider-neutral.
- Gemini Live through LiveKit Agents 1.5 does not currently support mid-session tool updates. DomOS records that update as deferred until the next session.
- Telephony/SIP is not implemented yet.
- `@domos/ui` currently has build/type validation for dashboard code, but no dedicated dashboard component test harness.

## LK-08 planning contract

Deployment, observability, quotas, retention and future telephony boundaries are documented in [`docs/livekit/telephony-deploy-observability.md`](./livekit/telephony-deploy-observability.md).

## Provider-neutral extension point

LiveKit can host providers other than Gemini, but DomOS should still receive the same `LiveAdapter`, `TTSService` and bridge contracts.

```ts
import type { LiveAdapter, TTSService } from '@domos/core';

export function registerMediaRuntime(options: {
  live?: LiveAdapter;
  tts?: TTSService;
}) {
  return options;
}
```

A future provider should implement the DomOS contracts first, then map its LiveKit model/session events to DomOS callbacks. It should not introduce a second tool execution path.
