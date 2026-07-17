# Sprint SRV-00 - Identité agent et définition runtime

## 1. Fiche du sprint

| Champ | Valeur |
| --- | --- |
| Statut | En attente de validation de l'identité persistée |
| Domaine | Contrats et persistence serveur |
| Objectif | Décrire un agent et sa composition sans instance ni secret |
| Bloque | Registry, coordinator, dashboard agents, OpenAI et Deepgram configurables |
| Hors livraison | Création effective des adapters |

## 2. Résultat observable

Le serveur peut charger une définition d'agent nommée et validée pour une API
key, avec un adapter texte obligatoire et une voix optionnelle en pipeline ou
realtime. La définition est sérialisable, versionnée, provider-neutral et ne
contient jamais un credential résolu.

## 3. État source

- `packages/server/src/persistence/types.ts::AgentRecord` contient uniquement
  `{ apiKey, prompt, createdAt, updatedAt }`.
- `AgentStore.load(apiKey)` impose actuellement « une clé = un record ».
- `ApiKeyRecord.name` sert partiellement de nom d'agent dans AdminAPI.
- `AdminAPI.getSessionRuntimeMeta()` cherche l'agent par `record.apiKey` puis
  déduit son nom du prompt, de la clé ou de l'adapter global.
- `DomOSServer.handleTextInput()` charge le prompt par `session.apiKey`, mais
  appelle toujours `this.llm`.
- Le live et le pipeline utilisent `this.live`, `this.stt`, `this.tts` globaux.

## 4. Décision produit à valider

### Option recommandée : identité découplée

`AgentDefinition.id` est stable et `ApiKeyRecord.agentId` référence l'agent.
Plusieurs clés peuvent représenter le même agent. Une rotation/révocation de clé
ne duplique ni ne supprime sa configuration.

Migration : un ancien record `{ apiKey, prompt }` devient un agent avec
`id = stableLegacyAgentId(apiKey)` ; la clé existante reçoit cet `agentId`.

### Option minimale : identité par API key

Conserver `apiKey` comme clé primaire de l'agent. Cette option réduit la migration
mais maintient le couplage entre secret, identité et configuration.

Le développeur ne tranche pas ce choix. Il consigne la décision du porteur dans
la progression avant la tâche 2. Les contrats runtime ci-dessous restent valides
dans les deux cas.

## 5. Contrats cibles

Fichier à créer : `packages/server/src/runtime/contracts.ts`.

```ts
export type AdapterKind = 'text' | 'live' | 'stt' | 'tts';

export interface AdapterReference {
  adapterId: string;
  model?: string;
  credentialRef?: string;
  config?: Record<string, unknown>;
}

export type VoiceRuntimeDefinition =
  | {
      mode: 'pipeline';
      stt: AdapterReference;
      tts: AdapterReference;
      mediaTransport?: 'websocket' | 'webrtc' | 'auto';
    }
  | {
      mode: 'realtime';
      live: AdapterReference;
      mediaTransport?: 'websocket' | 'webrtc' | 'auto';
    };

export interface AgentRuntimeDefinition {
  text: AdapterReference;
  voice?: VoiceRuntimeDefinition;
  language?: string;
  voiceId?: string;
}

export interface AgentDefinition {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  prompt: SystemPrompt;
  runtime: AgentRuntimeDefinition;
  createdAt: number;
  updatedAt: number;
  revision: number;
}
```

`adapterId` est un identifiant enregistré comme `openai.text`, jamais un chemin
de module. `config` est validé par la factory correspondante dans SRV-02. Il ne
peut contenir ni fonction, ni instance, ni clé API.

## 6. Résolution attendue

1. Le transport authentifie la clé.
2. Le resolver obtient l'identité agent ou le fallback legacy.
3. Il charge une définition active et valide sa structure.
4. Il produit un snapshot immuable avec la révision utilisée.
5. SRV-03 crée ensuite les adapters de session.
6. Agent absent, désactivé ou invalide : refus avant tout input LLM.

## 7. Tâches

### Tâche 1 - Types et schémas

**Fichiers :** créer `runtime/contracts.ts`, `runtime/schemas.ts`; modifier
`packages/server/src/index.ts`.

- Ajouter les contrats complets ci-dessus et leurs schémas Zod stricts.
- Borner IDs, noms, descriptions, prompt et profondeur de `config`.
- Refuser une définition pipeline sans STT ou TTS.
- Refuser un adapter realtime dans le champ texte et inversement.
- Ne pas exporter ces types depuis `@domos/core`.

### Tâche 2 - Faire évoluer `AgentStore`

**Fichiers :** `persistence/types.ts`, `MemoryAgentStore.ts`, stores SQLite/Mongo
existants, tests contractuels stores.

- Appliquer l'option d'identité validée.
- Ajouter `revision` et mise à jour avec révision attendue.
- Écrire une migration prompt-only idempotente.
- Ne jamais persister credentials résolus ou instances.
- Conserver une façade legacy dépréciée pendant `1.x`.

### Tâche 3 - Lier API key et agent

**Fichiers :** `ApiKeyRecord`, stores de clés, `ClientAuthManager` uniquement si
la résolution l'exige, tests.

- Avec l'option recommandée, ajouter `agentId?: string` à la clé.
- Une clé sans agent continue d'utiliser la composition legacy du boot.
- Rotation et révocation ne suppriment jamais l'agent.
- Aucun endpoint ne renvoie la valeur brute de la clé avec la définition.

### Tâche 4 - Créer `AgentDefinitionResolver`

```ts
export interface AgentDefinitionResolver {
  resolveForApiKey(apiKey: string): Promise<Readonly<AgentDefinition>>;
}
```

- Retour immuable.
- Erreurs normalisées `AGENT_NOT_FOUND`, `AGENT_DISABLED`,
  `AGENT_CONFIG_INVALID`, `AGENT_REVISION_CONFLICT`.
- Aucun secret dans erreurs ou logs.
- Le fallback legacy est explicite et observable, jamais silencieux.

### Tâche 5 - Tests

- Record legacy prompt-only et double exécution de migration.
- Agent texte, pipeline, realtime.
- Agent désactivé, inconnu et config invalide.
- Deux clés vers un agent si l'option recommandée est retenue.
- Rotation/révocation sans perte de définition.
- Update concurrent avec mauvaise révision.
- Vérification qu'aucun objet persisté ne contient `apiKey`, `token`, `secret`
  ou instance adapter dans `runtime`.

## 8. Fichiers autorisés

| Fichier/zone | Action |
| --- | --- |
| `packages/server/src/runtime/contracts.ts` | Créer |
| `packages/server/src/runtime/schemas.ts` | Créer |
| `packages/server/src/runtime/AgentDefinitionResolver.ts` | Créer |
| `packages/server/src/persistence/types.ts` | Modifier |
| Stores agents/clés existants | Modifier |
| `packages/server/src/index.ts` | Modifier |
| Tests contractuels associés | Créer/modifier |

`DomOSServer`, AdminAPI, UI et adapters providers sont hors scope.

## 9. Sécurité

- La définition contient des références, jamais des valeurs secrètes.
- `config` est non fiable jusqu'à validation par la factory.
- Le resolver ne logue jamais l'API key brute.
- La migration ne copie pas la clé dans `agentId`, les URLs ou les événements.

## 10. Definition of Done

- [ ] Décision d'identité validée et persistée.
- [ ] Contrats complets et schémas provider-neutral.
- [ ] Migration legacy idempotente et testée sur tous les stores supportés.
- [ ] Résolution déterministe avec erreurs normalisées.
- [ ] Aucun secret, package dynamique ou instance dans la définition.
- [ ] Exports publics server et documentation de compatibilité à jour.
- [ ] Tests et build serveur passent.
- [ ] Prochaine étape SRV-01 inscrite dans la progression.

## 11. Commit

`feat(server): define provider-neutral agent runtime configuration`

