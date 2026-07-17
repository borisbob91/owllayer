# Progression de la piste runtime serveur

Dernière mise à jour : 2026-07-17

## Phase actuelle

Architecture et rédaction détaillée terminées. Aucune implémentation du runtime
provider-neutral n'a commencé.

## Preuves utilisées

- [x] `DomOSServerOptions` reçoit des instances globales.
- [x] `DomOSServer.ts` dépasse 1 700 lignes.
- [x] `AdminAPI.ts` fait environ 1 457 lignes.
- [x] `AgentRecord` ne contient qu'API key et prompt.
- [x] Aucun registry, resolver ou coordinator n'existe.
- [x] Les hooks `SessionManager` ne sont pas composables.
- [x] Les noms d'agent admin sont actuellement déduits de plusieurs fallbacks.

## Livrables

- [x] README avec architecture, invariants et ordre obligatoire.
- [x] SRV-00 : identité et définition runtime.
- [x] SRV-01 : découpage AdminAPI comportement constant.
- [x] SRV-02 : factories et credentials.
- [x] SRV-03 : runtime isolé par session et cleanup.
- [x] SRV-04 : API agents/providers/status pour dashboard.

## Décisions produit avant implémentation

- [ ] Identité recommandée `agentId` stable + `ApiKeyRecord.agentId`, ou maintien
  strict « une API key = un agent ».
- [ ] Suppression forcée d'un agent avec sessions actives : interdite ou fermeture
  explicite des sessions.
- [ ] Politique de dégradation voice -> text autorisée par défaut ou uniquement
  quand déclarée dans l'agent. Recommandation : uniquement déclarée.
- [ ] Durée du support du constructeur legacy dans la ligne `1.x`.

## Ordre d'implémentation

1. Valider les décisions ci-dessus.
2. Implémenter SRV-00 uniquement et migrer les stores.
3. Exécuter la DoD et inscrire preuves/écarts ici.
4. Refactorer AdminAPI via SRV-01 sans nouvelles routes.
5. Livrer registry/credentials SRV-02.
6. Livrer coordinator SRV-03.
7. Ajouter les contrats admin SRV-04.
8. Préparer ensuite le dashboard, OpenAI et Deepgram.

## Definition of Done de la rédaction

- [x] Chaque sprint contient résultat final, état source, contrats et tâches.
- [x] Les fichiers autorisés et hors scope sont explicites.
- [x] Compatibilité legacy et migrations sont décrites.
- [x] Tests, sécurité et cleanup sont intégrés.
- [x] Aucun provider concret n'est placé dans core/server.
- [x] La prochaine étape est persistée.

