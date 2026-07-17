# Sprint ADTP-03 - Révision des tools et cycle Neural-DOM Binding

## 1. Fiche du sprint

| Champ | Valeur |
| --- | --- |
| Statut | Planifié après ADTP-02 |
| Domaine | Contrat core + application server/client de la surface de tools |
| Intention | Prouver qu'un tool monté est disponible et qu'un tool démonté ne l'est plus |
| Entrée | `CONTEXT_UPDATE`, registry client, tools serveur et éventuelle session live |
| Sortie | Révisions monotones, accusé explicite et rejet sûr des appels obsolètes |

## 2. Besoin produit final

Dans DomOS, un composant UI monté publie ses tools dans le Shadow Context. Quand
le composant est démonté, ces tools doivent disparaître du client, de la session
serveur et de l'adapter actif. Cette propriété est le cœur du Neural-DOM Binding :
l'agent ne doit voir et appeler que les actions réellement disponibles dans
l'interface courante.

Le démontage doit être sûr même si :

- un update provider est lent ou non supporté en milieu de session ;
- un tool call de l'ancienne révision arrive en retard ;
- un tool client porte le même nom qu'un tool serveur ;
- le réseau réordonne deux `CONTEXT_UPDATE` ;
- le composant disparaît pendant une demande HITL ou l'exécution du tool.

## 3. État source vérifié

- `ContextUpdatePayload` contient `activeTools` sans numéro de révision.
- `DomOSClient.registerTool()` et le cycle de démontage renvoient un
  `CONTEXT_UPDATE` avec la liste active.
- `DomOSServer.handleContextUpdate()` remplace le contexte, calcule
  `buildEffectiveToolsPayload()` puis envoie un `SYSTEM_EVENT` de type
  `tools_effective` avec un `Record<string, unknown>`.
- Les tools serveur sont prioritaires ; un conflit client est ignoré et loggé.
- Si une `LiveSession` est active, `updateTools(tools)` est appelé sans `await`,
  sans résultat et sans preuve que le provider a appliqué la nouvelle surface.
- `ToolCallPayload` ne précise pas la révision de tools utilisée.
- `ToolResultPayload` n'a pas de code structuré pour « tool démonté ».

## 4. Invariants d'architecture

- Le serveur reste l'autorité de la surface effective.
- Le client fournit une révision monotone de sa déclaration ; le serveur fournit
  une révision monotone de la surface fusionnée.
- Un update ancien ou dupliqué n'écrase jamais une révision plus récente.
- Le retrait est appliqué au routeur serveur avant la synchronisation provider.
- Un provider incapable de retirer dynamiquement un tool ne rend pas le tool
  exécutable : l'appel tardif est rejeté et la stratégie de session est signalée.
- Les tools UI s'exécutent uniquement sur le client via ADTP ; un adapter ou
  provider ne reçoit jamais leur handler JavaScript.
- Les règles HITL et la priorité des tools serveur restent inchangées.
- Le protocole décrit l'état du runtime, pas le nom du provider.

## 5. Contrats cibles complets

### 5.1 Étendre `ContextUpdatePayload`

Dans `packages/core/src/protocol/adtp.types.ts` :

```ts
export interface ContextUpdatePayload {
  url: string;
  title?: string;
  activeTools: ToolDeclaration[];
  context?: Record<string, unknown>;
  /** Compteur client strictement croissant pour cette connexion. */
  contextRevision?: number;
  /** Compteur client strictement croissant à chaque changement de tools. */
  clientToolRevision?: number;
}
```

Les champs sont optionnels pour conserver la compatibilité `1.0`. Si la capacité
`tools.revisions.v1` est active, ils deviennent obligatoires par validation
contextuelle dans le client et le serveur.

### 5.2 Remplacer le payload non typé `tools_effective`

```ts
export type RuntimeToolSyncStatus =
  | 'not_required'
  | 'applied'
  | 'pending'
  | 'requires_session_restart'
  | 'unsupported'
  | 'failed';

export interface EffectiveToolsPayload {
  /** Champs requis uniquement avec la capacité tools.revisions.v1. */
  clientToolRevision?: number;
  effectiveToolRevision?: number;
  effectiveTools: ToolDeclaration[];
  serverTools: ToolDeclaration[];
  clientTools: ToolDeclaration[];
  /** Forme historique conservée pendant toute la ligne 1.x. */
  ignoredClientTools: ToolDeclaration[];
  /** Détails additifs pour les clients ayant négocié tools.revisions.v1. */
  ignoredClientToolDetails?: Array<{
    tool: ToolDeclaration;
    reason: 'server_name_collision' | 'invalid_declaration' | 'policy_denied';
  }>;
  runtimeSync?: {
    status: RuntimeToolSyncStatus;
    appliedRevision?: number;
    reason?: string;
  };
}
```

Ajouter `TOOLS_EFFECTIVE` comme `MessageType` downstream et une factory
`Messages.toolsEffective(payload)`. Conserver le `SYSTEM_EVENT tools_effective`
uniquement pour les sessions sans capacité de révision.

### 5.3 Corréler les appels et résultats

```ts
export interface ToolCallPayload {
  callId: string;
  name: string;
  args: Record<string, unknown>;
  effectiveToolRevision?: number;
}

export type ToolResultErrorCode =
  | 'TOOL_NOT_FOUND'
  | 'TOOL_UNAVAILABLE'
  | 'TOOL_REVISION_STALE'
  | 'TOOL_EXECUTION_ERROR'
  | 'TOOL_TIMEOUT'
  | 'TOOL_APPROVAL_DENIED';

export type ToolResultPayload =
  | {
      callId: string;
      status: 'success';
      result: unknown;
      effectiveToolRevision?: number;
    }
  | {
      callId: string;
      status: 'error';
      /** Optionnels dans le schéma 1.0; requis avec tools.revisions.v1. */
      error?: string;
      errorCode?: ToolResultErrorCode;
      effectiveToolRevision?: number;
      result?: unknown;
    }
  | {
      callId: string;
      status: 'pending_approval';
      effectiveToolRevision?: number;
      result?: unknown;
    };
```

Les nouveaux champs restent optionnels hors capacité `tools.revisions.v1`.

### 5.4 Résultat de synchronisation côté runtime voix

Ce contrat n'est pas un message ADTP, mais il est requis pour que le serveur
puisse produire honnêtement `runtimeSync`. Il est ajouté de façon compatible
dans `packages/core/src/voice/contracts.ts` :

```ts
export interface ToolSyncRequest {
  revision: number;
  tools: ToolDeclaration[];
}

export type ToolSyncResult =
  | { status: 'applied'; revision: number }
  | { status: 'requires_session_restart'; revision: number; reason: string }
  | { status: 'unsupported'; revision: number; reason: string }
  | { status: 'failed'; revision: number; reason: string; retryable: boolean };

export interface LiveSession {
  /** Nouveau contrat vérifiable; les adapters migrent progressivement. */
  syncTools?(request: ToolSyncRequest): Promise<ToolSyncResult>;
  /** @deprecated Compatibilité 1.x; un retour void ne prouve pas l'application. */
  updateTools?(tools: ToolDeclaration[]): void;
}
```

La session émettrice n'est jamais acceptée depuis le payload. La connexion reçue
par le transport est l'autorité. Les API serveur cibles sont :

```ts
handleToolResult(session: Session, payload: ToolResultPayload): void;
handleApprovalResponse(session: Session, payload: ApprovalResponsePayload): void;
```

Chaque entrée pending conserve `sessionId`, `connId`, `callId` complet et
`effectiveToolRevision`. Un mismatch est rejeté sans consommer l'entrée légitime.

`syncTools` est additive : aucun adapter existant ne casse à la compilation. Si
seul `updateTools` existe, le serveur peut l'appeler pour préserver le
comportement historique, mais publie `runtimeSync.status = 'pending'`, jamais
`applied`. Sans aucune méthode, il publie `unsupported`. Les sprints providers
migrent ensuite vers `syncTools` et doivent retourner un résultat réel.

## 6. Flux de montage et démontage

### 6.1 Montage

1. Le SDK enregistre le handler local dans son `ToolRegistry`.
2. Il incrémente `clientToolRevision` et envoie la liste complète dans
   `CONTEXT_UPDATE`.
3. Le serveur rejette une révision inférieure, accepte une révision supérieure,
   fusionne tools serveur/client et incrémente `effectiveToolRevision` seulement
   si la surface effective change.
4. Le routeur serveur publie immédiatement la nouvelle surface autorisée.
5. Le serveur envoie immédiatement `TOOLS_EFFECTIVE` avec l'état
   `not_required`, `pending` ou `unsupported`.
6. Le runtime live synchronise cette révision; si `syncTools` est disponible, le
   serveur envoie un second `TOOLS_EFFECTIVE` avec son résultat final.

### 6.2 Démontage

1. Le SDK supprime d'abord le handler local pour empêcher une nouvelle exécution.
2. Il incrémente la révision et envoie la liste sans le tool.
3. Le serveur retire le tool client de la surface routable avant tout appel
   asynchrone à l'adapter.
4. Le runtime tente d'appliquer la nouvelle révision.
5. Si un restart est requis, le serveur ferme/recrée la session live selon la
   politique du server runtime, mais le tool reste indisponible pendant toute la
   transition.
6. `TOOLS_EFFECTIVE` confirme la surface et l'état de synchronisation.

### 6.3 Tool call tardif

- Si `effectiveToolRevision` est antérieure et le tool n'existe plus, le serveur
  ne route pas l'appel au client ; il renvoie au modèle
  `TOOL_UNAVAILABLE`/`TOOL_REVISION_STALE`.
- Si l'appel ADTP avait déjà atteint le client, le registry local revérifie le
  handler au moment exact de l'exécution et renvoie la même erreur structurée.
- Un résultat tardif après fermeture de l'appel est ignoré et journalisé sans
  rouvrir le tour.

### 6.4 HITL en cours

Si le composant est démonté pendant l'attente d'approbation, l'approbation ne
réactive pas le tool. La continuation vérifie à nouveau la révision et la présence
du handler ; elle termine par `TOOL_UNAVAILABLE` si le tool a disparu.

Le client ne stocke pas le handler dans `pendingApprovals`. Il stocke uniquement
`callId`, nom, arguments et révision; `resolveApproval()` relit le registry courant
et exige la même révision. `unregisterTool`, `unregisterToolsByComponent`,
`disconnect` et `destroy` purgent ou terminent les approbations concernées.

## 7. Tâches d'implémentation

### Tâche 1 - Étendre les contrats ADTP

**Fichiers :** `adtp.types.ts`, `adtp.validator.ts`, `adtp.serializer.ts`,
`adtp.capabilities.ts`, `packages/core/src/index.ts` et tests.

- Ajouter les révisions optionnelles et `TOOLS_EFFECTIVE`.
- Ajouter l'erreur structurée sans casser les résultats historiques.
- Valider les révisions comme entiers sûrs positifs ou nuls.
- Valider l'unicité des noms de tools dans chaque liste.

### Tâche 2 - Créer un calculateur pur de surface effective

**Fichier à créer :** `packages/core/src/tools/effective-tools.ts`.

```ts
export interface EffectiveToolsInput {
  serverTools: ToolDeclaration[];
  clientTools: ToolDeclaration[];
  previous?: EffectiveToolsSnapshot;
  clientToolRevision: number;
}

export interface EffectiveToolsSnapshot extends EffectiveToolsPayload {
  digest: string;
}

export function computeEffectiveTools(
  input: EffectiveToolsInput
): EffectiveToolsSnapshot;
```

Le calcul est déterministe, conserve la priorité serveur, ne dépend pas d'un
provider et n'incrémente la révision effective que si le digest canonique change.

### Tâche 3 - Câbler le runtime serveur de façon sûre

**Fichiers :** `packages/core/src/voice/contracts.ts`,
`packages/server/src/core/DomOSServer.ts`, `SessionManager.ts`, `ToolRouter.ts` et
tests serveur directement associés.

- Ajouter `syncTools` sans supprimer `updateTools`.
- Typer `handleContextUpdate()` avec `ContextUpdatePayload`.
- Persister les deux révisions sur la session et rejeter les updates anciens.
- Remplacer le calcul local par `computeEffectiveTools()`.
- Retirer la surface routable avant l'appel asynchrone au runtime live.
- Émettre l'ACK immédiat puis, si nécessaire, l'ACK final de synchronisation.
- Étendre `ToolRouter.route()` pour revalider présence et révision juste avant
  l'exécution serveur ou l'envoi de `TOOL_CALL` au client.
- Passer la session courante à `handleToolResult()` et
  `handleApprovalResponse()`; comparer `sessionId` et `connId` aux entrées
  pending avant résolution.
- Conserver le `callId` complet généré; supprimer la troncature à huit caractères.
- Revalider à nouveau après une approbation HITL et avant sa continuation.
- Nettoyer synchronisations, calls et approbations pending à la fermeture de la
  session et au shutdown.

### Tâche 4 - Câbler `DomOSClient`

**Fichiers :** `packages/core/src/client/DomOSClient.ts`, événements/types client
et tests client.

- Initialiser et incrémenter `contextRevision`/`clientToolRevision`.
- Traiter `TOOLS_EFFECTIVE` et exposer le dernier snapshot en lecture seule.
- Attacher la révision effective reçue aux résultats de tools.
- Vérifier l'existence du handler au moment exact de l'exécution; un handler
  retiré renvoie `TOOL_UNAVAILABLE` sans exécuter de callback.
- Ne conserver aucun handler dans `pendingApprovals`; recharger par nom et
  révision au moment de `resolveApproval()`.
- Purger/terminer les approbations lors d'un unregister, disconnect ou destroy.
- Réinitialiser les compteurs et snapshots à la reconnexion.

Les wrappers React/Angular/Vue/Svelte/Browser ne sont pas modifiés ici : ils
utilisent déjà les méthodes de registry de `DomOSClient`; leurs tests de cleanup
framework restent dans `client-media`.

### Tâche 5 - Tester le cycle end-to-end et préparer les adapters

- Premier montage et montage de plusieurs tools.
- Update de contexte sans changement de tools.
- Démontage simple et démontage du dernier tool.
- Révision dupliquée, ancienne, saut de révision et reconnexion.
- Collision serveur/client et déclaration invalide.
- Appel tardif, résultat tardif et démontage pendant HITL.
- Session B tente d'envoyer le `TOOL_RESULT` et l'`APPROVAL_RESPONSE` d'un call de
  session A : rejet, puis session A peut toujours terminer normalement.
- Destroy/unregister pendant HITL : aucun handler stale n'est exécuté.
- Faux adapter avec `syncTools`: `applied`, `requires_session_restart`,
  `unsupported`, `failed`.
- Adapter legacy avec seulement `updateTools`: état `pending`, jamais `applied`.
- Adapter sans méthode: état `unsupported` et appel stale rejeté par le serveur.

Dans la progression, lister chaque adapter réel qui doit implémenter `syncTools`.
Cette migration appartient à son sprint provider, mais la sécurité serveur ne
dépend pas de son achèvement.

## 8. Fichiers autorisés

| Fichier | Action |
| --- | --- |
| `packages/core/src/protocol/adtp.types.ts` | Modifier |
| `packages/core/src/protocol/adtp.validator.ts` | Modifier |
| `packages/core/src/protocol/adtp.serializer.ts` | Modifier |
| `packages/core/src/protocol/adtp.capabilities.ts` | Modifier |
| `packages/core/src/tools/effective-tools.ts` | Créer |
| `packages/core/src/voice/contracts.ts` | Modifier additivement |
| `packages/core/src/client/DomOSClient.ts` | Modifier |
| `packages/core/src/index.ts` | Modifier |
| `packages/server/src/core/DomOSServer.ts` | Modifier |
| `packages/server/src/core/SessionManager.ts` | Modifier |
| `packages/server/src/core/ToolRouter.ts` | Modifier |
| Tests/fixtures core, client et server associés | Créer/modifier |

## 9. Sécurité et robustesse

- Le nom et le schéma reçus du client sont non fiables et validés avant fusion.
- Un tool retiré est interdit avant la synchronisation provider, jamais après.
- Les approbations HITL ne contournent pas la vérification de révision.
- Les messages de collision ne divulguent pas l'implémentation ou les secrets du
  tool serveur.
- Les révisions utilisent des entiers sûrs et sont réinitialisées par connexion,
  pas persistées entre utilisateurs.
- Les listes de tools et schémas restent bornés par `DEFAULTS`.

## 10. Definition of Done

- [ ] Le cycle montage/démontage est décrit et automatisé par fixtures.
- [ ] `TOOLS_EFFECTIVE` remplace les données non typées pour les clients récents.
- [ ] Les révisions client et serveur sont distinctes et monotones.
- [ ] La priorité serveur et les collisions sont testées.
- [ ] Un tool démonté n'est plus routable, même si le runtime provider est lent.
- [ ] Les appels/résultats/HITL tardifs sont rejetés proprement.
- [ ] Un résultat ou une approbation d'une autre session ne peut pas résoudre un
  call pending, même avec le bon `callId`.
- [ ] Un unregister/destroy pendant HITL n'exécute jamais le handler capturé.
- [ ] Le helper de surface est pur, déterministe et couvert.
- [ ] `DomOSServer` et `ToolRouter` retirent le tool avant toute sync provider.
- [ ] `DomOSClient` revalide le handler juste avant exécution.
- [ ] Le faux adapter et les chemins legacy prouvent chaque état `runtimeSync`.
- [ ] La compatibilité sans `tools.revisions.v1` reste testée.
- [ ] Aucun handler client n'est transmis au serveur/provider.
- [ ] Le handoff server/client/SDK est complet et persistant.
- [ ] Build/tests core passent.
- [ ] La prochaine étape `ADTP-04` est inscrite dans la progression.

## 11. Hors scope

- Refactor général de `DomOSServer`; seules les méthodes tools sont touchées.
- Implémentation React/Angular/Vue/Svelte/Browser du cleanup.
- Migration des adapters réels vers `syncTools`.
- Politique concrète de restart propre à chaque provider.
- Évolution du dashboard.

## 12. Commit recommandé

`feat(protocol): version Neural-DOM tool lifecycle updates`
