# Plan : Compléter les stats/capabilities bridge dans AdminAPI

**Sprint :** LK-04 (AgentSession Bridge)  
**Point couvert :** Stats/capabilities bridge dans `AdminAPI.ts` (marqué "si nécessaire" dans le sprint)  
**État actuel :** ⚠️ PARTIEL — AdminAPI expose les capabilities LLM/Live/STT/TTS mais aucune stats spécifique au bridge LiveKit

---

## Problème

L'AdminAPI (`packages/server/src/admin/AdminAPI.ts`) ne dispose pas :
- d'un endpoint dédié pour voir l'état des bridges LiveKit actifs
- d'un compteur de bridges dans `/admin/status`
- d'accès à une instance du bridge via `AdminAPIDeps`

`DomOSLiveKitAgentBridge` (`packages/adapter-livekit/src/bridge/DomOSLiveKitAgentBridge.ts`) ne dispose pas :
- d'une méthode `getStats()` pour exposer son état interne
- d'un log d'events consultable

---

## Plan d'implémentation

### Étape 1 — Ajouter `getStats()` et `getEvents()` sur `DomOSLiveKitAgentBridge`

**Fichier :** `packages/adapter-livekit/src/bridge/DomOSLiveKitAgentBridge.ts`

Ajouter une interface exportée :

```ts
export interface BridgeStatsSnapshot {
  activeBridges: number;
  sessions: Array<{
    sessionId: string;
    roomName: string;
    agentIdentity: string;
    startedAt: number;
  }>;
}
```

Ajouter une méthode publique :

```ts
getStats(): BridgeStatsSnapshot {
  const sessions = Array.from(this.states.entries()).map(([sessionId, state]) => ({
    sessionId,
    roomName: state.room.roomName,
    agentIdentity: state.room.agentIdentity,
    startedAt: state.context.updatedAt,
  }));
  return { activeBridges: this.states.size, sessions };
}
```

Ajouter un eventLog interne et une méthode `getEvents()` :

```ts
private readonly eventLog: DomOSLiveKitBridgeEvent[] = [];

getEvents(limit = 50): DomOSLiveKitBridgeEvent[] {
  return this.eventLog.slice(-limit);
}
```

Stocker chaque event dans le constructeur ou dans `emitBridgeEvent` interne.

---

### Étape 2 — Exporter `BridgeStatsSnapshot`

**Fichier :** `packages/adapter-livekit/src/bridge/index.ts`

Ajouter dans les exports type :

```ts
export type {
  // ... existant
  BridgeStatsSnapshot,
} from './DomOSLiveKitAgentBridge.js';
```

---

### Étape 3 — Ajouter `bridge` dans `AdminAPIDeps`

**Fichier :** `packages/server/src/admin/AdminAPI.ts`

Ajouter l'interface de stats :

```ts
export interface BridgeStats {
  enabled: boolean;
  activeBridges: number;
  sessions: Array<{
    sessionId: string;
    roomName: string;
    agentIdentity: string;
    startedAt: number;
  }>;
}
```

Ajouter le champ `bridge` dans `AdminAPIDeps` :

```ts
export interface AdminAPIDeps {
  // ... champs existants inchangés
  bridge?: {
    getStats(): Promise<BridgeStats> | BridgeStats;
    getEvents?(limit?: number): DomOSLiveKitBridgeEvent[];
  };
}
```

---

### Étape 4 — Ajouter l'endpoint `GET /admin/bridge`

**Fichier :** `packages/server/src/admin/AdminAPI.ts`

Dans `handleRequest()`, ajouter après les endpoints existants :

```ts
} else if (method === 'GET' && path === '/bridge') {
  const stats = await this.getBridgeStats();
  this.sendJSON(res, stats);
```

Méthode `getBridgeStats()` :

```ts
private async getBridgeStats(): Promise<BridgeStats> {
  if (!this.deps.bridge) {
    return { enabled: false, activeBridges: 0, sessions: [] };
  }
  return this.deps.bridge.getStats();
}
```

---

### Étape 5 — Enrichir `/admin/status`

Dans `getStatus()`, ajouter après `pendingToolCalls` :

```ts
bridgeEnabled: Boolean(this.deps.bridge),
bridgeActiveBridges: this.deps.bridge
  ? (await this.deps.bridge.getStats()).activeBridges
  : 0,
```

---

### Étape 6 — Passer le bridge depuis `DomOSServer`

**Fichier :** `packages/server/src/core/DomOSServer.ts`

Ajouter la propriété privée et le setter :

```ts
private bridge?: DomOSLiveKitAgentBridge;

setBridge(bridge: DomOSLiveKitAgentBridge): void {
  this.bridge = bridge;
}
```

Dans le constructeur, lors de la création de l'AdminAPI, passer le bridge dans les `AdminAPIDeps` :

```ts
bridge: this.bridge ? {
  getStats: () => this.bridge.getStats(),
  getEvents: (limit) => this.bridge.getEvents(limit),
} : undefined,
```

---

## Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `packages/adapter-livekit/src/bridge/DomOSLiveKitAgentBridge.ts` | +30 lignes : `BridgeStatsSnapshot`, `getStats()`, `eventLog`, `getEvents()` |
| `packages/adapter-livekit/src/bridge/index.ts` | +1 ligne : exporter `BridgeStatsSnapshot` |
| `packages/server/src/admin/AdminAPI.ts` | +30 lignes : `BridgeStats`, `bridge` dans `AdminAPIDeps`, endpoint `/admin/bridge`, enrichir `/admin/status` |
| `packages/server/src/core/DomOSServer.ts` | +8 lignes : propriété `bridge`, setter, passer aux `AdminAPIDeps` |

**Total estimé : ~70 lignes de code**

---

## Note

Le sprint LK-04 marque ce point comme **"si nécessaire"** — les 7 gates principales sont déjà validées sans ça. Cette implémentation permet simplement de rendre le bridge observable depuis le dashboard admin. Ce n'est pas bloquant pour le fonctionnement du bridge lui-même.
