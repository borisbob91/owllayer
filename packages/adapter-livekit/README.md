# @domos/adapter-livekit

Package optionnel pour connecter DomOS a LiveKit sans remplacer le coeur DomOS.

Le package porte les integrations LiveKit cote serveur :

- configuration serveur LiveKit et redaction de secrets ;
- `GeminiTTSService` conforme au contrat `TTSService` de `@domos/core` ;
- `GeminiLiveAdapter` conforme au contrat `LiveAdapter` de `@domos/core` ;
- generation de tokens de room courts via `LiveKitRoomTokenService` ;
- bridge `DomOSLiveKitAgentBridge` pour relier une `AgentSession` au pipeline DomOS.

`@domos/server` ne depend pas directement de LiveKit. Les applications branchent ce package explicitement quand elles veulent activer le runtime media.

## Variables serveur

Ces valeurs doivent rester cote serveur :

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `GOOGLE_API_KEY`
- `GOOGLE_APPLICATION_CREDENTIALS`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`

Ne jamais exposer `LIVEKIT_API_SECRET`, `LIVEKIT_API_KEY` ou `GOOGLE_API_KEY` au client ou au dashboard. Les tokens de room sont generes cote serveur et doivent rester courts.

## Usage foundation

```ts
import { resolveLiveKitRuntimeConfig } from '@domos/adapter-livekit';

const config = resolveLiveKitRuntimeConfig({}, process.env);
```

Utiliser `redactLiveKitRuntimeConfig(config)` avant tout log ou affichage admin. Cette forme masque les secrets LiveKit, `GOOGLE_API_KEY` et le chemin `GOOGLE_APPLICATION_CREDENTIALS`.

## Gemini TTS

```ts
import { GeminiTTSService } from '@domos/adapter-livekit';

const tts = new GeminiTTSService({
  apiKey: process.env.GOOGLE_API_KEY,
  defaultVoice: 'Kore',
});

const audio = await tts.synthesize({
  text: 'Bonjour, je suis DomOS.',
  voice: 'Zephyr',
});
```

`GeminiTTSService` retourne du PCM 16-bit base64 avec un MIME type `audio/pcm;rate=24000`. Les options `speed`, `pitch`, `volume` et `outputFormat` de `TTSConfig` sont conservees dans les metadonnees mais ne sont pas forcees si le provider ne les supporte pas.

Le service TTS ne cree pas de room et n'execute aucun tool. Il transforme uniquement la sortie provider en `TTSResult` DomOS.

## Gemini Live Adapter

```ts
import { GeminiLiveAdapter } from '@domos/adapter-livekit';

const live = new GeminiLiveAdapter({
  apiKey: process.env.GOOGLE_API_KEY,
  voice: 'Puck',
});

const session = await live.createSession({
  systemPrompt: 'Tu es l agent vocal DomOS.',
  tools: effectiveTools,
  onAudioOutput: (audioBase64, mimeType) => {
    // Relay audio through the DomOS transport.
  },
  onToolCall: (toolCall) => {
    // Execute through DomOS ADTP/ToolRouter, then call sendToolResponse().
  },
  onToolsUpdateStatus: (event) => {
    // Observe provider limitations such as deferred mid-session tool updates.
  },
});
```

`GeminiLiveAdapter` expose le contrat `LiveAdapter` existant de `@domos/core`.
Les tool calls LiveKit sont convertis en `LLMToolCall` et remontent via
`onToolCall`; l adapter ne les execute pas localement. Le resultat doit revenir
avec `session.sendToolResponse(callId, name, result)` pour garder le cycle
DomOS : composant monte -> tool expose -> LLM demande -> DomOS execute -> resultat
renvoye au provider. Quand le modele le permet, `sendToolResponse()` declenche
ensuite la reprise de generation LiveKit.

Audio attendu en entree : PCM 16-bit base64, par defaut `audio/pcm;rate=16000`.
Le decodage base64 et le MIME PCM reutilisent `@domos/audio`; l adapter ajoute
seulement la validation LiveKit-specifique et la conversion vers `AudioFrame`.
Audio renvoye : PCM 16-bit base64 avec un MIME `audio/pcm;rate=<sampleRate>`.

Limitation LiveKit/Gemini actuelle : `midSessionToolsUpdate` est false dans
LiveKit Agents 1.5 pour Gemini Live. `session.updateTools()` enregistre donc
`deferred_until_next_session` sur la session courante; les changements de tools
doivent etre appliques par une nouvelle session tant que le provider ne supporte
pas l update mid-session. Pour observer ce cas sans downcast, passer
`onToolsUpdateStatus` dans la config de session adapter-specifique.

## Room tokens

```ts
import { createLiveKitRoomToken, resolveLiveKitRuntimeConfig } from '@domos/adapter-livekit';

const config = resolveLiveKitRuntimeConfig({}, process.env);

const token = await createLiveKitRoomToken(
  {
    sessionId: 'sess_123',
    ttlSeconds: 300,
  },
  { config }
);
```

`LiveKitRoomTokenService` lie le token a une session DomOS, limite le TTL a 300 secondes par defaut et 900 secondes maximum, et retourne seulement :

- `token` ;
- `livekitUrl` ;
- `roomName` ;
- `participantIdentity` ;
- `expiresAt`.

La cle API DomOS, `LIVEKIT_API_SECRET`, `LIVEKIT_API_KEY` et les secrets provider ne doivent pas etre places dans les metadata LiveKit.

## AgentSession bridge

`DomOSLiveKitAgentBridge` expose les tools DomOS a une `AgentSession`, mais ne les execute pas dans LiveKit. Un tool call LiveKit revient vers DomOS :

1. `AgentSession` demande un tool.
2. Le bridge convertit la demande en appel DomOS.
3. `DomOSServer` route vers le `ToolRouter`.
4. Si le tool est client, `DomOSClient` l'execute dans l'interface active.
5. Le resultat revient au bridge puis au provider.

Ce trajet preserve le Neural-DOM Binding : les tools montes/demontes restent synchronises par ADTP et le Shadow Context reste la source de verite.

## Dashboard

Le dashboard DomOS peut afficher l'etat operationnel du bridge via les endpoints admin generiques :

- `GET /admin/bridge` ;
- `GET /admin/bridge/events` ;
- `GET /admin/status` avec `bridge`.

Ces payloads sont des vues whitelistees. Ils ne doivent pas contenir de room handle, token, API key, contexte brut, args de tools ou resultats de tools.

## Limites connues

- LiveKit est optionnel et provider-neutre ; Gemini est l'implementation actuelle fournie par ce package.
- Gemini Live via LiveKit Agents 1.5 ne supporte pas l'update de tools mid-session. `updateTools()` signale donc `deferred_until_next_session`.
- Le package ne fournit pas encore de telephonie/SIP.
- Le frontend React demo utilise `livekit-client` pour rejoindre une room, mais `DomOSClient` reste responsable d'ADTP, du Shadow Context et des `TOOL_RESULT`.
