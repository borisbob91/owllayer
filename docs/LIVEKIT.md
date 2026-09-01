# Utiliser LiveKit avec OwlLayer

LiveKit est un adapter optionnel pour ajouter des rooms WebRTC, du realtime media et des `AgentSession` a OwlLayer.

Le point important : vous utilisez toujours OwlLayer comme serveur agentique. LiveKit ajoute le transport media et le runtime provider, mais ne remplace pas `OwlLayerServer`, `OwlLayerClient`, AITP, le Shadow Context ou les tools.

## Installation

Cote serveur :

```bash
pnpm add @owllayer/adapter-livekit
```

Cote React, si le navigateur doit rejoindre une room LiveKit :

```bash
pnpm add livekit-client
```

## Variables serveur

```env
LIVEKIT_URL=wss://your-livekit-host
LIVEKIT_API_KEY=lk_api_key
LIVEKIT_API_SECRET=lk_api_secret

GOOGLE_API_KEY=google_api_key

OWLLAYER_API_KEY=pk_demo_local
OWLLAYER_LIVEKIT_ALLOWED_ORIGINS=http://localhost:5173,https://app.example.com
```

Ces variables restent cote serveur. Le client recoit seulement un token de room court.

## Brancher l'adapter live dans OwlLayerServer

`GeminiLiveAdapter` se branche dans l'option `live`, comme les adapters live existants.

```ts
import 'dotenv/config';
import { OwlLayerServer } from '@owllayer/server';
import { GoogleAdapter } from '@owllayer/adapter-google';
import { GeminiLiveAdapter } from '@owllayer/adapter-livekit';

const server = new OwlLayerServer({
  llm: new GoogleAdapter({
    apiKey: process.env.GOOGLE_API_KEY!,
    model: 'gemini-2.5-flash',
    systemPrompt: 'Tu es un assistant OwlLayer.',
  }),

  live: new GeminiLiveAdapter({
    apiKey: process.env.GOOGLE_API_KEY!,
    voice: 'Puck',
    systemPrompt: 'Tu es un assistant vocal OwlLayer. Reponds court.',
  }),

  port: 3001,
  path: '/owllayer',
  client: {
    requireApiKey: true,
  },
});

server.addApiKey(process.env.OWLLAYER_API_KEY!);
server.listen();
```

Dans ce mode, OwlLayer continue de gerer les sessions, les API keys, les tools, HITL et les resultats de tools.

## Ajouter le TTS Gemini via LiveKit

Si vous voulez utiliser le TTS Gemini dans le pipeline OwlLayer :

```ts
import { GeminiTTSService } from '@owllayer/adapter-livekit';

const server = new OwlLayerServer({
  llm,
  tts: new GeminiTTSService({
    apiKey: process.env.GOOGLE_API_KEY!,
    defaultVoice: 'Kore',
  }),
  port: 3001,
  path: '/owllayer',
});
```

Ce service ne cree pas de room. Il respecte le contrat `TTSService` de OwlLayer.

## Donner une room LiveKit au client

Le client React appelle un endpoint serveur pour obtenir un token. Il ne recoit jamais `LIVEKIT_API_SECRET`.

### Endpoint token serveur

Le repo contient un exemple complet dans `apps/demo-server/src/livekitTokenEndpoint.ts`. Le principe minimal :

```ts
import {
  createLiveKitRoomToken,
  resolveLiveKitRuntimeConfig,
} from '@owllayer/adapter-livekit';

const snapshot = await server.getAgentBridgeSessionSnapshot(sessionId);
if (!snapshot || !server.isAgentBridgeSessionOwnedByApiKey(sessionId, apiKey)) {
  return reply(404, { error: 'owllayer_session_not_found' });
}

const token = await createLiveKitRoomToken(
  {
    sessionId: snapshot.sessionId,
    roomName: `owllayer-${snapshot.sessionId}`,
    ttlSeconds: 300,
  },
  { config: resolveLiveKitRuntimeConfig({}, process.env) }
);

return reply(200, token);
```

L'endpoint doit :

- verifier l'API key OwlLayer ;
- verifier que la session appartient a cette API key ;
- appliquer une allowlist CORS ;
- limiter le TTL ;
- retourner seulement `token`, `livekitUrl`, `roomName`, `participantIdentity`, `expiresAt`.

## Client React

`useOwlLayerLiveKitRoom` s'utilise dans une app deja connectee avec `OwlLayerProvider`.

```tsx
import { OwlLayerProvider, useAgent, useOwlLayerLiveKitRoom } from '@owllayer/react';

function VoiceRoomButton() {
  const { sessionId, agentState } = useAgent();
  const room = useOwlLayerLiveKitRoom({
    tokenEndpoint: 'http://localhost:3001/owllayer/livekit/token',
    apiKey: import.meta.env.VITE_OWLLAYER_API_KEY,
    autoConnect: false,
    disconnectOnUnmount: true,
    disconnectOnOwlLayerDisconnect: true,
    microphoneEnabledOnConnect: true,
  });

  if (!sessionId || agentState === 'disconnected') {
    return null;
  }

  return (
    <button onClick={() => room.isConnected ? room.disconnect() : void room.connect()}>
      {room.isConnected ? 'Quitter la room' : 'Rejoindre la room'}
    </button>
  );
}

export function App() {
  return (
    <OwlLayerProvider
      endpoint="ws://localhost:3001/owllayer"
      apiKey={import.meta.env.VITE_OWLLAYER_API_KEY}
    >
      <VoiceRoomButton />
    </OwlLayerProvider>
  );
}
```

Le hook utilise le `sessionId` OwlLayer courant pour demander un token, puis connecte `livekit-client`.

## Bridge AgentSession

Pour un usage avance avec `AgentSession`, utilisez `OwlLayerLiveKitAgentBridge`.

```ts
import { OwlLayerLiveKitAgentBridge } from '@owllayer/adapter-livekit';

const bridge = new OwlLayerLiveKitAgentBridge({
  toolExecutor: (toolCall, context) =>
    server.routeAgentBridgeToolCall(context.sessionId, toolCall),
});

const snapshot = await server.getAgentBridgeSessionSnapshot(sessionId);
if (snapshot) {
  await bridge.start(snapshot);
}
```

Le bridge n'execute pas les tools a la place de OwlLayer. Il ramene l'appel vers `OwlLayerServer`, qui route ensuite vers un server tool ou vers le client via AITP.

## Fichiers de reference

- `packages/adapter-livekit/README.md` : usage complet de l'adapter.
- `apps/demo-server/src/server.ts` : serveur demo avec endpoint token.
- `apps/demo-server/src/livekitTokenEndpoint.ts` : verification API key/session avant token LiveKit.
- `apps/demo-react/src/components/LiveKitRoomButton.tsx` : bouton React pour rejoindre/quitter une room.
- `packages/react/src/livekit/useOwlLayerLiveKitRoom.ts` : hook React expose par `@owllayer/react`.

## Limites actuelles

- Gemini est le provider LiveKit implemente aujourd'hui.
- L'architecture reste ouverte a d'autres providers LiveKit.
- La telephonie/SIP n'est pas implementee.
- Les secrets LiveKit et provider restent toujours cote serveur.
