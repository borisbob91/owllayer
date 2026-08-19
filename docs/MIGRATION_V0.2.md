# Guide de migration : OwlLayer v0.1 → v0.2

**Changement majeur** : Refactoring de l'authentification admin (Breaking Change)

---

## 🔄 Résumé des changements

### Avant (v0.1.x)

```typescript
const server = new OwlLayerServer({
  llm: adapter,
  port: 3000,
  admin: {
    path: '/admin',
    adminKey: 'secret-key-123',  // ❌ Une seule clé partagée
    exposeApiKeys: true,          // ❌ Nom confus
  },
  requireAuth: true,  // ❌ Auth client mélangée
});

server.addApiKey('pk_live_abc123');
```

### Après (v0.2.0)

```typescript
const server = new OwlLayerServer({
  llm: adapter,
  port: 3000,
  
  // ✅ Admin auth (monitoring API)
  admin: {
    username: 'admin',
    password: 'secure-password',  // ✅ Hashé avec bcrypt
    path: '/admin',
    sessionDuration: 24 * 60 * 60 * 1000,  // 24h
    rateLimitWindowMs: 15 * 60 * 1000,     // 15min
    rateLimitMaxAttempts: 5,
    allowedOrigins: ['https://dashboard.example.com'],
  },
  
  // ✅ Client auth (WebSocket API keys)
  client: {
    requireApiKey: true,
    enableApiKeyManagement: true,  // ✅ Renommé !
    maxConnectionsPerKey: 10,
  },
});

server.addApiKey('pk_live_abc123');
```

---

## 📋 Changements Breaking

### 1. Configuration `admin`

| v0.1.x | v0.2.0 | Notes |
|--------|--------|-------|
| `admin: boolean` | ❌ **Supprimé** | Utiliser `admin: { username, password }` |
| `admin.adminKey` | ❌ **Supprimé** | Remplacé par `username` + `password` |
| `admin.exposeApiKeys` | ❌ **Supprimé** | Déplacé vers `client.enableApiKeyManagement` |
| `admin.path` | ✅ **Conservé** | Toujours disponible |
| - | ✅ **Nouveau** `admin.username` | Username administrateur |
| - | ✅ **Nouveau** `admin.password` | Password (sera hashé) |
| - | ✅ **Nouveau** `admin.sessionDuration` | Durée de session (défaut: 24h) |
| - | ✅ **Nouveau** `admin.rateLimitWindowMs` | Fenêtre rate limit (défaut: 15min) |
| - | ✅ **Nouveau** `admin.rateLimitMaxAttempts` | Max tentatives (défaut: 5) |
| - | ✅ **Nouveau** `admin.allowedOrigins` | CORS strict (défaut: []) |

### 2. Configuration `client` (nouvelle section)

| Propriété | Type | Description |
|-----------|------|-------------|
| `client.requireApiKey` | `boolean` | Requérir API key (défaut: true) |
| `client.enableApiKeyManagement` | `boolean` | Gérer keys via admin API (⚠️ renommé depuis `exposeApiKeys`) |
| `client.maxConnectionsPerKey` | `number` | Connexions max par key (défaut: 10) |

### 3. Option `requireAuth` supprimée

```typescript
// ❌ v0.1.x
const server = new OwlLayerServer({
  requireAuth: false,  // ❌ N'existe plus
});

// ✅ v0.2.0
const server = new OwlLayerServer({
  client: {
    requireApiKey: false,  // ✅ Utiliser client.requireApiKey
  },
});
```

---

## 🔐 Nouvelle authentification admin

### Login flow (v0.2.0)

L'admin **ne peut plus** s'authentifier avec une simple clé. Il doit maintenant :

**1. Login avec username/password**

```typescript
// POST /admin/login
const response = await fetch('http://localhost:3000/admin/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin',
    password: 'secure-password',
  }),
});

const { token } = await response.json();
// => token: "8f3e4a2b1c9d7e6f5a4b3c2d1e0f9g8h..."
```

**2. Utiliser le token pour tous les endpoints**

```typescript
// GET /admin/status
const status = await fetch('http://localhost:3000/admin/status', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

**3. Logout (optionnel)**

```typescript
// POST /admin/logout
await fetch('http://localhost:3000/admin/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

### Endpoints admin affectés

Tous les endpoints (sauf `/admin/login`) **requièrent maintenant** un token de session :

- ✅ `POST /admin/login` — Public
- 🔒 `POST /admin/logout` — Protégé
- 🔒 `GET /admin/status` — Protégé
- 🔒 `GET /admin/sessions` — Protégé
- 🔒 `GET /admin/tools` — Protégé
- 🔒 `GET /admin/metrics` — Protégé
- 🔒 `GET /admin/client/keys` — Protégé (⚠️ path changé : `/apikeys` → `/client/keys`)

---

## 🛠️ Migration pas à pas

### Étape 1 : Installer les dépendances

```bash
cd owllayer/packages/server
pnpm install bcrypt @types/bcrypt
```

### Étape 2 : Mettre à jour la configuration serveur

**Avant :**
```typescript
const server = new OwlLayerServer({
  llm: adapter,
  admin: {
    adminKey: 'my-secret-key',
    exposeApiKeys: true,
  },
});
```

**Après :**
```typescript
const server = new OwlLayerServer({
  llm: adapter,
  admin: {
    username: 'admin',
    password: process.env.ADMIN_PASSWORD || 'change-me',
  },
  client: {
    requireApiKey: true,
    enableApiKeyManagement: true,  // Était exposeApiKeys
  },
});
```

### Étape 3 : Mettre à jour les clients admin (dashboard, etc.)

**Avant (v0.1.x) — Auth avec adminKey :**
```typescript
// ❌ N'existe plus
fetch('/admin/status', {
  headers: {
    'Authorization': 'Bearer my-secret-key',  // ❌ adminKey
  },
});
```

**Après (v0.2.0) — Login + session token :**
```typescript
// 1. Login
const loginRes = await fetch('/admin/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'secure-password' }),
});
const { token } = await loginRes.json();

// 2. Stocker le token (localStorage, sessionStorage, etc.)
localStorage.setItem('admin_token', token);

// 3. Utiliser le token
fetch('/admin/status', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

### Étape 4 : Gérer les erreurs 401

```typescript
async function fetchAdmin(endpoint, options = {}) {
  const token = localStorage.getItem('admin_token');
  
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    // Session expirée → redirect vers login
    localStorage.removeItem('admin_token');
    window.location.href = '/admin/login';
    return;
  }

  return res.json();
}
```

---

## 🔒 Améliorations de sécurité (v0.2.0)

### 1. Bcrypt password hashing

Les mots de passe admin sont maintenant hashés avec bcrypt (10 rounds).

```typescript
// Serveur
admin: {
  username: 'admin',
  password: 'plain-password',  // Sera hashé automatiquement
}
```

### 2. Rate limiting sur login

- **5 tentatives** max par IP dans une fenêtre de **15 minutes**
- Configurable via `admin.rateLimitMaxAttempts` et `admin.rateLimitWindowMs`

### 3. Protection timing attack

Les comparaisons de password utilisent `bcrypt.compare` (constant-time).

### 4. Sessions avec expiration

- Durée par défaut : **24 heures**
- Les sessions expirées sont automatiquement nettoyées (cleanup toutes les heures)

### 5. CORS strict

```typescript
admin: {
  username: 'admin',
  password: 'secret',
  allowedOrigins: ['https://dashboard.example.com'],  // Plus de wildcard '*'
}
```

---

## 📊 Nouveaux endpoints

### `POST /admin/login`

**Body :**
```json
{
  "username": "admin",
  "password": "secure-password"
}
```

**Response (200) :**
```json
{
  "success": true,
  "token": "8f3e4a2b1c9d7e6f5a4b3c2d1e0f9g8h...",
  "message": "Login réussi"
}
```

**Response (401) :**
```json
{
  "error": "Identifiants invalides",
  "message": "Username ou password incorrect"
}
```

**Response (429) :**
```json
{
  "error": "Trop de tentatives de connexion. Réessayez dans 15 minutes."
}
```

### `POST /admin/logout`

**Headers :**
```
Authorization: Bearer <token>
```

**Response (200) :**
```json
{
  "success": true,
  "message": "Logout réussi"
}
```

### `GET /admin/client/keys` (⚠️ path changé)

**Avant :** `/admin/apikeys`  
**Après :** `/admin/client/keys`

---

## 🧪 Tester la migration

### Test 1 : Vérifier que l'ancien adminKey ne fonctionne plus

```bash
# ❌ Devrait échouer (401)
curl -H "Authorization: Bearer my-old-admin-key" \
  http://localhost:3000/admin/status
```

### Test 2 : Login avec username/password

```bash
# ✅ Devrait réussir
curl -X POST http://localhost:3000/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secure-password"}'
  
# Response : { "success": true, "token": "..." }
```

### Test 3 : Utiliser le token

```bash
TOKEN="8f3e4a2b1c9d7e6f5a4b3c2d1e0f9g8h..."

# ✅ Devrait réussir
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/admin/status
```

### Test 4 : Rate limiting

```bash
# Faire 6 tentatives avec un mauvais password
for i in {1..6}; do
  curl -X POST http://localhost:3000/admin/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrong"}'
done

# La 6ème devrait retourner 429 (Too Many Requests)
```

---

## 🚨 Points d'attention

### 1. Variables d'environnement

**⚠️ NE JAMAIS** commit le password admin en dur :

```typescript
// ❌ MAUVAIS
admin: {
  username: 'admin',
  password: 'my-hardcoded-password',  // ❌ Insécure !
}

// ✅ BON
admin: {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD,  // ✅ Depuis .env
}
```

### 2. HTTPS en production

```typescript
admin: {
  username: 'admin',
  password: process.env.ADMIN_PASSWORD,
  requireHttps: true,  // Force HTTPS si NODE_ENV === 'production'
}
```

### 3. Durée de session

Ajuster selon vos besoins :

```typescript
admin: {
  sessionDuration: 8 * 60 * 60 * 1000,  // 8h au lieu de 24h
}
```

---

## 📚 Références

- [Issue #03 - Admin Authentication Security](../issues/issue_03_admin_authentication_security.md)
- [AdminAuthManager API](../packages/server/src/auth/AdminAuthManager.ts)
- [ClientAuthManager API](../packages/server/src/auth/ClientAuthManager.ts)

---

**Créé** : 12 février 2026  
**Dernière mise à jour** : 12 février 2026  
**Version** : 0.2.0
