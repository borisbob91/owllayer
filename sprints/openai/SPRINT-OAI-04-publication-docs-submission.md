# Sprint OAI-04 - Validation, documentation et soumission

Statut : **après clôture de OAI-01, OAI-02 et OAI-03**

## 1. Résultat attendu

Un développeur externe doit pouvoir installer DomOS, configurer OpenAI côté
serveur et exécuter quatre parcours réels sans connaître les détails internes :

1. conversation texte avec Responses API ;
2. tool UI avec approbation HITL et retour au modèle ;
3. conversation Realtime GA par WebSocket ;
4. WebRTC explicite puis `auto` avec preuve du fallback.

La documentation ne présente que les capacités livrées et testées. Elle ne sert
pas à annoncer LiveKit, SIP, des modèles preview ou des options en backlog.

## 2. Architecture documentaire

```text
apps/docs-site/src/content/docs/openai/
  index.mdx                 # choix texte/realtime et prérequis
  responses.mdx             # adapter texte et tools
  realtime-websocket.mdx    # mode par défaut
  realtime-webrtc.mdx       # webrtc explicite et auto
  tools-hitl-sideband.mdx   # autorité serveur et cycle de vie
  troubleshooting.mdx       # erreurs, limites et fallback
```

Le guide suit les patterns des dossiers React et adapters existants : imports
complets, configuration serveur réelle, composant client réel, résultat attendu
et limites. Il renvoie vers la documentation OpenAI officielle pour les modèles,
prix, quotas et détails provider susceptibles d'évoluer.

## 3. Tâches

### Tâche 1 - Stabiliser une démo unique

Étendre `apps/demo-server` et l'application `apps/demo` existantes. Ne pas créer
une seconde architecture d'exemple. La configuration se fait par variables
d'environnement serveur ; aucune clé n'entre dans un fichier client ou le build.

### Tâche 2 - Documenter Responses

Expliquer installation, création de `OpenAIAdapter`, prompt, tools, tool client,
HITL, streaming réellement supporté, erreurs et cleanup. Montrer l'usage DomOS,
pas un tutoriel brut du SDK OpenAI.

### Tâche 3 - Documenter Realtime WebSocket

Présenter ce mode en premier : configuration de `OpenAILiveAdapter`, formats
attendus, SDK client, interruption et cycle de fermeture. Expliquer que le média
transite par DomOS et qu'aucune configuration WebRTC n'est nécessaire.

### Tâche 4 - Documenter WebRTC et `auto`

Montrer l'option serveur et l'option/client capability requise, le transport
sélectionné, les raisons de fallback et les contraintes d'origine/session. Ne
jamais demander au développeur de placer une clé durable dans le navigateur.

### Tâche 5 - Documenter sideband, tools et HITL

Inclure un diagramme de séquence client/ADTP/serveur/OpenAI, puis illustrer le
mount d'un composant, la synchronisation du tool, l'appel, l'approbation, le
résultat et l'unmount qui désynchronise le tool côté serveur.

### Tâche 6 - Matrice de tests de publication

Ajouter tests unitaires adapters, contrats serveur, intégration mockée, e2e
navigateur du SDK pilote et tests de packaging. Les tests live avec clé sont
opt-in, protégés par variable d'environnement et absents des logs CI.

### Tâche 7 - Préparer la soumission

Vérifier exports npm, README package, licence, changelog, provenance des assets,
versions Node/pnpm, commandes reproductibles et liste honnête des limitations.
Faire une revue code, sécurité et documentation avant toute soumission.

## 4. Scénarios d'acceptation

- texte simple puis tool serveur ;
- tool UI synchronisé, HITL accepté/refusé, résultat propagé ;
- session WebSocket audio avec interruption et fermeture ;
- WebRTC explicite réussi ;
- `auto` réussi en WebRTC puis fallback WebSocket simulé ;
- perte ADTP fermant une session WebRTC ;
- erreur 401/429 sans secret dans UI/logs ;
- démontage composant retirant le tool de la session serveur.

## 5. Fichiers cibles

- dossier `apps/docs-site/src/content/docs/openai/` ci-dessus ;
- navigation/configuration du docs-site ;
- `packages/adapter-openai/README.md` ;
- `apps/demo-server/` et `apps/demo/` ;
- tests adapter/server/client concernés ;
- `packages/adapter-openai/package.json` et changelog si présents.

## 6. Commandes de validation

Les filtres exacts doivent suivre les noms de manifests : tests et builds de
core, adapter-openai, server, SDK pilote, demo, docs-site, puis `pnpm build` à la
racine. Vérifier également les imports provider dans les SDK avec `rg`.

## 7. Definition of Done

- [ ] Les quatre parcours sont reproductibles depuis un clone propre.
- [ ] Les exemples utilisent les applications existantes.
- [ ] Aucun secret durable n'est présent côté client, fixture ou capture.
- [ ] Chaque option documentée correspond à un contrat public exporté.
- [ ] Sideband, tools, HITL et cleanup sont expliqués et testés.
- [ ] WebSocket est présenté comme défaut ; WebRTC et `auto` sont explicites.
- [ ] Modèles, limites et fallbacks sont exacts au jour de publication.
- [ ] CI, packaging, licence et changelog sont validés.
- [ ] Revues code, sécurité et documentation sont clôturées.

## 8. Hors scope

Ajouter une feature pour embellir la soumission, LiveKit, SIP, téléphonie,
built-in tools non intégrés et stockage de clés OpenAI dans le dashboard.

## 9. Commit recommandé

`docs(openai): publish verified domos integration guides`
