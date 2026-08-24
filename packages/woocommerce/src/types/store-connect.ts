/**
 * store-connect.ts — DTOs de référence pour le module StoreConnect NestJS
 *
 * Ces types documentent le contrat d'interface entre :
 *   - le plugin WordPress (@owllayer/woocommerce)
 *   - OwlLayer Cloud Pro backend (StoreConnectModule NestJS)
 *
 * ⚠️ Ce fichier ne doit PAS être exporté dans l'index public du package.
 *    Il sert de référence interne/documentation pour l'implémentation backend.
 *    CU-SC02 : connexion WooCommerce via wc-auth
 *    CU-SC04 : clés API OwlLayer par boutique
 */

/**
 * Payload envoyé par OwlLayer Cloud lors de l'appel POST /wp-json/owllayer/v1/connect
 * (après validation wc-auth CU-SC02 étapes 12-15)
 */
export interface ConnectStoreDto {
  /** Clé API OwlLayer générée pour cette boutique — format: pk_(live|dev)_woo_{hash}_{random} */
  api_key: string;
  /** UUID boutique enregistré dans la table stores OwlLayer Cloud */
  shop_id: string;
  /** Webhook secret HMAC-SHA256 partagé pour signer les requêtes OwlLayer → Plugin */
  webhook_secret: string;
  /** Timestamp d'autorisation ISO 8601 */
  authorized_at: string;
}

/**
 * Payload envoyé par OwlLayer Cloud lors d'un webhook vers /wp-json/owllayer/v1/webhook
 */
export interface WebhookPayloadDto {
  type: 'order.created' | 'order.updated' | 'cart.updated' | 'store.disconnected';
  shop_id: string;
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * Réponse renvoyée par GET /wp-json/owllayer/v1/health
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
 * après connexion Store Connect réussie.
 * Correspond aux champs ajoutés par le plugin si la boutique est connectée.
 */
export interface StoreConnectConfig {
  api_key: string;
  shop_id: string;
  site_url: string;
  connected_at: string;
}
