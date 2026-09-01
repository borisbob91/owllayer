# @owllayer/adapter-livekit

Adapter optionnel pour utiliser LiveKit avec OwlLayer.

Cette doc repond a la question principale : comment brancher l'adapter LiveKit dans une application OwlLayer existante.

## Ce que fournit le package

`@owllayer/adapter-livekit` fournit quatre briques serveur :

- `GeminiLiveAdapter` : adapter `live` pour `OwlLayerServer`, compatible avec le contrat `LiveAdapter` de `@owllayer/core`.
- `GeminiTTSService` : service `tts` compatible avec le contrat `TTSService` de `@owllayer/core`.
- `LiveKitRoomTokenService` / `createLiveKitRoomToken` : generation de tokens de room LiveKit cote serveur.
- `OwlLayerLiveKitAgentBridge` : bridge optionnel pour relier une `AgentSession` LiveKit au pipeline tools de OwlLayer.

LiveKit reste optionnel. `@owllayer/server` ne l'importe pas directement. Votre application importe cet adapter uniquement quand elle veut activer LiveKit.

## Installation

```bash
pnpm add @owllayer/adapter-livekit
```

Pour le client React qui rejoint une room LiveKit :

```bash
pnpm add livekit-client
```

`livekit-client` est un peer dependency optionnel de `@owllayer/react`.

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
OWLLAYER_LIVEKIT_ALLOWED_ORIGINS=http://localhost:5173,https://app.example.com
```

Ne placez jamais `LIVEKIT_API_SECRET`, `LIVEKIT_API_KEY` ou `GOOGLE_API_KEY` dans le frontend. Le navigateur recoit seulement un token de room court genere par votre serveur.

## Usage 1 - Brancher Gemini Live via LiveKit dans OwlLayerServer

`GeminiLiveAdapter` s'utilise comme les autres adapters live (`GoogleLiveAdapter`, `OpenAILiveAdapter`) : il se passe dans l'option `live` du serveur.

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
  console.log('OwlLayer ready on http://localhost:3001');
});
```

Dans ce mode, OwlLayer continue de gerer :

- les sessions ;
- les API keys ;
- les server tools ;
- les client tools exposes par les SDK frontend ;
- HITL ;
- les `TOOL_CALL` / `TOOL_RESULT`.

L'adapter LiveKit traduit seulement les evenements provider vers le contrat `LiveAdapter` de OwlLayer.

## Usage 2 - Brancher Gemini TTS via LiveKit

Si vous voulez uniquement utiliser le TTS Gemini via LiveKit, passez `GeminiTTSService` dans `tts`.

```ts
import { OwlLayerServer } from '@owllayer/server';
import { GoogleAdapter } from '@owllayer/adapter-google';
import { GeminiTTSService } from '@owllayer/adapter-livekit';

const server = new OwlLayerServer({
  llm: new GoogleAdapter({
    apiKey: process.env.GOOGLE_API_KEY!,
    model: 'gemini-2.5-flash',
  }),
  tts: new GeminiTTSService({
    apiKey: process.env.GOOGLE_API_KEY!,
    defaultVoice: 'Kore',
  }),
  port: 3001,
  path: '/owllayer',
});
```

Ce mode ne cree pas de room LiveKit. Il transforme du texte en audio et laisse OwlLayer transporter la reponse.

## Usage 3 - Donner une room LiveKit au client React

Le client ne doit pas connaitre les secrets LiveKit. Il appelle un endpoint serveur qui verifie la session OwlLayer puis genere un token.

### Endpoint token cote serveur

Le demo-server fournit un exemple complet avec `createLiveKitTokenRequestHandler`.

```ts
import { createServer } from 'http';
import { OwlLayerServer } from '@owllayer/server';
import {
  createLiveKitRoomToken,
  isLiveKitServerEnvConfigured,
  resolveLiveKitRuntimeConfig,
} from '@owllayer/adapter-livekit';

const httpServer = createServer();
const server = new OwlLayerServer({
  llm,
  server: httpServer,
  path: '/owllayer',
  client: { requireApiKey: true },
});

httpServer.on('request', async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  if (url.pathname !== '/owllayer/livekit/token') {
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
    res.end(JSON.stringify({ error: 'owllayer_session_not_found' }));
    return;
  }

  const snapshot = await server.getAgentBridgeSessionSnapshot(sessionId);
  if (!snapshot) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'owllayer_session_not_found' }));
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

- verifier l'API key OwlLayer du client ;
- verifier que la session demandee appartient a cette API key ;
- appliquer une allowlist CORS pour vos domaines deployes ;
- limiter le TTL du token ;
- ne jamais mettre de secret dans les metadata LiveKit.

### Client React

Le hook `useOwlLayerLiveKitRoom` se branche dans une app React deja connectee a OwlLayer.

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
    <OwlLayerProvider
      endpoint="ws://localhost:3001/owllayer"
      apiKey={import.meta.env.VITE_OWLLAYER_API_KEY}
    >
      <VoiceRoomButton />
      {/* Vos composants OwlLayer et vos tools React restent inchanges. */}
    </OwlLayerProvider>
  );
}
```

Le hook demande automatiquement un token avec le `sessionId` OwlLayer courant. Il connecte ensuite `livekit-client` avec `livekitUrl` et `token`.

## Usage 4 - Bridge AgentSession LiveKit vers les tools OwlLayer

`OwlLayerLiveKitAgentBridge` sert quand vous utilisez une `AgentSession` LiveKit et voulez que ses tool calls reviennent dans OwlLayer.

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

Le trajet attendu est :

1. `AgentSession` appelle un tool.
2. Le bridge convertit l'appel en `LLMToolCall` OwlLayer.
3. `OwlLayerServer` route l'appel via `ToolRouter` et HITL.
4. Si le tool est cote client, `OwlLayerClient` l'execute dans l'interface montee.
5. Le resultat revient au bridge puis au provider LiveKit.

Cette partie est utile pour les agents LiveKit avances. Pour un usage simple audio/realtime, commencez par `GeminiLiveAdapter` et `useOwlLayerLiveKitRoom`.

## Exemple demo existant

Dans ce repo :

- `apps/demo-server/src/server.ts` montre un serveur OwlLayer avec endpoint `/owllayer/livekit/token`.
- `apps/demo-server/src/livekitTokenEndpoint.ts` montre la verification API key + session avant creation du token.
- `apps/demo-react/src/components/LiveKitRoomButton.tsx` montre le bouton React qui rejoint/quitte la room.

## Limites actuelles

- Gemini est le provider LiveKit implemente aujourd'hui, mais l'architecture reste ouverte a d'autres providers LiveKit.
- La telephonie/SIP n'est pas encore implementee.
- Les updates de tools mid-session dependent du provider LiveKit. Quand ce n'est pas supporte, OwlLayer doit appliquer les nouveaux tools a la prochaine session.
- Le dashboard affiche seulement de l'etat operationnel redige. Il ne doit pas afficher de token, secret, contexte brut, args de tools ou resultats de tools.

---

## License

MIT © OwlLayer

