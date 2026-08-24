<?php
/**
 * OwlLayer_REST_API — Endpoints REST WordPress pour Store Connect (Sprint 7)
 *
 * Endpoints exposés :
 *   GET  /wp-json/owllayer/v1/health   — Vérification plugin par OwlLayer Cloud (CU-SC02 étape 10)
 *   POST /wp-json/owllayer/v1/connect  — Réception clé API après wc-auth (CU-SC02 étape 12-15)
 *   POST /wp-json/owllayer/v1/webhook  — Réception webhooks OwlLayer Cloud (order.created, etc.)
 *
 * Sécurité :
 *   - Toutes les routes sont protégées par verify_owllayer_signature() (HMAC-SHA256)
 *   - hash_equals() pour protection contre timing attack
 *   - sanitize_text_field() sur toutes les entrées avant stockage
 *
 * @package OwlLayerWooCommerce
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class OwlLayer_REST_API {

    /**
     * Enregistre les routes REST OwlLayer.
     * Appelé via le hook 'rest_api_init'.
     */
    public function register_routes(): void {
        register_rest_route( 'owllayer/v1', '/health', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'health_check' ],
            'permission_callback' => [ $this, 'verify_owllayer_signature' ],
        ] );

        register_rest_route( 'owllayer/v1', '/connect', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'handle_connect' ],
            'permission_callback' => [ $this, 'verify_owllayer_signature' ],
        ] );

        register_rest_route( 'owllayer/v1', '/webhook', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'handle_webhook' ],
            'permission_callback' => [ $this, 'verify_owllayer_signature' ],
        ] );
    }

    // ── Callbacks ─────────────────────────────────────────────────────────────

    /**
     * GET /wp-json/owllayer/v1/health
     *
     * Renvoie l'état du plugin et de WooCommerce.
     * Appelé par OwlLayer Cloud pour vérifier que le plugin est actif (CU-SC02 étape 10).
     */
    public function health_check( WP_REST_Request $request ): WP_REST_Response {
        return new WP_REST_Response( [
            'status'      => 'ok',
            'plugin'      => 'owllayer-woocommerce',
            'version'     => OWLLAYER_WOO_VERSION,
            'woocommerce' => defined( 'WC_VERSION' ) ? WC_VERSION : null,
            'site_url'    => get_home_url(),
            'configured'  => ! empty( get_option( 'owllayer_woo_settings', [] )['api_key'] ),
        ], 200 );
    }

    /**
     * POST /wp-json/owllayer/v1/connect
     *
     * Reçoit la clé API OwlLayer Cloud après validation wc-auth.
     * Payload attendu : { "api_key": "pk_live_woo_...", "shop_id": "uuid" }
     *
     * Stocke api_key + shop_id dans owllayer_woo_settings (wp_options).
     */
    public function handle_connect( WP_REST_Request $request ): WP_REST_Response {
        $body    = $request->get_json_params();
        $api_key = sanitize_text_field( $body['api_key'] ?? '' );
        $shop_id = sanitize_text_field( $body['shop_id'] ?? '' );

        // Validation stricte du format clé API OwlLayer (pk_live_woo_ ou pk_dev_woo_)
        if ( ! preg_match( '/^pk_(live|dev)_woo_[a-z0-9]{6}_[a-zA-Z0-9]{10,}$/', $api_key ) ) {
            return new WP_REST_Response( [ 'error' => 'Invalid API key format' ], 400 );
        }

        if ( empty( $shop_id ) ) {
            return new WP_REST_Response( [ 'error' => 'shop_id is required' ], 400 );
        }

        // Stocker la clé API + shop_id reçus depuis OwlLayer Cloud
        $settings                 = get_option( 'owllayer_woo_settings', [] );
        $settings['api_key']      = $api_key;
        $settings['shop_id']      = $shop_id;
        $settings['connected_at'] = current_time( 'mysql' );
        update_option( 'owllayer_woo_settings', $settings );

        return new WP_REST_Response( [
            'success'  => true,
            'site_url' => get_home_url(),
            'shop_id'  => $shop_id,
        ], 200 );
    }

    /**
     * POST /wp-json/owllayer/v1/webhook
     *
     * Reçoit les webhooks OwlLayer Cloud (order.created, order.updated, etc.).
     * Déclenche le hook WordPress 'owllayer_webhook_received' pour extensibilité.
     * Payload attendu : { "type": "order.created", "data": { ... } }
     */
    public function handle_webhook( WP_REST_Request $request ): WP_REST_Response {
        $body = $request->get_json_params();
        $type = sanitize_text_field( $body['type'] ?? '' );
        $data = is_array( $body['data'] ?? null ) ? $body['data'] : [];

        /**
         * Fires when a OwlLayer Cloud webhook is received.
         *
         * @param string $type  Webhook type (ex: 'order.created').
         * @param array  $data  Webhook payload data.
         */
        do_action( 'owllayer_webhook_received', $type, $data );

        return new WP_REST_Response( [ 'received' => true ], 200 );
    }

    // ── Signature verification ────────────────────────────────────────────────

    /**
     * Vérifie la signature HMAC-SHA256 de toutes les requêtes OwlLayer Cloud.
     *
     * Header attendu : X-OwlLayer-Signature: sha256={hmac}
     * Secret partagé : owllayer_woo_settings['webhook_secret']
     *
     * Utilise hash_equals() pour se protéger contre les attaques par timing.
     *
     * @return bool|WP_Error True si valide, WP_Error 403 sinon.
     */
    public function verify_owllayer_signature( WP_REST_Request $request ): bool|WP_Error {
        $signature = $request->get_header( 'X-OwlLayer-Signature' );
        if ( empty( $signature ) ) {
            return new WP_Error( 'rest_forbidden', 'Missing X-OwlLayer-Signature header', [ 'status' => 403 ] );
        }

        $settings = get_option( 'owllayer_woo_settings', [] );
        $secret   = $settings['webhook_secret'] ?? '';

        if ( empty( $secret ) ) {
            return new WP_Error( 'rest_forbidden', 'Webhook secret not configured', [ 'status' => 403 ] );
        }

        $body     = $request->get_body();
        $expected = 'sha256=' . hash_hmac( 'sha256', $body, $secret );

        if ( ! hash_equals( $expected, $signature ) ) {
            return new WP_Error( 'rest_forbidden', 'Invalid signature', [ 'status' => 403 ] );
        }

        return true;
    }
}
