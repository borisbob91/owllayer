# @domos/adapter-livekit

Package optionnel pour preparer l'integration LiveKit dans DomOS.

LK-01 ne lance pas encore de room, AgentSession, TTS, STT ou adapter live. Le package pose seulement la frontiere technique :

- configuration serveur LiveKit ;
- types provider-neutres ;
- erreurs communes ;
- reexport des contrats DomOS existants depuis `@domos/core`.

## Variables serveur

Ces valeurs doivent rester cote serveur :

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `GOOGLE_API_KEY`
- `GOOGLE_APPLICATION_CREDENTIALS`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`

Ne jamais exposer `LIVEKIT_API_SECRET`, `LIVEKIT_API_KEY` ou `GOOGLE_API_KEY` au client ou au dashboard. Les tokens de room seront generes cote serveur dans un sprint ulterieur.

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

Les implementations LiveAdapter, bridge AgentSession, rooms frontend, endpoints dashboard et telephony restent hors scope LK-02.

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

Le bridge AgentSession, les rooms, les tokens frontend, le dashboard et la
telephony restent hors scope LK-03.
