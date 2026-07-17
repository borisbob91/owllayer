# OpenAI dans DomOS - Plan de livraison

## Finalité

Faire de `@domos/adapter-openai` une intégration de référence, complète mais
provider-neutral du point de vue de DomOS. OpenAI implémente les interfaces du
core ; il ne remplace ni ADTP, ni `DomOSServer`, ni `ToolRouter`, ni le HITL.

## Expérience finale

```ts
const server = new DomOSServer({
  adapter: new OpenAIAdapter({ apiKey: process.env.OPENAI_API_KEY! }),
  live: new OpenAILiveAdapter({
    apiKey: process.env.OPENAI_API_KEY!,
    mediaTransport: 'websocket', // défaut
  }),
});
```

Trois politiques realtime sont prévues :

- `websocket` : média client → ADTP → serveur → OpenAI, mode par défaut ;
- `webrtc` : média direct client/OpenAI, demandé explicitement ;
- `auto` : WebRTC si toutes les capacités sont négociées, sinon WebSocket.

Dans les trois cas, le control plane ADTP reste actif. Les tools, le HITL, le
Shadow Context, les instructions sensibles et la fermeture de session restent
sous autorité DomOS. Aucune clé OpenAI durable n'est envoyée au navigateur.

## État du code constaté

- `OpenAIAdapter` utilise encore Chat Completions et reconstruit les messages
  dans une map locale de tool calls ;
- `OpenAILiveAdapter` vise un modèle preview, envoie le header beta et mappe les
  anciens champs Realtime ;
- le package possède des tests STT/TTS mais pas une couverture équivalente pour
  les adapters texte et live ;
- le WebRTC existant dans core/server transporte ADTP par DataChannel : ce n'est
  pas le chemin média WebRTC OpenAI ;
- les SDK clients ne doivent pas importer de types ou événements OpenAI.

## Ordre obligatoire

1. [`SPRINT-OAI-00-current-state-contract.md`](./SPRINT-OAI-00-current-state-contract.md)
2. [`SPRINT-OAI-01-responses-text-adapter.md`](./SPRINT-OAI-01-responses-text-adapter.md)
3. [`SPRINT-OAI-02-realtime-ga-websocket.md`](./SPRINT-OAI-02-realtime-ga-websocket.md)
4. `../protocol-adtp/SPRINT-ADTP-01-media-negotiation.md`
5. [`SPRINT-OAI-03-webrtc-sideband-media.md`](./SPRINT-OAI-03-webrtc-sideband-media.md)
6. les raccordements génériques prévus dans `../client-media/`
7. [`SPRINT-OAI-04-publication-docs-submission.md`](./SPRINT-OAI-04-publication-docs-submission.md)

Chaque sprint doit être livré, testé, revu et clôturé avant le suivant.

## Références officielles à revalider au début de chaque sprint

- Responses : https://developers.openai.com/api/docs/guides/migrate-to-responses
- Realtime : https://developers.openai.com/api/docs/guides/realtime
- WebSocket : https://developers.openai.com/api/docs/guides/realtime-websocket
- WebRTC : https://developers.openai.com/api/docs/guides/realtime-webrtc
- Sideband : https://developers.openai.com/api/docs/guides/realtime-server-controls
- Référence Realtime : https://platform.openai.com/docs/api-reference/realtime

Les modèles ne sont pas figés dans le plan. Au moment de l'implémentation, le
développeur doit vérifier les aliases GA disponibles et ne jamais remettre un
modèle `preview` comme valeur par défaut.
