---
mode: agent
description: >
  Sprint 7 — Store Connect Backend + alignements bidirectionnels SDK ↔ Backend.
  Couvre la construction du StoreConnectModule NestJS, les modifications backend
  pour s'aligner sur l'implémentation SDK actuelle, et les modifications SDK pour
  s'aligner sur le contrat backend.
tools:
  - read_file
  - replace_string_in_file
  - multi_replace_string_in_file
  - create_file
  - run_in_terminal
  - grep_search
  - file_search
  - get_errors
---

# Sprint 7 — Store Connect Backend + Alignements bidirectionnels

**Base :** Sprint 6 Bloc A commité `4412d9b` (123 tests ✓), Sprint 6 v2 planifié  
**Périmètre :** Monorepo `domos/` — `packages/server/` + `packages/shopify/` + `packages/woocommerce/`  
**Référence CDC :** `domos/cahiers/DomOS_CDC_StoreConnect.md`

---

## Parties

- **Partie A — StoreConnectModule NestJS** : construire le module backend complet
- **Partie B — Backend → SDK** : modifications backend pour s'aligner sur ce que les SDKs envoient aujourd'hui
- **Partie C — SDK → Backend** : modifications SDK pour s'aligner sur les contrats backend

---

# Partie A — StoreConnectModule NestJS (à construire)

## A.1 Structure des fichiers

```
packages/server/src/store-connect/
├── store-connect.module.ts
├── store-connect.controller.ts
├── store-connect.service.ts
│
├── shopify/
│   ├── shopify-oauth.service.ts     ← init OAuth, callback, échange code/token
│   ├── shopify-verify.service.ts    ← appel /shop.json pour valider le token
│   ├── shopify-webhook.service.ts   ← réception app/uninstalled (HMAC validé)
│   └── shopify-revoke.service.ts    ← révocation token côté API Shopify
│
├── woocommerce/
│   ├── woo-auth.service.ts          ← génération URL wc-auth, réception callback POST
│   ├── woo-verify.service.ts        ← appel /wp-json/wc/v3/system-status
│   └── woo-revoke.service.ts
│
├── common/
│   ├── store-key.service.ts         ← génération pk_{env}_{platform}_{hash}_{random}
│   ├── credentials.service.ts       ← chiffrement/déchiffrement AES-256-GCM
│   └── store-validator.service.ts   ← validation format shop_domain / site_url
│
└── entities/
    ├── store.entity.ts
    ├── store-credential.entity.ts
    └── store-api-key.entity.ts
```

## A.2 Endpoints REST à exposer

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/store-connect/shopify/init` | JWT marchand | Valide `shop_domain`, génère CSRF state Redis (TTL 10min), retourne URL OAuth Shopify |
| GET | `/api/store-connect/shopify/callback` | Aucune (Shopify) | Vérifie `state` CSRF, échange `code` → `access_token`, enregistre boutique |
| POST | `/api/store-connect/shopify/manual` | JWT marchand | Connexion directe avec `access_token` fourni |
| POST | `/api/store-connect/woocommerce/init` | JWT marchand | Génère URL wc-auth pour `site_url` |
| POST | `/api/store-connect/woocommerce/callback` | Aucune (WooCommerce) | Reçoit `consumer_key/secret`, vérifie `user_id` CSRF |
| POST | `/api/store-connect/woocommerce/manual` | JWT marchand | Connexion directe avec `consumer_key/secret` |
| GET | `/api/store-connect/stores` | JWT marchand | Liste boutiques connectées |
| GET | `/api/store-connect/stores/:storeId` | JWT marchand | Détail d'une boutique |
| POST | `/api/store-connect/stores/:storeId/keys/rotate` | JWT marchand | Rotation clé API DomOS |
| DELETE | `/api/store-connect/stores/:storeId` | JWT marchand | Révocation boutique |
| POST | `/api/webhooks/shopify/app-uninstalled` | HMAC Shopify | Désinstallation automatique |

## A.3 Entités PostgreSQL

### `store.entity.ts`
```ts
@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn('uuid') id: string;                          // storeId interne
  @Column() organizationId: string;                                    // FK → organizations
  @Column({ type: 'enum', enum: ['shopify', 'woocommerce'] })
  platform: 'shopify' | 'woocommerce';
  @Column({ unique: true }) shopIdentifier: string;                    // shop_domain ou site_url normalisé
  @Column({ nullable: true }) shopName: string;
  @Column({ nullable: true }) shopEmail: string;
  @Column({ nullable: true }) shopCurrency: string;
  @Column({ type: 'enum', enum: ['oauth', 'wc_auth', 'manual'] })
  connectionMode: 'oauth' | 'wc_auth' | 'manual';
  @Column({ type: 'enum', enum: ['active', 'disconnected', 'suspended', 'pending'] })
  status: 'active' | 'disconnected' | 'suspended' | 'pending';
  @Column({ nullable: true }) lastVerifiedAt: Date;
  @Column({ default: true }) v3Ready: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
```

### `store-credential.entity.ts`
```ts
@Entity('store_credentials')
export class StoreCredential {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() storeId: string;
  @Column({ type: 'enum', enum: ['shopify_access_token', 'woo_consumer_key', 'woo_consumer_secret'] })
  credentialType: string;
  @Column('text') encryptedValue: string;  // AES-256-GCM — jamais en clair
  @Column() iv: string;                     // 96 bits, unique par entrée
  @Column() authTag: string;               // 128 bits tag GCM
  @Column({ default: 1 }) keyVersion: number;
}
```

### `store-api-key.entity.ts`
```ts
@Entity('store_api_keys')
export class StoreApiKey {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() storeId: string;
  @Column() keyHash: string;    // SHA-256 de la clé — jamais la clé en clair
  @Column() keyPrefix: string;  // ex: "pk_live_shopify_a3f8b2_x9kL4..." (visible dans logs)
  @Column({ type: 'enum', enum: ['shopify', 'woocommerce'] }) platform: string;
  @Column({ type: 'enum', enum: ['live', 'dev'] }) environment: string;
  @Column({ default: true }) isActive: boolean;
  @Column({ nullable: true }) lastUsedAt: Date;
  @Column({ type: 'bigint', default: 0 }) usageCount: number;
}
```

## A.4 Génération de clé API DomOS — `store-key.service.ts`

```ts
// Format : pk_{environment}_{platform}_{store_hash}_{random_suffix}
// Exemple : pk_live_shopify_a3f8b2_x9kL4mN7pQ2

import { createHash, randomBytes } from 'crypto';

@Injectable()
export class StoreKeyService {
  generate(platform: 'shopify' | 'woocommerce', shopIdentifier: string, env: 'live' | 'dev' = 'live'): string {
    const storeHash = createHash('sha256').update(shopIdentifier).digest('hex').slice(0, 6);
    const random = randomBytes(8).toString('base64url').slice(0, 10);
    return `pk_${env}_${platform}_${storeHash}_${random}`;
  }

  hash(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }
}
```

## A.5 Chiffrement des credentials — `credentials.service.ts`

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class CredentialsService {
  private readonly algorithm = 'aes-256-gcm';
  // La clé maître vient des secrets d'infra (Vault / Docker Secrets) — jamais hardcodée
  private readonly masterKey: Buffer = Buffer.from(process.env.CREDENTIALS_MASTER_KEY!, 'hex');

  encrypt(plaintext: string): { encryptedValue: string; iv: string; authTag: string } {
    const iv = randomBytes(12); // 96 bits
    const cipher = createCipheriv(this.algorithm, this.masterKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return {
      encryptedValue: encrypted.toString('base64'),
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex'),
    };
  }

  decrypt(encryptedValue: string, iv: string, authTag: string): string {
    const decipher = createDecipheriv(this.algorithm, this.masterKey, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }
}
```

## A.6 Vérification HMAC webhook Shopify

```ts
// À activer sur la route POST /api/webhooks/shopify/app-uninstalled uniquement.
// NestJS RawBodyMiddleware requis sur cette route (rawBody: true dans main.ts).

function verifyShopifyWebhook(rawBody: Buffer, hmacHeader: string): boolean {
  const computed = createHmac('sha256', process.env.SHOPIFY_CLIENT_SECRET!)
    .update(rawBody)
    .digest('base64');
  // Comparaison constant-time — protège contre les timing attacks
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}
```

## A.7 CSRF State Redis

```ts
// Génération state (init OAuth/wc-auth)
const state = randomUUID();
await redis.set(`csrf:state:${state}`, userId, 'EX', 600); // TTL 10min

// Vérification callback
const storedUserId = await redis.get(`csrf:state:${state}`);
if (!storedUserId || storedUserId !== expectedUserId) throw new BadRequestException('ERR-SC03');
await redis.del(`csrf:state:${state}`); // Suppression immédiate après usage
```

## A.8 Rate limiting à configurer

| Route | Limite | Fenêtre |
|-------|--------|---------|
| POST `/store-connect/shopify/init` | 5 req/IP | 15 min |
| GET `/store-connect/shopify/callback` | 10 req/IP | 15 min |
| POST `/store-connect/woocommerce/callback` | 10 req/IP | 15 min |
| POST `/store-connect/*/manual` | 3 req/compte | 15 min |
| POST `/store-connect/stores/:id/keys/rotate` | 2 req/boutique | 1h |
| DELETE `/store-connect/stores/:id` | 1 req/boutique | 1h |

## A.9 Vérification périodique des credentials (`@nestjs/schedule`)

```ts
@Cron('0 */6 * * *') // Toutes les 6h
async verifyAllActiveStores(): Promise<void> {
  const stores = await this.storeRepo.find({ where: { status: 'active' } });
  for (const store of stores) {
    try {
      await this.verifyCredentials(store);
      await this.storeRepo.update(store.id, { lastVerifiedAt: new Date() });
    } catch {
      await this.storeRepo.update(store.id, { status: 'suspended' });
      await this.notifyMerchant(store, 'credential_invalid');
    }
  }
}
```

---

# Partie B — Modifications backend pour s'aligner sur les SDKs actuels

## B.1 Parsing du `CONTEXT_UPDATE` — forme exacte Shopify

Le `SessionManager` backend reçoit les mises à jour de contexte de `DomOS.updateContext()`.
Voici la **forme exacte** envoyée par `@domos/shopify` aujourd'hui :

### Premier envoi — `ShopifyContextBuilder.build()`
```json
{
  "platform": "shopify",
  "currentPage": "product | collection | cart | checkout | account | home",
  "userLocation": "L'utilisateur consulte la page produit : <titre>",
  "availableActions": ["Ajouter au panier → add_to_cart(variantId, qty)", "..."],
  "shop": {
    "name": "<window.Shopify.shop>",
    "currency": "<window.Shopify.currency>",
    "locale": "<window.Shopify.locale>"
  },
  "product": { "id", "handle", "title", "price", "inStock", "categories", "variants" },
  "collection": { "id", "handle", "title", "productsCount" }
}
```

### Deuxième envoi — `readCustomerContext()`
```json
{
  "customer": {
    "isLoggedIn": true,
    "id": "<window.__st.cid>"
  }
}
```

### Troisième envoi (et continu via `CartContextSync`) — état du panier
```json
{
  "cart": {
    "isEmpty": false,
    "itemCount": 2,
    "total": "238.00",
    "currency": "EUR",
    "productIds": ["123", "456"],
    "items": [
      { "id": 123, "variantId": 456, "title": "Veste Trail Pro", "qty": 1, "price": 149 }
    ]
  }
}
```

**⚠ Point critique pour le backend :** `shop.name` contient `window.Shopify.shop` qui est en réalité le **shop_domain** (ex: `ma-boutique.myshopify.com`). C'est ce champ que le `StoreConnectModule` doit extraire pour la validation `apiKey + shopDomain`.

**Action backend :** Dans le `SessionManager`, lors de la validation WebSocket :
```ts
// À l'initialisation de session (CONTEXT_UPDATE initial)
const shopDomain = contextUpdate.shop?.name; // = window.Shopify.shop (shop_domain)
const storeApiKey = session.apiKey;
await this.storeConnectService.validateKeyForStore(storeApiKey, shopDomain);
```

## B.2 Parsing du `CONTEXT_UPDATE` — forme exacte WooCommerce

Envoyé par `WooContextBuilder.build()` depuis `<script id="domos-woo-context">` :
```json
{
  "platform": "woocommerce",
  "currentPage": "product | category | cart | checkout | account | home",
  "userLocation": "L'utilisateur consulte le produit : <name>",
  "product": {
    "id": 123,
    "name": "T-Shirt Rouge",
    "price": "29.00",
    "inStock": true,
    "categories": ["vêtements"],
    "variations": [{ "id": 124, "attributes": { "couleur": "rouge" } }]
  },
  "category": { "id": 5, "name": "Vêtements", "slug": "vetements", "count": 42 },
  "shop": { "name": "Ma Boutique WooCommerce", "currency": "EUR" },
  "customer": { "isLoggedIn": true, "id": 7, "email": "client@example.com" }
}
```

**Point critique :** Chez WooCommerce, le `site_url` pour la validation `apiKey + site_url` n'est **pas** dans `WooContextBuilder.build()` actuellement. Il faut l'ajouter (voir Partie C.2).

## B.3 Registre des tools IA — liste complète par plateforme

Le backend doit avoir connaissance des tools que les SDKs enregistrent pour construire le system prompt LLM correct. Liste exhaustive par sprint implémenté aujourd'hui :

### Tools Shopify (Sprints 1–6, tous implémentés)

| Tool | Risk | Source | Paramètres clés |
|------|------|--------|-----------------|
| `add_to_cart` | `low` | CartTools | `variantId: string`, `qty?: number` |
| `update_cart` | `low` | CartTools | `variantId: string`, `qty: number` |
| `remove_from_cart` | `low` | CartTools | `variantId: string` |
| `clear_cart` | `medium` | CartTools | aucun |
| `get_cart` | `none` | CartTools | aucun |
| `search_products` | `none` | ProductTools | `query: string`, `first?: number` |
| `get_product` | `none` | ProductTools | `handle: string` |
| `select_variant` | `none` | ProductTools | `variantId?: string`, `options?: Record<string,string>` |
| `navigate_to_product` | `none` | NavigationTools | `handle: string` |
| `navigate_to_collection` | `none` | NavigationTools | `handle: string` |
| `navigate_to_cart` | `low` | NavigationTools | aucun |
| `initiate_checkout` | **`high`** | CheckoutTools | aucun — HITL obligatoire |
| `apply_discount` | `none` | CheckoutTools | `code: string` |
| `get_order_status` | `none` | OrderTools | `orderNumber?: string`, `last?: number` |
| `show_products` | `none` | UITools | `query?: string`, `product_ids?: string[]` |
| `show_product_detail` | `none` | UITools | `product_id: string` |
| `show_cart` | `none` | UITools | aucun |
| `show_notification` | `none` | UITools | `message: string`, `variant?: 'success'\|'error'\|'info'` |
| `close_panel` | `none` | UITools | aucun |
| `show_upsell` | `none` | UITools | `product_id: string`, `reason: string` |

### Tools WooCommerce (Sprints 1–5 — stubs TODO, pas encore implémentés)

| Tool | Risk | Sprint | Notes |
|------|------|--------|-------|
| `add_to_cart` | `low` | 2 | `id: number`, `qty: number` — Store API POST /cart/add-item |
| `update_cart_item` | `low` | 2 | `key: string`, `quantity: number` — PUT /cart/items/{key} |
| `remove_cart_item` | `low` | 2 | `key: string` — DELETE /cart/items/{key} |
| `get_cart` | `none` | 2 | GET /cart |
| `search_products` | `none` | 3 | `search: string` — GET /products?search= |
| `get_product` | `none` | 3 | `id: number` — GET /products/{id} |
| `apply_coupon` | `none` | 4 | `code: string` — POST /cart/coupons |
| `initiate_checkout` | **`high`** | 4 | POST /checkout — HITL obligatoire |
| `get_order_status` | `none` | 4 | À définir — API REST WC v3 ou Store API |

## B.4 HITL — comportement attendu pour `initiate_checkout`

Les deux SDKs enregistrent `initiate_checkout` avec `risk: 'high'`. Le backend ADTP doit :

1. Intercepter l'appel tool avant exécution
2. Envoyer un `HITL_REQUEST` kind message au client :
   ```json
   {
     "kind": "HITL_REQUEST",
     "toolName": "initiate_checkout",
     "message": "Je vais vous rediriger vers la page de paiement. Confirmez-vous ?",
     "confirmLabel": "Confirmer",
     "cancelLabel": "Annuler"
   }
   ```
3. Attendre le `HITL_RESPONSE` du client (`confirmed: true | false`)
4. Si confirmé → exécuter le tool + appeler `window.location.href = checkout_url` côté SDK
5. Si annulé → répondre au LLM `{ success: false, cancelled: true }`

**Important :** `@domos/browser` a déjà `hitl: { enabled: true }` dans `DomOS.init()` côté Shopify et WooCommerce. Le protocole HITL est donc déjà activé côté client — le backend doit simplement l'utiliser.

## B.5 `get_order_status` — tool côté client uniquement

**Comportement actuel Shopify :** `OrderTools.ts` exécute la requête GraphQL **directement depuis le browser** via `StorefrontClient` avec `window.__domos_customer_token`. Le backend ne proxie pas cet appel.

**Impact backend :**
- Quand le backend reçoit le résultat de `get_order_status`, c'est le browser qui a déjà interrogé la Storefront API et retourné le résultat
- Le backend ne doit **pas** tenter de re-proxier cet appel vers la Storefront API
- Le tool s'exécute comme un tool local (résultat retourné au LLM sans traitement backend supplémentaire)

**Si le customer_token est absent** : `OrderTools.ts` retourne un lien `/account/orders` — le backend doit inclure ce cas dans son system prompt ("Si absent, proposer le lien compte client").

## B.6 Double validation `apiKey + shopIdentifier` au WebSocket

Au moment de la connexion WebSocket, le `SessionManager` doit effectuer :

```ts
// 1. Hash la clé API reçue dans le handshake
const keyHash = sha256(incomingApiKey);

// 2. Chercher la clé dans store_api_keys par hash
const apiKeyRecord = await storeApiKeyRepo.findOne({ where: { keyHash, isActive: true } });
if (!apiKeyRecord) {
  sendSystemEvent({ kind: 'error', code: 'INVALID_API_KEY' });
  return;
}

// 3. Récupérer le shop_domain depuis le CONTEXT_UPDATE initial du SDK
// (envoyé dans context.shop.name par ShopifyContextBuilder)
const shopIdentifier = initialContext.shop?.name ?? initialContext.siteUrl;

// 4. Vérifier que la clé correspond bien à cette boutique
const store = await storeRepo.findOne({ where: { id: apiKeyRecord.storeId } });
if (store.shopIdentifier !== normalizeShopIdentifier(shopIdentifier)) {
  sendSystemEvent({ kind: 'error', code: 'STORE_MISMATCH' });
  createSecurityAlert({ type: 'STORE_MISMATCH', apiKeyPrefix: apiKeyRecord.keyPrefix, shopIdentifier });
  return;
}

// 5. Vérifier le statut de la boutique
if (store.status !== 'active') {
  const code = store.status === 'disconnected' ? 'STORE_DISCONNECTED' : 'STORE_SUSPENDED';
  sendSystemEvent({ kind: 'error', code });
  return;
}

// 6. Injecter storeId dans la session — toutes les métriques seront attribuées à cette boutique
session.storeId = store.id;
session.platform = store.platform;
await storeApiKeyRepo.update(apiKeyRecord.id, { lastUsedAt: new Date(), usageCount: () => 'usageCount + 1' });
```

## B.7 SYSTEM_EVENT codes à implémenter

Ces codes sont reçus par les SDKs clients. Le backend doit les émettre dans les scenarios suivants :

| Code | Condition de déclenchement |
|------|---------------------------|
| `INVALID_API_KEY` | Clé API inconnue ou format invalide |
| `REVOKED_API_KEY` | Clé `isActive: false` |
| `STORE_MISMATCH` | `keyHash` trouvé mais `shopIdentifier` ne correspond pas |
| `STORE_DISCONNECTED` | `store.status === 'disconnected'` |
| `STORE_SUSPENDED` | `store.status === 'suspended'` |
| `QUOTA_EXCEEDED` | Connexions simultanées boutique dépassées |
| `KEY_ROTATED` | Rotation de clé en cours (message: `'Clé API invalidée — reconnexion requise'`) |

Format WebSocket :
```json
{
  "kind": "SYSTEM_EVENT",
  "type": "error",
  "code": "STORE_MISMATCH",
  "message": "Clé API utilisée depuis une boutique non autorisée."
}
```

## B.8 Snippet CDN — alignement des noms de fichiers de build

Le CDC spécifie ces URLs CDN dans le snippet d'intégration (§ 6.2) :
```
https://cdn.domos.dev/browser@1.0.0/domos.min.js
https://cdn.domos.dev/shopify@1.0.0/domos-shopify.min.js
https://cdn.domos.dev/woocommerce@1.0.0/domos-woocommerce.min.js
```

**Action build pipeline** dans `packages/shopify/esbuild.config.mjs` :
```js
// Nom de sortie actuel (à vérifier) → doit être :
outfile: 'dist/domos-shopify.min.js',   // IIFE autonome pour CDN
// Garder aussi :
outfile: 'dist/domos-shopify.bundle.mjs',  // ESM pour npm/bundler
```

Idem pour `packages/woocommerce/esbuild.config.mjs` → `domos-woocommerce.min.js`.

---

# Partie C — Modifications SDK (direction : backend → SDK)

## C.1 `@domos/shopify` — `DomOSShopify.ts` : auto-détection `shopDomain`

**Problème :** Le snippet généré par le dashboard Store Connect (CDC § 6.2) n'inclut pas `shopDomain`, mais `StorefrontClient` en a besoin pour appeler la Storefront API.

**Solution :** Lire `window.Shopify?.shop` comme fallback si `config.shopDomain` est absent.

```ts
// Dans DomOSShopify.ts — remplacer la ligne actuelle :
// AVANT
const storefrontClient =
  config.storefrontToken && config.shopDomain
    ? new StorefrontClient(config.shopDomain, config.storefrontToken, config.storefrontApiVersion)
    : null;

// APRÈS
const shopDomain = config.shopDomain
  ?? (window as unknown as { Shopify?: { shop?: string } }).Shopify?.shop
  ?? null;
const storefrontClient =
  config.storefrontToken && shopDomain
    ? new StorefrontClient(shopDomain, config.storefrontToken, config.storefrontApiVersion)
    : null;
```

## C.2 `@domos/woocommerce` — `WooContextBuilder.ts` : inclure `site_url`

**Problème :** Le backend a besoin du `site_url` (= l'URL WordPress) pour valider `apiKey + site_url`. Or `WooContextBuilder.build()` ne l'expose pas actuellement.

**Solution :** Ajouter `siteUrl` dans le contexte envoyé au backend.

```ts
// Dans WooContextBuilder.build() — ajouter :
build(): Record<string, unknown> {
  const raw = this._readInjectedBlock();
  const pageType = raw?.pageType ?? this._detectPageType();
  return {
    platform: 'woocommerce',
    siteUrl: raw?.siteUrl ?? window.location.origin,  // ← ajout
    currentPage: pageType,
    // ... reste inchangé
  };
}
```

Et côté PHP plugin, injecter `siteUrl` dans le bloc JSON :
```php
// Dans class-context-builder.php
$context['siteUrl'] = get_site_url();
```

## C.3 `@domos/shopify` — `ShopifyWidgetApp.tsx` : gérer les SYSTEM_EVENT codes backend

**Problème :** Le widget passe en `agentState: 'error'` sans message user-facing adapté.

**Solution :** Écouter les SYSTEM_EVENTs via `DomOS.onSystemEvent()` (si disponible dans `@domos/browser`) ou intercepter via `onAgentStateChange` avec payload étendu, et mapper vers des messages dans `ShopifyWidgetApp`.

Ajouter un état `errorCode` dans le composant :
```tsx
// Dans ShopifyWidgetApp.tsx — ajouter ces messages dans le rendu erreur
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_API_KEY: 'Clé API invalide. Contactez votre administrateur.',
  REVOKED_API_KEY: 'Accès révoqué. Reconnectez votre boutique dans le dashboard DomOS.',
  STORE_MISMATCH: 'Erreur de configuration. Contactez le support.',
  STORE_DISCONNECTED: 'Boutique déconnectée. Reconnectez-la dans le dashboard DomOS.',
  STORE_SUSPENDED: 'Boutique suspendue. Vérifiez votre dashboard DomOS.',
  QUOTA_EXCEEDED: 'Quota de connexions dépassé. Réessayez dans quelques instants.',
  KEY_ROTATED: 'Configuration mise à jour. Veuillez rafraîchir la page.',
};
```

**Note :** Vérifier d'abord l'API publique de `@domos/browser` pour la méthode d'écoute des SYSTEM_EVENTs. Si `DomOS.onSystemEvent()` n'existe pas, ouvrir une issue sur `packages/browser` pour l'ajouter.

## C.4 `@domos/shopify` — `UITools.ts` : accepter `StorefrontClient | null`

**Contexte :** Sprint 6 v2 Bloc B planifié — remplacement des mocks par la vraie Storefront API.

```ts
// Signature à changer dans UITools.ts :
// AVANT
export function registerUITools(domos: DomOSRegister): void

// APRÈS
export function registerUITools(
  domos: DomOSRegister,
  storefront: StorefrontClient | null = null,
): void
```

Et dans `DomOSShopify.ts`, passer le client :
```ts
// AVANT
registerUITools(DomOS);

// APRÈS — Sprint 6 v2
registerUITools(DomOS, storefrontClient);
```

Quand `storefront !== null`, les tools `show_products` et `show_product_detail` feront appel à `storefront.searchProducts()` au lieu de `MOCK_PRODUCTS`.

## C.5 `@domos/woocommerce` — `DomOSWoo.ts` : `widget.enabled` à aligner

**Situation actuelle :** `DomOSWoo.ts` a `widget: { enabled: true }` — utilise le widget browser par défaut.

**Plan :** À Sprint 6 WooCommerce (parallèle du Sprint 6 Shopify), créer un `WooWidget` (Shadow DOM + Preact) et passer à `widget: { enabled: false }`. Les outils UI (`show_products`, etc.) seront ajoutés à ce moment-là, avec le même pattern `CustomEvent` que `UITools.ts` Shopify.

**Pour l'instant :** Garder `enabled: true` — le widget browser gère l'UI par défaut.

## C.6 Format `apiKey` dans les tests — mise à jour pour cohérence

**Problème :** Les tests d'intégration `DomOSShopify.integration.test.ts` utilisent `'dk_test_123'` comme `apiKey`. Le CDC définit le format `pk_dev_shopify_{hash}_{random}`.

```ts
// AVANT (dans les tests)
await DomOSShopify.init({ apiKey: 'dk_test_123' });

// APRÈS (format CDC cohérent)
await DomOSShopify.init({ apiKey: 'pk_dev_shopify_a3f8b2_test123' });
```

Ce changement est purement cosmétique (pas d'impact fonctionnel) mais produit des logs plus lisibles et aligne les snapshots de tests avec ce que Store Connect génèrera en production.

---

# Résumé des tâches Sprint 7

## Priorité 1 — Backend critique (bloquant pour la mise en production)

- [ ] **A.1** Créer `store-connect.module.ts` + controller + service (NestJS)
- [ ] **A.2** Implémenter `shopify-oauth.service.ts` (init, callback, exchange)
- [ ] **A.3** Implémenter `shopify-verify.service.ts` (appel /shop.json)
- [ ] **A.4** Implémenter `woo-auth.service.ts` + `woo-verify.service.ts`
- [ ] **A.5** Implémenter `credentials.service.ts` + `store-key.service.ts`
- [ ] **A.6** Créer les 3 entités PostgreSQL + migrations TypeORM
- [ ] **B.6** Implémenter la double validation `apiKey + shopIdentifier` dans `SessionManager`
- [ ] **B.7** Émettre les SYSTEM_EVENT codes corrects depuis le `SessionManager`

## Priorité 2 — Backend fonctionnel

- [ ] **A.7** Implémenter CSRF Redis (state generation + verification)
- [ ] **A.6** Vérification HMAC webhook Shopify (`/api/webhooks/shopify/app-uninstalled`)
- [ ] **A.8** Configurer le rate limiting sur les endpoints Store Connect
- [ ] **A.9** Tâche planifiée de vérification périodique des credentials
- [ ] **B.4** Implémenter HITL pour `initiate_checkout` dans le protocole ADTP
- [ ] **B.8** Aligner les noms de fichiers de build CDN (`domos-shopify.min.js`)

## Priorité 3 — SDK alignements

- [ ] **C.1** `DomOSShopify.ts` : auto-détection `shopDomain` depuis `window.Shopify.shop`
- [ ] **C.2** `WooContextBuilder.ts` + PHP plugin : ajouter `siteUrl` dans le contexte
- [ ] **C.3** `ShopifyWidgetApp.tsx` : mapper SYSTEM_EVENT codes → messages utilisateur
- [ ] **C.4** `UITools.ts` : accepter `StorefrontClient | null` (Sprint 6 v2)
- [ ] **C.6** Tests unitaires : mettre à jour `apiKey` format → `pk_dev_shopify_*`

## Priorité 4 — Non-bloquant / v3 prep

- [ ] **A.10** Initialiser le Stores Registry pour v3 MCP (champ `v3Ready: true` par défaut)
- [ ] **C.5** Planifier Sprint 6 WooCommerce (WooWidget Shadow DOM, `widget.enabled: false`)
- [ ] Implémenter les 4 fichiers PHP du plugin WooCommerce (`class-context-builder.php`, `class-admin-settings.php`, `class-sw-registrar.php`, `domos-woocommerce.php`)

---

# Dépendances et ordre d'implémentation

```
A.5 (credentials + store-key) → A.2/A.4 (OAuth flows) → A.6 (entities) → B.6 (WebSocket validation)
                                                                              ↓
                                                                           B.7 (SYSTEM_EVENTs)
                                                                              ↓
                                                                           C.3 (widget error handling)
```

Les tâches C.1 et C.2 sont indépendantes et peuvent être implémentées à tout moment.

---

*Document confidentiel — Futur4Tech © 2026 — DomOS Sprint 7*
