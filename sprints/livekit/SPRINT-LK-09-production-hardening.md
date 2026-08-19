# SPRINT-LK-09 - Deploiement web LiveKit et durcissement production

## Statut

- **Etat** : planifie
- **Cible** : DomOS integre comme widget dans une page web
- **Prerequis** : runtime LiveKit optionnel et sprints LK00 a LK08 integres sur `master`
- **Objectif** : rendre le serveur DomOS et le canal audio LiveKit deployables, configurables et validables dans un environnement web reel.

## Decision de scope

La telephonie SIP ne fait pas partie de ce sprint. DomOS vit actuellement dans un widget web : LiveKit sert au transport audio temps reel entre le navigateur et l'agent. ADTP reste le canal canonique pour le Shadow Context, les tools, les approvals et leurs resultats.

La telephonie pourra etre traitee plus tard comme extension produit distincte si un cas d'usage centre d'appels ou appels entrants/sortants est valide.

## Etat actuel verifie

Deja present dans le code :

- `@domos/adapter-livekit` et runtime LiveKit optionnel ;
- hook React `useDomOSLiveKitRoom` ;
- bouton de demonstration `LiveKitRoomButton` ;
- endpoint serveur `POST /domos/livekit/token` ;
- verification API key et possession de session avant emission du token ;
- tokens de room a duree courte ;
- allowlist CORS via `DOMOS_LIVEKIT_ALLOWED_ORIGINS` ;
- bridge entre session DomOS et AgentSession LiveKit ;
- redaction des donnees sensibles dans la surface d'administration ;
- documentation de configuration LiveKit.

Elements reellement manquants pour un deploiement web :

1. Image Docker de production pour DomOS Server.
2. Fichier Compose ou equivalent pour lancer DomOS avec ses dependances.
3. Commande de demarrage production claire pour le serveur.
4. Configuration complete et validee par environnement.
5. Reverse proxy HTTPS/WSS et politique CORS de production.
6. Health checks et readiness checks.
7. Procedure de deploiement LiveKit Cloud ou self-hosted.
8. Validation end-to-end du widget depuis un domaine public.
9. Observabilite et procedure de reprise.
10. Fermeture de deux lacunes SDK deja auditees : contrat `send()` et handshake WebRTC complet.

## Hors scope

- Telephonie SIP, trunks et numeros de telephone.
- Reimplementation Anthropic.
- Reimplementation des stores SQLite ou MongoDB.
- Remplacement d'ADTP par LiveKit.
- Couplage obligatoire de `@domos/server` a LiveKit.
- Refonte generale des widgets React, Vue, Svelte ou Angular.

---

## Lot A - Packaging du serveur

### Tache 1 - Ajouter une image Docker de production pour DomOS Server

**But** : produire une image reproductible, minimale et exploitable hors du monorepo local.

**Implementation** :

1. Creer un Dockerfile multi-stage pour installer avec `pnpm --frozen-lockfile`, builder les packages requis et ne copier que les artefacts necessaires au runtime.
2. Utiliser une version Node LTS explicite et un utilisateur non-root.
3. Exposer uniquement le port du serveur DomOS.
4. Ajouter un `.dockerignore` pour exclure caches, secrets, rapports et `node_modules` locaux.
5. Verifier que LiveKit reste optionnel : l'image doit demarrer sans variables LiveKit.
6. Ajouter un health check conteneur sans exposer de secret.

**Fichiers cibles probables** :

- `apps/demo-server/Dockerfile`
- `.dockerignore`
- `apps/demo-server/package.json`
- `apps/demo-server/src/server.ts`

**Acceptation** :

- [ ] `docker build` reussit depuis la racine.
- [ ] Le conteneur demarre sans LiveKit.
- [ ] Le conteneur demarre avec LiveKit lorsque les variables sont fournies.
- [ ] Aucun secret n'est embarque dans l'image.
- [ ] Le processus ne tourne pas en root.

### Tache 2 - Ajouter une composition locale et une reference de production

**But** : lancer l'ensemble avec une commande documentee.

**Implementation** :

1. Ajouter un fichier Compose pour DomOS Server et les dependances reellement necessaires.
2. Prevoir deux profils LiveKit : Cloud externe et LiveKit self-hosted.
3. Ne pas embarquer LiveKit self-hosted dans le profil par defaut.
4. Monter les secrets via variables ou fichiers ignores par Git.
5. Ajouter les volumes persistants uniquement lorsque SQLite ou un service externe l'exige.
6. Documenter les differences entre developpement, staging et production.

**Fichiers cibles probables** :

- `compose.yaml`
- `.env.example`
- `docs/DEPLOYMENT.md`

**Acceptation** :

- [ ] `docker compose up` lance DomOS en mode texte.
- [ ] Le profil LiveKit Cloud fonctionne sans conteneur LiveKit local.
- [ ] Le profil self-hosted documente ports, TURN et stockage.
- [ ] Aucun mot de passe par defaut dangereux n'est fourni.

### Tache 3 - Definir une commande de demarrage production stable

**But** : ne plus dependre d'une commande de developpement implicite.

**Implementation** :

1. Ajouter un script `start` production au serveur deploye.
2. S'assurer que le build genere tous les fichiers executes au runtime.
3. Gerer correctement `SIGTERM` et `SIGINT` : fermeture WebSocket, sessions, bridge LiveKit et connexions de persistence.
4. Retourner un code de sortie non nul si la configuration obligatoire DomOS est invalide.
5. Ne pas bloquer le boot si les variables LiveKit optionnelles sont absentes.

**Acceptation** :

- [ ] `pnpm --filter <serveur> build` puis `pnpm --filter <serveur> start` fonctionne.
- [ ] L'arret du conteneur est propre et borne dans le temps.
- [ ] Une mauvaise configuration produit une erreur actionnable.

---

## Lot B - Configuration reseau et securite

### Tache 4 - Finaliser la configuration par environnement

**Variables serveur minimales a documenter** :

```env
LIVEKIT_URL=wss://your-livekit-host
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
GOOGLE_API_KEY=...
DOMOS_LIVEKIT_ALLOWED_ORIGINS=https://app.example.com
DOMOS_REQUIRE_API_KEY=true
```

**Implementation** :

1. Centraliser la lecture et la validation des variables de production.
2. Refuser une `LIVEKIT_URL` non TLS en production.
3. Refuser les wildcards CORS en production sauf opt-in explicite et visible.
4. Conserver `LIVEKIT_API_SECRET`, les cles provider et les credentials de persistence uniquement cote serveur.
5. Documenter la rotation des cles sans rebuild du widget.
6. Fournir des exemples distincts pour local et production.

**Acceptation** :

- [ ] La configuration manquante indique precisement la variable concernee.
- [ ] Les secrets ne sont jamais inclus dans les bundles navigateur.
- [ ] Changer une origine autorisee ne demande pas de rebuilder le widget.

### Tache 5 - Ajouter le reverse proxy HTTPS et WebSocket

**But** : servir DomOS en HTTPS/WSS depuis un domaine public.

**Implementation** :

1. Fournir une configuration de reference Caddy ou Nginx.
2. Router le WebSocket DomOS et l'endpoint `/domos/livekit/token`.
3. Preserver les headers d'upgrade WebSocket.
4. Appliquer TLS, limites de taille, timeouts et rate limiting raisonnables.
5. Restreindre CORS au domaine du widget.
6. Documenter les contraintes proxy/load balancer pour les connexions longues.

**Acceptation** :

- [ ] Le widget se connecte via `wss://` depuis un domaine distinct.
- [ ] Le token endpoint refuse une origine non autorisee.
- [ ] Les connexions longues ne sont pas coupees par un timeout proxy trop court.

### Tache 6 - Documenter LiveKit Cloud et LiveKit self-hosted

**LiveKit Cloud** :

1. Creer un projet LiveKit.
2. Recuperer URL, API key et API secret.
3. Injecter ces valeurs uniquement dans le runtime serveur.
4. Autoriser le domaine public du widget dans DomOS.
5. Verifier la region et les contraintes reseau des utilisateurs cibles.

**Self-hosted** :

1. Documenter domaine TLS, certificat, TURN, ports UDP/TCP et load balancer.
2. Separer metriques LiveKit et metriques bridge DomOS.
3. Garder Redis et le multi-node LiveKit hors de `@domos/server`.
4. Fournir des liens vers la documentation LiveKit officielle pour les composants d'infrastructure.

**Acceptation** :

- [ ] Un developpeur peut choisir Cloud ou self-hosted sans modifier le widget.
- [ ] Les exigences TURN et ports sont explicites.
- [ ] Les secrets LiveKit restent absents du navigateur.

---

## Lot C - Exploitation et validation

### Tache 7 - Ajouter health, readiness et observabilite de production

**But** : distinguer un serveur vivant d'un serveur pret a accepter des sessions.

**Implementation** :

1. Ajouter un endpoint liveness pour le processus DomOS.
2. Ajouter un endpoint readiness validant la configuration et les dependances obligatoires.
3. Rapporter LiveKit comme `disabled`, `ready` ou `degraded` sans rendre son absence fatale.
4. Ajouter logs structures avec identifiant de correlation redige.
5. Mesurer connexions widget, sessions, echecs de token, rooms et temps de connexion.
6. Ne jamais logger token, secret, contexte brut, arguments ou resultats de tools.

**Acceptation** :

- [ ] L'orchestrateur peut distinguer `alive` et `ready`.
- [ ] Une panne LiveKit place le media en `degraded` sans tuer le mode texte.
- [ ] Les tests detectent une fuite de secret connue.

### Tache 8 - Valider le widget web de bout en bout sur un domaine public

**Scenario obligatoire** :

1. Deployer DomOS Server derriere HTTPS/WSS.
2. Configurer une instance LiveKit Cloud ou self-hosted.
3. Deployer le widget sur un second domaine HTTPS.
4. Ouvrir une session DomOS avec API key.
5. Demander un token room au serveur.
6. Rejoindre/quitter la room depuis le navigateur.
7. Autoriser le microphone et envoyer l'audio.
8. Recevoir texte ou audio agent.
9. Executer un tool via ADTP et verifier que LiveKit ne remplace pas ce canal.
10. Tester Chrome et Firefox, puis un navigateur mobile.

**Cas d'erreur** :

- origine CORS refusee ;
- microphone refuse ;
- token expire ;
- LiveKit indisponible ;
- WebSocket DomOS interrompu ;
- room fermee pendant que le mode texte reste actif.

**Acceptation** :

- [ ] Le parcours principal fonctionne sur un domaine public.
- [ ] Le mode texte survit a une panne LiveKit lorsque la session ADTP reste ouverte.
- [ ] Les erreurs sont visibles et actionnables dans le widget.
- [ ] Les preuves de test ne contiennent aucun secret.

### Tache 9 - Ajouter un runbook de deploiement, rollback et reprise

**Contenu** :

1. Prerequis DNS, TLS, Node, stockage et LiveKit.
2. Build, migration, demarrage et verification.
3. Rotation des secrets.
4. Diagnostic d'une erreur WebSocket, CORS, token ou media.
5. Rollback vers l'image precedente.
6. Sauvegarde et restauration des donnees persistantes.
7. Procedure lorsque LiveKit tombe mais DomOS texte reste disponible.

**Acceptation** :

- [ ] Le runbook permet un deploiement neuf sans connaissance implicite du monorepo.
- [ ] Le rollback est teste au moins une fois en staging.
- [ ] Les commandes ne contiennent aucune valeur secrete reelle.

---

## Lot D - Lacunes SDK bloquantes

### Tache 10 - Fermer les lacunes de transport avant publication

#### 10.1 Definir `DomOSClient.send()` sans transport ouvert

1. Choisir un contrat unique pour `disconnected`, `connecting` et `reconnecting`.
2. Eviter tout envoi perdu silencieusement et toute file infinie.
3. Retourner une erreur typee et actionnable si aucun mecanisme fiable de queue n'existe.
4. Aligner implementation, tests et documentation.

#### 10.2 Ajouter le test WebRTC complet

Couvrir :

```text
DataChannel.open
  -> HANDSHAKE_INIT
  -> verification Authorization + lineToken
  -> HANDSHAKE_ACK
  -> etat connected
```

Ajouter les cas timeout, ACK invalide et fermeture avant ACK, sans service reseau externe.

#### 10.3 Completer DevTools

Comparer les tools locaux, les tools acceptes par le serveur et la surface effective. Signaler absences, collisions, versions differentes et changements mount/unmount sans exposer d'arguments sensibles.

**Acceptation** :

- [ ] `send()` possede un contrat public teste.
- [ ] Le handshake WebRTC complet est couvert.
- [ ] DevTools montre les divergences du registre de tools.

---

## Ordre d'execution recommande

1. Commande production et validation de configuration.
2. Dockerfile serveur.
3. Compose et profils LiveKit.
4. Health/readiness.
5. Reverse proxy HTTPS/WSS.
6. Guide LiveKit Cloud/self-hosted.
7. Deploiement staging.
8. Test widget end-to-end public.
9. Observabilite, runbook et rollback.
10. Lacunes SDK de transport et DevTools.

## Strategie de tests

```bash
pnpm --filter @domos/core build
pnpm --filter @domos/core test
pnpm --filter @domos/adapter-livekit build
pnpm --filter @domos/adapter-livekit test
pnpm --filter @domos/server build
pnpm --filter @domos/server test
pnpm --filter @domos/react build
pnpm --filter @domos/react test
pnpm --filter @domos/ui build
pnpm --filter @domos/ui test
pnpm --filter @domos/demo build
pnpm test

docker build -f apps/demo-server/Dockerfile .
docker compose config
docker compose up -d
```

Ajouter un smoke test public automatisable pour :

- ouverture WebSocket DomOS ;
- creation de session ;
- emission d'un token LiveKit ;
- connexion room ;
- publication microphone ;
- maintien du mode texte lorsque LiveKit est coupe.

## Gates finales

- [ ] Une image serveur production est disponible.
- [ ] Une commande Compose ou equivalente lance l'environnement.
- [ ] DomOS fonctionne sans LiveKit configure.
- [ ] LiveKit fonctionne avec Cloud ou self-hosted sans modifier le widget.
- [ ] HTTPS, WSS et CORS sont configures pour un vrai domaine.
- [ ] Liveness et readiness sont exploitables par un orchestrateur.
- [ ] Aucun secret LiveKit ou provider n'atteint le navigateur.
- [ ] Le widget rejoint une room depuis un domaine public.
- [ ] Le microphone et le retour agent fonctionnent dans les navigateurs cibles.
- [ ] Une panne LiveKit ne supprime pas arbitrairement la session texte ADTP.
- [ ] Logs, dashboard et preuves de test ne divulguent aucune donnee sensible.
- [ ] Le deploiement et le rollback sont documentes et testes.
- [ ] Les lacunes `send()`, handshake WebRTC et DevTools sont fermees.

## Definition of Done

Le sprint est termine lorsqu'une personne peut cloner le depot, construire une image DomOS Server, deployer le serveur derriere HTTPS/WSS, brancher LiveKit Cloud ou self-hosted, configurer le domaine du widget, puis valider une conversation texte et audio depuis un navigateur public sans exposer de secret. La telephonie SIP reste explicitement hors scope tant qu'un besoin produit distinct n'est pas valide.
