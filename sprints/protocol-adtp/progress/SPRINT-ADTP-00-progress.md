# Progression de la piste ADTP

Dernière mise à jour : 2026-07-17

## Phase actuelle

**Architecture et rédaction détaillée terminées pour la piste ADTP.**

L'implémentation n'a pas commencé. Le prochain mouvement autorisé est la
validation produit d'ADTP-00, puis l'implémentation de ce seul sprint.

## Décisions acquises

- [x] Conserver l'enveloppe ADTP `id/type/timestamp/payload/meta`.
- [x] Exclure JSON-RPC et tout message RPC générique.
- [x] Séparer le transport de contrôle et le transport média.
- [x] Garder WebSocket comme politique média par défaut.
- [x] Rendre WebRTC explicite et `auto` opt-in.
- [x] Conserver le cycle mount/unmount du Neural-DOM Binding.
- [x] Maintenir les messages historiques pendant la ligne `1.x`.
- [x] Décrire cinq lots ordonnés, chacun avec contrats, tâches, fichiers, tests
  et DoD.

## Décisions produit à valider avant code

- [ ] Version cible additive `ADTP 1.1.0`.
- [ ] Même version majeure + version commune la plus élevée.
- [ ] `fallback: 'none'` par défaut pour une demande explicite WebRTC.
- [ ] `fallback: 'websocket'` par défaut pour `auto`.
- [ ] Noms publics des messages `MEDIA_*` et `TOOLS_EFFECTIVE`.
- [ ] Maintien de `HandshakeInitPayload.apiKey` uniquement comme champ déprécié
  de compatibilité jusqu'à `2.0.0`.

## Preuves de cartographie utilisées

- `DomOSServer.handleConnection()` envoie actuellement `HANDSHAKE_ACK` avant
  réception de `HANDSHAKE_INIT`.
- `DomOSServer.handleMessage()` applique ensuite une égalité stricte de version.
- `AUDIO_STREAM` est classé downstream mais traité comme input client.
- `WebRTCTransport` transporte ADTP sur DataChannel et n'implémente pas de piste
  audio provider.
- `handleContextUpdate()` pousse `updateTools()` sans attendre de résultat.
- `ToolCallPayload` et `ToolResultPayload` n'ont pas de révision.

## Livrables de rédaction

- [x] `README.md` : finalité, état réel et ordre obligatoire.
- [x] `SPRINT-ADTP-00-compatibility-contract.md` : handshake et matrice.
- [x] `SPRINT-ADTP-01-media-negotiation.md` : sélection média provider-neutral.
- [x] `SPRINT-ADTP-02-streaming-turn-contract.md` : audio, tours et barge-in.
- [x] `SPRINT-ADTP-03-tool-lifecycle-revision.md` : montage/démontage et révisions.
- [x] `SPRINT-ADTP-04-conformance-migration.md` : fixtures, conformité et release.

## Revue d'intégrité du 2026-07-17

Le premier passage de `code_reviewer_54` a refusé la clôture. Corrections
appliquées :

- [x] `PROTOCOL_ERROR` n'est plus utilisé pour signaler l'absence de version
  commune avant négociation.
- [x] La traduction normative `audio` vers `audio.legacy` est documentée et doit
  être testée dans les deux sens.
- [x] ADTP-03 inclut maintenant les points d'intégration indispensables
  `voice/contracts.ts`, `DomOSServer`, `SessionManager`, `ToolRouter` et
  `DomOSClient`.
- [x] `LiveSession.syncTools()` est additive; `updateTools(): void` reste legacy
  et ne peut jamais produire un faux statut `applied`.
- [x] La DoD d'ADTP-02 ne prétend plus prouver l'E2E hors de son scope.
- [x] ADTP-04 nomme les deux vrais points de décodage WebSocket/DataChannel.
- [x] Le fallback historique inclut `VOICE_STATE_EVENT`.
- [x] Re-review code reviewer terminée : six findings fermés, aucun nouveau
  blocage d'implémentabilité.
- [x] Première revue sécurité terminée avec verdict `unsafe` avant corrections.
- [x] ADTP-01 exige auth/origin/lineToken et limites avant allocation WebRTC.
- [x] ADTP-03 lie calls/réponses/approbations à session+connexion et traite les
  approvals stale après unmount/destroy.
- [x] Le handshake legacy utilise une sentinelle non secrète; les logs invalides
  ne doivent plus recopier le payload brut.
- [x] Re-review runtime sécurité : `Unsafe` attendu tant que les sprints ne sont
  pas implémentés. Les cinq remédiations et leurs tests sont présents dans le
  plan; la clôture sécurité runtime appartient aux futures implémentations.

## Prochaine étape persistée

1. Faire relire la piste par `code_reviewer_54` et `security_reviewer_54`.
2. Présenter au porteur uniquement les décisions listées plus haut.
3. Après validation, implémenter **ADTP-00 uniquement**.
4. Enregistrer commandes, tests, écarts et fichiers réellement modifiés ici.
5. Ne préparer ADTP-01 pour implémentation qu'après DoD complète d'ADTP-00.

## Definition of Done de la phase de rédaction

- [x] Chaque sprint est un lot autonome et non un résumé.
- [x] Chaque contrat cible indique son fichier source.
- [x] Chaque lot contient tâches numérotées, fichiers autorisés, sécurité, tests,
  compatibilité, hors scope et DoD.
- [x] Les limites réelles du code actuel sont citées.
- [x] Relecture code reviewer terminée.
- [x] Relecture sécurité du plan terminée; runtime actuel explicitement non clos.
- [ ] Décisions produit validées.
