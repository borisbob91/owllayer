# Sprint LK-09 progress - Deploiement web LiveKit

Date de mise a jour : 2026-07-13
Branche : `docs/sprint-lk09-production-hardening`
Sprint : `sprints/livekit/SPRINT-LK-09-production-hardening.md`
Statut : **en cours - implementation poussee, validation runtime non terminee**

## Note importante

LK-09 cible DomOS comme widget dans une page web. LiveKit transporte le media temps reel du navigateur, tandis qu'ADTP reste responsable de la session, du Shadow Context, des tools, des approvals et des resultats.

La telephonie SIP a ete retiree du scope. Elle ne doit pas etre implementee sans besoin produit distinct valide.

## Livre sur la branche

- [x] Sprint LK-09 recentre sur le deploiement web.
- [x] Dockerfile multi-stage pour `apps/demo-server`.
- [x] Image runtime Node 20 avec utilisateur non-root.
- [x] Healthcheck conteneur TCP initial.
- [x] `.dockerignore` sans secrets ni artefacts locaux.
- [x] `compose.yaml` pour DomOS Server.
- [x] Profil proxy Caddy optionnel.
- [x] Configuration HTTPS/WSS de reference.
- [x] Exemple `deploy/.env.example` sans valeur secrete.
- [x] Documentation LiveKit Cloud et self-hosted.
- [x] Documentation du parcours widget -> session DomOS -> token -> room LiveKit.
- [x] Documentation du fallback texte lorsque LiveKit est indisponible.
- [x] PR #5 convertie en draft d'implementation.

## Partiellement termine

- [~] Healthcheck : le port TCP est teste, mais il manque une liveness et une readiness applicatives.
- [~] Reverse proxy : configuration de reference ajoutee, mais pas encore testee sur un domaine public.
- [~] Deploiement LiveKit : Cloud et self-hosted sont documentes, mais aucun environnement reel n'a encore ete valide.
- [~] Securite production : non-root, CORS et secrets serveur sont couverts; rate limiting et verification d'image restent a valider sur la plateforme cible.
- [~] Runbook : lancement et rollback sont documentes; restauration, incident et rotation des secrets doivent etre testes.

## Reste a faire avant merge

### Validation locale obligatoire

- [ ] Executer `pnpm install --frozen-lockfile`.
- [ ] Executer `pnpm --filter @domos/demo-server build`.
- [ ] Executer les builds/tests de `@domos/core`, `@domos/server`, `@domos/adapter-livekit`, `@domos/react` et `@domos/ui`.
- [ ] Executer `docker build -f apps/demo-server/Dockerfile .`.
- [ ] Executer `docker compose config`.
- [ ] Executer `docker compose up -d server` et verifier l'etat healthy.
- [ ] Verifier que l'image demarre sans variables LiveKit.
- [ ] Verifier que l'image demarre avec les trois variables `LIVEKIT_*`.
- [ ] Verifier l'arret propre via `SIGTERM`.

### Runtime production

- [ ] Ajouter un endpoint liveness applicatif.
- [ ] Ajouter un endpoint readiness distinguant DomOS `ready`, LiveKit `disabled`, `ready` ou `degraded`.
- [ ] Ajouter ou confirmer une commande `start` production stable dans `apps/demo-server/package.json`.
- [ ] Valider que le Dockerfile execute l'artefact reel genere par le build.
- [ ] Ajouter une validation de configuration production : URL TLS, origines CORS et variables obligatoires.
- [ ] Ajouter une politique de rate limiting compatible avec le proxy choisi ou la plateforme cible.

### Validation sur domaine public

- [ ] Pointer un domaine DNS vers le serveur.
- [ ] Obtenir et renouveler un certificat TLS.
- [ ] Connecter le widget en `wss://` a DomOS.
- [ ] Appeler `/domos/livekit/token` depuis l'origine autorisee.
- [ ] Rejoindre une room LiveKit depuis le navigateur.
- [ ] Autoriser le microphone et publier l'audio.
- [ ] Recevoir une reponse agent texte ou audio.
- [ ] Executer un tool via ADTP pendant que LiveKit transporte l'audio.
- [ ] Couper LiveKit et confirmer que le chat texte reste actif.
- [ ] Tester Chrome, Firefox et au moins un navigateur mobile.

### Lacunes SDK conservees dans LK-09

- [ ] Definir le contrat de `DomOSClient.send()` sans transport ouvert.
- [ ] Ajouter le test WebRTC complet `DataChannel.open -> HANDSHAKE_INIT -> HANDSHAKE_ACK`.
- [ ] Ajouter dans DevTools la comparaison tools locaux / tools serveur / surface effective.

## Risques connus

1. L'image Docker n'est pas consideree valide tant que son build et son demarrage n'ont pas ete executes.
2. Un port ouvert ne prouve pas que DomOS est pret a creer des sessions.
3. Le proxy de reference ne remplace pas la validation des timeouts et WebSockets de la plateforme finale.
4. LiveKit self-hosted demande TURN, ports UDP/TCP, TLS, supervision et eventuellement Redis; LiveKit Cloud reste recommande pour le premier deploiement.
5. Aucun secret ne doit etre place dans le bundle widget, les logs, le dashboard ou les metadata LiveKit.

## Gate de passage en ready for review

La PR #5 peut quitter le statut draft uniquement lorsque :

- [ ] l'image Docker build et demarre ;
- [ ] Compose est valide ;
- [ ] les builds/tests touches passent ;
- [ ] liveness/readiness sont finalisees ;
- [ ] le parcours public widget + LiveKit est prouve, ou explicitement reporte avec un environnement de staging planifie ;
- [ ] aucun secret n'apparait dans l'image, les logs ou le frontend.

## Prochaine action recommandee

Commencer par la validation locale du packaging existant. Corriger d'abord tout echec du Dockerfile ou de `pnpm deploy`, puis ajouter liveness/readiness avant le smoke test public.
