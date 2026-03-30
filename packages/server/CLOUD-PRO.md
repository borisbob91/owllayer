# DomOS Server — Cloud Pro Mode

Le mode `cloud` transforme le serveur standalone en une plateforme multi-tenant complète : auth JWT/RBAC, billing Stripe, analytics, audit log, et intégration e-commerce (Shopify / WooCommerce).

---

## Table des matières

1. [Prérequis](#1-prérequis)
2. [Démarrage rapide](#2-démarrage-rapide)
3. [Configuration YAML](#3-configuration-yaml)
4. [Génération des clés JWT](#4-génération-des-clés-jwt)
5. [API REST](#5-api-rest)
   - [Auth](#51-auth)
   - [Organisations](#52-organisations)
   - [Projets](#53-projets)
   - [Agents](#54-agents)
   - [Virtual Lines](#55-virtual-lines)
   - [Analytics](#56-analytics)
   - [Billing](#57-billing)
   - [Audit](#58-audit)
   - [Stores e-commerce](#59-stores-e-commerce)
6. [RBAC — Rôles et permissions](#6-rbac--rôles-et-permissions)
7. [Plans et quotas](#7-plans-et-quotas)
8. [Store Connect (Shopify / WooCommerce)](#8-store-connect-shopify--woocommerce)
9. [Modèle de données](#9-modèle-de-données)

---

## 1. Prérequis

| Service | Version min | Usage |
|---------|------------|-------|
| PostgreSQL | 14 | Base de données principale |
| Redis | 6 | Cache et sessions |
| Node.js | 18 | Runtime |

Dépendances npm ajoutées en mode cloud :

```
@prisma/client   @prisma/adapter-pg   pg
stripe           redis                bcrypt
```

---

## 2. Démarrage rapide

### Avec Docker (recommandé)

```bash
# 1. Variables d'environnement
cp packages/server/docker/.env.example packages/server/docker/.env
# → Remplir DATABASE_URL, REDIS_URL, STRIPE_SECRET_KEY, etc.

# 2. Générer les clés RS256
mkdir -p packages/server/docker/keys
openssl genrsa -out packages/server/docker/keys/private.pem 2048
openssl rsa -in packages/server/docker/keys/private.pem \
            -pubout -out packages/server/docker/keys/public.pem

# 3. Lancer la stack (Postgres 16 + Redis 7 + serveur)
cd packages/server
pnpm docker:cloud:up

# 4. Vérifier
curl http://localhost:3000/health
```

### Sans Docker

```bash
export DATABASE_URL="postgresql://user:pass@localhost:5432/domos"
export REDIS_URL="redis://localhost:6379"
export DOMOS_CONFIG_PATH="./docker/config/domos.cloud.yml"

pnpm start
```

---

## 3. Configuration YAML

Fichier type : `docker/config/domos.cloud.yml`

```yaml
mode: cloud                    # Active le mode cloud

server:
  port: 3000
  adminPassword: ${ADMIN_PASSWORD}

llm:
  provider: google
  model: gemini-2.0-flash-001

cloud:
  # ── JWT RS256 ──────────────────────────────────────────────────
  jwt:
    publicKeyPath: /keys/public.pem
    privateKeyPath: /keys/private.pem
    issuer: domos.cloud
    audience: domos-api
    expiresIn: 7d              # Durée de validité des tokens

  # ── Base de données ────────────────────────────────────────────
  database:
    provider: postgresql
    url: ${DATABASE_URL}       # postgresql://user:pass@host:5432/db

  # ── Redis ──────────────────────────────────────────────────────
  redis:
    url: ${REDIS_URL}          # redis://host:6379

  # ── Billing Stripe ─────────────────────────────────────────────
  billing:
    stripeSecretKey: ${STRIPE_SECRET_KEY}
    webhookSecret: ${STRIPE_WEBHOOK_SECRET}
    plans:
      - id: free
        name: Free
        limits:
          sessionsPerDay: 50
          tokensPerMonth: 1000000
          agentsMax: 2
          linesMax: 10
      - id: pro
        name: Pro
        stripePriceId: ${STRIPE_PRICE_PRO}
        limits:
          sessionsPerDay: 500
          tokensPerMonth: 10000000
          agentsMax: 10
          linesMax: 5
      - id: enterprise
        name: Enterprise
        stripePriceId: ${STRIPE_PRICE_ENTERPRISE}
        limits:
          sessionsPerDay: 10000
          tokensPerMonth: 100000000
          agentsMax: 100
          linesMax: 50

  # ── Store Connect ──────────────────────────────────────────────
  storeConnect:
    shopify:
      clientId: ${SHOPIFY_CLIENT_ID}
      clientSecret: ${SHOPIFY_CLIENT_SECRET}
      scopes: [read_products, read_orders, read_inventory, write_orders]
      webhookSecret: ${SHOPIFY_WEBHOOK_SECRET}
    woocommerce:
      callbackUrl: ${WOO_CALLBACK_URL}
```

### Variables d'environnement

| Variable | Requis | Description |
|----------|--------|-------------|
| `DATABASE_URL` | Oui | URL PostgreSQL |
| `REDIS_URL` | Oui | URL Redis |
| `ADMIN_PASSWORD` | Oui | Mot de passe admin |
| `STRIPE_SECRET_KEY` | Si billing | Clé secrète Stripe |
| `STRIPE_WEBHOOK_SECRET` | Si billing | Secret webhook Stripe |
| `STRIPE_PRICE_PRO` | Si billing | Price ID Stripe plan Pro |
| `STRIPE_PRICE_ENTERPRISE` | Si billing | Price ID Stripe plan Enterprise |
| `SHOPIFY_CLIENT_ID` | Si Shopify | Client ID app Shopify |
| `SHOPIFY_CLIENT_SECRET` | Si Shopify | Client secret app Shopify |
| `SHOPIFY_WEBHOOK_SECRET` | Si Shopify | Secret HMAC webhooks Shopify |
| `WOO_CALLBACK_URL` | Si WooCommerce | URL de callback OAuth WC |

---

## 4. Génération des clés JWT

Le mode cloud utilise RS256 (clés asymétriques). La clé privée signe les tokens, la clé publique les vérifie.

```bash
# Générer la paire de clés
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# Vérification
openssl rsa -in private.pem -check
```

Les chemins sont configurés dans `cloud.jwt.publicKeyPath` / `cloud.jwt.privateKeyPath`. En Docker, monter les clés en volume read-only.

---

## 5. API REST

Toutes les routes sont sous `/api/`. Les routes protégées requièrent :

```
Authorization: Bearer <jwt_token>
```

### 5.1 Auth

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/auth/register` | Créer un compte |
| `POST` | `/api/auth/login` | Connexion → token JWT |
| `POST` | `/api/auth/refresh` | Rafraîchir un token |

**POST /api/auth/register**
```json
{
  "email": "user@example.com",
  "password": "min8chars",
  "name": "Alice"
}
```
Réponse `201` :
```json
{ "token": "<jwt>" }
```

**POST /api/auth/login**
```json
{ "email": "user@example.com", "password": "..." }
```
Réponse `200` :
```json
{ "token": "<jwt>" }
```

---

### 5.2 Organisations

| Méthode | Route | Permission requise |
|---------|-------|-------------------|
| `GET` | `/api/orgs` | authentifié |
| `POST` | `/api/orgs` | authentifié |
| `GET` | `/api/orgs/:orgId` | member |
| `PATCH` | `/api/orgs/:orgId` | `project.write` |
| `GET` | `/api/orgs/:orgId/members` | `member.read` |
| `POST` | `/api/orgs/:orgId/members` | `member.invite` |
| `DELETE` | `/api/orgs/:orgId/members/:userId` | `member.remove` |

**POST /api/orgs**
```json
{ "name": "ACME Corp" }
```
Réponse `201` : l'organisation créée, l'appelant devient `OWNER`.

---

### 5.3 Projets

| Méthode | Route | Permission |
|---------|-------|-----------|
| `GET` | `/api/orgs/:orgId/projects` | `project.read` |
| `POST` | `/api/orgs/:orgId/projects` | `project.write` |
| `GET` | `/api/orgs/:orgId/projects/:projectId` | `project.read` |
| `PATCH` | `/api/orgs/:orgId/projects/:projectId` | `project.write` |
| `DELETE` | `/api/orgs/:orgId/projects/:projectId` | `project.delete` |

**POST /api/orgs/:orgId/projects**
```json
{
  "name": "Support Bot",
  "description": "Bot de support client",
  "language": "fr-FR"
}
```

---

### 5.4 Agents

| Méthode | Route | Permission |
|---------|-------|-----------|
| `GET` | `/api/projects/:projectId/agents` | `agent.read` |
| `POST` | `/api/projects/:projectId/agents` | `agent.write` |
| `PATCH` | `/api/projects/:projectId/agents/:agentId` | `agent.write` |
| `DELETE` | `/api/projects/:projectId/agents/:agentId` | `agent.delete` |

**POST /api/projects/:projectId/agents**
```json
{
  "name": "Alice",
  "systemPrompt": "Tu es un assistant commercial...",
  "voice": "Kore",
  "language": "fr-FR"
}
```

---

### 5.5 Virtual Lines

| Méthode | Route | Permission |
|---------|-------|-----------|
| `GET` | `/api/projects/:projectId/lines` | `line.read` |
| `POST` | `/api/projects/:projectId/lines` | `line.write` |
| `PATCH` | `/api/projects/:projectId/lines/:lineId` | `line.write` |
| `DELETE` | `/api/projects/:projectId/lines/:lineId` | `line.delete` |

**POST /api/projects/:projectId/lines**
```json
{
  "name": "Support FR",
  "agentId": "agt_xxx",
  "phoneNumber": "+33612345678"
}
```

---

### 5.6 Analytics

| Méthode | Route | Permission |
|---------|-------|-----------|
| `GET` | `/api/orgs/:orgId/analytics` | `analytics.read` |

**Query params**

| Param | Type | Défaut | Description |
|-------|------|--------|-------------|
| `startDate` | ISO date | 30 jours avant | Début de la période |
| `endDate` | ISO date | aujourd'hui | Fin de la période |

Réponse `200` :
```json
[
  {
    "date": "2026-03-01",
    "projectId": "prj_xxx",
    "totalSessions": 142,
    "totalTokensIn": 85000,
    "totalTokensOut": 210000,
    "totalToolCalls": 38,
    "avgDurationSeconds": 47,
    "estimatedCostUsd": 0.076
  }
]
```

> Le coût est estimé sur les tarifs Gemini Flash : $0.075/M tokens in, $0.30/M tokens out.

---

### 5.7 Billing

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `GET` | `/api/orgs/:orgId/billing` | `billing.read` | Infos abonnement |
| `POST` | `/api/orgs/:orgId/billing/subscribe` | `billing.write` | Souscrire/changer de plan |
| `GET` | `/api/orgs/:orgId/billing/invoices` | `billing.read` | Historique factures |
| `POST` | `/api/billing/webhook` | Public (HMAC Stripe) | Webhook Stripe |

**POST /api/orgs/:orgId/billing/subscribe**
```json
{ "planId": "pro" }
```

Le webhook Stripe gère automatiquement :
- `invoice.paid` → mise à jour du statut de l'abonnement
- `customer.subscription.deleted` → downgrade vers `free`

---

### 5.8 Audit

| Méthode | Route | Permission |
|---------|-------|-----------|
| `GET` | `/api/orgs/:orgId/audit` | `audit.read` |

**Query params**

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page (défaut: 1) |
| `limit` | number | Résultats par page (max: 100, défaut: 50) |
| `userId` | string | Filtrer par utilisateur |
| `action` | string | Filtrer par type d'action |

Actions auditées : `user.login`, `user.register`, `org.create`, `org.update`, `member.invite`, `member.remove`, `project.create`, `project.update`, `project.delete`, `agent.create`, `agent.update`, `agent.delete`, `line.create`, `line.update`, `line.delete`, `session.start`, `session.end`, `billing.subscribe`, `billing.cancel`, `store.connect`, `store.disconnect`, `apikey.create`, `apikey.revoke`.

---

### 5.9 Stores e-commerce

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/projects/:projectId/stores/shopify/oauth` | URL d'installation Shopify |
| `GET` | `/api/projects/:projectId/stores/shopify/callback` | Callback OAuth Shopify |
| `GET` | `/api/projects/:projectId/stores/woocommerce/oauth` | URL d'auth WooCommerce |
| `POST` | `/api/projects/:projectId/stores/woocommerce/callback` | Callback WooCommerce |
| `DELETE` | `/api/projects/:projectId/stores/:storeId` | Déconnecter un store |

**Connexion Shopify — flux OAuth**

```
1. GET /api/projects/:projectId/stores/shopify/oauth?shop=my-store.myshopify.com
   → Redirige vers l'écran d'installation Shopify

2. Shopify callback → GET /api/projects/:projectId/stores/shopify/callback?code=...&hmac=...&shop=...
   → Échange le code contre un access token
   → Enregistre le ConnectedStore en base

3. L'agent peut maintenant utiliser les 5 store tools
```

**Connexion WooCommerce — flux wc-auth**

```
1. GET /api/projects/:projectId/stores/woocommerce/oauth?url=https://my-store.com
   → Redirige vers la page d'autorisation WC

2. WC callback → POST /api/projects/:projectId/stores/woocommerce/callback
   → Body: { consumer_key, consumer_secret, key_id }
   → Enregistre le ConnectedStore en base
```

---

## 6. RBAC — Rôles et permissions

### Hiérarchie des rôles

```
OWNER (40) ── peut tout faire
  └─ ADMIN (30) ── gestion org, membres, billing
       └─ DEVELOPER (20) ── créer/modifier agents, lines, sessions
            └─ VIEWER (10) ── lecture seule
```

### Matrice permissions

| Permission | VIEWER | DEVELOPER | ADMIN | OWNER |
|-----------|:------:|:---------:|:-----:|:-----:|
| `project.read` | ✓ | ✓ | ✓ | ✓ |
| `agent.read` | ✓ | ✓ | ✓ | ✓ |
| `line.read` | ✓ | ✓ | ✓ | ✓ |
| `session.read` | ✓ | ✓ | ✓ | ✓ |
| `analytics.read` | ✓ | ✓ | ✓ | ✓ |
| `store.read` | ✓ | ✓ | ✓ | ✓ |
| `session.connect` | | ✓ | ✓ | ✓ |
| `agent.write` | | ✓ | ✓ | ✓ |
| `line.write` | | ✓ | ✓ | ✓ |
| `apikey.read` | | ✓ | ✓ | ✓ |
| `project.write` | | | ✓ | ✓ |
| `member.read` | | | ✓ | ✓ |
| `member.invite` | | | ✓ | ✓ |
| `member.remove` | | | ✓ | ✓ |
| `billing.read` | | | ✓ | ✓ |
| `apikey.write` | | | ✓ | ✓ |
| `store.connect` | | | ✓ | ✓ |
| `store.disconnect` | | | ✓ | ✓ |
| `audit.read` | | | ✓ | ✓ |
| `project.delete` | | | | ✓ |
| `agent.delete` | | | | ✓ |
| `line.delete` | | | | ✓ |
| `billing.write` | | | | ✓ |

---

## 7. Plans et quotas

Les quotas sont appliqués en temps réel à chaque session.

| Plan | Sessions/jour | Tokens/mois | Agents max | Lines max |
|------|:------------:|:-----------:|:----------:|:---------:|
| Free | 50 | 1 M | 2 | 10 |
| Pro | 500 | 10 M | 10 | 5 |
| Enterprise | 10 000 | 100 M | 100 | 50 |

### Reset automatique

Les quotas doivent être remis à zéro via cron :

```bash
# Minuit UTC — reset sessions quotidiennes
0 0 * * * curl -X POST http://localhost:3000/admin/quotas/reset-daily

# 1er du mois — reset tokens mensuels
0 0 1 * * curl -X POST http://localhost:3000/admin/quotas/reset-monthly
```

> Alternative : appeler directement `QuotaService.resetDailyQuotas()` / `resetMonthlyQuotas()` depuis un job interne.

---

## 8. Store Connect (Shopify / WooCommerce)

Une fois un store connecté à un projet, l'agent vocal dispose de 5 tools automatiquement :

| Tool | Description |
|------|-------------|
| `search_products` | Recherche dans le catalogue par mot-clé |
| `get_product` | Détails d'un produit par ID |
| `get_order_status` | Statut d'une commande par ID |
| `search_orders` | Commandes d'un client par email |
| `check_inventory` | Stock disponible d'un produit |

### Sécurité Shopify

Les webhooks Shopify sont vérifiés via HMAC-SHA256 avec timing-safe comparison. Toute requête avec un HMAC invalide retourne `401`.

### Sécurité WooCommerce

L'API utilise Basic Auth (consumer key / consumer secret) sur HTTPS. Les credentials sont stockés chiffrés en base.

---

## 9. Modèle de données

```
Organization
  ├── OrgMember (→ User, role: OWNER|ADMIN|DEVELOPER|VIEWER)
  ├── Project
  │   ├── Agent
  │   ├── VirtualLine (→ Agent)
  │   ├── SessionRecord
  │   ├── UsageRecord (statistiques quotidiennes par projet)
  │   └── ConnectedStore (Shopify | WooCommerce)
  ├── Invoice
  └── AuditLog

User
  └── OrgMember (un user peut appartenir à plusieurs orgs)
```

Les migrations Prisma se trouvent dans `packages/server/prisma/schema.prisma`.

```bash
# Appliquer les migrations en production
npx prisma migrate deploy

# En développement
npx prisma migrate dev
```
