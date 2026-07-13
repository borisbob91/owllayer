# SPRINT-LK-09 - Production, telephonie et durcissement du socle

## Statut

- **Etat** : planifie
- **Branche de travail recommandee** : `feat/sprint-lk09-production-hardening`
- **Prerequis** : LK00 a LK08 integres sur `master`
- **Objectif principal** : transformer l'integration LiveKit actuelle, deja fonctionnelle pour les rooms et le runtime optionnel, en une capacite exploitable en production avec telephonie SIP, deploiement reproductible, observabilite sure et validation end-to-end.

## Constat verifie dans le code

Le runtime LiveKit optionnel, le bridge DomOS, l'endpoint de token, l'integration React room, les tests de base et la documentation d'exploitation existent deja. Les adaptateurs Anthropic et la persistance SQLite/MongoDB existent egalement : ils ne doivent pas etre recrees dans ce sprint.

Les lacunes encore actives sont :

1. La telephonie SIP entrante et sortante n'est pas implementee.
2. Le lien metier complet entre appel, room, participant et session DomOS doit etre ferme.
3. La configuration des trunks, numeros et regles de dispatch n'a pas de surface DomOS finalisee.
4. Aucun scenario telephonique reel ne valide toute la chaine.
5. Le deploiement actuel reste principalement une reference/demo et doit devenir reproductible.
6. L'observabilite doit couvrir la telephonie sans exposer de secrets.
7. Les pannes et reprises LiveKit doivent etre testees explicitement.
8. Le contrat de `DomOSClient.send()` sans transport ouvert reste ambigu.
9. Le handshake WebRTC complet n'a pas de test end-to-end.
10. DevTools ne compare pas clairement les tools locaux avec la surface effective du serveur.

## Hors scope

- Reimplementation de `@domos/adapter-anthropic`.
- Reimplementation des stores SQLite ou MongoDB.
- Remplacement du protocole ADTP.
- Couplage obligatoire du serveur core a LiveKit.
- Stockage de token, secret, contexte brut, arguments ou resultats de tools dans le dashboard ou les logs.
- Refonte generale des packages React, Vue, Svelte ou Angular.

## Principes d'architecture

- LiveKit reste un module optionnel. DomOS Server doit demarrer sans dependance ou configuration LiveKit.
- DomOS reste proprietaire de la session, du Shadow Context, du registre de tools, des approvals et des politiques de securite.
- LiveKit gere la room, les participants, les medias temps reel et la couche SIP.
- Gemini ne devient jamais obligatoire : la couche LiveKit doit rester ouverte a plusieurs providers.
- Une session sans UI expose uniquement les tools serveur.
- Une UI connectee ajoute ses tools montes; leur demontage les retire de la surface effective.
- Toutes les erreurs externes sont converties en erreurs DomOS stables, redigees et sans secret.

---

## Lot A - Telephonie LiveKit

### Tache 1 - Implementer la telephonie SIP entrante et sortante

**But** : permettre a DomOS de recevoir et d'initier un appel via LiveKit SIP.

**Implementation** :

1. Ajouter un domaine `sip` dans `packages/adapter-livekit/src/` sans melanger cette logique avec le bridge agent existant.
2. Definir des types publics minimaux pour trunk, numero, direction, dispatch rule et call state.
3. Fournir une facade de haut niveau pour creer/fermer un appel et normaliser les evenements LiveKit.
4. Mapper les etats `ringing`, `active`, `ended` et `failed` vers des evenements DomOS stables.
5. Garder les imports LiveKit lazy ou isoles afin de preserver le runtime optionnel.
6. Rediger les erreurs provider avant de les transmettre au serveur ou au dashboard.

**Fichiers cibles probables** :

- `packages/adapter-livekit/src/sip/types.ts`
- `packages/adapter-livekit/src/sip/LiveKitSipService.ts`
- `packages/adapter-livekit/src/sip/index.ts`
- `packages/adapter-livekit/src/index.ts`
- `packages/adapter-livekit/tests/LiveKitSipService.test.ts`

**Acceptation** :

- [ ] Un appel entrant peut etre accepte et associe a une room.
- [ ] Un appel sortant peut etre cree depuis une commande serveur.
- [ ] Aucun secret SIP n'est transmis au navigateur.
- [ ] Le package build sans configuration LiveKit active.

### Tache 2 - Relier les appels LiveKit aux sessions DomOS

**But** : rendre le cycle call/room/participant/session coherent et observable.

**Implementation** :

1. Introduire un identifiant de correlation non secret entre appel, room et session DomOS.
2. Etendre `DomOSLiveKitAgentBridge` par composition, sans dupliquer le pipeline de tools.
3. Creer la session DomOS au bon moment, puis attacher le participant telephonique.
4. Appliquer la regle tools serveur seuls tant qu'aucune UI n'est connectee.
5. Synchroniser les tools client au montage et au demontage lorsque le provider le supporte.
6. Lorsque l'update mid-session n'est pas supportee, exposer clairement la limitation et appliquer la nouvelle surface a la prochaine session.
7. Fermer proprement les ressources a la fin de l'appel sans detruire arbitrairement une session texte encore active.

**Acceptation** :

- [ ] Chaque appel actif possede une correlation call/room/participant/session.
- [ ] Les tools client ne sont jamais executes cote serveur par erreur.
- [ ] Le cleanup est idempotent.
- [ ] Une deconnexion room ne casse pas le mode texte restant.

### Tache 3 - Ajouter le routage des appels et la configuration SIP

**But** : fournir une configuration exploitable sans hardcode.

**Implementation** :

1. Definir un schema de configuration pour trunks entrants/sortants, numeros et dispatch rules.
2. Charger les secrets uniquement depuis l'environnement ou un secret manager.
3. Valider la configuration au demarrage avec des messages d'erreur actionnables.
4. Ajouter des exemples neutres dans `.env.example`, sans valeur reelle.
5. Documenter le provisionnement LiveKit Cloud et self-hosted.
6. Ajouter une politique CORS et d'origine explicite pour les endpoints publics associes.

**Acceptation** :

- [ ] Une configuration invalide echoue proprement sans afficher de secret.
- [ ] Une configuration absente desactive uniquement SIP/LiveKit.
- [ ] Les regles entrantes et sortantes sont testables separement.

### Tache 4 - Valider un appel telephonique LiveKit de bout en bout

**But** : prouver que la chaine complete fonctionne, pas seulement les unites.

**Scenario de reference** :

1. Demarrer DomOS Server avec LiveKit active.
2. Recevoir ou initier un appel SIP.
3. Creer la room et lier la session DomOS.
4. Echanger de l'audio dans les deux sens.
5. Executer un tool serveur.
6. Connecter une UI et verifier l'apparition de ses tools.
7. Demonter l'UI et verifier leur retrait.
8. Terminer l'appel et verifier le cleanup.

**Acceptation** :

- [ ] Le scenario est automatise ou fourni sous forme de harnais reproductible.
- [ ] Les preuves de test ne contiennent aucun secret.
- [ ] Les echecs indiquent l'etape exacte en cause.

---

## Lot B - Deploiement et observabilite

### Tache 5 - Deployer DomOS Server et LiveKit dans un environnement reel

**But** : passer de la demo a un deploiement reproductible.

**Implementation** :

1. Definir une topologie cible : DomOS Server, endpoint de token, LiveKit, stockage persistant et reverse proxy TLS.
2. Fournir une configuration par environnement avec validation au boot.
3. Ajouter des health checks separes pour DomOS et l'integration LiveKit.
4. Documenter DNS, TLS, CORS, URL WebSocket et rotation des secrets.
5. Ajouter une procedure de migration et rollback.
6. Verifier que le serveur reste fonctionnel lorsque LiveKit est desactive.

**Points d'appui existants** :

- `apps/demo-server/src/livekitTokenEndpoint.ts`
- `packages/server/.env.example`
- `docs/LIVEKIT.md`
- `docs/livekit/telephony-deploy-observability.md`

**Acceptation** :

- [ ] Un environnement vierge peut etre deploye avec la documentation seule.
- [ ] Les health checks distinguent panne DomOS et panne LiveKit.
- [ ] Le rollback est documente et teste.

### Tache 6 - Finaliser l'observabilite LiveKit sans fuite de secrets

**But** : rendre l'exploitation compréhensible et sure.

**Implementation** :

1. Exposer l'etat configure/non configure de LiveKit.
2. Afficher rooms, participants, etat d'appel et correlation de session avec des identifiants rediges.
3. Ajouter logs structures, compteurs d'appels, erreurs par categorie, latence de connexion et duree de session.
4. Interdire explicitement tokens, cles, contexte brut, args et resultats de tools.
5. Ajouter une verification automatique de redaction dans les tests.
6. Completer le dashboard existant, sans construire une seconde interface d'administration.

**Acceptation** :

- [ ] Un operateur peut diagnostiquer un appel sans acces aux secrets.
- [ ] Les logs permettent de suivre une correlation sans PII brute.
- [ ] Les tests echouent si un secret connu apparait dans une sortie.

### Tache 7 - Tester la resilience et la reprise du runtime LiveKit

**But** : eviter qu'une panne externe bloque DomOS.

**Cas a couvrir** :

- LiveKit non configure.
- Credentials invalides.
- Endpoint de token indisponible.
- Room interrompue.
- Participant deconnecte brutalement.
- Provider realtime indisponible.
- Redemarrage du serveur.
- Cleanup execute plusieurs fois.

**Acceptation** :

- [ ] Le mode texte reste utilisable lorsque le media tombe.
- [ ] Aucun etat `connecting` ne reste bloque indefiniment.
- [ ] Les ressources et listeners sont liberes.
- [ ] Un runbook court indique diagnostic, mitigation et reprise.

---

## Lot C - Socle et validation SDK

### Tache 8 - Definir le comportement de send sans transport ouvert

**But** : fermer l'ambiguite du contrat public de `DomOSClient.send()`.

**Implementation** :

1. Choisir un contrat unique et documente pour `disconnected`, `connecting` et `reconnecting`.
2. Privilegier une erreur typee et actionnable si aucune file d'attente fiable n'existe deja.
3. Eviter une file infinie ou silencieuse.
4. Aligner browser, tests et documentation publique.
5. Verifier que les appels internes existants gerent le nouveau contrat.

**Acceptation** :

- [ ] Aucun envoi n'est perdu silencieusement.
- [ ] Le comportement est identique pour tous les transports.
- [ ] Les tests couvrent chaque etat de connexion.

### Tache 9 - Ajouter le test WebRTC complet du handshake client

**But** : couvrir le chemin reel qui manque encore dans les audits.

**Scenario** :

1. Ouvrir un `DataChannel` mocke.
2. Verifier l'emission de `HANDSHAKE_INIT`.
3. Verifier `Authorization` et `lineToken`.
4. Injecter `HANDSHAKE_ACK`.
5. Verifier la transition vers l'etat connecte.
6. Couvrir timeout, ACK invalide et fermeture avant ACK.

**Acceptation** :

- [ ] Le chemin `DataChannel.open -> HANDSHAKE_INIT -> HANDSHAKE_ACK` passe.
- [ ] Les erreurs ne laissent aucun timer ou listener actif.
- [ ] Le test ne depend pas d'un service reseau externe.

### Tache 10 - Comparer les tools locaux a la surface serveur dans DevTools

**But** : rendre visibles les divergences du registre de tools.

**Implementation** :

1. Reutiliser les evenements standardises du core.
2. Afficher tools locaux, tools acceptes par le serveur et surface effective.
3. Signaler absences, collisions, versions differentes et tools retires.
4. Montrer l'effet du montage/demontage des composants.
5. Ne jamais afficher les arguments ou resultats sensibles par defaut.

**Acceptation** :

- [ ] Une divergence est identifiable sans lire les logs bruts.
- [ ] La vue se met a jour pendant le cycle mount/unmount.
- [ ] Aucun nouveau protocole parallele n'est introduit.

---

## Ordre d'execution recommande

1. Tache 8 : verrouiller le contrat `send()` avant d'etendre les scenarios reseau.
2. Tache 9 : fermer le handshake WebRTC manquant.
3. Tache 1 : fondation SIP.
4. Tache 3 : configuration et routage.
5. Tache 2 : correlation call/room/session.
6. Tache 6 : observabilite necessaire au debug.
7. Tache 5 : deploiement cible.
8. Tache 7 : resilience et reprise.
9. Tache 4 : validation telephonique end-to-end.
10. Tache 10 : surface DevTools finale.

## Strategie de tests

Executer au minimum :

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
pnpm test
```

Ajouter :

- tests unitaires des services SIP;
- tests d'integration du bridge call/room/session;
- test WebRTC complet sans reseau externe;
- test de redaction des logs;
- test de runtime sans LiveKit installe/configure;
- harnais end-to-end telephonique documente.

## Gates finales

- [ ] LiveKit reste optionnel dans DomOS Server.
- [ ] Un appel entrant et un appel sortant sont supportes.
- [ ] Call, room, participant et session sont correles proprement.
- [ ] Les tools serveur/client respectent leur lieu d'execution.
- [ ] Le deploiement TLS/CORS/secrets est reproductible.
- [ ] Le dashboard et les logs ne divulguent aucune donnee sensible.
- [ ] Les pannes LiveKit ne bloquent pas durablement le mode texte.
- [ ] `DomOSClient.send()` possede un contrat public teste.
- [ ] Le handshake WebRTC complet est couvert.
- [ ] DevTools montre la surface effective des tools.
- [ ] Les builds et tests des packages touches passent.
- [ ] La documentation LiveKit et les exemples sont synchronises avec le code final.

## Definition of Done

Le sprint est termine uniquement lorsqu'un environnement neuf peut deployer DomOS avec LiveKit, recevoir ou initier un appel SIP, relier cet appel a une session DomOS, executer les tools au bon endroit, survivre aux pannes testees et fournir assez d'observabilite pour diagnostiquer le systeme sans exposer de secret. Toute case historique non cochee mais deja implementee doit etre corrigee dans la documentation au lieu de generer du travail en doublon.
