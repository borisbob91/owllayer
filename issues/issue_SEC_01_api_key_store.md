# Issue SEC_01 — API Key Store (Persistance en Base de Données)

> **Date de création** : 25 Mars 2026  
> **Priorité** : 🔴 CRITIQUE (Phase 1 — Urgences)  
> **Porteur** : @domos/server owner  
> **Estimation** : 1-2 jours  
> **Référence** : `cahiers/SECURITY_BENCHMARK_AUDIT.md` — Section 3.1

---

## 1. Contexte & Problème

### 1.1 État Actuel (Vulnérable)

**Fichier** : `packages/server/src/middleware/auth.ts`

```typescript
export class AuthMiddleware {
  private validKeys = new Set<string>();  // ❌ EN MÉMOIRE UNIQUEMENT

  addKeys(...keys: string[]): void {
    for (const key of keys) {
      this.validKeys.add(key);
    }
  }

  async authenticate(req: IncomingMessage): Promise<AuthResult> {
    // Validation via Set en mémoire
    const isValid = this.customValidator 
      ? await this.customValidator(apiKey)
      : this.validKeys.has(apiKey);  // ❌ Perdu au redémarrage
  }
}
```

### 1.2 Problèmes Identifiés

| Problème | Impact | Gravité |
|---|---|---|
| **API keys en mémoire uniquement** | Redémarrage = toutes les clés perdues | 🔴 Critique |
| **Pas de persistance** | Reconfiguration manuelle après chaque restart | 🔴 Critique |
| **Pas de révocation persistante** | Une clé compromise reste valide indéfiniment | 🔴 Critique |
| **Pas d'expiration** | Les clés ne périment jamais | 🟠 Élevé |
| **Pas d'audit** | Impossible de tracer qui a créé/révoqué quelle clé | 🟠 Élevé |

### 1.3 Comparaison avec Incidents Réels

**OpenWebUI — Default Login (Nov 2025)**
- Credentials admin dans `.env` → commités par erreur dans Git
- Résultat : des milliers d'instances compromises

**DomOS Risque Similaire :**
- API keys dans le code (`apps/demo-server/src/server.ts`) → commitées dans Git
- Ou dans `.env` → sauvegardé dans les backups non sécurisés

---

## 2. Solution Attendue

### 2.1 Architecture Cible

```
┌─────────────────────────────────────────────────────────────┐
│                    DomOSServer                               │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  AuthMiddleware                                         │ │
│  │  - authenticate()                                       │ │
│  │       ↓                                                 │ │
│  │  - Appelle ApiKeyStore.validateKey()                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ↓                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ApiKeyStore (NOUVEAU)                                  │ │
│  │  - addKey(key, name, permissions, expiresAt)           │ │
│  │  - validateKey(key) → boolean                          │ │
│  │  - revokeKey(key) → void                               │ │
│  │  - listKeys() → ApiKeyRecord[]                         │ │
│  │       ↓                                                 │ │
│  │  Utilise SQLite (ou MongoDB)                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ↓                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  SQLite Database                                        │ │
│  │  Table: api_keys                                        │ │
│  │  - id (PRIMARY KEY)                                     │ │
│  │  - key_hash (UNIQUE, INDEXED)                           │ │
│  │  - name                                                 │ │
│  │  - permissions (JSON)                                   │ │
│  │  - created_at, created_by                               │ │
│  │  - expires_at (NULL = jamais)                           │ │
│  │  - revoked_at (NULL = actif)                            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Spécifications Techniques

#### 2.2.1 ApiKeyStore — Interface

```typescript
// packages/server/src/auth/ApiKeyStore.ts

export interface ApiKeyRecord {
  id: string;
  keyHash: string;      // SHA-256 de la clé
  name: string;         // Nom descriptif (ex: "Demo React")
  permissions: string[]; // Ex: ['tools:*', 'sessions:read']
  createdAt: Date;
  createdBy: string;   ;  // userId ou 'system'
  expiresAt?: Date;   ; ;  // undefined = jamais
  revokedAt?: Date;   ;  ;  // undefined = actif
  revokedBy?: string; ;  ;  // userId
  revokedReason?: string;
}

export interface IApiKeyStore {
  /** Ajouter une nouvelle clé */
  addKey(options: {
    key: string;
    name: string;
    permissions?: string[];
    expiresAt?: Date;
    createdBy?: string;
  }): Promise<ApiKeyRecord>;

  /** Valider une clé (pour authentification) */
  validateKey(key: string): Promise<boolean>;

  /** Révoquer une clé */
  revokeKey(options: {
    key: string;
    revokedBy?: string;
    reason?: string;
  }): Promise<void>;

  /** Lister toutes les clés (sans les hashes) */
  listKeys(options?: {
    includeRevoked?: boolean;
    includeExpired?: boolean;
  }): Promise<Omit<ApiKeyRecord, 'keyHash'>[]>;

  /** Supprimer définitivement une clé (cleanup) */
  deleteKey(keyHash: string): Promise<void>;
}
```

#### 2.2.2 Implémentation SQLite

```typescript
// packages/server/src/persistence/ApiKeySQLiteStore.ts

export class ApiKeySQLiteStore implements IApiKeyStore {
  private db: Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        key_hash TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        permissions TEXT NOT NULL,  -- JSON array
        created_at INTEGER NOT NULL,
        created_by TEXT NOT NULL,
        expires_at INTEGER,
        revoked_at INTEGER,
        revoked_by TEXT,
        revoked_reason TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
      CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at);
      CREATE INDEX IF NOT EXISTS idx_api_keys_revoked_at ON api_keys(revoked_at);
    `);
  }

  async addKey(options: {
    key: string;
    name: string;
    permissions?: string[];
    expiresAt?: Date;
    createdBy?: string;
  }): Promise<ApiKeyRecord> {
    const id = generateId();
    const keyHash = this.hashKey(options.key);
    const now = Date.now();

    this.db.run(`
      INSERT INTO api_keys (id, key_hash, name, permissions, created_at, created_by, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      keyHash,
      options.name,
      JSON.stringify(options.permissions || ['*']),
      now,
      options.createdBy || 'system',
      options.expiresAt?.getTime() || null,
    ]);

    return {
      id,
      keyHash,
      name: options.name,
      permissions: options.permissions || ['*'],
      createdAt: new Date(now),
      createdBy: options.createdBy || 'system',
      expiresAt: options.expiresAt,
    };
  }

  async validateKey(key: string): Promise<boolean> {
    const keyHash = this.hashKey(key);
    const now = Date.now();

    const row: any = this.db.prepare(`
      SELECT key_hash, expires_at, revoked_at
      FROM api_keys
      WHERE key_hash = ?
    `).get(keyHash);

    if (!row) {
      return false;  // Clé inconnue
    }

    if (row.revoked_at) {
      return false;  // Clé révoquée
    }

    if (row.expires_at && row.expires_at < now) {
      return false;  // Clé expirée
    }

    return true;  // ✅ Clé valide
  }

  async revokeKey(options: {
    key: string;
    revokedBy?: string;
    reason?: string;
  }): Promise<void> {
    const keyHash = this.hashKey(options.key);
    const now = Date.now();

    this.db.run(`
      UPDATE api_keys
      SET revoked_at = ?, revoked_by = ?, revoked_reason = ?
      WHERE key_hash = ?
    `, [
      now,
      options.revokedBy || 'system',
      options.reason || null,
      keyHash,
    ]);
  }

  async listKeys(options?: {
    includeRevoked?: boolean;
    includeExpired?: boolean;
  }): Promise<Omit<ApiKeyRecord, 'keyHash'>[]> {
    let whereClauses = ['1=1'];

    if (!options?.includeRevoked) {
      whereClauses.push('revoked_at IS NULL');
    }

    if (!options?.includeExpired) {
      whereClauses.push('(expires_at IS NULL OR expires_at > ?)');
    }

    const where = whereClauses.join(' AND ');
    const rows: any[] = this.db.prepare(`
      SELECT id, name, permissions, created_at, created_by, expires_at, revoked_at, revoked_by, revoked_reason
      FROM api_keys
      WHERE ${where}
      ORDER BY created_at DESC
    `).all(options?.includeExpired ? [] : [Date.now()]);

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      permissions: JSON.parse(row.permissions),
      createdAt: new Date(row.created_at),
      createdBy: row.created_by,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      revokedAt: row.revoked_at ? new Date(row.revoked_at) : undefined,
      revokedBy: row.revoked_by,
      revokedReason: row.revoked_reason,
    }));
  }

  async deleteKey(keyHash: string): Promise<void> {
    this.db.run(`
      DELETE FROM api_keys WHERE key_hash = ?
    `, [keyHash]);
  }

  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }
}
```

#### 2.2.3 Intégration dans AuthMiddleware

```typescript
// packages/server/src/middleware/auth.ts — MODIFICATIONS

import { ApiKeySQLiteStore } from '../persistence/ApiKeySQLiteStore.js';

export class AuthMiddleware {
  private validKeys = new Set<string>();  // ⚠️ Garder pour fallback
  private customValidator?: ApiKeyValidator;
  private apiKeyStore?: ApiKeySQLiteStore;  // ✅ NOUVEAU

  /** Définir le store d'API keys */
  setApiKeyStore(store: ApiKeySQLiteStore): void {
    this.apiKeyStore = store;
  }

  async authenticate(req: IncomingMessage): Promise<AuthResult> {
    // ... extraction apiKey ...

    // Valider avec le store si disponible
    if (this.apiKeyStore) {
      const isValid = await this.apiKeyStore.validateKey(apiKey);
      
      if (!isValid) {
        log.warn(`API key invalide (store): ${apiKey.slice(0, 8)}...`);
        return { authenticated: false, error: 'API key invalide' };
      }
      
      return { authenticated: true, apiKey };
    }

    // Fallback : validateur custom ou Set en mémoire
    if (this.customValidator) {
      const isValid = await this.customValidator(apiKey);
      if (!isValid) {
        return { authenticated: false, error: 'API key invalide' };
      }
    } else {
      if (!this.validKeys.has(apiKey)) {
        return { authenticated: false, error: 'API key invalide' };
      }
    }

    return { authenticated: true, apiKey };
  }
}
```

#### 2.2.4 Intégration dans DomOSServer

```typescript
// packages/server/src/core/DomOSServer.ts — MODIFICATIONS

import { ApiKeySQLiteStore } from '../persistence/ApiKeySQLiteStore.js';

export class DomOSServer {
  private apiKeyStore?: ApiKeySQLiteStore;

  constructor(private options: DomOSServerOptions) {
    // ... existing code ...

    // Initialiser le store si configuré
    if (options.apiKeyStore?.provider === 'sqlite') {
      this.apiKeyStore = new ApiKeySQLiteStore(options.apiKeyStore.sqlitePath);
      this.clientAuth.setApiKeyStore(this.apiKeyStore);
      log.info('API Key Store SQLite initialisé');
    }
  }

  /** Ajouter une clé API (utilise le store si disponible) */
  async addApiKey(key: string, options?: {
    name?: string;
    permissions?: string[];
    expiresAt?: Date;
  }): Promise<void> {
    if (this.apiKeyStore) {
      await this.apiKeyStore.addKey({
        key,
        name: options?.name || 'Unnamed',
        permissions: options?.permissions,
        expiresAt: options?.expiresAt,
      });
      log.info(`API key ajoutée: ${options?.name || 'Unnamed'}`);
    } else {
      // Fallback : mémoire uniquement
      this.clientAuth.addKeys(key);
      log.warn(`API key ajoutée en mémoire (non persistant): ${key.slice(0, 8)}...`);
    }
  }

  /** Révoquer une clé API */
  async revokeApiKey(key: string, options?: {
    reason?: string;
  }): Promise<void> {
    if (this.apiKeyStore) {
      await this.apiKeyStore.revokeKey({
        key,
        reason: options?.reason,
      });
      log.info(`API key révoquée: ${key.slice(0, 8)}...`);
    } else {
      log.warn('API Key Store non configuré — révocation impossible');
      throw new Error('Révocation non disponible sans API Key Store');
    }
  }

  /** Lister les clés API */
  async listApiKeys(options?: {
    includeRevoked?: boolean;
  }): Promise<Omit<ApiKeyRecord, 'keyHash'>[]> {
    if (this.apiKeyStore) {
      return this.apiKeyStore.listKeys(options);
    }
    throw new Error('Listage non disponible sans API Key Store');
  }
}
```

---

## 3. Fichiers à Modifier/Créer

| Fichier | Action | Description |
|---|---|---|
| `packages/server/src/auth/ApiKeyStore.ts` | **CRÉER** | Interface et types |
| `packages/server/src/persistence/ApiKeySQLiteStore.ts` | **CRÉER** | Implémentation SQLite |
| `packages/server/src/middleware/auth.ts` | **MODIFIER** | Intégrer ApiKeyStore |
| `packages/server/src/core/DomOSServer.ts` | **MODIFIER** | Méthodes addApiKey, revokeApiKey |
| `packages/server/src/index.ts` | **MODIFIER** | Exporter ApiKeyStore |
| `packages/server/tests/auth/apikey.store.test.ts` | **CRÉER** | Tests unitaires |
| `packages/server/tests/auth/auth.integration.test.ts` | **CRÉER** | Tests d'intégration |
| `apps/demo-server/src/server.ts` | **MODIFIER** | Utiliser le nouveau store |

---

## 4. Checklist de Validation

### 4.1 Architecture

- [ ] `ApiKeyStore` est une interface séparée (dans `auth/` ou `persistence/`)
- [ ] `ApiKeySQLiteStore` implémente l'interface
- [ ] Utilise SQLite (via `better-sqlite3` déjà dans les dépendances)
- [ ] Schéma de base de données avec index

### 4.2 Sécurité

- [ ] API keys hashées avec SHA-256 avant stockage
- [ ] Méthode `validateKey()` compare les hashes (pas de stockage en clair)
- [ ] Méthode `revokeKey()` marque comme révoquée (pas de suppression)
- [ ] Champ `expiresAt` optionnel pour expiration automatique
- [ ] Champ `revokedAt` pour traçabilité
- [ ] Champ `revokedBy` et `revokedReason` pour audit

### 4.3 Intégration

- [ ] `AuthMiddleware` a une méthode `setApiKeyStore()`
- [ ] `authenticate()` appelle `apiKeyStore.validateKey()` en priorité
- [ ] Validation asynchrone (`async/await`)
- [ ] Fallback vers `Set<string>` si store non configuré (rétro-compatibilité)

### 4.4 DomOSServer

- [ ] Nouvelle méthode `addApiKey()` avec options (name, permissions, expiresAt)
- [ ] Nouvelle méthode `revokeApiKey()` avec reason
- [ ] Nouvelle méthode `listApiKeys()`
- [ ] Utilise le store si configuré, fallback mémoire sinon

### 4.5 Tests

#### Tests Unitaires

- [ ] Test : `addKey()` → clé ajoutée en DB
- [ ] Test : `validateKey()` clé valide → `true`
- [ ] Test : `validateKey()` clé inconnue → `false`
- [ ] Test : `validateKey()` clé révoquée → `false`
- [ ] Test : `validateKey()` clé expirée → `false`
- [ ] Test : `revokeKey()` → clé marquée révoquée
- [ ] Test : `hashKey()` → même hash pour même clé (déterministe)
- [ ] Test : `listKeys()` → retourne les clés sans hashes

#### Tests d'Intégration

- [ ] Test : Authentification avec clé valide → succès
- [ ] Test : Authentification avec clé révoquée → échec
- [ ] Test : Authentification avec clé expirée → échec
- [ ] Test : Révocation → session en cours déconnectée (lié à SEC_02)

### 4.6 Logging

- [ ] Log : "API key ajoutée: {name}" (sans la clé !)
- [ ] Log : "API key révoquée: {name}"
- [ ] Log : "API key validation failed: {hash_prefix}" (8 premiers caractères)
- [ ] Log level : WARN pour les échecs, INFO pour les succès

### 4.7 Documentation

- [ ] JSDoc sur `ApiKeyStore` interface
- [ ] JSDoc sur toutes les méthodes publiques
- [ ] Exemple d'usage dans le commentaire de classe
- [ ] README mis à jour avec la nouvelle configuration

### 4.8 Build & Performance

- [ ] `pnpm --filter @domos/server build` → SUCCESS
- [ ] `tsc --noUnusedLocals` → 0 erreur
- [ ] Overhead validation : < 5ms (objectif : < 1ms)
- [ ] Throughput : > 500 req/s (objectif : 1000 req/s)

---

## 5. Exemple d'Usage

### 5.1 Configuration dans demo-server

```typescript
// apps/demo-server/src/server.ts

import { DomOSServer, ApiKeySQLiteStore } from '@domos/server';

const server = new DomOSServer({
  llm: new GoogleAdapter({ apiKey: process.env.GOOGLE_API_KEY }),
  port: 3000,
  apiKeyStore: {
    provider: 'sqlite',
    sqlitePath: './data/api-keys.db',
  },
});

// Ajouter une clé avec expiration
await server.addApiKey(process.env.DOMOS_API_KEY!, {
  name: 'Demo React',
  permissions: ['*'],
  expiresAt: new Date('2027-01-01'),
});

// Révoquer une clé compromise
await server.revokeApiKey('pk_compromised_xxx', {
  reason: 'Clé exposée dans un commit Git',
});

// Lister les clés actives
const keys = await server.listApiKeys({ includeRevoked: false });
console.log('Clés actives:', keys.map(k => ({ name: k.name, expiresAt: k.expiresAt })));
```

### 5.2 Migration depuis l'Ancien Système

```typescript
// Ancien code (à migrer)
server.addApiKey('pk_live_xxx');  // ❌ Mémoire uniquement

// Nouveau code
await server.addApiKey('pk_live_xxx', {
  name: 'Production',
  permissions: ['*'],
});  // ✅ Persistant en DB
```

---

## 6. Critères d'Acceptation

- [ ] Build passe sans erreur
- [ ] Tous les tests existants passent (non-régression)
- [ ] Nouveaux tests unitaires passent (100% coverage sur ApiKeyStore)
- [ ] Tests d'intégration passent
- [ ] Logging implémenté et vérifié
- [ ] Documentation JSDoc 100%
- [ ] Performance overhead < 5ms
- [ ] Rétro-compatible (fallback mémoire si store non configuré)

---

## 7. Références

- `cahiers/SECURITY_BENCHMARK_AUDIT.md` — Section 3.1 (API Keys en mémoire)
- `cahiers/SECURITY_BENCHMARK_AUDIT.md` — Section 4 (Comparaison OpenWebUI)
- `skills/SECURITY_FIX_VALIDATOR.md` — Section 2.1 (Checklist de validation)
- CVE-2024-12537 (OpenWebUI — Aucune auth)
- OWASP Agentic AI Top 10 #2 (Broken Access Control)

---

## 8. Notes Techniques

### 8.1 Pourquoi SHA-256 ?

- Standard industriel (utilisé par Stripe, GitHub, etc.)
- Rapide à calculer (important pour l'authentification)
- Suffisant pour notre cas d'usage (pas besoin de bcrypt/argon2)

### 8.2 Pourquoi SQLite et pas MongoDB ?

- `better-sqlite3` est déjà dans les dépendances
- Plus simple à déployer (fichier unique, pas de serveur)
- Suffisant pour notre volume (quelques centaines de clés max)
- MongoDB disponible en alternative (à implémenter si besoin)

### 8.3 Rétro-compatibilité

Le système garde un fallback vers `Set<string>` pour :
- Les déploiements existants qui ne configurent pas le store
- Les tests unitaires (pas besoin de DB)
- Les environnements de développement légers

---

## 9. Tâches Associées

- [ ] **SEC_01** : API Key Store (cette issue)
- [ ] **SEC_02** : Re-vérification Auth (dépend de SEC_01)
- [ ] **SEC_04** : Audit Logger (dépend partiellement de SEC_01)

---

## 10. Validation Finale

**À remplir après implémentation :**

```markdown
## Rapport de Validation

**Date** : [DATE]  
**Validé par** : [NOM]

### Build
- [ ] pnpm --filter @domos/server build — SUCCESS

### Tests
- [ ] Tests unitaires — X/X PASS
- [ ] Tests d'intégration — X/X PASS

### Performance
- [ ] Overhead validation : < 5ms
- [ ] Throughput : > 500 req/s

### Code Quality
- [ ] tsc --noUnusedLocals — 0 erreur
- [ ] ESLint — 0 errors, 0 warnings
- [ ] JSDoc — 100%

### Validation Finale
- [ ] TOUS LES CHECKS PASSENT — CORRECTIF VALIDÉ
```

---

**Issue créée le 25 Mars 2026**  
**À associer à** : `cahiers/SECURITY_BENCHMARK_AUDIT.md`  
**Skill de validation** : `skills/SECURITY_FIX_VALIDATOR.md` — Section 2.1
