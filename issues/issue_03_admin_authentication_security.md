# Issue #03 - Admin Authentication Security Refactoring

**Status**: ✅ Complété  
**Version**: DomOS v0.2.0  
**Date**: 12 février 2026  
**Breaking Changes**: ✅ Oui

---

## 📋 Résumé

Refactoring majeur du système d'authentification admin pour améliorer la sécurité :

**Avant (v0.1.x)**:
- Admin utilisait une simple clé API statique (`adminKey`)
- Auth client et admin mélangées dans la config
- Pas de rate limiting
- Vulnérable aux timing attacks
- CORS avec wildcard `*`

**Après (v0.2.0)**:
- Admin utilise username/password avec bcrypt (10 rounds)
- Session-based authentication avec tokens aléatoires
- Rate limiting (5 tentatives / 15min par IP)
- Protection timing attack (bcrypt.compare constant-time)
- CORS strict avec liste d'origines autorisées
- Séparation admin/client dans la config

---

## 🎯 Objectifs

### Problèmes résolus

1. **Sécurité faible** : La clé admin était une simple string envoyée en clair
2. **Pas de rate limiting** : Vulnérable aux attaques brute-force
3. **Timing attacks** : Les comparaisons de strings révélaient des infos
4. **Config confuse** : `admin`, `requireAuth`, `exposeApiKeys` mélangés
5. **CORS permissif** : Wildcard `*` permettait toutes origines

### Solutions implémentées

✅ **Bcrypt password hashing** avec 10 rounds  
✅ **Session management** avec tokens aléatoires (32 bytes)  
✅ **Rate limiting** configurable (défaut: 5 tentatives/15min)  
✅ **Timing attack protection** via `bcrypt.compare()`  
✅ **CORS strict** avec `allowedOrigins` array  
✅ **Separation of concerns** : `AdminAuthManager` vs `ClientAuthManager`  
✅ **Connection limits** par API key (défaut: 10 connexions)  
✅ **Session expiration** avec cleanup automatique

---

## 🏗️ Architecture

### Nouveaux modules

```
packages/server/src/auth/
├── types.ts                  # AdminAuthOptions, ClientAuthOptions, AdminSession
├── AdminAuthManager.ts       # Username/password + sessions
└── ClientAuthManager.ts      # API key auth + connection tracking
```

### Fichiers modifiés

```
packages/server/
├── src/
│   ├── core/DomOSServer.ts         # Config refactor, auth managers
│   ├── admin/AdminAPI.ts           # Session-based auth, nouveaux endpoints
│   └── index.ts                    # Exports mis à jour
├── package.json                    # Dépendances: bcrypt, jsonwebtoken
├── test-server.ts                  # Serveur de test
└── test-admin-auth.ts              # Script de tests automatisés
```

---

## 🔐 AdminAuthManager

### Responsabilités

- Hashing de mots de passe avec bcrypt
- Gestion des sessions (create, verify, revoke)
- Rate limiting par IP
- Protection contre timing attacks
- Cleanup automatique des sessions expirées

### API publique

```typescript
class AdminAuthManager {
  constructor(options: AdminAuthOptions);

  // Authentification
  async login(username: string, password: string, ip?: string): Promise<{
    success: boolean;
    token?: string;
    message?: string;
  }>;

  // Vérification de session
  verifySession(token: string): AdminSession | null;

  // Déconnexion
  logout(token: string): boolean;

  // Rate limiting
  private checkRateLimit(ip: string): { allowed: boolean; message?: string };

  // Cleanup
  private cleanupExpiredSessions(): void;
  private cleanupOldAttempts(): void;

  // Lifecycle
  stop(): void;
}
```

### Options de configuration

```typescript
interface AdminAuthOptions {
  username: string; // Username admin (requis)
  password: string; // Password (sera hashé)
  path?: string; // Path admin API (défaut: '/admin')
  sessionDuration?: number; // Durée session ms (défaut: 24h)
  rateLimitWindowMs?: number; // Fenêtre rate limit (défaut: 15min)
  rateLimitMaxAttempts?: number; // Max tentatives (défaut: 5)
  allowedOrigins?: string[]; // CORS origins (défaut: [])
}
```

### Sécurité

- **Bcrypt**: `BCRYPT_ROUNDS = 10` (2^10 = 1024 iterations)
- **Random tokens**: `crypto.randomBytes(32).toString('hex')`
- **Timing attack**: Toujours appeler `bcrypt.compare()` même si username invalide
- **Rate limiting**: Tracking par IP avec window glissante
- **Session expiry**: Cleanup toutes les heures via `setInterval`

---

## 🔑 ClientAuthManager

### Responsabilités

- Validation des API keys (wrapper AuthMiddleware)
- Tracking des connexions par key
- Limites de connexions simultanées
- Libération des connexions à la déconnexion

### API publique

```typescript
class ClientAuthManager {
  constructor(options?: ClientAuthOptions);

  // Auth
  async authenticate(req: IncomingMessage): Promise<{
    authorized: boolean;
    apiKey?: string;
    message?: string;
  }>;

  // Connection tracking
  registerConnection(apiKey: string): { allowed: boolean; message?: string };
  releaseConnection(apiKey: string): void;

  // API Key management
  addApiKey(key: string): void;
  removeApiKey(key: string): void;
  setApiKeyValidator(validator: ApiKeyValidator): void;
  getApiKeys(): string[];
}
```

### Options de configuration

```typescript
interface ClientAuthOptions {
  requireApiKey?: boolean; // Requérir auth (défaut: true)
  enableApiKeyManagement?: boolean; // Exposer /admin/client/keys (défaut: false)
  maxConnectionsPerKey?: number; // Max connexions (défaut: 10)
}
```

---

## 🚀 AdminAPI Endpoints

### Nouveau flow d'authentification

```
Client                    Server
  |                         |
  |--POST /admin/login----->|  (public)
  |  { username, password } |
  |                         |--- Verify bcrypt
  |                         |--- Check rate limit
  |                         |--- Create session
  |                         |
  |<------{ token }---------|
  |                         |
  |--GET /admin/status----->|  (protected)
  |  Authorization: Bearer  |
  |                         |--- Verify session
  |                         |
  |<------{ status }--------|
```

### Endpoints disponibles

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/admin/login` | POST | Publique | Login username/password |
| `/admin/logout` | POST | Protégé | Invalider session |
| `/admin/status` | GET | Protégé | Statut serveur |
| `/admin/sessions` | GET | Protégé | Sessions actives |
| `/admin/tools` | GET | Protégé | Liste des tools |
| `/admin/metrics` | GET | Protégé | Métriques (si activé) |
| `/admin/client/keys` | GET/POST/DELETE | Protégé | Gestion API keys |

### Changements d'endpoints

| v0.1.x | v0.2.0 | Notes |
|--------|--------|-------|
| ❌ `/admin/apikeys` | ✅ `/admin/client/keys` | Path changé |
| ❌ Auth via `adminKey` | ✅ Auth via Bearer token | Méthode changée |

---

## 📝 Breaking Changes

### 1. Configuration `DomOSServerOptions`

**Avant (v0.1.x)**:
```typescript
const server = new DomOSServer({
  llm: adapter,
  admin: {
    adminKey: 'secret-key-123',
    exposeApiKeys: true,
  },
  requireAuth: true,
});
```

**Après (v0.2.0)**:
```typescript
const server = new DomOSServer({
  llm: adapter,
  admin: {
    username: 'admin',
    password: process.env.ADMIN_PASSWORD,
    path: '/admin',
  },
  client: {
    requireApiKey: true,
    enableApiKeyManagement: true,
  },
});
```

### 2. Authentification admin

**Avant**: Header `Authorization: Bearer <adminKey>`  
**Après**: 
1. Login → recevoir token
2. Header `Authorization: Bearer <token>` pour tous endpoints

### 3. Gestion des API keys

**Avant**: `GET /admin/apikeys`  
**Après**: `GET /admin/client/keys`

---

## 🧪 Tests

### Lancer le serveur de test

```bash
cd domos/packages/server
tsx test-server.ts
```

### Lancer les tests automatisés

```bash
# Dans un autre terminal
tsx test-admin-auth.ts
```

### Tests couverts

1. ✅ Login avec username/password valides
2. ✅ Accès endpoint protégé avec token
3. ✅ Accès endpoint protégé SANS token (401)
4. ✅ Rate limiting (5 tentatives → 429)
5. ✅ Logout
6. ✅ Token invalide après logout

### Résultat attendu

```
🧪 Test: Admin Login
✅ Login réussi! Token: 8f3e4a2b1c9d7e6f...

🧪 Test: Admin Status (Protected)
✅ Status récupéré! Uptime: 15234ms

🧪 Test: Admin Status (Sans token - doit échouer)
✅ Accès refusé comme prévu (401)

🧪 Test: Login avec mauvais credentials (Rate Limiting)
✅ Rate limit activé à la tentative 6!

🧪 Test: Admin Logout
✅ Logout réussi!

🧪 Test: Access après logout (doit échouer)
✅ Token invalidé après logout (401)

📊 RÉSUMÉ DES TESTS
Total: 6 / 6 tests passés
🎉 Tous les tests sont passés!
```

---

## 📚 Migration

Voir le guide complet: [MIGRATION_V0.2.md](../docs/MIGRATION_V0.2.md)

### Étapes essentielles

1. **Installer les dépendances**:
   ```bash
   pnpm install bcrypt @types/bcrypt
   ```

2. **Mettre à jour la config serveur**:
   ```typescript
   admin: {
     username: 'admin',
     password: process.env.ADMIN_PASSWORD,
   },
   client: {
     requireApiKey: true,
     enableApiKeyManagement: true,
   }
   ```

3. **Mettre à jour les clients** (dashboard, etc.):
   - Implémenter login flow (POST /admin/login)
   - Stocker le token (localStorage, sessionStorage)
   - Utiliser Bearer token pour tous les endpoints
   - Gérer les 401 (redirect vers login)

---

## 🔒 Best Practices

### 1. Variables d'environnement

```typescript
// ❌ MAUVAIS
admin: {
  password: 'hardcoded-password',
}

// ✅ BON
admin: {
  password: process.env.ADMIN_PASSWORD,
}
```

### 2. HTTPS en production

```typescript
admin: {
  username: 'admin',
  password: process.env.ADMIN_PASSWORD,
  allowedOrigins: ['https://dashboard.example.com'],
}
```

### 3. Session duration

```typescript
// Dev: sessions courtes pour tester l'expiration
admin: {
  sessionDuration: 5 * 60 * 1000, // 5min
}

// Prod: sessions longues pour UX
admin: {
  sessionDuration: 24 * 60 * 60 * 1000, // 24h
}
```

### 4. Rate limiting

```typescript
// Dev: rate limit court pour tester rapidement
admin: {
  rateLimitWindowMs: 60 * 1000, // 1min
  rateLimitMaxAttempts: 3,
}

// Prod: rate limit strict
admin: {
  rateLimitWindowMs: 15 * 60 * 1000, // 15min
  rateLimitMaxAttempts: 5,
}
```

---

## 📦 Dépendances ajoutées

### Production

- `bcrypt: ^5.1.1` - Password hashing (C++ native)
- `jsonwebtoken: ^9.0.2` - JWT tokens (pour futures évolutions)

### Dev

- `@types/bcrypt: ^5.0.2` - Types TypeScript
- `@types/jsonwebtoken: ^9.0.5` - Types TypeScript

---

## ⚡ Performance

### Bcrypt hashing

- **Rounds**: 10 (recommandé OWASP)
- **Time**: ~100-200ms par hash (dépend CPU)
- **Impact**: Login seulement (pas de hash à chaque requête)

### Session lookup

- **Storage**: Map en mémoire (O(1) lookup)
- **Cleanup**: Toutes les heures (pas d'impact sur requêtes)
- **Impact**: Négligeable (<1ms par vérification)

### Rate limiting

- **Storage**: Map en mémoire par IP
- **Cleanup**: Automatique (window glissante)
- **Impact**: Négligeable (<1ms par check)

---

## 🔮 Évolutions futures

### v0.3.0 (prévues)

- [ ] JWT tokens au lieu de tokens aléatoires
- [ ] Redis pour sessions distribuées
- [ ] 2FA / TOTP support
- [ ] Audit log des actions admin
- [ ] Role-based access control (admin vs viewer)
- [ ] Password reset flow
- [ ] Session management UI (kill session)

### Améliorations suggérées

- Utiliser `jsonwebtoken` pour tokens structurés
- Ajouter `RefreshToken` pour sessions longues
- Implémenter `SessionStore` interface (Redis, MongoDB)
- Ajouter métriques Prometheus pour login attempts

---

## 📖 Références

### Code

- [AdminAuthManager.ts](../packages/server/src/auth/AdminAuthManager.ts)
- [ClientAuthManager.ts](../packages/server/src/auth/ClientAuthManager.ts)
- [types.ts](../packages/server/src/auth/types.ts)
- [AdminAPI.ts](../packages/server/src/admin/AdminAPI.ts)
- [DomOSServer.ts](../packages/server/src/core/DomOSServer.ts)

### Documentation

- [MIGRATION_V0.2.md](../docs/MIGRATION_V0.2.md)
- [test-server.ts](../packages/server/test-server.ts)
- [test-admin-auth.ts](../packages/server/test-admin-auth.ts)

### Standards

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html) (Digital Identity Guidelines)
- [bcrypt: Choosing a Work Factor](https://www.npmjs.com/package/bcrypt#a-note-on-rounds)

---

**Auteur**: GitHub Copilot  
**Reviewers**: -  
**Créé**: 12 février 2026  
**Dernière mise à jour**: 12 février 2026  
**Version**: 1.0.0

