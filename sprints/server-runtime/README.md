# Piste runtime serveur provider-neutral

## Finalité produit

Le serveur DomOS doit résoudre l'agent associé à une connexion, construire ses
adapters texte et voix, conserver le Neural-DOM Binding et libérer toutes les
ressources avec la session. Le dashboard configure et observe ce runtime ; il ne
charge pas de package npm, ne reçoit aucun secret et ne devient pas un laboratoire.

## État réel vérifié

- `packages/server/src/core/DomOSServer.ts` dépasse 1 700 lignes et concentre
  transport, sessions, texte, pipeline vocal, live, tools, HITL et admin wiring.
- `DomOSServerOptions` reçoit directement des singletons `llm`, `live`, `stt`,
  `tts`; toutes les sessions consomment donc la même composition.
- `packages/server/src/admin/AdminAPI.ts` fait environ 1 457 lignes et contient
  routing, parsing, présentation, redaction et toutes les familles de routes.
- `AgentRecord` est indexé par API key et ne contient qu'un `SystemPrompt`.
- Il n'existe aucun `AdapterFactoryRegistry`, `CredentialResolver`,
  `AgentDefinitionResolver` ou `SessionRuntimeCoordinator`.
- `SessionManager.setLifecycleHooks()` remplace un unique objet de hooks, ce qui
  risque d'écraser le cleanup mémoire lors de l'ajout du cleanup runtime.
- `OpenAIAdapter` conserve notamment des contextes de tool calls dans son
  instance : le partage global n'est pas sûr pour tous les adapters.

## Architecture cible

```text
API key authentifiée
        |
        v
AgentDefinitionResolver ------ AgentStore / ApiKeyStore
        |
        v
SessionRuntimeCoordinator ---- AdapterFactoryRegistry
        |                              |
        |                       CredentialResolver
        v
SessionRuntime immutable
 text + pipeline ou realtime
        |
        v
SessionManager / ToolRouter / ADTP / HITL
```

## Invariants non négociables

- `@domos/core` et `@domos/server` ne dépendent d'aucun provider concret.
- Les factories sont enregistrées explicitement par l'application ; jamais
  importées depuis une chaîne fournie par le dashboard.
- Les secrets sont résolus côté serveur à partir de références opaques.
- Chaque session possède un snapshot immuable de définition et de révision.
- Une modification admin s'applique aux nouvelles sessions ; une session active
  n'est jamais mutée silencieusement.
- `ToolRouter`, HITL et les révisions ADTP restent l'unique chemin des tools.
- Les tools UI continuent de s'exécuter dans `DomOSClient`.
- Le constructeur historique avec instances directes reste compatible pendant
  la ligne `1.x`, puis sera déprécié explicitement.

## Ordre obligatoire

1. `SPRINT-SRV-00-provider-neutral-runtime-contract.md`
2. `SPRINT-SRV-01-admin-api-safe-decomposition.md`
3. `SPRINT-SRV-02-adapter-registry-credentials.md`
4. `SPRINT-SRV-03-session-runtime-coordinator.md`
5. `SPRINT-SRV-04-admin-runtime-contracts.md`

Le découpage AdminAPI précède les nouveaux endpoints afin de ne pas ajouter un
nouveau domaine dans le fichier monolithique. Le dashboard UI sera traité dans
un dossier distinct après gel des réponses serveur.

## Dépendances

- ADTP : `../protocol-adtp/`, en particulier ADTP-00 et ADTP-03.
- Audio partagé : `../core-media/` avant pipeline streaming.
- OpenAI et Deepgram : consommateurs du registry, jamais prérequis du serveur.
- LiveKit : reste en backlog jusqu'à validation du runtime provider-neutral.

## Règle d'exécution

Un développeur prend un seul fichier de sprint. Tout fichier supplémentaire doit
être justifié dans `progress/SPRINT-SRV-00-progress.md` avant modification. La DoD
du sprint précédent est obligatoire.

