# LiveKit Integration

LiveKit is an optional adapter for adding WebRTC rooms, realtime media, and `AgentSession` to DomOS.

The key point: you still use DomOS as the agentic server. LiveKit adds the media transport and runtime provider, but does not replace `DomOSServer`, `DomOSClient`, ADTP, Shadow Context, or tools.

---

## Installation

Server side:

```bash
pnpm add @domos/adapter-livekit
```

React client (if the browser needs to join a LiveKit room):

```bash
pnpm add livekit-client
```

---

## Server Environment Variables

```env
LIVEKIT_URL=wss://your-livekit-host
LIVEKIT_API_KEY=lk_api_key
LIVEKIT_API_SECRET=lk_api_secret

GOOGLE_API_KEY=google_api_key

DOMOS_API_KEY=pk_demo_local
DOMOS_LIVEKIT_ALLOWED_ORIGINS=http://localhost:5173,https://app.example.com
```

These variables stay server-side. The client only receives a short-lived room token.

---

## Server Setup with GeminiLiveAdapter

`GeminiLiveAdapter` plugs into the `live` option, alongside existing adapters.

```ts
import 'dotenv/config';
import { DomOSServer } from '@domos/server';
import { GoogleAdapter } from '@domos/adapter-google';
import { GeminiLiveAdapter } from '@domos/adapter-livekit';

const server = new DomOSServer({
  llm: new GoogleAdapter({
    apiKey: process.env.GOOGLE_API_KEY!,
    model: 'gemini-2.5-flash',
    systemPrompt: 'You are a DomOS assistant.',
  }),

  live: new GeminiLiveAdapter({
    apiKey: process.env.GOOGLE_API_KEY!,
    voice: 'Puck',
    systemPrompt: 'You are a DomOS voice assistant. Keep answers short.',
  }),

  port: 3001,
  path: '/domos',
  client: { requireApiKey: true },
});

server.addApiKey(process.env.DOMOS_API_KEY!);
server.listen();
```

In this mode, DomOS continues to manage sessions, API keys, tools, HITL, and tool results.

---

## Gemini TTS via LiveKit

To use Gemini TTS in the DomOS pipeline:

```ts
import { GeminiTTSService } from '@domos/adapter-livekit';

const server = new DomOSServer({
  llm,
  tts: new GeminiTTSService({
    apiKey: process.env.GOOGLE_API_KEY!,
    defaultVoice: 'Kore',
  }),
  port: 3001,
  path: '/domos',
});
```

This service does not create a room. It respects the DomOS `TTSService` contract.

---

## Token Endpoint (Server)

The client calls a server endpoint to get a room token. It never receives `LIVEKIT_API_SECRET`.

```ts
import {
  createLiveKitRoomToken,
  resolveLiveKitRuntimeConfig,
} from '@domos/adapter-livekit';

const snapshot = await server.getAgentBridgeSessionSnapshot(sessionId);
if (!snapshot || !server.isAgentBridgeSessionOwnedByApiKey(sessionId, apiKey)) {
  return reply(404, { error: 'domos_session_not_found' });
}

const token = await createLiveKitRoomToken(
  {
    sessionId: snapshot.sessionId,
    roomName: `domos-${snapshot.sessionId}`,
    ttlSeconds: 300,
  },
  { config: resolveLiveKitRuntimeConfig({}, process.env) }
);

return reply(200, token);
```

The endpoint must:

- Verify the DomOS API key
- Verify the session belongs to that API key
- Apply a CORS allowlist
- Limit the TTL
- Return only `token`, `livekitUrl`, `roomName`, `participantIdentity`, `expiresAt`

---

## React Client

`useDomOSLiveKitRoom` works inside an app already connected with `DomOSProvider`.

```tsx
import { DomOSProvider, useAgent, useDomOSLiveKitRoom } from '@domos/react';

function VoiceRoomButton() {
  const { sessionId, agentState } = useAgent();
  const room = useDomOSLiveKitRoom({
    tokenEndpoint: 'http://localhost:3001/domos/livekit/token',
    apiKey: import.meta.env.VITE_DOMOS_API_KEY,
    autoConnect: false,
    disconnectOnUnmount: true,
    disconnectOnDomOSDisconnect: true,
    microphoneEnabledOnConnect: true,
  });

  if (!sessionId || agentState === 'disconnected') return null;

  return (
    <button onClick={() => room.isConnected ? room.disconnect() : void room.connect()}>
      {room.isConnected ? 'Leave Room' : 'Join Room'}
    </button>
  );
}

export function App() {
  return (
    <DomOSProvider
      endpoint="ws://localhost:3001/domos"
      apiKey={import.meta.env.VITE_DOMOS_API_KEY}
    >
      <VoiceRoomButton />
    </DomOSProvider>
  );
}
```

The hook uses the current DomOS `sessionId` to request a token, then connects `livekit-client`.

---

## AgentSession Bridge

For advanced usage with `AgentSession`, use `DomOSLiveKitAgentBridge`:

```ts
import { DomOSLiveKitAgentBridge } from '@domos/adapter-livekit';

const bridge = new DomOSLiveKitAgentBridge({
  toolExecutor: (toolCall, context) =>
    server.routeAgentBridgeToolCall(context.sessionId, toolCall),
});

const snapshot = await server.getAgentBridgeSessionSnapshot(sessionId);
if (snapshot) {
  await bridge.start(snapshot);
}
```

The bridge does not execute tools in place of DomOS. It routes the call back to `DomOSServer`, which then routes to a server tool or to the client via ADTP.

---

## Reference Files

- `packages/adapter-livekit/README.md`: Full adapter documentation
- `apps/demo-server/src/server.ts`: Demo server with token endpoint
- `apps/demo-server/src/livekitTokenEndpoint.ts`: API key/session verification before LiveKit token
- `apps/demo/src/components/LiveKitRoomButton.tsx`: React button to join/leave a room
- `packages/react/src/livekit/useDomOSLiveKitRoom.ts`: React hook exposed by `@domos/react`

---

## Current Limitations

- Gemini is the implemented LiveKit provider today
- Architecture remains open to other LiveKit providers
- SIP telephony is not yet implemented
- LiveKit and provider secrets always stay server-side
