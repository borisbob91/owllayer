# Sprint SRV-02 - Registry d'adapters et credentials

## 1. Fiche du sprint

| Champ | Valeur |
| --- | --- |
| Statut | Après SRV-01 |
| Domaine | Construction contrôlée des adapters |
| Objectif | Résoudre une `AdapterReference` sans import arbitraire ni fuite de secret |
| Bloque | Coordinator, OpenAI, Deepgram et configuration dashboard |

## 2. Résultat observable

L'application enregistre explicitement des factories d'adapters. Le serveur
valide la référence de l'agent, résout son credential côté serveur et crée
l'instance adaptée. Le dashboard peut lister les descriptors disponibles sans
voir factory, secret ou configuration privée.

## 3. État source

- Les adapters sont instanciés dans les applications puis passés au constructeur.
- Aucun catalogue provider-neutral n'existe.
- Le `ToolProvider` des plugins est un concept distinct et ne doit pas être
  réutilisé comme registry LLM/speech.
- Les options adapters contiennent souvent directement `apiKey`.
- Le package serveur ne doit pas importer tous les packages providers.

## 4. Contrats cibles

Fichiers sous `packages/server/src/runtime/` :

```ts
export interface CredentialResolver {
  resolve(
    reference: string,
    context: { agentId: string; adapterId: string }
  ): Promise<Readonly<Record<string, string>>>;
}

export type AdapterScope = 'server' | 'session';

export interface AdapterFactoryContext {
  agentId: string;
  sessionId: string;
  definition: Readonly<AdapterReference>;
  credentials: Readonly<Record<string, string>>;
}

export interface AdapterFactory<TAdapter> {
  readonly id: string;
  readonly kind: AdapterKind;
  readonly scope: AdapterScope;
  readonly configSchema: z.ZodType;
  create(context: AdapterFactoryContext): Promise<TAdapter> | TAdapter;
  dispose?(adapter: TAdapter): Promise<void> | void;
  capabilities?(): Promise<AdapterCapabilities> | AdapterCapabilities;
}

export interface AdapterFactoryDescriptor {
  id: string;
  kind: AdapterKind;
  scope: AdapterScope;
  displayName: string;
  description?: string;
}

export interface AdapterFactoryRegistry {
  register<T>(factory: AdapterFactory<T>): void;
  get(id: string, kind: AdapterKind): AdapterFactory<unknown>;
  list(): readonly AdapterFactoryDescriptor[];
}
```

Une factory `server` doit déclarer son adapter sans état de session et sûr pour
la concurrence. Tout adapter realtime ou conservant un `callId` est `session`.

## 5. Erreurs normalisées

```ts
type RuntimeConfigurationErrorCode =
  | 'ADAPTER_NOT_REGISTERED'
  | 'ADAPTER_KIND_MISMATCH'
  | 'ADAPTER_CONFIG_INVALID'
  | 'CREDENTIAL_REFERENCE_INVALID'
  | 'CREDENTIAL_NOT_FOUND'
  | 'ADAPTER_CREATE_FAILED'
  | 'ADAPTER_DISPOSE_FAILED';
```

L'erreur publique contient code, adapterId redigé si nécessaire, retryable et
correlationId. La cause provider reste dans un log serveur redigé.

## 6. Tâches

### Tâche 1 - Implémenter le registry

**Fichiers :** créer `AdapterFactoryRegistry.ts`, compléter `contracts.ts` et
exports.

- Refuser doublon d'ID, ID invalide et kind incohérent.
- Retourner une copie immutable des descriptors.
- N'accepter aucune chaîne de module, URL ou fonction venue du dashboard.
- Ne pas fusionner ce registry avec les plugins/tools.

### Tâche 2 - Implémenter les resolvers de credentials

**Fichiers :** créer `CredentialResolver.ts`,
`EnvironmentCredentialResolver.ts`, tests.

- Support initial : référence `env:NOM_VARIABLE` et callback applicatif.
- Ne jamais renvoyer les credentials dans un descriptor ou une erreur.
- Rediger les clés `key`, `secret`, `token`, `password`, `authorization`.
- Zéro cache par défaut ; un cache futur doit être borné et invalidable.
- Refuser nom de variable invalide et référence non supportée.

### Tâche 3 - Résoudre une factory

- Charger factory par `adapterId` et vérifier son `kind` attendu.
- Valider `definition.config` avant résolution du credential.
- Résoudre le credential seulement au moment de créer l'instance.
- Vider toute référence locale aux credentials après création.
- Ne jamais inclure le credential dans le snapshot de session.

### Tâche 4 - Préserver le constructeur historique

- Créer des factories internes `legacy.text`, `legacy.live`, `legacy.stt`,
  `legacy.tts` qui enveloppent les instances de `DomOSServerOptions`.
- Ces IDs ne sont ni persistables ni sélectionnables depuis AdminAPI.
- La propriété de l'instance reste à l'application ; ne pas appeler `dispose` sur
  un singleton legacy que le serveur ne possède pas.

### Tâche 5 - Tests

- Deux factories de même kind et plusieurs agents en parallèle.
- Doublon, adapter inconnu, kind incorrect et config invalide.
- Credential absent, callback en erreur et redaction.
- `list()` sans fonctions, schéma, credentials ou config privée.
- `adapterId` contenant chemin/URL/code rejeté sans import.
- Factory session créée deux fois ; factory server réutilisée seulement si
  explicitement thread-safe.
- Compatibilité constructor legacy.

## 7. Fichiers autorisés

| Fichier | Action |
| --- | --- |
| `runtime/AdapterFactoryRegistry.ts` | Créer |
| `runtime/CredentialResolver.ts` | Créer |
| `runtime/EnvironmentCredentialResolver.ts` | Créer |
| `runtime/errors.ts` | Créer |
| `runtime/contracts.ts` | Modifier |
| `packages/server/src/index.ts` | Modifier |
| Tests runtime associés | Créer |

`DomOSServer`, AdminAPI, adapters providers et UI sont hors scope.

## 8. Sécurité

- Aucun chargement dynamique piloté par une requête.
- Aucun secret dans définition, descriptor, exception, métrique ou snapshot.
- Les erreurs provider sont normalisées et redigées.
- Les resolvers custom sont injectés au boot, pas enregistrés par le dashboard.

## 9. Definition of Done

- [ ] Registry explicite, typé et provider-neutral.
- [ ] Config validée avant credential et création.
- [ ] Résolution de secrets exclusivement côté serveur.
- [ ] Scope server/session documenté et testé.
- [ ] Legacy constructor compatible sans faux ownership.
- [ ] Tests d'injection, redaction et concurrence passent.
- [ ] Prochaine étape SRV-03 persistée.

## 10. Commit

`feat(server): add adapter factory and credential registries`

