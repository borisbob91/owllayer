# Utiliser LiveKit avec DomOS

LiveKit est un adapter optionnel pour ajouter des rooms WebRTC, du realtime media et des `AgentSession` a DomOS.

Le point important : vous utilisez toujours DomOS comme serveur agentique. LiveKit ajoute le transport media et le runtime provider, mais ne remplace pas `DomOSServer`, `DomOSClient`, ADTP, le Shadow Context ou les tools.

## Installation

Cote serveur :

```bash
pnpm add @domos/adapter-livekit
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

DOMOS_API_KEY=pk_demo_local
DOMOS_LIVEKIT_ALLOWED_ORIGINS=http://localhost:5173,https://app.example.com
```

Ces variables restent cote serveur. Le client recoit seulement un token de room court.

## Brancher l'adapter live dans DomOSServer

`GeminiLiveAdapter` se branche dans l'option `live`, comme les adapters live existants.

```ts
import 'dotenv/config';
import { DomOSServer } from '@domos/server';
import { GoogleAdapter } from '@domos/adapter-google';
import { GeminiLiveAdapter } from '@domos/adapter-livekit';

const server = new DomOSServer({
  llm: new GoogleAdapter({
    apiKey: process.env.GOOGLE_API_KEY!,
    model: 'gemini-2.5-flash',
    systemPrompt: 'Tu es un assistant DomOS.',
  }),

  live: new GeminiLiveAdapter({
    apiKey: process.env.GOOGLE_API_KEY!,
    voice: 'Puck',
    systemPrompt: 'Tu es un assistant vocal DomOS. Reponds court.',
  }),

  port: 3001,
  path: '/domos',
  client: {
    requireApiKey: true,
  },
});

server.addApiKey(process.env.DOMOS_API_KEY!);
server.listen();
```

Dans ce mode, DomOS continue de gerer les sessions, les API keys, les tools, HITL et les resultats de tools.

## Ajouter le TTS Gemini via LiveKit

Si vous voulez utiliser le TTS Gemini dans le pipeline DomOS :

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

Ce service ne cree pas de room. Il respecte le contrat `TTSService` de DomOS.

## Donner une room LiveKit au client

Le client React appelle un endpoint serveur pour obtenir un token. Il ne recoit jamais `LIVEKIT_API_SECRET`.

### Endpoint token serveur

Le repo contient un exemple complet dans `apps/demo-server/src/livekitTokenEndpoint.ts`. Le principe minimal :

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

L'endpoint doit :

- verifier l'API key DomOS ;
- verifier que la session appartient a cette API key ;
- appliquer une allowlist CORS ;
- limiter le TTL ;
- retourner seulement `token`, `livekitUrl`, `roomName`, `participantIdentity`, `expiresAt`.

## Client React

`useDomOSLiveKitRoom` s'utilise dans une app deja connectee avec `DomOSProvider`.

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
    <DomOSProvider
      endpoint="ws://localhost:3001/domos"
      apiKey={import.meta.env.VITE_DOMOS_API_KEY}
    >
      <VoiceRoomButton />
    </DomOSProvider>
  );
}
```

Le hook utilise le `sessionId` DomOS courant pour demander un token, puis connecte `livekit-client`.

## Bridge AgentSession

Pour un usage avance avec `AgentSession`, utilisez `DomOSLiveKitAgentBridge`.

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

Le bridge n'execute pas les tools a la place de DomOS. Il ramene l'appel vers `DomOSServer`, qui route ensuite vers un server tool ou vers le client via ADTP.

## Fichiers de reference

- `packages/adapter-livekit/README.md` : usage complet de l'adapter.
- `apps/demo-server/src/server.ts` : serveur demo avec endpoint token.
- `apps/demo-server/src/livekitTokenEndpoint.ts` : verification API key/session avant token LiveKit.
- `apps/demo/src/components/LiveKitRoomButton.tsx` : bouton React pour rejoindre/quitter une room.
- `packages/react/src/livekit/useDomOSLiveKitRoom.ts` : hook React expose par `@domos/react`.

## Limites actuelles

- Gemini est le provider LiveKit implemente aujourd'hui.
- L'architecture reste ouverte a d'autres providers LiveKit.
- La telephonie/SIP n'est pas implementee.
- Les secrets LiveKit et provider restent toujours cote serveur.
