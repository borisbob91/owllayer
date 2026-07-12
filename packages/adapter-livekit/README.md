# @domos/adapter-livekit

Adapter optionnel pour utiliser LiveKit avec DomOS.

Cette doc repond a la question principale : comment brancher l'adapter LiveKit dans une application DomOS existante.

## Ce que fournit le package

`@domos/adapter-livekit` fournit quatre briques serveur :

- `GeminiLiveAdapter` : adapter `live` pour `DomOSServer`, compatible avec le contrat `LiveAdapter` de `@domos/core`.
- `GeminiTTSService` : service `tts` compatible avec le contrat `TTSService` de `@domos/core`.
- `LiveKitRoomTokenService` / `createLiveKitRoomToken` : generation de tokens de room LiveKit cote serveur.
- `DomOSLiveKitAgentBridge` : bridge optionnel pour relier une `AgentSession` LiveKit au pipeline tools de DomOS.

LiveKit reste optionnel. `@domos/server` ne l'importe pas directement. Votre application importe cet adapter uniquement quand elle veut activer LiveKit.

## Installation

```bash
pnpm add @domos/adapter-livekit
```

Pour le client React qui rejoint une room LiveKit :

```bash
pnpm add livekit-client
```

`livekit-client` est un peer dependency optionnel de `@domos/react`.

## Variables serveur

Ces variables restent cote serveur :

```env
LIVEKIT_URL=wss://your-livekit-host
LIVEKIT_API_KEY=lk_api_key
LIVEKIT_API_SECRET=lk_api_secret

# Provider Gemini utilise par l'implementation actuelle.
GOOGLE_API_KEY=google_api_key

# Optionnel si vous utilisez Vertex AI.
GOOGLE_GENAI_USE_VERTEXAI=false
GOOGLE_CLOUD_PROJECT=
GOOGLE_CLOUD_LOCATION=

# Origines autorisees pour l'endpoint token.
DOMOS_LIVEKIT_ALLOWED_ORIGINS=http://localhost:5173,https://app.example.com
```

Ne placez jamais `LIVEKIT_API_SECRET`, `LIVEKIT_API_KEY` ou `GOOGLE_API_KEY` dans le frontend. Le navigateur recoit seulement un token de room court genere par votre serveur.

## Usage 1 - Brancher Gemini Live via LiveKit dans DomOSServer

`GeminiLiveAdapter` s'utilise comme les autres adapters live (`GoogleLiveAdapter`, `OpenAILiveAdapter`) : il se passe dans l'option `live` du serveur.

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

server.tool(
  'get_order_status',
  {
    description: 'Retourne le statut d une commande.',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
      },
      required: ['orderId'],
    },
  },
  async ({ orderId }) => {
    return { orderId, status: 'processing' };
  }
);

server.listen(() => {
  console.log('DomOS ready on http://localhost:3001');
});
```

Dans ce mode, DomOS continue de gerer :

- les sessions ;
- les API keys ;
- les server tools ;
- les client tools exposes par les SDK frontend ;
- HITL ;
- les `TOOL_CALL` / `TOOL_RESULT`.

L'adapter LiveKit traduit seulement les evenements provider vers le contrat `LiveAdapter` de DomOS.

## Usage 2 - Brancher Gemini TTS via LiveKit

Si vous voulez uniquement utiliser le TTS Gemini via LiveKit, passez `GeminiTTSService` dans `tts`.

```ts
import { DomOSServer } from '@domos/server';
import { GoogleAdapter } from '@domos/adapter-google';
import { GeminiTTSService } from '@domos/adapter-livekit';

const server = new DomOSServer({
  llm: new GoogleAdapter({
    apiKey: process.env.GOOGLE_API_KEY!,
    model: 'gemini-2.5-flash',
  }),
  tts: new GeminiTTSService({
    apiKey: process.env.GOOGLE_API_KEY!,
    defaultVoice: 'Kore',
  }),
  port: 3001,
  path: '/domos',
});
```

Ce mode ne cree pas de room LiveKit. Il transforme du texte en audio et laisse DomOS transporter la reponse.

## Usage 3 - Donner une room LiveKit au client React

Le client ne doit pas connaitre les secrets LiveKit. Il appelle un endpoint serveur qui verifie la session DomOS puis genere un token.

### Endpoint token cote serveur

Le demo-server fournit un exemple complet avec `createLiveKitTokenRequestHandler`.

```ts
import { createServer } from 'http';
import { DomOSServer } from '@domos/server';
import {
  createLiveKitRoomToken,
  isLiveKitServerEnvConfigured,
  resolveLiveKitRuntimeConfig,
} from '@domos/adapter-livekit';

const httpServer = createServer();
const server = new DomOSServer({
  llm,
  server: httpServer,
  path: '/domos',
  client: { requireApiKey: true },
});

httpServer.on('request', async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  if (url.pathname !== '/domos/livekit/token') {
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { Allow: 'POST' });
    res.end();
    return;
  }

  if (!isLiveKitServerEnvConfigured(process.env)) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'livekit_not_configured' }));
    return;
  }

  const body = await readJson(req);
  const sessionId = String(body.sessionId ?? '');
  const apiKey = readBearerApiKey(req);

  if (!apiKey || !server.isAgentBridgeSessionOwnedByApiKey(sessionId, apiKey)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'domos_session_not_found' }));
    return;
  }

  const snapshot = await server.getAgentBridgeSessionSnapshot(sessionId);
  if (!snapshot) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'domos_session_not_found' }));
    return;
  }

  const token = await createLiveKitRoomToken(
    {
      sessionId: snapshot.sessionId,
      roomName: body.roomName,
      participantName: body.participantName,
      ttlSeconds: 300,
    },
    { config: resolveLiveKitRuntimeConfig({}, process.env) }
  );

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(token));
});
```

Dans votre application, gardez la meme logique de securite que le demo-server :

- verifier l'API key DomOS du client ;
- verifier que la session demandee appartient a cette API key ;
- appliquer une allowlist CORS pour vos domaines deployes ;
- limiter le TTL du token ;
- ne jamais mettre de secret dans les metadata LiveKit.

### Client React

Le hook `useDomOSLiveKitRoom` se branche dans une app React deja connectee a DomOS.

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
    <button
      type="button"
      disabled={room.status === 'requesting-token' || room.status === 'connecting'}
      onClick={() => room.isConnected ? room.disconnect() : void room.connect()}
    >
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
      {/* Vos composants DomOS et vos tools React restent inchanges. */}
    </DomOSProvider>
  );
}
```

Le hook demande automatiquement un token avec le `sessionId` DomOS courant. Il connecte ensuite `livekit-client` avec `livekitUrl` et `token`.

## Usage 4 - Bridge AgentSession LiveKit vers les tools DomOS

`DomOSLiveKitAgentBridge` sert quand vous utilisez une `AgentSession` LiveKit et voulez que ses tool calls reviennent dans DomOS.

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

Le trajet attendu est :

1. `AgentSession` appelle un tool.
2. Le bridge convertit l'appel en `LLMToolCall` DomOS.
3. `DomOSServer` route l'appel via `ToolRouter` et HITL.
4. Si le tool est cote client, `DomOSClient` l'execute dans l'interface montee.
5. Le resultat revient au bridge puis au provider LiveKit.

Cette partie est utile pour les agents LiveKit avances. Pour un usage simple audio/realtime, commencez par `GeminiLiveAdapter` et `useDomOSLiveKitRoom`.

## Exemple demo existant

Dans ce repo :

- `apps/demo-server/src/server.ts` montre un serveur DomOS avec endpoint `/domos/livekit/token`.
- `apps/demo-server/src/livekitTokenEndpoint.ts` montre la verification API key + session avant creation du token.
- `apps/demo/src/components/LiveKitRoomButton.tsx` montre le bouton React qui rejoint/quitte la room.

## Limites actuelles

- Gemini est le provider LiveKit implemente aujourd'hui, mais l'architecture reste ouverte a d'autres providers LiveKit.
- La telephonie/SIP n'est pas encore implementee.
- Les updates de tools mid-session dependent du provider LiveKit. Quand ce n'est pas supporte, DomOS doit appliquer les nouveaux tools a la prochaine session.
- Le dashboard affiche seulement de l'etat operationnel redige. Il ne doit pas afficher de token, secret, contexte brut, args de tools ou resultats de tools.
