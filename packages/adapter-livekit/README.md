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
