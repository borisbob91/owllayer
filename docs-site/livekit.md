# LiveKit Integration

LiveKit is an **optional** voice transport for the OwlLayer AI Runtime. It adds WebRTC rooms and realtime media. It does **not** replace `DomOSServer`, `DomOSClient`, AITP, Shadow Context, or tools.

In this guide, **AITP** means *Agent-to-Interface Transfer Protocol*. **ADTP** is the legacy compatibility name retained for the existing wire contract and runtime identifiers.

---

## Where does LiveKit plug in? (the short answer)

This is the question everyone asks. The answer: **the exact same `live` slot as every other live adapter.**

`GeminiLiveAdapter` (from `@domos/adapter-livekit`) implements the same `LiveAdapter` interface as `GoogleLiveAdapter`. So switching to LiveKit is **one line**:

```ts
// Native Gemini audio (no LiveKit):
live: new GoogleLiveAdapter({ ... })

// Gemini audio via LiveKit — same slot:
live: new GeminiLiveAdapter({ ... })
```

The server only sees a `LiveAdapter`. It has no idea LiveKit is behind it. There is no separate "LiveKit mode" to turn on.

> A complete, runnable example lives in [`apps/demo-server-livekit`](https://github.com/borisbob91/domos/tree/master/apps/demo-server-livekit).

---

## Two pieces to wire

LiveKit needs two things, and it helps to keep them separate in your head:

| Piece | What it is | Where it goes |
|---|---|---|
| **(A) Voice brain** | `GeminiLiveAdapter` | `new DomOSServer({ live })` |
| **(B) Room transport** | a token endpoint | an HTTP route on your server |

(A) is identical to any other live adapter. (B) is the only LiveKit-specific extra, because the audio flows through a WebRTC **room** the browser must join with a signed token.

---

## Step 1 — Install

```bash
pnpm add @domos/adapter-livekit
```

You also need a LiveKit server reachable at `LIVEKIT_URL` (self-hosted, see `deploy/`, or LiveKit Cloud).

## Step 2 — Server env (server-side only)

```env
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=change_me
GOOGLE_API_KEY=your_gemini_key
DOMOS_LIVEKIT_ALLOWED_ORIGINS=http://localhost:5173
```

`LIVEKIT_API_SECRET` never reaches the browser.

## Step 3 — (A) Plug the adapter into `live`

```ts
import { DomOSServer } from '@domos/server';
import { GoogleAdapter } from '@domos/adapter-google';
import { GeminiLiveAdapter } from '@domos/adapter-livekit';

const server = new DomOSServer({
  llm: new GoogleAdapter({ apiKey: process.env.GOOGLE_API_KEY!, model: 'gemini-2.5-flash' }),
  live: new GeminiLiveAdapter({          // <-- LiveKit is wired HERE
    apiKey: process.env.GOOGLE_API_KEY!,
    voice: 'Puck',
  }),
  port: 3002,
  path: '/domos',
});
```

That's the entire "how do I connect LiveKit to the server" answer.

## Step 4 — (B) Expose the room token endpoint

```ts
import { createLiveKitRoomToken, resolveLiveKitRuntimeConfig } from '@domos/adapter-livekit';

const config = resolveLiveKitRuntimeConfig({}, process.env);

// POST /domos/livekit/token  { sessionId, apiKey }
const snapshot = server.getAgentBridgeSessionSnapshot(sessionId);
if (!snapshot || !server.isAgentBridgeSessionOwnedByApiKey(sessionId, apiKey)) {
  return reply(404, { error: 'domos_session_not_found' });
}

const token = await createLiveKitRoomToken(
  { sessionId: snapshot.sessionId, roomName: `domos-${snapshot.sessionId}`, ttlSeconds: 300 },
  { config }
);
return reply(200, token);
```

The endpoint must verify the OwlLayer AI API key, verify the session belongs to that key, apply a CORS allowlist, and cap the TTL.

## Step 5 — React client joins the room

```tsx
import { DomOSProvider, useAgent, useDomOSLiveKitRoom } from '@domos/react';

function VoiceButton() {
  const { sessionId } = useAgent();
  const room = useDomOSLiveKitRoom({
    tokenEndpoint: 'http://localhost:3002/domos/livekit/token',
    apiKey: import.meta.env.VITE_DOMOS_API_KEY,
    microphoneEnabledOnConnect: true,
  });

  if (!sessionId) return null;
  return (
    <button onClick={() => room.isConnected ? room.disconnect() : room.connect()}>
      {room.isConnected ? 'Leave' : 'Join room'}
    </button>
  );
}
```

---

## Full flow

1. Browser connects to the OwlLayer AI Runtime over AITP (with the legacy ADTP wire compatibility) and gets a `sessionId`.
2. Browser asks `/domos/livekit/token` for a room token.
3. Server verifies session ownership, signs a short-lived token.
4. Browser joins the LiveKit room with that token.
5. Voice flows through LiveKit; tool calls still route through the OwlLayer AI Runtime (Shadow Context, HITL, ToolRouter) exactly as in text mode.

---

## Optional: Gemini TTS

To use Gemini TTS in the OwlLayer AI Runtime pipeline (decoupled STT → LLM → TTS instead of native live):

```ts
import { GeminiTTSService } from '@domos/adapter-livekit';

new DomOSServer({ llm, tts: new GeminiTTSService({ apiKey, defaultVoice: 'Kore' }) });
```

## Optional: AgentSession bridge

For advanced `AgentSession` usage, `DomOSLiveKitAgentBridge` routes LiveKit tool calls back into the OwlLayer AI Runtime (it never executes tools itself).

---

## Vertex AI

`GeminiLiveAdapter` also supports Vertex AI instead of an API key:

```ts
new GeminiLiveAdapter({ vertexai: true, project: 'my-gcp-project', location: 'us-central1', voice: 'Puck' })
```

---

## Current limitations

- Gemini is the implemented LiveKit provider today; the design stays provider-agnostic for others.
- SIP / telephony is **not** implemented yet.
- LiveKit and provider secrets always stay server-side.
