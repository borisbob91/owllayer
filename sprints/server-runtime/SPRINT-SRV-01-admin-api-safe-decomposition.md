# Sprint SRV-01 - Découpage sûr d'AdminAPI

## 1. Fiche du sprint

| Champ | Valeur |
| --- | --- |
| Statut | Après SRV-00 |
| Type | Refactor comportement constant |
| Objectif | Préparer l'ajout du runtime sans agrandir `AdminAPI.ts` |
| Interdit | Nouvelle route, nouveau payload, provider ou changement UI |

## 2. Résultat observable

Toutes les routes admin existantes répondent exactement comme avant, mais le
routing et les responsabilités sont séparés. `AdminAPI.handleRequest()` reste la
façade unique appelée par `DomOSServer`.

## 3. Problème réel

`AdminAPI.ts` mélange auth, lecture body, sessions, tools, métriques, clés,
prompts, lignes, capacités, bridge, voix, événements et présentation. Ajouter les
agents/providers maintenant empêcherait une revue isolée et sûre.

## 4. Arborescence cible

```text
packages/server/src/admin/
  AdminAPI.ts
  AdminRequestContext.ts
  routes/
    status.routes.ts
    sessions.routes.ts
    tools.routes.ts
    metrics.routes.ts
    api-keys.routes.ts
    agents.routes.ts
    lines.routes.ts
    capabilities.routes.ts
    bridge.routes.ts
  services/
    AdminSessionPresenter.ts
    AdminEventService.ts
    AdminRedactionService.ts
```

Aucun framework HTTP ni dépendance supplémentaire.

## 5. Tâches

### Tâche 1 - Geler les routes actuelles

- Inventorier méthode, path, auth, status et shape de réponse.
- Ajouter fixtures/snapshots redigeant timestamps et IDs instables.
- Couvrir auth absente/invalide, méthode interdite, JSON invalide, route inconnue
  et body trop grand.
- Conserver les tests `AdminAPI.dashboard.test.ts` existants.

### Tâche 2 - Extraire le contexte HTTP

- Centraliser URL, lecture bornée du body, parsing JSON et `sendJSON`.
- Ne lire un body qu'une fois.
- Conserver CORS, headers, codes et format d'erreur.
- Centraliser redaction des erreurs et événements bridge.

### Tâche 3 - Extraire les routes une famille à la fois

- Déplacer une famille puis exécuter ses tests avant la suivante.
- Injecter seulement les dépendances nécessaires.
- Ne pas importer `DomOSServer` dans les routes.
- Ne pas déplacer de logique métier de `SessionManager` ou `ToolRouter`.

### Tâche 4 - Extraire les presenters

- Sortir sérialisation sessions/agents et métadonnées d'affichage.
- Préserver le fallback actuel du nom d'agent.
- Ne pas introduire encore `AgentDefinition` dans les réponses publiques.
- Conserver redaction des clés et erreurs bridge.

### Tâche 5 - Vérifier la composition

- `DomOSServer` injecte toujours toutes les dépendances requises.
- `AdminAPI.handleRequest()` reste la seule façade.
- Objectif mesurable : `AdminAPI.ts` sous 350 lignes.
- Aucun nouveau fichier extrait ne redevient un monolithe multi-domaines.

## 6. Fichiers autorisés

`packages/server/src/admin/**`, tests `AdminAPI*.test.ts` et ajustements d'import
strictement nécessaires dans `DomOSServer.ts`. Aucun `packages/ui`.

## 7. Tests obligatoires

- Matrice avant/après de toutes les routes.
- Redaction clés, tokens, messages provider/bridge.
- Échec d'un store ou bridge avec réponse dégradée identique.
- Body trop grand rejeté avant concaténation complète.
- Dashboard buildé contre les mêmes réponses.

## 8. Definition of Done

- [ ] Zéro changement observable des routes existantes.
- [ ] Auth, body limits et redaction centralisés.
- [ ] Chaque famille possède un test contractuel.
- [ ] `AdminAPI.ts` est une façade de composition lisible.
- [ ] Aucun CRUD runtime/provider ajouté.
- [ ] Tests serveur et build dashboard passent.
- [ ] Prochaine étape SRV-02 persistée.

## 9. Commit

`refactor(server): decompose admin api without behavior changes`

