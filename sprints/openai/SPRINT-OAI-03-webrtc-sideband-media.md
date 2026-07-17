# Sprint OAI-03 - WebRTC, mode auto et sideband serveur

Statut : **après OAI-02, ADTP-01 et le runtime client-media minimal**

## 1. Résultat attendu

Ajouter un chemin média WebRTC OpenAI sans remplacer le control plane ADTP.
Le navigateur échange l'audio directement avec OpenAI ; le serveur DomOS reste
attaché à la même session par sideband et garde tools, HITL, contexte et contrôle.

## 2. Distinction obligatoire

- `WebRTCTransport` existant transporte ADTP via DataChannel ;
- OAI-03 utilise le WebRTC média OpenAI (audio track + data channel provider) ;
- ces deux mécanismes ne partagent ni classe ni détection implicite ;
- les messages de négociation restent provider-neutral au niveau ADTP.

## 3. Politique de sélection

```ts
type RequestedMediaTransport = 'websocket' | 'webrtc' | 'auto';

interface MediaSelection {
  requested: RequestedMediaTransport;
  selected: 'websocket' | 'webrtc';
  fallbackReason?: string;
}
```

- `websocket` sélectionne toujours OAI-02 ;
- `webrtc` échoue explicitement si une capacité manque ;
- `auto` sélectionne WebRTC seulement si adapter, serveur, protocole et client
  annoncent tous la capacité ; sinon il retourne WebSocket et une raison stable ;
- aucun choix n'est déduit du nom du provider, du navigateur ou du modèle seul.

## 4. Séquence cible

1. Le client ouvre/authentifie sa session ADTP normale.
2. Il demande un mode média dans le contrat ADTP-01.
3. Le serveur vérifie session, origine, politique et capacités.
4. Pour WebRTC, le client crée une offre SDP et la transmet via le message ADTP
   prévu ; le serveur appelle `POST /v1/realtime/calls` avec sa clé durable.
5. Le serveur retourne la réponse SDP et l'identité temporaire de négociation,
   jamais sa clé OpenAI.
6. Le client établit la peer connection et confirme l'activation à DomOS.
7. Le serveur ouvre le sideband officiel associé au call et synchronise session,
   instructions et tools.
8. ADTP reste ouvert pour contexte, tools, HITL, statuts et cleanup.
9. La fermeture de l'un des plans déclenche une fermeture coordonnée et idempotente.

## 5. Contrats de composants

### Adapter OpenAI

Créer une classe interne dédiée au bootstrap call/SDP et une session sideband.
Elle traduit les événements en événements Live DomOS, sans exposer SDP ou call ID
comme API publique provider. Elle ne gère pas l'authentification utilisateur DomOS.

### Serveur

Le coordinateur média lie `domosSessionId`, connexion ADTP, identité du call,
transport sélectionné et état. Il vérifie qu'une réponse de négociation ne peut
être réutilisée par une autre session. Les ressources ont TTL et cleanup.

### Client générique

Le runtime client-media consomme la négociation ADTP, attache la piste micro,
lit la piste distante et relaie les événements de contrôle nécessaires. Aucun
SDK framework ne connaît `OpenAI`, `/v1/realtime/calls` ou les événements bruts.

### Sideband, tools et HITL

Les tools sont annoncés et reçus côté sideband. Chaque call revient dans le
`ToolRouter` existant. Pour un tool client, ADTP demande l'exécution comme si le
provider avait appelé le tool via WebSocket. HITL reste obligatoire selon le
risque. Le résultat retourne au sideband une seule fois.

## 6. Règles de fallback

- avant activation média, `auto` peut fermer le bootstrap incomplet et repartir
  sur une nouvelle session WebSocket propre ;
- `webrtc` explicite ne fallback pas silencieusement ;
- après début d'un tour, aucune reprise transparente ne mélange les contextes :
  fermer/réinitialiser avant fallback ;
- une perte du control plane ADTP ferme le média, même si l'audio fonctionne encore.

## 7. Tâches

### Tâche 1 - Implémenter la sélection de capacités

Ajouter le resolver provider-neutral prévu par ADTP-01, les raisons de fallback
stables et les tests de matrice des trois politiques.

### Tâche 2 - Implémenter le bootstrap WebRTC serveur

Échanger le SDP avec l'API officielle, borner taille/durée, associer la requête à
la session DomOS et nettoyer tout bootstrap expiré. Ne jamais logger SDP ou clé.

### Tâche 3 - Implémenter le sideband

Se connecter à l'identité du call, appliquer configuration/tools et mapper les
événements dans la même interface `LiveSession` que OAI-02.

### Tâche 4 - Raccorder le coordinateur serveur

Relier session ADTP, média et sideband ; empêcher collision, replay et double
fermeture ; conserver la désynchronisation des tools au démontage du composant.

### Tâche 5 - Raccorder le runtime client générique

Implémenter la peer connection dans le sprint client-media prévu, puis intégrer
un SDK pilote. Les autres SDK suivent leurs propres sprints de parité.

### Tâche 6 - Tester sécurité et robustesse

Tester SDP invalide/surdimensionné, session étrangère, replay, expiration,
sideband indisponible, ICE failure, fallback, perte ADTP, refus HITL et cleanup.

## 8. Fichiers cibles

- `packages/adapter-openai/src/realtime/OpenAIWebRTCBootstrap.ts` à créer
- `packages/adapter-openai/src/realtime/OpenAISidebandSession.ts` à créer
- `packages/adapter-openai/src/OpenAILiveAdapter.ts`
- coordinateur prévu par `sprints/server-runtime/`
- messages/capacités prévus par `sprints/protocol-adtp/`
- runtime prévu par `sprints/client-media/`
- tests adapter, server et navigateur associés.

Les chemins serveur/client exacts doivent être repris des sprints prérequis une
fois implémentés ; OAI-03 ne doit pas créer un second coordinateur concurrent.

## 9. Definition of Done

- [ ] Les trois politiques respectent la matrice de sélection.
- [ ] La clé durable ne quitte jamais le serveur.
- [ ] WebRTC explicite ne fallback pas silencieusement.
- [ ] `auto` explique tout fallback vers OAI-02.
- [ ] Sideband conserve ToolRouter, HITL et Neural-DOM Binding.
- [ ] Perte ADTP ferme média et sideband.
- [ ] Replay, TTL, ownership et cleanup sont testés.
- [ ] Aucun SDK n'importe de type OpenAI.
- [ ] Le WebRTC ADTP historique reste inchangé.

## 10. Hors scope

LiveKit, SIP, téléphonie, stockage de secrets dans le dashboard et migration de
tous les SDK en une livraison.

## 11. Commit recommandé

`feat(openai): add negotiated webrtc media and sideband`
