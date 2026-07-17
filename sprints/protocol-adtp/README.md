# Piste protocole ADTP

## Finalité produit

Cette piste fait évoluer le protocole propriétaire DomOS pour supporter les
sessions vocales streaming, la sélection WebSocket/WebRTC et la synchronisation
du Neural-DOM Binding, sans introduire JSON-RPC ni exposer le vocabulaire d'un
provider dans `@domos/core`.

Le résultat final doit permettre à un client DomOS ancien ou récent de se
connecter à un serveur récent, de négocier uniquement les fonctions communes,
puis d'utiliser le texte, les tools et la voix sans ambiguïté entre :

- le transport de contrôle ADTP (`websocket` ou `webrtc-datachannel`) ;
- le transport média effectif (`websocket` par défaut, `webrtc` sur demande,
  `auto` uniquement sur demande explicite) ;
- la session DomOS, la session média et chaque tour vocal ;
- la révision des tools montés dans l'interface.

## Décisions acquises

- ADTP conserve l'enveloppe `{ id, type, timestamp, payload, meta? }`.
- Aucun champ `jsonrpc`, aucune methode RPC generique et aucune erreur RPC.
- Chaque intention possède un `MessageType`, un payload, une direction, un
  validateur Zod et une factory `Messages.*` explicites.
- Les extensions restent provider-neutral : aucun champ `openai`, `deepgram`,
  `gemini` ou `livekit` dans `packages/core/src/protocol/`.
- Le contrôle ADTP et le plan média sont deux concepts distincts.
- `websocket` est la politique média par défaut ; `webrtc` est explicite ;
  `auto` est opt-in et préfère WebRTC seulement si toutes les capacités le
  permettent, sinon il choisit WebSocket avant l'ouverture du tour.
- `AUDIO_STREAM`, `VOICE_INPUT_END`, `VOICE_INTERRUPT`, `VOICE_STATE_EVENT` et
  le `SYSTEM_EVENT tools_effective` restent acceptés pendant la fenêtre de
  migration.
- Le montage/démontage d'un composant continue de piloter la disponibilité de
  ses tools côté client et côté serveur.

## État réel au 2026-07-17

| Sujet | Source actuelle | Limite constatee |
| --- | --- | --- |
| Version | `packages/core/src/protocol/adtp.constants.ts` | `ADTP_VERSION = '1.0.0'` et égalité stricte dans le serveur |
| Handshake | `HandshakeInitPayload`, `HandshakeAckPayload` | ACK envoyé avant analyse du `HANDSHAKE_INIT`; aucune intersection de capacités |
| Validation | `adtp.validator.ts` | un type inconnu est rejeté; aucune erreur protocolaire structurée |
| Audio | `AUDIO_STREAM` | base64 sans `mediaSessionId`, `turnId`, `streamId` ni `sequence` |
| Média | aucun contrat | `ClientTransport = 'websocket' | 'webrtc'` désigne uniquement le contrôle ADTP |
| Tools | `CONTEXT_UPDATE` + `SYSTEM_EVENT.tools_effective` | aucune révision permettant de prouver quelle surface a produit un tool call |
| Cycle vocal | `VOICE_STATE_EVENT` | trois événements sans identifiant de tour ni état de session média |

## Ordre obligatoire

1. `SPRINT-ADTP-00-compatibility-contract.md`
2. `SPRINT-ADTP-01-media-negotiation.md`
3. `SPRINT-ADTP-02-streaming-turn-contract.md`
4. `SPRINT-ADTP-03-tool-lifecycle-revision.md`
5. `SPRINT-ADTP-04-conformance-migration.md`

Un sprint ne commence que si la DoD du precedent est prouvee. Les adapters ne
doivent pas definir leurs propres variantes de ces contrats.

## Règle de lecture pour l'implémentateur

Chaque document contient : l'intention produit, l'état source vérifié, le flux
attendu, les contrats cibles, les tâches numérotées, la liste exhaustive des
fichiers autorisés, les erreurs, les tests, la compatibilité et la DoD. Un
snippet marqué **contrat cible** est normatif pour le sprint ; un bloc marqué
**décision à valider** ne doit pas être implémenté avant validation du porteur.

## Dépendances sortantes

- `sprints/server-runtime/` implémente la négociation et le runtime de sessions.
- `sprints/core-media/` fournit les primitives audio, sans connaitre ADTP.
- `sprints/client-media/` consomme les contrats dans `DomOSClient` et les SDKs.
- `sprints/openai/` et `sprints/deepgram/` mappent leurs événements vers ADTP.
- `sprints/livekit/patch/` reste en backlog jusqu'à validation des fondations.
