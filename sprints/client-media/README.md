# Client media - Plan de sprints

## Domaine

Ce dossier couvre la sélection du transport média, son lifecycle côté client et
le raccordement séquentiel des SDK UI. Il ne définit aucun adapter provider et
ne modifie pas le transport de contrôle ADTP existant.

## Politique produit

```ts
mediaTransport: 'websocket' | 'webrtc' | 'auto'
```

- défaut : `websocket` ;
- `webrtc` : activation explicite ;
- `auto` : WebRTC prioritaire seulement après négociation des capacités, sinon
  WebSocket ;
- fallback : annoncé par ADTP, jamais silencieux au milieu d'un tour ;
- le control plane ADTP reste actif dans tous les cas.

## Architecture

```txt
DomOSClient (ADTP control plane)
        |
        +-- MediaSessionController
              |-- ADTP/WebSocket audio
              `-- WebRTC media adapter
                       |
                 SDK capture/playback
```

Le contrôleur partagé possède la politique, les états, la sélection, les
timeouts, la fermeture et les événements. Chaque SDK garde uniquement ses
primitives de capture, playback et UI idiomatiques.

## Ordre

1. `SPRINT-CMEDIA-00-core-client-runtime.md`
2. `SPRINT-CMEDIA-01-react.md`
3. `SPRINT-CMEDIA-02-angular.md`
4. `SPRINT-CMEDIA-03-vue.md`
5. `SPRINT-CMEDIA-04-svelte.md`
6. `SPRINT-CMEDIA-05-browser.md`
7. `SPRINT-CMEDIA-06-devtools-docs-demo.md`

Un seul SDK est modifié par sprint, conformément aux domaines du monorepo.

