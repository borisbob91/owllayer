# DomOS Server — Analyse des incohérences & gaps

> **Date** : Mars 2026  
> **Fichiers analysés** : `DomOSServer.ts`, `AdminAPI.ts`, `ClientAuthManager.ts`, `AdminAuthManager.ts`, `VirtualLineManager.ts`, `LineHTTPHandler.ts`, `middleware/auth.ts`, `demo-server/src/server.ts`

---

## Partie 1 — Confusion Auth : code mort & nommage

### 1.1 Historique du problème

Il y a eu deux tentatives d'authentification admin :

**Tentative 1 (abandonnée)** : une "admin API key" — une clé spéciale qui donnait accès au panneau d'administration. Ça n'a pas fonctionné (le LLM s'est perdu dans l'implémentation).

**Tentative 2 (actuelle, fonctionnelle)** : `username` + `password` via `AdminAuthManager` (bcrypt + session token). C'est ce qui est en place et qui fonctionne.

La tentative 1 a laissé des traces qu'il faut nettoyer.

---

### 1.2 Code mort — `ClientAuthOptions.allowedScopes`

**Fichier :** `packages/server/src/auth/types.ts`

```ts
export interface ClientAuthOptions {
  requireApiKey?: boolean;
  enableApiKeyManagement?: boolean;
  allowedScopes?: string[];    // ← JAMAIS UTILISÉ
  maxConnectionsPerKey?: number;
}
```

`allowedScopes` n'est lu **nulle part** dans `ClientAuthManager`, `AuthMiddleware`, `DomOSServer` ou qui que ce soit. C'est un vestige de la tentative auth admin par scopes.

**Action : supprimer ce champ.**

---

### 1.3 Feature semi-morte — `/admin/client/keys`

**Fichier :** `packages/server/src/admin/AdminAPI.ts`

```ts
// GET /admin/client/keys
// POST /admin/client/keys
// DELETE /admin/client/keys/:key
```

Ces 3 endpoints permettent de gérer les API keys *client* depuis le panneau admin. Ils sont protégés par `enableClientKeyManagement: false` par défaut.

**Le problème :** c'est une fonctionnalité de l'époque "admin API key" repensée. Aujourd'hui, les API keys client sont enregistrées statiquement via `server.addApiKey()`. Les gérer dynamiquement depuis l'admin panel peut être utile, mais :

1. La feature est désactivée par défaut (`ADMIN_EXPOSE_API_KEYS = false`)
2. Elle crée une confusion entre "admin auth" (username/password) et "client API keys"
3. Les API keys sont en mémoire — redémarrer le serveur les efface

**Action :** garder la feature, mais la renommer pour clarifier. Les endpoints `/admin/client/keys` sont OK. Le problème est le nom de la config `enableApiKeyManagement` qui sonne comme "gérer les API via l'admin" alors que ça devrait être `enableRuntimeKeyManagement` ou simplement le nommer clairement dans la doc.

---

### 1.4 CONFUSION CRITIQUE — Nommage de `DOMOS_ADMIN_API_KEY`

**Fichier :** `apps/demo-server/src/server.ts`

```ts
const DOMOS_API_KEY      = process.env.DOMOS_API_KEY || '';          // ← React demo (shopping)
const DOMOS_ADMIN_API_KEY = process.env.DOMOS_ADMIN_API_KEY || '';   // ← Vue demo (catalog admin)
const DOMOS_HOME_API_KEY  = process.env.DOMOS_HOME_API_KEY  || '';   // ← Svelte demo (smart home)
const ADMIN_USERNAME      = process.env.ADMIN_USERNAME || 'admin';   // ← Admin panel auth
const ADMIN_PASSWORD      = process.env.ADMIN_PASSWORD || '';        // ← Admin panel auth
```

`DOMOS_ADMIN_API_KEY` est une **API key client WebSocket** avec un system prompt dédié pour la démo Vue de gestion de catalogue. Elle n'a **rien à voir** avec l'authentification du panneau admin (`ADMIN_USERNAME/ADMIN_PASSWORD`).

Ce nommage est la source principale de la confusion. Quelqu'un qui lit le code croit que `DOMOS_ADMIN_API_KEY` est utilisée pour accéder à `/admin`. Ce n'est pas le cas.

**Deux systèmes distincts, clairement séparés :**

| Système | Qui l'utilise | Comment | Fichier |
|---|---|---|---|
| **Auth admin panel** | Développeur/ops | `POST /admin/login` username+password → Bearer token | `AdminAuthManager.ts` |
| **Auth client WS** | Application cliente | clé API dans `?apiKey=` ou `Authorization: Bearer` sur le WS | `AuthMiddleware.ts` |

**Actions :**
1. Renommer `DOMOS_ADMIN_API_KEY` → `DOMOS_CATALOG_API_KEY` dans `demo-server/src/server.ts` et dans le `.env`
2. Mettre un commentaire dans `server.ts` pour distinguer les deux systèmes
3. **Ne jamais** exposer l'admin username/password côté client

---

### 1.5 Résumé auth — ce qui est propre, ce qui ne l'est pas

```
✅ AdminAuthManager — bcrypt + session token — propre, complet
✅ AuthMiddleware — validation API key WS — propre, complet
✅ ClientAuthManager — connection counting + validation — propre
❌ ClientAuthOptions.allowedScopes — champ mort, à supprimer
⚠️ DOMOS_ADMIN_API_KEY — nommage trompeur, à renommer
⚠️ enableApiKeyManagement — nom ambigu mais feature utile
```

---

## Partie 2 — Virtual Lines : gaps & état actuel

### 2.1 Ce que c'est (conceptuellement)

Les virtual lines simulent des "lignes téléphoniques". Chaque "ligne" représente une capacité de traitement simultanée. Si toutes les lignes sont occupées, le client suivant entre en liste d'attente ou reçoit un refus.

**Objectif :** limiter la concurrence per-apiKey. Ex : un client avec 4 lignes ne peut avoir que 4 conversations simultanées.

**Flux normal :**
```
1. Client → HTTP POST /lines/acquire?apiKey=... → { token, lineNumber, waiting }
2. Client → WS connect ?lineToken=<token> → validé par DomOSServer.handleConnection()
3. Serveur → bindSession(token, sessionId)
4. [fin de conversation] → DomOSServer.handleClose() → releaseBySession(sessionId)
```

---

### 2.2 État actuel — DÉSACTIVÉ dans la démo

```ts
// apps/demo-server/src/server.ts
// Virtual Lines — desactivees temporairement pour test
// virtualLines: {
//   lines: [{ apiKey: DOMOS_API_KEY, count: 4, ttlMs: 5 * 60_000, ...}],
// },
```

Les virtual lines sont **commentées**. La démo tourne sans contrôle de concurrence. Elles ont été désactivées "temporairement pour test" mais le test n'a jamais été conclu.

---

### 2.3 Gap 1 — Pas de promotion automatique liste d'attente

**Le problème majeur.**

Quand une ligne se libère via `release(token)` ou `releaseBySession(sessionId)`, la ligne repasse à `available`. Mais :
- Le client en liste d'attente (`waitingLine`) **n'est pas notifié**
- Il doit timeout (2 min) ou retry manuellement
- Il n'y a aucun callback/event `onLineAvailable`

**Flux brisé :**
```
Ligne 1 occupée → Client A → line_001 (busy)
Ligne 2 occupée → Client B → line_002 (busy)
Client C → waitingLine (waiting)

Client A raccroche → line_001 (available)
                  → Client C n'est PAS notifié
                  → Client C attend 2min → timeout → erreur
```

**Ce qu'il faudrait :**
```ts
// VirtualLineManager — quand release() est appelé
private expireOrReleaseLine(token: string): void {
  this.release(token);
  // Vérifier si quelqu'un attend et le promouvoir
  this.promoteWaitingClient();
}

private promoteWaitingClient(): void {
  // Pour chaque pool → si waitingLine occupée ET une ligne normale disponible
  // → notifier le serveur → serveur envoie SYSTEM_EVENT 'line_promoted'
  // → client reçoit l'événement → reconnecte sur la ligne normale
}
```

Mais `VirtualLineManager` ne connaît pas le transport WebSocket. Il faudrait un **callback d'événement** injecté depuis `DomOSServer`.

---

### 2.4 Gap 2 — Un seul slot d'attente (pas de vraie file)

Le code crée **une seule `waitingLine`** par pool. Si elle est occupée, le 3ème client reçoit une erreur sèche :

```ts
return { success: false, error: 'Toutes les lignes sont occupées, veuillez réessayer plus tard' };
```

Ce n'est pas une file d'attente — c'est un "full ou attente, sinon refused". Pour une vraie file il faudrait un tableau `waitingQueue: VirtualLine[]` mais ça complexifie beaucoup.

**Pour l'instant, c'est acceptable** si le nombre de lignes est bien dimensionné (ex: 10 lignes → très rare d'avoir 2 clients en attente simultanément).

---

### 2.5 Gap 3 — API key dans l'URL de `LineHTTPHandler`

```
POST /lines/acquire?apiKey=pk_prod_xxx
```

L'API key apparaît dans l'URL, donc dans les logs serveur, les proxies, l'historique navigateur. Ce n'est pas critique pour une API interne, mais en production il vaut mieux la passer dans le **body** ou en **header**.

**Situation actuelle dans `LineHTTPHandler` :**
```ts
const apiKey = url.searchParams.get('apiKey');  // ← URL param
```

**Meilleure approche :**
```ts
// Body JSON ou header Authorization
const apiKey = parsed?.apiKey || req.headers['x-api-key'];
```

---

### 2.6 Gap 4 — Token expiré lors d'une reconnexion WS

`DomOSClient` persiste le `lineToken` dans `sessionStorage`. Sur reconnexion automatique (après coupure réseau), il tente de se reconnecter avec le même token. Si le TTL a expiré côté serveur, le serveur ferme la connexion (code 1008 `lineToken invalide`).

`DomOSClient` gère les reconnexions par défaut et détecte les codes 1003/1008/1011 comme erreurs permanentes sans retry. Du coup l'utilisateur est bloqué.

**Ce qu'il manque dans `DomOSClient` :** détecter l'erreur `lineToken invalide`, re-acquérir un nouveau token, puis se reconnecter.

---

### 2.7 Gap 5 — Double route `/lines/acquire` et `/lines/release`

Les routes de gestion des lignes existent **à deux endroits** :

| Endpoint | Handler | Auth |
|---|---|---|
| `POST /lines/acquire` | `LineHTTPHandler` | Aucune |
| `POST /lines/release` | `LineHTTPHandler` | Aucune |
| `POST /admin/lines/acquire` | `AdminAPI` | Session token admin |
| `POST /admin/lines/release` | `AdminAPI` | Session token admin |

Les routes admin `/admin/lines/acquire` et `/admin/lines/release` semblent être une copie des routes client mais protégées. L'usage admin est différent (debug/maintenance), donc avoir les deux est justifiable. Mais le code `handleLineAcquire` et `handleLineRelease` est **dupliqué** dans `AdminAPI.ts` et `LineHTTPHandler.ts`.

**Action :** extraire la logique dans `VirtualLineManager` (déjà fait) et faire appel au même manager depuis les deux handlers. C'est déjà le cas — les deux handlers appellent `this.lineManager.acquire(apiKey)`. Pas de vrai problème, juste de la duplication de boilerplate HTTP.

---

### 2.8 Gap 6 — `configureLines()` sur DomOSServer ne câble pas le `LineHTTPHandler`

```ts
// DomOSServer — méthode publique
configureLines(apiKey: string, count: number, ttlMs?: number): void {
  if (!this.lineManager) {
    this.lineManager = new VirtualLineManager([{ apiKey, count, ttlMs }]);
    this.lineHTTPHandler = new LineHTTPHandler(this.lineManager);
    // ❌ MAIS le httpHandler n'est pas recâblé dans le transport !
  } else {
    this.lineManager.configurePool(apiKey, count, ttlMs);
  }
}
```

Si `configureLines()` est appelée **après** que le serveur a démarré (via `listen()`), le nouveau `LineHTTPHandler` n'est jamais passé au transport. Le transport a déjà son `httpHandler` capturé dans la closure du constructeur. Le handler de lignes ne sera donc **jamais invoqué** pour les requêtes entrantes.

**Action :** soit interdire `configureLines()` après `listen()`, soit rendre le handler dynamique.

---

## Partie 3 — Plan d'action priorisé

### Priorité 1 — Corrections immédiates (propre, safe)

| # | Action | Fichier | Impact |
|---|---|---|---|
| 1 | Supprimer `allowedScopes` de `ClientAuthOptions` | `auth/types.ts` | Nettoyage |
| 2 | Renommer `DOMOS_ADMIN_API_KEY` → `DOMOS_CATALOG_API_KEY` | `demo-server/src/server.ts` + `.env` | Clarté |
| 3 | Ajouter commentaire bloc auth dans `demo-server/src/server.ts` | `demo-server/src/server.ts` | Clarté |
| 4 | Interdire / documenter `configureLines()` post-`listen()` | `DomOSServer.ts` | Correctness |

### Priorité 2 — Re-activer les Virtual Lines

| # | Action | Fichier |
|---|---|---|
| 5 | Décommenter le bloc `virtualLines` dans `demo-server/src/server.ts` | `demo-server` |
| 6 | Tester et valider le flux complet (acquire → connect → release) | — |
| 7 | Passer `apiKey` dans le body de `/lines/acquire` (non dans l'URL) | `LineHTTPHandler.ts` + `DomOSClient.ts` |

### Priorité 3 — Compléter les Virtual Lines (list d'attente)

| # | Action | Description |
|---|---|---|
| 8 | Ajouter `onLineReleased` callback dans `VirtualLineManager` | Permet à `DomOSServer` d'écouter les libérations de lignes |
| 9 | Câbler `DomOSServer` pour notifier le client en attente | `Session` en attente reçoit `SYSTEM_EVENT 'line_available'` |
| 10 | `DomOSClient` : re-acquérir un token et reconnect si `lineToken invalide` | Gestion reconnexion avec token expiré |

---

## Partie 4 — Architecture auth clarifiée (référence)

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTIFICATION                         │
│                                                             │
│  ┌──────────────────────────┐  ┌─────────────────────────┐ │
│  │   Admin Panel Auth       │  │   Client WS Auth        │ │
│  │                          │  │                         │ │
│  │  POST /admin/login       │  │  WS connect             │ │
│  │  { username, password }  │  │  ?apiKey=pk_xxx         │ │
│  │      ↓                   │  │  ou Bearer pk_xxx       │ │
│  │  Bearer <session_token>  │  │      ↓                  │ │
│  │  (24h, bcrypt)           │  │  AuthMiddleware         │ │
│  │                          │  │  validKeys.has(apiKey)  │ │
│  │  AdminAuthManager.ts     │  │  ou customValidator()   │ │
│  └──────────────────────────┘  └─────────────────────────┘ │
│           ↓                              ↓                  │
│    Accès /admin/status            Accès /domos WS           │
│    Accès /admin/sessions          Prompt résolu par         │
│    Accès /admin/prompts           promptOverrides[apiKey]   │
│                                                             │
│  [DEUX SYSTÈMES INDÉPENDANTS — AUCUN LIEN ENTRE EUX]       │
└─────────────────────────────────────────────────────────────┘

Variables d'environnement (demo-server)
──────────────────────────────────────
ADMIN_USERNAME          → Admin panel login
ADMIN_PASSWORD          → Admin panel password

DOMOS_API_KEY           → Client WS key (React shopping demo)
DOMOS_CATALOG_API_KEY   → Client WS key (Vue catalog admin demo)  ← À renommer
DOMOS_HOME_API_KEY      → Client WS key (Svelte smart home demo)
```

---

## Partie 5 — Virtual Lines : architecture cible (promotion)

Pour compléter les virtual lines avec notification de la liste d'attente :

```ts
// VirtualLineManager — à ajouter
export type LineReleasedCallback = (apiKey: string, availableCount: number) => void;

class VirtualLineManager {
  private onLineReleased?: LineReleasedCallback;

  setReleasedCallback(cb: LineReleasedCallback): void {
    this.onLineReleased = cb;
  }

  // Appelé dans this.release() après remise à 'available'
  private notifyRelease(apiKey: string): void {
    const pool = this.pools.get(apiKey);
    if (!pool) return;
    const available = pool.lines.filter(l => l.state === 'available').length;
    this.onLineReleased?.(apiKey, available);
  }
}
```

```ts
// DomOSServer — à câbler dans constructeur
this.lineManager?.setReleasedCallback((apiKey, available) => {
  // Trouver les sessions en attente pour cette apiKey
  const waitingSessions = this.sessions.getAll()
    .filter(s => s.apiKey === apiKey && s.state === 'waiting');
  
  for (const session of waitingSessions.slice(0, available)) {
    this.transport.send(session.connId, 
      Messages.systemEvent('line_available', 'Une ligne est disponible — reconnectez-vous')
    );
  }
});
```

```ts
// DomOSClient — à ajouter dans handleMessage
case MessageType.SYSTEM_EVENT:
  if (payload.kind === 'line_available') {
    // Re-acquire + reconnect
    await this.reacquireLineAndReconnect();
  }
```

---

## Résumé en une ligne par point

| Point | Statut | Action |
|---|---|---|
| Auth admin panel (username/password) | ✅ Propre et complet | — |
| Auth client WS (API keys) | ✅ Propre et complet | — |
| `allowedScopes` dans `ClientAuthOptions` | ❌ Code mort | Supprimer |
| `DOMOS_ADMIN_API_KEY` naming | ❌ Trompeur | Renommer en `DOMOS_CATALOG_API_KEY` |
| `/admin/client/keys` endpoints | ⚠️ Désactivé, half-baked | Garder mais documenter |
| Virtual Lines — flux acquire/connect/release | ⚠️ Implémenté mais désactivé | Décommenter + tester |
| Virtual Lines — promotion liste d'attente | ❌ Non implémenté | Gap #1 à compléter |
| Virtual Lines — API key dans URL | ⚠️ Sécurité mineure | Passer dans body |
| Virtual Lines — reconnect avec token expiré | ❌ Non géré par DomOSClient | À ajouter |
| `configureLines()` post-listen | ❌ Bug silencieux | Documenter / corriger |
