# Sprint 3 - @owllayer/browser (roadmap v1.1)

## Objectif

Implémenter le palier **v1.1 du CdC** : mode vocal, mémoire persistante OwlLayerAgent (Niveau 3), compatibilité SSR guidée (Next.js / Nuxt), et plugin WordPress minimal autonome.

> **Prérequis** : Sprint 2 (v1.0) complété et testé.

## Références CdC couvertes

| ID | Feature | Référence |
|---|---|---|
| Roadmap v1.1 | Mode vocal `OwlLayer.startVoice()` / `OwlLayer.stopVoice()` | §3.2.3, §10.1 |
| Roadmap v1.1 | OwlLayerAgent mémoire persistante (Niveau 3) | §5.5, §10.1 |
| Roadmap v1.1 | Compatibilité SSR Next.js / Nuxt | §10.1 |
| Roadmap v1.1 | Plugin WordPress officiel minimal | §7.2, §10.1 |
| ERR-B08 | Fallback micro->texte si accès refusé | §8 |

---

## TODO détaillés — tâche par tâche, fichier par fichier

---

### Tâche 1 — Voix : API publique

**Fichier** : `src/types.ts`

- [ ] Ajouter l'interface de config voix dans `OwlLayerBrowserConfig` :
  ```ts
  voice?: {
    enabled?: boolean;
    fallbackToText?: boolean;   // défaut: true — si micro refusé, bascule texte
    sampleRate?: number;        // défaut: 16000 (PCM 16kHz)
    language?: string;          // ex: 'fr-FR', 'en-US'
    onStateChange?: (state: 'idle' | 'listening' | 'processing') => void;
  };
  ```
- [ ] Ajouter le type `VoiceState` :
  ```ts
  export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';
  ```

---

### Tâche 2 — Voix : `VoiceManager` (capture + playback)

**Nouveau fichier** : `src/runtime/VoiceManager.ts`

Ce module gère le cycle complet de la voix côté browser : capture micro → stream vers serveur → playback de la réponse audio → interruption (barge-in).

- [ ] Créer la classe `VoiceManager` avec :
  ```ts
  export class VoiceManager {
    constructor(private readonly client: OwlLayerClient, private readonly options: VoiceManagerOptions) {}

    async start(): Promise<void>   // demande accès micro -> AudioContext -> capture PCM
    stop(): void                   // arrête la capture et le stream
    isActive(): boolean            // retourne létat courant
    playback(audioBase64: string, mimeType: string): Promise<void>  // joue la réponse audio
    interrupt(): void              // barge-in : arrête le playback + notifie serveur
  }
  ```

- [ ] Dans `start()` :
  - Appeler `navigator.mediaDevices.getUserMedia({ audio: true })`
  - En cas de refus (`NotAllowedError`) : appeler `options.onMicDenied?.()` et rejeter
  - Créer un `AudioContext` à 16kHz
  - Utiliser `ScriptProcessor` (ou `AudioWorklet` si disponible) pour capturer des chunks PCM
  - Encoder en base64 et envoyer via `this.client.sendAudio(audioBase64, 'audio/pcm')`

- [ ] Dans `playback()` :
  - Décoder `audioBase64` -> `ArrayBuffer`
  - Lire via `AudioContext.decodeAudioData()` puis `AudioBufferSourceNode`
  - Stocker la référence du `sourceNode` courant pour permettre linterruption
  - Utiliser `nextStartTime` pour enchaîner les chunks audio sans coupure

- [ ] Dans `interrupt()` :
  - Appeler `sourceNode.stop()` sur le playback en cours
  - Envoyer `VOICE_INTERRUPT` via le client (si la méthode est exposée par `@owllayer/core`)

---

### Tâche 3 — Voix : intégration dans `BrowserOwlLayer`

**Fichier** : `src/runtime/BrowserOwlLayer.ts`

- [ ] Ajouter la propriété :
  ```ts
  private voiceManager: VoiceManager | null = null;
  ```

- [ ] Ajouter les méthodes publiques :
  ```ts
  async startVoice(): Promise<void>
  stopVoice(): void
  isVoiceActive(): boolean
  ```

- [ ] Dans `startVoice()` :
  - Créer le `VoiceManager` si non existant
  - Appeler `voiceManager.start()`
  - En cas de refus micro et `voice.fallbackToText !== false` : logger un warning, ne pas lever derreur

- [ ] Dans le `client.on({ ... })` de `init()` : ajouter le handler audio :
  ```ts
  onAudioOutput: (audioBase64, mimeType) => {
    this.voiceManager?.playback(audioBase64, mimeType);
  }
  ```

- [ ] Dans `destroy()` : appeler `this.voiceManager?.stop()`

---

### Tâche 4 — Voix : bouton micro dans le Widget

**Fichier** : `src/ui/WidgetHost.tsx`

- [ ] Ajouter un bouton microphone dans `WidgetView`, visible uniquement si `voice.enabled !== false`
- [ ] Le bouton appelle `props.onStartVoice()` / `props.onStopVoice()` selon létat
- [ ] Indicateur visuel de létat vocal : idle / listening (animation pulse) / processing
- [ ] Si le mode vocal est actif, griser la zone de saisie texte (un seul mode à la fois)
- [ ] Ajouter dans `WidgetHostOptions` : `onStartVoice`, `onStopVoice`, `voiceState`

---

### Tâche 5 — Mémoire persistante OwlLayerAgent (Niveau 3)

**Référence CdC** : §5.5  
**Nouveau fichier** : `src/runtime/MemoryAdapter.ts`

- [ ] Créer linterface `BrowserMemoryAdapter` :
  ```ts
  export interface BrowserMemoryAdapter {
    get(key: string): Promise<unknown | null>;
    set(key: string, value: unknown): Promise<void>;
    search(query: string): Promise<Array<{ key: string; value: unknown }>>;
  }
  ```

- [ ] Créer limplémentation `LocalMemoryAdapter` (adapter localStorage) :
  - Stocke sous la clé `owllayer_memory_{key}`
  - `search()` fait une recherche naive sur les valeurs JSON stringifiées

- [ ] Créer limplémentation `RemoteBrowserMemoryAdapter` qui délègue à `RemoteMemoryAdapter` de `@owllayer/core` :
  - Nécessite `userId` dans le contexte
  - Niveau 3 réel (Cloud Pro)

- [ ] Ajouter la config dans `OwlLayerBrowserConfig` :
  ```ts
  memory?: {
    enabled?: boolean;
    adapter?: 'local' | 'remote';  // 'local' = localStorage, 'remote' = OwlLayerAgent Cloud
    userId?: string;                // nécessaire pour 'remote'
  };
  ```

---

### Tâche 6 — Mémoire : intégration dans `BrowserOwlLayer`

**Fichier** : `src/runtime/BrowserOwlLayer.ts`

- [ ] Ajouter la propriété :
  ```ts
  private memoryAdapter: BrowserMemoryAdapter | null = null;
  ```

- [ ] Exposer lobjet `memory` dans lAPI publique :
  ```ts
  readonly memory = {
    get: (key: string) => this.memoryAdapter?.get(key) ?? Promise.resolve(null),
    set: (key: string, value: unknown) => this.memoryAdapter?.set(key, value) ?? Promise.resolve(),
    search: (query: string) => this.memoryAdapter?.search(query) ?? Promise.resolve([]),
  };
  ```

- [ ] Au `init()` si `memory.enabled` : instancier ladapter et injecter les données mémoire dans le Shadow Context initial :
  ```ts
  const memoryData = await this.memoryAdapter.search('preferences');
  this.currentContext.__memory = memoryData;
  ```

---

### Tâche 7 — Exposer voix et mémoire dans `src/index.ts`

- [ ] Ajouter dans lobjet `OwlLayer` et les exports nommés : `startVoice`, `stopVoice`, `isVoiceActive`
- [ ] Ajouter `OwlLayer.memory` (objet avec `get`, `set`, `search`)
- [ ] Exporter les types : `VoiceState`, `BrowserMemoryAdapter`

---

### Tâche 8 — Compatibilité SSR (Next.js / Nuxt)

**Objectif** : sassurer que limport du SDK ne casse pas côté serveur.

#### 8a — Guard SSR dans `src/runtime/BrowserOwlLayer.ts`

- [ ] Vérifier que le message derreur dans `init()` est explicite pour les contextes SSR :
  ```ts
  throw new Error('[OwlLayer/browser] Ce SDK est client-only. En Next.js, ajoutez "use client". En Nuxt, utilisez un plugin .client.ts.');
  ```

#### 8b — Guard SSR dans `src/index.ts`

- [ ] Vérifier quaucune référence `window`/`document`/`navigator` nexiste au top-level du module (en dehors des guards `typeof window !== 'undefined'`)

#### 8c — Wrapper Next.js (`src/ssr/next.ts`)

- [ ] Créer `src/ssr/next.ts` — fichier de documentation du pattern (pas de dépendance React) :
  ```ts
  // Usage dans un composant Next.js :
  // 'use client'
  // import { useEffect } from 'react'
  //
  // useEffect(() => {
  //   import('@owllayer/browser').then(({ OwlLayer }) => OwlLayer.init(config))
  // }, [])
  ```

#### 8d — Wrapper Nuxt (`src/ssr/nuxt.ts`)

- [ ] Créer `src/ssr/nuxt.ts` — pattern plugin `.client.ts` documenté

---

### Tâche 9 — Plugin WordPress minimal

**Nouveau dossier** : `plugins/wordpress/owllayer-browser/`

Plugin PHP autonome installable dans WordPress — livrable séparé du SDK TS.

- [ ] `plugins/wordpress/owllayer-browser/owllayer-browser.php` :
  - Header de plugin WordPress (Plugin Name, Version, Description, Author)
  - `wp_enqueue_scripts` : enqueue `owllayer.min.js` depuis CDN
  - `wp_add_inline_script` : injecter `OwlLayer.init(...)` avec les options depuis les réglages WordPress
  - Lecture des options via `get_option('owllayer_api_key')`, `get_option('owllayer_endpoint')`, `get_option('owllayer_agent_name')`

- [ ] `plugins/wordpress/owllayer-browser/admin.php` :
  - Page de réglages dans le menu Admin WordPress
  - Champs : API Key, Endpoint, Agent Name
  - Sauvegarde via `update_option()`

- [ ] `plugins/wordpress/owllayer-browser/README.txt` :
  - Description au format WordPress Plugin Directory

---

### Tâche 10 — Tests Sprint 3

**Dossier** : `tests/`

- [ ] `tests/voice.test.ts` — **nouveau** :
  - `startVoice()` : mock `getUserMedia` -> appel `client.sendAudio()`
  - `stopVoice()` : stop propre sans erreur
  - Fallback texte si `getUserMedia` rejette avec `NotAllowedError`
  - `isVoiceActive()` : retourne le bon état

- [ ] `tests/memory.test.ts` — **nouveau** :
  - `LocalMemoryAdapter.get/set/search` avec mock localStorage
  - Injection de la mémoire dans le contexte initial
  - Mode `remote` avec mock `RemoteMemoryAdapter`

- [ ] `tests/ssrGuard.test.ts` — **nouveau** :
  - Import du module en environnement sans `window` : pas de `ReferenceError`
  - `init()` en environnement SSR : erreur descriptive levée
  - `window.OwlLayer` non assigné côté serveur

---

## Definition of Done Sprint 3

- [ ] API voix stable : `startVoice`, `stopVoice`, `isVoiceActive`, fallback texte, playback + barge-in
- [ ] `OwlLayer.memory` fonctionnel avec adapter `local` et `remote`
- [ ] Aucune `ReferenceError` à limport en contexte SSR
- [ ] Plugin WordPress minimal installable et fonctionnel
- [ ] Tous les nouveaux tests passent sans régression Sprint 1/2
