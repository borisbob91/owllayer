# Rapport LiveKit - LK-07 release readiness

Date: 2026-07-10
Branch: `feat/feature-35-livekit-optional-runtime`

## Verdict

LiveKit est integre comme runtime optionnel et respecte l'orientation DomOS : il transporte le media et peut orchestrer une `AgentSession`, mais DomOS garde ADTP, Shadow Context, ToolRouter/HITL, DomOSClient et DomOSServer comme source de verite.

Le projet est proche d'un etat publiable pour une preview technique, a condition de garder les limites connues explicites.

## Architecture validee

- `packages/adapter-livekit` contient les dependances LiveKit, Gemini TTS, Gemini Live, tokens room et bridge AgentSession.
- `packages/server` expose des hooks generiques de snapshot/routage bridge et des endpoints admin rediges. Il ne depend pas de LiveKit.
- `packages/react` expose un hook de room optionnel pour la demo sans remplacer `DomOSClient`.
- `packages/audio` reste une brique de codec/format audio et ne porte aucun secret.
- `packages/ui` affiche l'etat operationnel du bridge sans executer de tools depuis le dashboard.

## Points critiques

- 🔴 `apps/demo-server/src/server.ts` avait un CORS trop permissif pour `/domos/livekit/token` : l'origin etait reflete automatiquement. Action LK-07: durci via `DOMOS_LIVEKIT_ALLOWED_ORIGINS`, avec localhost Vite autorise par defaut pour le dev, et test couvert dans `LiveKitTokenCors.test.ts`.
- 🔴 Les docs `packages/adapter-livekit/README.md` etaient obsoletes et indiquaient encore que les tokens/bridge/dashboard etaient hors scope. Action LK-07: README realigne sur l'etat actuel.
- 🔴 Toute documentation publique doit continuer a dire que les secrets LiveKit/provider restent serveur-side. Les tokens de room ne sont pas des secrets long-terme, mais ils ne doivent pas etre loggues ni affiches dans le dashboard.

## Warnings

- 🟠 `@domos/ui` n'a pas de harness de tests composants dashboard. La validation dashboard passe aujourd'hui par `AdminAPI.dashboard.test.ts`, `@domos/ui lint` et `@domos/ui build`.
- 🟠 Gemini Live via LiveKit Agents 1.5 ne supporte pas l'update de tools mid-session. DomOS expose l'evenement comme `deferred_until_next_session`.
- 🟠 La telephonie/SIP n'est pas implementee. Elle doit rester LK-08.
- 🟠 `packages/angular/src/lib/services/voice/DomOSVoiceService.ts` utilise `@domos/audio` pour la capture, mais garde encore une logique de decode PCM manuelle pour le playback. `packages/react`, `packages/vue`, `packages/svelte` et `packages/browser` ont aussi des chemins voice qui dupliquent une partie de l'encodage/decodage PCM. Ce n'est pas bloquant pour LK-07, mais c'est une dette client/audio.

## Gates de securite

| Gate | Etat | Evidence |
| --- | --- | --- |
| Pas de secret dans `@domos/server` | OK | `@domos/server` ne doit pas importer `@livekit/*`, `livekit-server-sdk` ou `livekit-client`. |
| Tokens room courts | OK | `LiveKitRoomTokenService`: 300s par defaut, 900s maximum. |
| Token lie a session DomOS/API key | OK | Metadata/attributes incluent `domosSessionId` / `domos.sessionId`; le token endpoint verifie que l'API key authentifiee possede la session avant de signer. |
| Pas d'API key DomOS dans metadata | OK | Demo token endpoint envoie seulement `source` et `domos.demo`; service n'ajoute pas la cle client. |
| Dashboard sans fuite brute | OK | `AdminAPI` whitelist/redacte bridge stats/events et teste les payloads contenant des secrets factices. |
| CORS token endpoint | OK | `DOMOS_LIVEKIT_ALLOWED_ORIGINS`, localhost Vite par defaut, refus `origin_not_allowed`, tests `LiveKitTokenCors.test.ts` et `LiveKitTokenEndpoint.test.ts`. |
| Quotas room/session | Documente | Politique de deploiement a appliquer pres du token endpoint ou du room provisioner avant usage production large. |
| Revocation DomOS ferme room liee | Partiel | Hooks de fermeture existent cote bridge; le comportement de revocation globale doit rester documente tant que non automatise pour tous les deploiements. |

## Actions restantes recommandees

1. Ajouter un harness de tests UI dashboard si `@domos/ui` devient une surface critique de publication.
2. Ajouter un exemple d'integration serveur complet pour brancher `DomOSLiveKitAgentBridge` hors demo.
3. Nettoyer les chemins voice client React/Vue/Svelte/browser/Angular pour reutiliser `@domos/audio` au lieu de decoder ou encoder le PCM manuellement.
4. Formaliser la politique de quotas rooms/sessions par deploiement avant LK-08.
5. Garder `@domos/server` libre de dependances LiveKit.
