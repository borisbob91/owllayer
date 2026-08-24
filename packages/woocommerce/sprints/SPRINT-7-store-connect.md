# @owllayer/woocommerce — Sprint 7
## Store Connect — Préparation & Adaptations Frontend/Backend

**Durée estimée :** 4-5 jours  
**Branche :** `feat/woo-sprint-7`  
**Dépendance :** Sprint 6 ✅ (Widget UI + WooPaymentWidget)  
**Référence CDC :** `OwlLayer_CDC_StoreConnect.md` — CU-SC02 (connexion WooCommerce via wc-auth) + CU-SC04 (clés API OwlLayer par boutique)

---

## Contexte et objectifs

### Qu'est-ce que Store Connect pour WooCommerce ?
Store Connect est le module OwlLayer Cloud Pro (CU-SC02) qui permet à un marchand WooCommerce de connecter sa boutique au cloud OwlLayer **sans configuration manuelle** :
1. Le marchand clique "Connecter WooCommerce" dans le dashboard OwlLayer
2. Il est redirigé vers son admin WordPress via **wc-auth** (OAuth-like de WooCommerce)
3. Il approuve → WooCommerce génère `consumer_key` + `consumer_secret` → OwlLayer les reçoit
4. OwlLayer génère une clé API `pk_live_woo_{site_hash}_{random}` pour cette boutique
5. Le plugin WordPress se configure automatiquement avec la clé API OwlLayer

### Ce que ce sprint prépare

**Côté JS (`@owllayer/woocommerce`)** :
- Auto-détection de `siteUrl` depuis `window.location.origin`
- Validation du format de clé API OwlLayer (`pk_live_woo_*` / `pk_dev_woo_*`)
- Identité de boutique transmise à OwlLayer lors de l'init (`siteUrl` + `shopId`)
- Events de statut de connexion Store Connect
- Helper `OwlLayerWoo.getStoreStatus()`

**Côté Plugin PHP** :
- Endpoint REST `/wp-json/owllayer/v1/health` (vérification par OwlLayer Cloud, CU-SC02 étape 10)
- Endpoint REST `/wp-json/owllayer/v1/connect` (réception clé API OwlLayer après wc-auth)
- Auto-configuration du plugin après réception de la clé API
- Listener webhook `/wp-json/owllayer/v1/webhook` (order/created → sync panier)
- Page admin : bouton "Connecter au Cloud OwlLayer" + statut de connexion

**Côté types (DTOs backend NestJS — typés uniquement, non implémentés)** :
- `StoreConnectConfig`, `ConnectStoreDto`, `WebhookPayloadDto`
- Servira de contrat d'interface pour l'implémentation NestJS (`StoreConnectModule`)

**Côté WooWidget UI** :
- Indicateur de connexion dans le widget (badge "OwlLayer Cloud" + statut)
- Message d'erreur si la clé API est invalide ou expirée

---

## Tâches JS — `@owllayer/woocommerce`

### 7.1 — `src/types.ts` — Nouveaux types Store Connect

Ajouter à `types.ts` :

```ts
/** Identité de boutique transmise au serveur OwlLayer lors de l'init */
export interface WooStoreIdentity {
  /** URL canonique de la boutique (window.location.origin normalisé) */
  siteUrl: string;
  /** shopId UUID assigné par OwlLayer Cloud lors de la connexion wc-auth */
  shopId?: string;
}

/** Statut de connexion Store Connect */
export interface WooStoreStatus {
  connected: boolean;
  siteUrl: string;
  shopId?: string;
  /** Message d'erreur si connected: false */
  error?: string;
}

/** Extended config avec Store Connect */
export interface OwlLayerWooConfig {
  // ... champs existants Sprint 1-6 ...
  /**
   * shopId UUID assigné par OwlLayer Cloud Pro lors de la connexion Store Connect.
   * Injecté automatiquement par le plugin PHP si la boutique est connectée.
   * Si absent, la boutique fonctionne en mode standalone (apiKey seule).
   */
  shopId?: string;
}
```

Ajouter dans `WooFeatures` :
```ts
export interface WooFeatures {
  inChatPayments?: boolean;
  paymentGateway?: 'stripe' | 'paypal' | 'auto';
  orderTracking?: boolean;
  /** Active les comportements Store Connect (validation shopId, events de statut) */
  storeConnect?: boolean;
}
```

- [ ] Mettre à jour `src/types.ts`

### 7.2 — `src/utils/storeIdentity.ts` — Auto-détection siteUrl

```ts
/**
 * Détermine l'URL canonique de la boutique.
 * Normalise : lowercase, sans trailing slash, sans www optionnel.
 * Source prioritaire : config.endpoint host (si présent), sinon window.location.origin.
 */
export function resolveSiteUrl(configSiteUrl?: string): string {
  if (configSiteUrl) return normalizeSiteUrl(configSiteUrl);
  if (typeof window !== 'undefined') return normalizeSiteUrl(window.location.origin);
  return '';
}

/** Valide le format d'une clé API OwlLayer WooCommerce */
export function validateApiKey(key: string): boolean {
  return /^pk_(live|dev)_woo_[a-z0-9]{6}_[a-zA-Z0-9]{10,}$/.test(key);
}

function normalizeSiteUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}${u.port ? ':' + u.port : ''}`;
  } catch {
    return url.replace(/\/$/, '').toLowerCase();
  }
}
```

- [ ] Créer `src/utils/storeIdentity.ts`

### 7.3 — Mise à jour `src/OwlLayerWoo.ts` — Intégration Store Connect

```ts
import { resolveSiteUrl, validateApiKey } from './utils/storeIdentity.js';

export const OwlLayerWoo = {
  private _storeStatus: WooStoreStatus | null = null,

  async init(config: OwlLayerWooConfig): Promise<void> {
    const siteUrl = resolveSiteUrl(config.siteUrl);

    // Validation clé API format (warn seulement — pas bloquant)
    if (config.apiKey && !validateApiKey(config.apiKey)) {
      // Clé API en format legacy ou OwlLayer standalone — log uniquement
      console.debug('[OwlLayerWoo] API key format standalone (non Store Connect)');
    }

    // Stocker l'identité boutique
    OwlLayerWoo._storeStatus = {
      connected: !!config.shopId,
      siteUrl,
      shopId: config.shopId,
    };

    // OwlLayer.init avec identité boutique dans le contexte
    await OwlLayer.init({
      // ... config existante ...
      context: {
        role: 'woocommerce-assistant',
        // ✅ Ajouter siteUrl + shopId pour que le serveur OwlLayer puisse valider la boutique
        storeIdentity: config.shopId ? { siteUrl, shopId: config.shopId } : { siteUrl },
      },
    });

    // ... reste de l'init (Sprints 1-6) ...

    // Émettre l'événement de statut Store Connect
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('owllayer:store:status', {
        detail: OwlLayerWoo._storeStatus
      }));
    }
  },

  getStoreStatus(): WooStoreStatus | null {
    return OwlLayerWoo._storeStatus;
  },
};
```

- [ ] Mettre à jour `src/OwlLayerWoo.ts`

### 7.4 — `src/index.ts` — Export helpers Store Connect

```ts
// Exports publics Sprint 7
export { resolveSiteUrl, validateApiKey } from './utils/storeIdentity.js';
export type { WooStoreStatus, WooStoreIdentity } from './types.js';
```

- [ ] Mettre à jour `src/index.ts`

---

## Tâches Plugin PHP — Endpoints REST

### 7.5 — Endpoint `/wp-json/owllayer/v1/health` (CU-SC02 étape 10)

Le serveur OwlLayer Cloud appelle cet endpoint pour **vérifier** que le plugin est installé et que les clés WooCommerce fonctionnent :

```php
// plugin/includes/class-rest-api.php — NOUVEAU FICHIER

class OwlLayer_REST_API {
  public function register_routes(): void {
    register_rest_route('owllayer/v1', '/health', [
      'methods'             => 'GET',
      'callback'            => [$this, 'health_check'],
      'permission_callback' => [$this, 'verify_owllayer_signature'],
    ]);

    register_rest_route('owllayer/v1', '/connect', [
      'methods'             => 'POST',
      'callback'            => [$this, 'handle_connect'],
      'permission_callback' => [$this, 'verify_owllayer_signature'],
    ]);

    register_rest_route('owllayer/v1', '/webhook', [
      'methods'             => 'POST',
      'callback'            => [$this, 'handle_webhook'],
      'permission_callback' => [$this, 'verify_owllayer_signature'],
    ]);
  }

  /**
   * GET /wp-json/owllayer/v1/health
   * Vérifie que le plugin OwlLayer est actif et que WooCommerce fonctionne.
   */
  public function health_check(WP_REST_Request $request): WP_REST_Response {
    return new WP_REST_Response([
      'status'      => 'ok',
      'plugin'      => 'owllayer-woocommerce',
      'version'     => OWLLAYER_WOO_VERSION,
      'woocommerce' => defined('WC_VERSION') ? WC_VERSION : null,
      'site_url'    => get_home_url(),
      'configured'  => !empty(get_option('owllayer_woo_settings')['api_key']),
    ], 200);
  }

  /**
   * POST /wp-json/owllayer/v1/connect
   * Reçoit la clé API OwlLayer après validation wc-auth.
   * Payload attendu : { "api_key": "pk_live_woo_...", "shop_id": "uuid" }
   */
  public function handle_connect(WP_REST_Request $request): WP_REST_Response {
    $body = $request->get_json_params();
    $api_key = sanitize_text_field($body['api_key'] ?? '');
    $shop_id = sanitize_text_field($body['shop_id'] ?? '');

    // Validation format clé API (pk_live_woo_ ou pk_dev_woo_)
    if (!preg_match('/^pk_(live|dev)_woo_[a-z0-9]{6}_[a-zA-Z0-9]{10,}$/', $api_key)) {
      return new WP_REST_Response(['error' => 'Invalid API key format'], 400);
    }

    // Stocker la clé API reçue depuis OwlLayer Cloud
    $settings = get_option('owllayer_woo_settings', []);
    $settings['api_key'] = $api_key;
    $settings['shop_id'] = $shop_id;
    $settings['connected_at'] = current_time('mysql');
    update_option('owllayer_woo_settings', $settings);

    return new WP_REST_Response([
      'success'  => true,
      'site_url' => get_home_url(),
      'shop_id'  => $shop_id,
    ], 200);
  }

  /**
   * POST /wp-json/owllayer/v1/webhook
   * Reçoit les webhooks OwlLayer Cloud (ex: order/created pour sync).
   * Payload : { "type": "order.created", "data": { ... } }
   */
  public function handle_webhook(WP_REST_Request $request): WP_REST_Response {
    $body    = $request->get_json_params();
    $type    = sanitize_text_field($body['type'] ?? '');
    $data    = $body['data'] ?? [];

    do_action('owllayer_webhook_received', $type, $data);

    return new WP_REST_Response(['received' => true], 200);
  }

  /**
   * Vérifie la signature HMAC-SHA256 de la requête OwlLayer Cloud.
   * Header attendu : X-OwlLayer-Signature: sha256={hmac}
   */
  public function verify_owllayer_signature(WP_REST_Request $request): bool {
    $signature = $request->get_header('X-OwlLayer-Signature');
    if (!$signature) return false;

    $settings = get_option('owllayer_woo_settings', []);
    $secret   = $settings['webhook_secret'] ?? '';
    if (empty($secret)) return false;

    $body     = $request->get_body();
    $expected = 'sha256=' . hash_hmac('sha256', $body, $secret);

    // Comparaison en temps constant (protection timing attack)
    return hash_equals($expected, $signature);
  }
}
```

⚠️ **Sécurité** : L'endpoint `/connect` valide le format de la clé API ET vérifie la signature HMAC avant tout traitement. Le `shop_id` et `api_key` sont sanitizés avant stockage. Pas d'exposition de `consumer_key`/`consumer_secret`.

- [ ] Créer `plugin/includes/class-rest-api.php`

### 7.6 — Mise à jour `owllayer-woocommerce.php` — Enregistrement routes REST + shopId

```php
// Charger la REST API
require_once OWLLAYER_WOO_PATH . 'includes/class-rest-api.php';
add_action('rest_api_init', function() {
  (new OwlLayer_REST_API())->register_routes();
});

// Passer shopId dans la config JS (si boutique connectée)
$settings = get_option('owllayer_woo_settings', []);
$owllayer_config = [
  // ... existant ...
  'shopId'   => esc_js($settings['shop_id'] ?? ''),
  'siteUrl'  => esc_js(get_home_url()),   // ← AJOUT — pour auto-validation siteUrl
];
```

- [ ] Mettre à jour `plugin/owllayer-woocommerce.php`

### 7.7 — Mise à jour `class-admin-settings.php` — Statut connexion + bouton Connect

**Ajouts dans la page réglages OwlLayer :**

```php
// Section "Connexion au Cloud OwlLayer"
// Afficher statut : connecté/non connecté
$shop_id    = $settings['shop_id'] ?? '';
$connected  = !empty($settings['api_key']) && !empty($shop_id);
$status_html = $connected
  ? '<span style="color:#22c55e">● Connecté</span> (Shop ID: ' . esc_html($shop_id) . ')'
  : '<span style="color:#ef4444">● Non connecté</span>';

// Bouton "Connecter au Cloud OwlLayer" → redirige vers le dashboard OwlLayer Store Connect
$connect_url = add_query_arg([
  'platform' => 'woocommerce',
  'site_url'  => urlencode(get_home_url()),
], 'https://cloud.owllayer.dev/store-connect/authorize');

// Champs supplémentaires
// - webhook_secret : clé secrète partagée pour valider les webhooks (Champ: Webhook Secret)
// - shop_id        : UUID boutique (lecture seule, rempli par connexion automatique)
```

Nouveau champ settings :
- `webhook_secret` : secret HMAC partagé entre OwlLayer Cloud et le plugin (généré aléatoirement à l'installation)

- [ ] Mettre à jour `plugin/includes/class-admin-settings.php`

---

## Tâches WooWidget UI — Statut Store Connect

### 7.8 — Indicateur connexion dans `WooWidgetApp.tsx`

Le widget affiche discrètement le statut Store Connect :

```tsx
// Écoute l'event 'owllayer:store:status'
useEffect(() => {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<WooStoreStatus>).detail;
    setStoreStatus(detail);
  };
  window.addEventListener('owllayer:store:status', handler);
  return () => window.removeEventListener('owllayer:store:status', handler);
}, []);

// Dans le rendu — badge discret dans le header du widget
// Si storeStatus.connected: false → petite icône de warning avec tooltip "Boutique non connectée au Cloud OwlLayer"
// Si storeStatus.connected: true → pas d'indicateur visible (cas normal)
```

- [ ] Mettre à jour `src/ui/WooWidgetApp.tsx`

---

## Types DTOs backend (contrat d'interface NestJS — typés seulement)

### 7.9 — `src/types/store-connect.ts` — DTOs de référence

Ces types documentent le contrat attendu par `StoreConnectModule` NestJS (non implémenté dans ce package — ce json-schema sert de référence au backend) :

```ts
// Ne pas exporter dans l'index public — documentation interne uniquement
// Fichier : src/types/store-connect.ts

/**
 * Payload envoyé par OwlLayer Cloud lors de l'appel POST /wp-json/owllayer/v1/connect
 * (après validation wc-auth CU-SC02 étape 12-15)
 */
export interface ConnectStoreDto {
  /** Clé API OwlLayer générée pour cette boutique */
  api_key: string;      // format: pk_(live|dev)_woo_{hash}_{random}
  /** UUID boutique enregistré dans la table stores OwlLayer Cloud */
  shop_id: string;
  /** Webhook secret HMAC-SHA256 partagé pour signer les requêtes OwlLayer → Plugin */
  webhook_secret: string;
  /** Timestamp d'autorisation ISO 8601 */
  authorized_at: string;
}

/**
 * Payload envoyé par OwlLayer Cloud lors d'un webhook
 */
export interface WebhookPayloadDto {
  type: 'order.created' | 'order.updated' | 'cart.updated' | 'store.disconnected';
  shop_id: string;
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * Payload de réponse health check vers OwlLayer Cloud
 */
export interface HealthCheckResponseDto {
  status: 'ok' | 'error';
  plugin: string;
  version: string;
  woocommerce: string | null;
  site_url: string;
  configured: boolean;
}

/**
 * Config étendue passée par le plugin WP vers OwlLayerWoo.init()
 * après connexion Store Connect réussie
 */
export interface StoreConnectConfig {
  api_key: string;
  shop_id: string;
  site_url: string;
  connected_at: string;
}
```

- [ ] Créer `src/types/store-connect.ts`

---

## Tests Sprint 7

| Fichier test | Ce qu'il teste | Tests estimés |
|---|---|---|
| `storeIdentity.test.ts` | resolveSiteUrl (avec ww, sans, avec port), validateApiKey (valide/invalide) | 12 |
| `OwlLayerWoo.storeConnect.test.ts` | init avec shopId → _storeStatus.connected=true, sans shopId → connected=false, event owllayer:store:status émis | 8 |
| `RestApi.php.test.ts` (vitest) | health_check retourne les bons champs, handle_connect valide le format clé, handle_connect refuse format invalide, verify_owllayer_signature HMAC correcte/incorrecte | 12 |

> Note : les tests PHP seront validés manuellement (env WordPress) — les fichiers `.test.ts` testent les helpers JS uniquement.

**Total estimé :** +20 tests JS → **~208 tests** (188 après Sprint 6 + 20)

---

## Ordre d'implémentation recommandé

1. `src/types.ts` — ajouter `WooStoreIdentity`, `WooStoreStatus`, `shopId` dans config
2. `src/utils/storeIdentity.ts` — helpers `resolveSiteUrl` + `validateApiKey`
3. `src/OwlLayerWoo.ts` — intégrer siteUrl auto + event owllayer:store:status + getStoreStatus()
4. `src/index.ts` — exporter les helpers
5. `src/types/store-connect.ts` — DTOs de référence NestJS
6. `plugin/includes/class-rest-api.php` — 3 endpoints REST (/health, /connect, /webhook)
7. `plugin/owllayer-woocommerce.php` — register routes + passer shopId/siteUrl dans config JS
8. `plugin/includes/class-admin-settings.php` — statut connexion + bouton Connect + webhook_secret
9. `src/ui/WooWidgetApp.tsx` — badge statut Store Connect
10. Tests
11. Commit

---

## Critères de succès

- [ ] `pnpm test` : 208+ tests ✓
- [ ] `resolveSiteUrl('https://www.ma-boutique.com/') === 'https://www.ma-boutique.com'`
- [ ] `validateApiKey('pk_live_woo_a3f8b2_x9kL4mN7pQ2') === true`
- [ ] `validateApiKey('pk_shopify_xxx') === false` (mauvaise plateforme)
- [ ] `OwlLayerWoo.getStoreStatus()` retourne `{ connected: true, siteUrl, shopId }` après init avec config.shopId
- [ ] Event `owllayer:store:status` émis sur window après OwlLayerWoo.init()
- [ ] Endpoint `/wp-json/owllayer/v1/health` retourne 200 + `status: 'ok'` (testable avec curl sur env WP)
- [ ] Endpoint `/wp-json/owllayer/v1/connect` with valid payload + HMAC → stocke la clé API dans `owllayer_woo_settings`
- [ ] Endpoint `/wp-json/owllayer/v1/connect` with invalid API key format → 400
- [ ] Endpoint `/wp-json/owllayer/v1/connect` without valid HMAC → 403
- [ ] Admin settings affiche le statut de connexion (connecté/non connecté)
- [ ] Bouton "Connecter au Cloud OwlLayer" pointe vers `https://cloud.owllayer.dev/store-connect/authorize?platform=woocommerce&site_url=...`
- [ ] widget badge statut visible uniquement si `connected: false`

---

## Notes de sécurité

1. **HMAC-SHA256** : toutes les requêtes OwlLayer Cloud → Plugin sont signées. Le `verify_owllayer_signature()` utilise `hash_equals()` (protection timing attack).
2. **Validation format clé API** : regex stricte avant stockage en base.
3. **sanitize_text_field** + **esc_js** sur toutes les valeurs PHP externe avant utilisation.
4. **webhook_secret** : généré aléatoirement à l'activation du plugin (`wp_generate_password(32, false)`), jamais exposé dans le JS front-end.
5. **shop_id** : UUID opaque, ne révèle pas d'information sur la boutique.

---

## Notes sur les adaptations Dashboard OwlLayer Cloud Pro (hors scope ce sprint)

Ces changements sont **à prévoir côté OwlLayer Cloud** (Sprint NestJS suivant) :

| Composant | Adaptation requise |
|-----------|--------------------|
| `StoreConnectModule` | Implémenter CU-SC02 wc-auth flow complet (déjà typé via DTOs Sprint 7) |
| `StoreConnectController` | Endpoint `POST /api/store-connect/woocommerce/callback` → reçoit consumer_key/secret wc-auth |
| `StoreConnectService` | Appeler `/wp-json/wc/v3/system-status` pour verifier, puis POST `/wp-json/owllayer/v1/connect` |
| `stores` table (Postgres) | Colonnes : `shop_id UUID`, `site_url`, `consumer_key_encrypted`, `consumer_secret_encrypted`, `webhook_secret`, `api_key`, `connected_at`, `status` |
| Dashboard UI | Page Store Connect : liste boutiques, wizard connexion, snippet intégration WooCommerce, bouton révoquer |
