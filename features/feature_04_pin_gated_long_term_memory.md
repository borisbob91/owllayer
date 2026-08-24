# Feature #04 : Mémoire longue sécurisée par PIN

**Statut** : 🔵 Proposée  
**Domaine** : core + browser  
**Porteur** : @BorisBob  
**Date** : 2026-03-25  
**Dépend de** : Feature #03 (summaries + getBrowserId + registerMemoryTools)

---

## Besoin

### User story

> En tant qu'utilisateur, je veux que mes échanges avec l'agent soient mémorisés de manière persistante entre les sessions, mais **uniquement après avoir confirmé mon identité par un code PIN** — afin de protéger mes données si quelqu'un d'autre accède à mon appareil.

> En tant que développeur, je veux pouvoir activer ce mode sans toucher à la cryptographie ou au localStorage directement.

### Problème actuel

Feature #03 active la mémoire longue pour tout utilisateur sur le device. Si le device est partagé ou volé, n'importe qui peut démarrer une session et recevoir le contexte mémorisé. Ce n'est pas acceptable pour des données sensibles.

### Ce que la feature apporte

- Activation consciente et explicite : l'utilisateur crée un PIN la première fois qu'il choisit d'activer la mémoire longue.
- Les sessions sans PIN restent en mémoire courte (volatile) — comportement par défaut inchangé.
- Un PIN incorrect ou annulé → session volatile pour cette ouverture. Pas de blocage.

---

## Architecture

### `PinGatedTransport` (`packages/core/src/agent/PinGatedTransport.ts`)

Decorator wrapping n'importe quel `RemoteMemoryTransport`. Intercepte `load()` et `save()` pour demander un PIN.

```ts
export interface PinGatedTransportOptions {
  /** Transport wrappé (ex: LocalStorageTransport) */
  inner: RemoteMemoryTransport;
  /** Callback appelé par le transport pour demander le PIN.
   *  mode='create' = première utilisation, l'utilisateur crée son PIN.
   *  mode='verify' = utilisateur existant, doit entrer son PIN.
   *  Retourner null = annulation → load retourne null, save est no-op.
   */
  onRequestPin: (mode: 'create' | 'verify') => Promise<string | null>;
  /** Clé de stockage du hash PIN. Défaut: `owllayer:pin-hash:{userId}` */
  pinStorageKey?: string;
}
```

#### Flow `load(identity)`

```
1. pinHash = localStorage.getItem(`owllayer:pin-hash:${userId}`)
2. Si pas de hash → aucune mémoire longue existante → retourner null (no-op)
3. Si hash présent → onRequestPin('verify') → entrée utilisateur
4. Si null (annulé) → retourner null → mémoire courte pour cette session
5. SHA-256(userId + pin) → comparé au hash stocké
6. Match → inner.load(identity)
7. No match → retourner null → mémoire courte (ne pas bloquer, ne pas faire d'erreur)
```

#### Flow `save(identity, snapshot)`

```
1. pinHash = localStorage.getItem(`owllayer:pin-hash:${userId}`)
2. Si pas de hash → premier save → onRequestPin('create') → entrée utilisateur
3. Si null (annulé) → no-op, snapshot non sauvegardé
4. SHA-256(userId + pin) → stocker pinHash → inner.save(identity, snapshot)
5. Si hash déjà présent → vérifier PIN (même flow que load étape 3-7)
6. Si match → inner.save(identity, snapshot)
```

#### Implémentation hash

```ts
async function hashPin(userId: string, pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${userId}:${pin}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

WebCrypto est natif en navigateur et Node.js 16+. Pas de dépendance externe.

---

### `RemoteMemoryAdapter` — option `noLocalCache`

**Problème identifié** : `RemoteMemoryAdapter` maintient un cache localStorage en clair comme fallback. Si `PinGatedTransport` est le transport, ce cache contourne le PIN — un attaquant lit le cache directement.

**Fix** :

```ts
export interface RemoteMemoryAdapterOptions {
  transport: RemoteMemoryTransport;
  cacheKeyPrefix?: string;
  noLocalCache?: boolean;  // ← NOUVEAU — désactive le cache interne
}
```

Quand `noLocalCache: true` :
- `readLocalCache()` → retourne toujours `null`
- `writeLocalCache()` → no-op

---

### Config browser (`packages/browser/src/types.ts`)

```ts
memory?: {
  enabled?: boolean;
  storageKey?: string;
  userId?: string;
  transport?: RemoteMemoryTransport;
  /** Activer le verrou PIN. Défaut: 'default' (pas de PIN). */
  mode?: 'default' | 'pin-protected';
  /** Requis si mode === 'pin-protected'. L'intégrateur fournit sa propre UI. */
  onRequestPin?: (mode: 'create' | 'verify') => Promise<string | null>;
};
```

#### `BrowserOwlLayer.init()` avec PIN

```ts
if (memConfig.mode === 'pin-protected') {
  if (!memConfig.onRequestPin) {
    throw new Error('[OwlLayer] memory.onRequestPin est requis en mode pin-protected.');
  }
  const innerTransport = memConfig.transport ?? new LocalStorageTransport(memKey);
  transport = new PinGatedTransport({ inner: innerTransport, onRequestPin: memConfig.onRequestPin });
  adapter = new RemoteMemoryAdapter({ transport, cacheKeyPrefix: memKey, noLocalCache: true });
} else {
  transport = memConfig.transport ?? new LocalStorageTransport(memKey);
  adapter = new RemoteMemoryAdapter({ transport, cacheKeyPrefix: memKey });
}
```

---

## Contraintes et avertissements

| Contrainte | Détail |
|---|---|
| **PIN oublié = tout perdu** | Aucun mécanisme de récupération. L'UI doit informer l'utilisateur explicitement avant la création du PIN. |
| **Pas de crypto des données** | SHA-256 protège le verrou d'activation. Les données sont en clair dans localStorage. Protection contre accès passif/inattention, pas contre attaquant déterminé. |
| **Pas de rate-limiting natif** | localStorage ne limite pas les tentatives. Un attaquant avec accès au device peut tester des PINs par script. Pour protection renforcée → Feature #05 (AES-GCM). |
| **SSR** | `PinGatedTransport.load()` retourne `null` si `typeof localStorage === 'undefined'`. |
| **UX** | `onRequestPin` est de la responsabilité de l'intégrateur. Le SDK ne fournit pas de UI PIN. |

---

## Fichiers impactés

| Fichier | Changement |
|---|---|
| `packages/core/src/agent/PinGatedTransport.ts` | Nouveau — decorator WebCrypto |
| `packages/core/src/agent/RemoteMemoryAdapter.ts` | Ajouter `noLocalCache` option |
| `packages/core/src/index.ts` | Exporter `PinGatedTransport` + `PinGatedTransportOptions` |
| `packages/browser/src/runtime/BrowserOwlLayer.ts` | Détecter `mode: 'pin-protected'`, monter `PinGatedTransport` |
| `packages/browser/src/types.ts` | Champs `mode` et `onRequestPin` dans `memory?:` |

## Hors périmètre

- Chiffrement AES-GCM des données (Feature #05)
- Rate-limiting des tentatives PIN
- Composants UI PIN modal (responsabilité de l'intégrateur via `onRequestPin`)
- Hooks React/Vue/Svelte spécifiques (les hooks Feature #03 suffisent)
