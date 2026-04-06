# Sprint 2 - @domos/browser (conformité v1.0 CdC)

> **✅ TERMINÉ — 22/03/2026** — Build OK, TypeScript OK, zéro erreur, 61/61 tests.  
> Toutes les tâches 1–8 implémentées. Bundles : `domos.bundle.mjs` (ESM), `domos.min.js` (IIFE), `domos.core.esm.js` (core-only).

## Objectif

Atteindre la conformité complète **v1.0 du CdC** — rendre `@domos/browser` production-ready pour les environnements MPA (sites multi-pages : PHP, Laravel, HTML statique).

> Les intégrations spécifiques Shopify / WooCommerce sont **différées au Sprint 4** (CdC dédié à venir).  
> Ce sprint prépare le terrain en rendant le SDK robuste pour tous les MPAs.

## Références CdC couvertes

| ID | Exigence | Priorité |
|---|---|---|
| EF-B02 | `registerTool()` accepte JSON Schema standard (pas Zod) | Critique |
| EF-B04 | `beforeunload` + auto-resume robuste | Critique |
| EF-B05 | Widget isolé en Shadow DOM fermé | Critique |
| EF-B06 | HITL 4 niveaux + modal Shadow DOM | Critique |
| EF-B08 | `onResponse()` pour UI custom sans widget | Haute |
| EF-B09 | Actions DOM complètes (`show/hide/addClass/removeClass` + interpolation `{param}`) | Haute |
| ET-B01 | 3 bundles de build (IIFE, ESM, ESM core-only) | Critique |
| ET-B05 | Un seul `MutationObserver` global (déjà OK Sprint 1, à garder) | Haute |
| ET-B07 | Exports npm finalisés | Moyenne |

---

## TODO détaillés — tâche par tâche, fichier par fichier

---

### Tâche 1 — Shadow DOM : WidgetHost (EF-B05)

**Fichier** : `src/ui/WidgetHost.tsx`

Actuellement le widget est rendu directement dans un `div` ajouté à `document.body` — le CSS du site hôte peut l'affecter.

- [x] Dans la méthode `mount()` : après `document.body.appendChild(this.host)`, attacher un Shadow Root fermé :
  ```ts
  private shadowRoot: ShadowRoot | null = null;
  // dans mount() :
  this.shadowRoot = this.host.attachShadow({ mode: 'closed' });
  ```
- [x] Remplacer tous les appels `render(h(...), this.host)` par `render(h(...), this.shadowRoot)`
- [x] Conserver tous les styles inline actuels (pas de stylesheet externe à injecter pour l'instant — les styles inline fonctionnent dans Shadow DOM)
- [x] Vérifier que ces méthodes fonctionnent toujours après migration : `mount()`, `unmount()`, `addUserMessage()`, `upsertAgentMessage()`, `setStatus()`, `restoreMessages()`

---

### Tâche 2 — Shadow DOM : HitlOverlay (EF-B06)

**Fichier** : `src/ui/HitlOverlay.tsx`

Même problème que le Widget — la modal HITL doit être isolée du CSS hôte.

- [x] Dans `mount()` : après `document.body.appendChild(this.host)`, attacher un Shadow Root fermé :
  ```ts
  private shadowRoot: ShadowRoot | null = null;
  // dans mount() :
  this.shadowRoot = this.host.attachShadow({ mode: 'closed' });
  ```
- [x] Remplacer `render(h(Overlay, ...), this.host)` par `render(h(Overlay, ...), this.shadowRoot)` dans `update()`
- [x] Vérifier que `mount()`, `show()`, `hide()`, `unmount()` fonctionnent après migration

---

### Tâche 3 — API events & méthodes manquantes (EF-B08)

Ces méthodes sont dans le CdC §3.2.3 mais absentes du code actuel.

#### 3a — Étendre `DomOSBrowserConfig` dans `src/types.ts`

- [x] Ajouter les callbacks de cycle de vie dans l'interface `DomOSBrowserConfig` :
  ```ts
  onReady?: () => void;
  onError?: (error: Error) => void;
  ```
- [x] Ajouter l'objet `session` (nom CdC) en remplacement/complément de `sessionPersistence` :
  ```ts
  session?: {
    enabled?: boolean;
    storageKey?: string;
    ttlMs?: number;
    maxHistoryMessages?: number;
    autoResume?: boolean;
    onResume?: () => void;
    onNewSession?: () => void;
  };
  ```
  > ⚠️ Garder `sessionPersistence` existant pour ne pas casser Sprint 1. `session` est la clé CdC, on lira en priorité `session`, avec fallback sur `sessionPersistence`.

- [x] Ajouter le type `SessionInfo` :
  ```ts
  export interface SessionInfo {
    sessionId: string | null;
    status: 'disconnected' | 'connecting' | 'connected';
    messageCount: number;
  }
  ```

#### 3b — EventBus interne dans `src/runtime/BrowserDomOS.ts`

- [x] Ajouter les tableaux de callbacks en propriétés privées de `BrowserDomOS` :
  ```ts
  private readonly responseCallbacks: Array<(text: string, done: boolean) => void> = [];
  private readonly errorCallbacks: Array<(error: Error) => void> = [];
  private readonly readyCallbacks: Array<() => void> = [];
  private readonly toolCallCallbacks: Array<(name: string, args: Record<string, unknown>) => void> = [];
  ```

#### 3c — Méthode `onResponse(cb)` dans `BrowserDomOS`

- [x] Ajouter la méthode :
  ```ts
  onResponse(cb: (text: string, done: boolean) => void): void {
    this.responseCallbacks.push(cb);
  }
  ```
- [x] Dans `upsertAgentMessage()` : notifier tous les `responseCallbacks` avec `(content, true)`  
  _(le streaming dans le SDK browser est actuellement traité comme un upsert du dernier message, donc `done: true` à chaque appel — évolution possible en Sprint 3 avec la voix)_

#### 3d — Méthode `onError(cb)` dans `BrowserDomOS`

- [x] Ajouter la méthode :
  ```ts
  onError(cb: (error: Error) => void): void {
    this.errorCallbacks.push(cb);
  }
  ```
- [x] Dans le `client.on({ ... })` de `init()` : enrichir le handler `onError` pour notifier les callbacks :
  ```ts
  onError: (err) => {
    this.errorCallbacks.forEach(cb => cb(err instanceof Error ? err : new Error(String(err))));
  }
  ```
  > ⚠️ Si `DomOSClient` n'exposes pas encore `onError` dans ses handlers, vérifier `@domos/core` — ne pas modifier core, adapter côté browser si besoin.

#### 3e — Méthode `onReady(cb)` dans `BrowserDomOS`

- [x] Ajouter la méthode :
  ```ts
  onReady(cb: () => void): void {
    this.readyCallbacks.push(cb);
  }
  ```
- [x] Dans `onStateChange()` : quand `state === 'connected'`, notifier les `readyCallbacks` (une seule fois — vider le tableau après le premier appel) :
  ```ts
  if (state === 'connected' && this.readyCallbacks.length > 0) {
    this.readyCallbacks.forEach(cb => cb());
    this.readyCallbacks.length = 0;
  }
  ```
  > `onReady` se déclenche à la première connexion. Les reconnexions automatiques ne le redéclenchent pas.

#### 3f — Méthode `onToolCall(cb)` dans `BrowserDomOS`

- [x] Ajouter la méthode :
  ```ts
  onToolCall(cb: (name: string, args: Record<string, unknown>) => void): void {
    this.toolCallCallbacks.push(cb);
  }
  ```
- [x] Dans `registerTool()` : envelopper le `handler` pour notifier les callbacks avant exécution :
  ```ts
  handler: async (args) => {
    this.toolCallCallbacks.forEach(cb => cb(name, args ?? {}));
    return definition.handler(args ?? {});
  }
  ```

#### 3g — Méthode `setContext(data)` dans `BrowserDomOS`

- [x] Ajouter la méthode (remplacement total, ≠ `updateContext` qui est un merge) :
  ```ts
  setContext(data: Record<string, unknown>): void {
    this.currentContext = { ...data };
    this.client?.updateContext(this.currentContext);
    this.persistSnapshot();
  }
  ```

#### 3h — Méthode `disconnect()` dans `BrowserDomOS`

- [x] Ajouter la méthode (ferme la WS sans détruire l'instance — widget et tools restent) :
  ```ts
  disconnect(): void {
    this.client?.disconnect?.();
  }
  ```
  > ⚠️ Vérifier si `DomOSClient` expose `disconnect()`. Si non, utiliser `destroy()` du client uniquement (la reconnexion auto ne se déclenchera pas). Ne pas modifier `@domos/core`.

#### 3i — Méthode `getSession()` dans `BrowserDomOS`

- [x] Ajouter la méthode :
  ```ts
  getSession(): SessionInfo {
    return {
      sessionId: this.client?.sessionId ?? null,
      status: this.initialized ? 'connected' : 'disconnected',
      messageCount: this.recentMessages.length,
    };
  }
  ```

#### 3j — Exposer dans `src/index.ts`

- [x] Ajouter dans l'objet `DomOS` et les exports nommés :
  `onResponse`, `onError`, `onReady`, `onToolCall`, `setContext`, `disconnect`, `getSession`
- [x] Ajouter `export type { SessionInfo }` dans `index.ts`

---

### Tâche 4 — Auto-discovery complet (EF-B09)

**Fichier principal** : `src/runtime/autoDiscovery.ts`  
**Fichier types** : `src/types.ts`

#### 4a — Étendre `DiscoveredToolConfig` dans `types.ts`

- [x] Étendre le type `action` pour inclure les 3 nouvelles actions :
  ```ts
  action: 'click' | 'focus' | 'scrollIntoView' | 'setValue' | 'show' | 'hide' | 'addClass' | 'removeClass';
  ```
- [x] Ajouter les champs optionnels :
  ```ts
  target?: string;                         // data-domos-target (avec {param} interpolation)
  schema?: Record<string, unknown>;        // data-domos-schema parsé
  contextData?: Record<string, unknown>;   // data-domos-context parsé
  ```

#### 4b — Étendre `AutoDiscoveryCallbacks` dans `autoDiscovery.ts`

- [x] Ajouter le callback `onContextData` pour injecter dans le Shadow Context :
  ```ts
  onContextData?: (data: Record<string, unknown>) => void;
  ```

#### 4c — Parser `data-domos-target` avec interpolation `{param}` dans `bindElement()`

- [x] Lire l'attribut `data-domos-target` et le stocker dans `tool.target`
- [x] Ajouter une méthode privée `interpolate(template, args)` :
  ```ts
  private interpolate(template: string, args: Record<string, unknown>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => String(args[key] ?? ''));
  }
  ```
- [x] Dans `resolveTarget()` : si `tool.target` est présent, l'utiliser (avec interpolation des `args`) en priorité sur `selector` et `args.selector`

#### 4d — Parser `data-domos-schema` dans `bindElement()`

- [x] Lire l'attribut `data-domos-schema` (JSON string)
- [x] Parser avec `JSON.parse()` dans un try/catch — en cas d'erreur : `console.warn` + ignorer
- [x] Utiliser le schema parsé pour construire les `parameters` du tool (remplace les paramètres fixes `selector/value` actuels si `data-domos-schema` est présent)

#### 4e — Parser `data-domos-context` dans `bindElement()`

- [x] Lire l'attribut `data-domos-context` (JSON string)
- [x] Parser avec `JSON.parse()` dans un try/catch
- [x] Si valide et `callbacks.onContextData` présent : appeler `onContextData(parsed)` pour injecter dans le Shadow Context

#### 4f — Actions `show`, `hide`, `addClass`, `removeClass` dans le handler

- [x] Dans le `switch (tool.action)` existant, ajouter :
  ```ts
  case 'show':
    (target as HTMLElement).classList.remove('hidden');
    (target as HTMLElement).style.display = 'block';
    break;
  case 'hide':
    (target as HTMLElement).classList.add('hidden');
    (target as HTMLElement).style.display = 'none';
    break;
  case 'addClass': {
    const cn = String(args.className ?? '').trim();
    if (cn) target.classList.add(...cn.split(/\s+/));
    break;
  }
  case 'removeClass': {
    const cn = String(args.className ?? '').trim();
    if (cn) target.classList.remove(...cn.split(/\s+/));
    break;
  }
  ```

#### 4g — Déduplication des noms de tools dans `bindElement()`

- [x] Avant d'enregistrer, vérifier si le nom est déjà utilisé dans `boundElements.values()` :
  ```ts
  const alreadyBound = [...this.boundElements.values()].includes(name);
  if (alreadyBound) {
    console.warn(`[DomOS/browser] Auto-discovery: tool "${name}" déjà enregistré — élément ignoré.`);
    return;
  }
  ```

#### 4h — Câbler `onContextData` dans `BrowserDomOS.ts`

- [x] Passer le callback dans le `new AutoDiscoveryManager(...)` :
  ```ts
  onContextData: (data) => {
    this.updateContext(data);
  }
  ```

---

### Tâche 5 — Session robustesse (EF-B04)

**Fichier principal** : `src/runtime/BrowserDomOS.ts`  
**Fichier secondaire** : `src/runtime/sessionPersistence.ts`

#### 5a — `beforeunload` synchrone

- [x] Ajouter une propriété bound dans `BrowserDomOS` pour pouvoir retirer le listener :
  ```ts
  private readonly boundBeforeUnload = (): void => { this.persistSnapshot(); };
  ```
- [x] Dans `init()`, après `this.initialized = true` : enregistrer le listener
  ```ts
  window.addEventListener('beforeunload', this.boundBeforeUnload);
  ```
- [x] Dans `destroy()` : retirer le listener
  ```ts
  window.removeEventListener('beforeunload', this.boundBeforeUnload);
  ```

#### 5b — Lire la config `session` avec fallback sur `sessionPersistence`

- [x] Dans `init()`, lors du merge de la config, lire `session` en priorité :
  ```ts
  const sessionCfg = config.session ?? config.sessionPersistence;
  // utiliser sessionCfg.enabled, sessionCfg.storageKey, sessionCfg.ttlMs, etc.
  ```
- [x] Utiliser `sessionCfg.storageKey ?? 'domos_browser_session_v1'` comme `SESSION_KEY` local (pas la constante module) :
  ```ts
  private sessionKey = 'domos_browser_session_v1'; // écrasé dans init()
  ```

#### 5c — `maxHistoryMessages` configurable

- [x] Dans `pushMessage()` : remplacer le `10` hardcodé par `this.config?.session?.maxHistoryMessages ?? 10`

#### 5d — Callbacks `onResume` et `onNewSession`

- [x] Dans le handler `onSessionId` du `client.on({ ... })` : détecter si la session est une reprise ou nouvelle :
  ```ts
  onSessionId: (sessionId) => {
    const isResume = !!loadSessionSnapshot(this.sessionKey);
    this.persistSnapshot();
    if (isResume) {
      this.config?.session?.onResume?.();
    } else {
      this.config?.session?.onNewSession?.();
    }
  }
  ```

#### 5e — `autoResume` : désactiver la reprise si `false`

- [x] Dans `init()`, lors du chargement du snapshot :
  ```ts
  const autoResume = sessionCfg?.autoResume ?? true;
  if (autoResume && sessionCfg?.enabled !== false) {
    const restored = loadSessionSnapshot(this.sessionKey);
    // ... restore
  }
  ```

---

### Tâche 6 — `registerTool()` accepte JSON Schema standard (EF-B02)

**Fichier** : `src/types.ts`

- [x] Ajouter le type `JsonSchemaObject` :
  ```ts
  export type JsonSchemaObject = {
    type?: string;
    properties?: Record<string, { type: string; description?: string; [k: string]: unknown }>;
    required?: string[];
    [key: string]: unknown;
  };
  ```
- [x] Modifier `BrowserToolDefinition.parameters` pour accepter les deux formes :
  ```ts
  parameters?: ToolParameters | JsonSchemaObject;
  ```

**Fichier** : `src/runtime/BrowserDomOS.ts`

- [x] Dans `registerTool()`, normaliser le schema avant de le passer au `DomOSClient` :
  ```ts
  // Si le schema est un JSON Schema plain (pas ToolParameters qui a un champ `type: 'OBJECT'`),
  // le convertir en ToolParameters minimal
  const params = normalizeParameters(definition.parameters);
  ```
- [x] Ajouter la fonction `normalizeParameters()` (peut être dans `src/utils/schema.ts`) :
  ```ts
  function normalizeParameters(p?: ToolParameters | JsonSchemaObject): ToolParameters | undefined {
    if (!p) return undefined;
    if ('type' in p && typeof (p as ToolParameters).type === 'string' && (p as ToolParameters).type === 'OBJECT') {
      return p as ToolParameters; // déjà au bon format
    }
    // JSON Schema plain → ToolParameters
    return {
      type: 'OBJECT',
      properties: (p as JsonSchemaObject).properties
        ? Object.fromEntries(
            Object.entries((p as JsonSchemaObject).properties!).map(([k, v]) => [
              k,
              { type: ((v.type as string) ?? 'STRING').toUpperCase(), description: v.description ?? '' },
            ]),
          )
        : {},
    };
  }
  ```

---

### Tâche 7 — Build : 3 bundles (ET-B01)

**Fichier** : `esbuild.config.mjs`  
**Nouveau fichier** : `src/index.core.ts`

#### 7a — `src/index.core.ts` — entrée core-only (sans Preact, sans Widget, sans HITL UI)

- [x] Créer `src/index.core.ts` qui exporte uniquement les fonctions `@domos/browser` sans UI :
  ```ts
  // Exporte tout sauf WidgetHost et HitlOverlay
  // Le runtime BrowserDomOS est initialisé avec widget.enabled: false et hitl.enabled: false implicitement
  ```
  > Ce bundle est pour les développeurs qui implémentent leur propre UI et veulent ~8KB gzippé.

#### 7b — Ajouter le 3ème build dans `esbuild.config.mjs`

- [x] Ajouter après les 2 builds existants :
  ```js
  await build({
    entryPoints: ['src/index.core.ts'],
    bundle: true,
    sourcemap: true,
    target: 'es2022',
    external: ['@domos/core', 'preact'],
    format: 'esm',
    outfile: 'dist/domos.core.esm.js',
    minify: false,
  });
  ```

#### 7c — Mettre à jour `package.json` exports map

- [x] Ajouter l'entrée `./core` dans la map `exports` de `package.json` :
  ```json
  "./core": {
    "import": "./dist/domos.core.esm.js",
    "types": "./dist/index.core.d.ts"
  }
  ```

---

### Tâche 8 — Tests Sprint 2

**Dossier** : `tests/`

- [x] `tests/shadowDom.test.ts` — **nouveau** :
  - Vérifier que `WidgetHost.mount()` crée bien un `ShadowRoot` sur le host
  - Vérifier que `HitlOverlay.mount()` idem
  - Vérifier (jsdom) que les styles CSS injectés dans la page n'affectent pas les éléments dans le Shadow Root

- [x] `tests/apiEvents.test.ts` — **nouveau** :
  - `onResponse()` : le callback est appelé après `upsertAgentMessage()`
  - `onError()` : le callback est appelé si le client émet une erreur
  - `onReady()` : le callback est appelé au premier passage à `connected`
  - `onToolCall()` : le callback est appelé avant l'exécution du handler
  - `setContext()` : remplace complètement (≠ merge de `updateContext()`)
  - `getSession()` : retourne bien `sessionId`, `status`, `messageCount`

- [x] `tests/autoDiscovery.test.ts` — **mise à jour** :
  - Actions `show` / `hide` : vérifient `display` + classe `hidden`
  - Actions `addClass` / `removeClass` : vérifient les classes CSS
  - `data-domos-target` avec `{param}` : interpolation correcte des args
  - `data-domos-schema` valide : parameters bien parsés
  - `data-domos-schema` invalide (JSON cassé) : warning + outil enregistré quand même
  - `data-domos-context` : callback `onContextData` appelé avec le bon objet
  - Déduplication : 2 éléments avec le même nom → 1 seul tool + warning

- [x] `tests/sessionPersistence.test.ts` — **mise à jour** :
  - `beforeunload` sauvegarde le snapshot
  - `autoResume: false` → snapshot ignoré au `init()`
  - `storageKey` custom → bonne clé localStorage utilisée
  - `maxHistoryMessages: 5` → historique tronqué à 5

---

## Préparation de l'environnement pour les intégrations futures (Sprint 4)

> Le CdC Shopify / WooCommerce sera partagé séparément. Ce Sprint 2 rend le SDK intrinsèquement compatible MPA.

| Ce qu'on fait | Pourquoi c'est important pour Shopify/WooCommerce |
|---|---|
| Shadow DOM fermé | Widget opérationnel dans les thèmes Liquid sans conflits CSS |
| `beforeunload` | Session préservée lors des navigations entre pages produit |
| `data-domos-target` + interpolation | Outils déclarables 100% en HTML dans les templates Liquid/Blade : `data-domos-target="#variant-{id}"` |
| `data-domos-schema` | Typage des paramètres directement dans le HTML sans JS |
| `onReady` / `onError` | La page hôte peut réagir à l'état DomOS sans coupler son code |
| `setContext()` | Mise à jour complète du contexte lors du changement de page produit |
| JSON Schema natif | Pas de Zod, pas de build step — compatible PHP/Liquid/Blade |

---

## Definition of Done Sprint 2

- [x] Exigences critiques EF-B02, EF-B04, EF-B05, EF-B06 implémentées et testées
- [x] Exigences hautes EF-B08, EF-B09 implémentées et testées
- [x] 3 bundles produits par `pnpm build` (`dist/index.mjs`, `dist/domos.min.js`, `dist/domos.core.esm.js`)
- [x] Tous les nouveaux tests passent
- [x] Aucune régression sur les tests Sprint 1 (lifecycle, autoDiscovery, sessionPersistence)
