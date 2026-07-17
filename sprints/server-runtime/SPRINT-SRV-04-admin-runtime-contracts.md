# Sprint SRV-04 - Contrats admin du runtime

## 1. Fiche du sprint

| Champ | Valeur |
| --- | --- |
| Statut | Après SRV-03 |
| Domaine | API opérationnelle consommée par le dashboard |
| Objectif | Configurer et observer l'essentiel d'un agent en production |
| Interdit | Playground, pipeline editor, console provider brute |

## 2. Résultat observable

Le dashboard peut créer/modifier un agent, choisir parmi les adapters enregistrés,
voir les modèles/voix/capacités, puis identifier les sessions et erreurs de cet
agent. Chaque contrôle affiché possède une vraie route et une validation.

## 3. Routes cibles

Sous le base path admin existant :

```text
GET    /providers
GET    /agents
GET    /agents/:id
POST   /agents
PUT    /agents/:id
DELETE /agents/:id
POST   /agents/:id/validate
GET    /agents/:id/runtime-status
```

Les routes historiques de prompts restent des aliases `1.x` vers le prompt de
l'agent associé. Les paths exacts doivent respecter le routeur existant et être
capturés dans les tests de contrat.

## 4. Contrats cibles

```ts
export interface AdminAdapterStatus {
  adapterId: string;
  kind: AdapterKind;
  state: 'configured' | 'missing_credential' | 'unavailable' | 'ready';
  model?: string;
  voice?: string;
  capabilities?: Record<string, boolean | string | string[]>;
}

export interface AdminRuntimeStatus {
  agentId: string;
  agentName: string;
  revision: number;
  valid: boolean;
  text: AdminAdapterStatus;
  voice?:
    | AdminAdapterStatus
    | {
        mode: 'pipeline';
        stt: AdminAdapterStatus;
        tts: AdminAdapterStatus;
      };
  activeSessions: number;
  sessionsOnOlderRevision: number;
  lastError?: {
    code: string;
    occurredAt: number;
    correlationId: string;
  };
}
```

Jamais de credential, endpoint privé, SDP, token, transcript ou erreur provider
brute.

## 5. Règles produit

- Le dashboard configure un agent, pas un pipeline expérimental.
- `GET /providers` décrit ce qui est enregistré au boot ; il n'installe rien.
- Une modification d'agent affecte les nouvelles sessions.
- Les anciennes sessions affichent leur révision ; aucune mutation silencieuse.
- Un health check réseau est opt-in, borné et mis en cache ; il n'est pas lancé à
  chaque rendu du dashboard.
- Credential « configuré » signifie référence résoluble, jamais valeur révélée.

## 6. Tâches

### Tâche 1 - Catalogue des factories

- Ajouter la route dans `capabilities.routes.ts` ou une route provider dédiée.
- Retourner uniquement `AdapterFactoryDescriptor` et capacités sûres.
- Distinguer factory enregistrée, credential présent et provider joignable.
- Erreur d'une factory ne casse pas les autres descriptors.

### Tâche 2 - CRUD agent

- Réutiliser `AgentDefinitionResolver`, schémas et store.
- `expectedRevision` obligatoire pour update/delete.
- Auditer create/update/delete/enable/disable sans secret.
- Refuser suppression avec sessions actives, sauf politique `force` explicitement
  validée par le porteur et testée.
- `validate` ne sauvegarde pas et ne crée aucune session payante.

### Tâche 3 - Corriger l'identité des sessions

- Ajouter `agentId`, `agentName`, `agentRevision`, mode vocal, adapters et
  transport effectif aux summaries/détails.
- Ne plus déduire le nom uniquement du prompt ou de la clé.
- Préserver un fallback legacy clairement marqué.
- Les sessions de révision ancienne restent identifiables.

### Tâche 4 - Runtime status et erreurs

- Construire le status depuis registry, resolver et coordinator.
- Normaliser les erreurs et supprimer cause provider.
- Exposer seulement correlationId pour investigation serveur.
- Ne pas effectuer de création adapter pour une simple lecture de status.

### Tâche 5 - Compatibilité prompts et voice config

- Conserver routes prompts comme façade de compatibilité.
- Documenter priorité agent runtime > defaults boot seulement après validation.
- Remplacer progressivement `RuntimeVoiceConfig` global par la définition agent.
- Une route legacy ne peut pas modifier tous les agents silencieusement.

### Tâche 6 - Tests et handoff UI

- CRUD, conflit de révision, validation dry-run.
- Provider inconnu et credential manquant sans fuite.
- Agent désactivé et suppression avec session active.
- Session affiche vrai nom/révision/runtime.
- Routes prompts historiques toujours fonctionnelles.
- Produire fixtures/types consommés par `sprints/dashboard-admin/`.

## 7. Fichiers autorisés

Routes/services admin extraits en SRV-01, presenters runtime, persistence et tests
AdminAPI. `packages/ui` est hors scope.

## 8. Sécurité

- Toutes les routes restent sous l'auth admin existante.
- Body borné et schéma strict.
- Aucun secret dans lecture, validation, audit ou erreur.
- Update optimiste par révision pour éviter écrasement concurrent.
- Health check protégé contre SSRF : endpoints viennent des factories enregistrées,
  jamais du body admin.

## 9. Definition of Done

- [ ] Chaque configuration utile possède API, validation et persistence.
- [ ] Sessions remontent identité et runtime effectifs.
- [ ] Secrets et erreurs providers sont redigés.
- [ ] Updates n'altèrent pas les sessions actives silencieusement.
- [ ] Prompts/voice config legacy restent compatibles et explicitement dépréciés.
- [ ] Fixtures UI publiées sans importer le package serveur dans le navigateur.
- [ ] Tests AdminAPI et build serveur passent.
- [ ] Handoff `dashboard-admin` persisté.

## 10. Commit

`feat(server): expose operational agent runtime administration`

