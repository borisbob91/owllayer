<?php
/**
 * Plugin Name: DomOS WooCommerce
 * Plugin URI:  https://domos.dev
 * Description: DomOS AI assistant integration for WooCommerce stores. Adds an intelligent voice/chat agent that can search products, manage the cart, and assist with checkout.
 * Version:     0.1.0
 * Requires at least: 6.0
 * Requires PHP: 8.0
 * WC requires at least: 7.0
 * WC tested up to: 9.5
 * Author: DomOS
 * License: Unlicensed
 * Text Domain: domos-woocommerce
 *
 * @package DomOSWooCommerce
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'DOMOS_WOO_VERSION', '0.1.0' );
define( 'DOMOS_WOO_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'DOMOS_WOO_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// ── Dependencies ──────────────────────────────────────────────────────────────

require_once DOMOS_WOO_PLUGIN_DIR . 'includes/class-context-builder.php';
require_once DOMOS_WOO_PLUGIN_DIR . 'includes/class-admin-settings.php';
require_once DOMOS_WOO_PLUGIN_DIR . 'includes/class-sw-registrar.php';
require_once DOMOS_WOO_PLUGIN_DIR . 'includes/class-rest-api.php';

// ── HPOS compatibility declaration ────────────────────────────────────────────

add_action( 'before_woocommerce_init', function () {
    if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility(
            'custom_order_tables',
            __FILE__,
            true
        );
    }
} );

// ── REST API routes (Sprint 7 — Store Connect) ───────────────────────────────

add_action( 'rest_api_init', function () {
    ( new DomOS_REST_API() )->register_routes();
} );

// ── Bootstrap ─────────────────────────────────────────────────────────────────

add_action( 'plugins_loaded', function () {
    if ( ! class_exists( 'WooCommerce' ) ) {
        add_action( 'admin_notices', function () {
            echo '<div class="error"><p>'
                . esc_html__( 'DomOS WooCommerce requires WooCommerce to be active.', 'domos-woocommerce' )
                . '</p></div>';
        } );
        return;
    }

    $settings = get_option( 'domos_woo_settings', [] );

    // Admin settings page
    $admin = new Domos_Woo_Admin_Settings();
    $admin->init();

    // Skip front-end injection if no API key configured
    if ( empty( $settings['api_key'] ) ) {
        return;
    }

    // Context injection + JS enqueue
    add_action( 'wp_enqueue_scripts', function () use ( $settings ) {
        $config = [
            'apiKey'   => $settings['api_key'],
            'nonce'    => wp_create_nonce( 'wc_store_api' ),
            // Sprint 7: transmit siteUrl + shopId for Store Connect routing
            'siteUrl'  => get_home_url(),
            'shopId'   => $settings['shop_id'] ?? '',
            'features' => [
                'orderTracking'          => ! empty( $settings['order_tracking'] ),
                'inChatPayments'         => ! empty( $settings['in_chat_payments'] ),
                'stripeKey'              => esc_js( $settings['stripe_publishable_key'] ?? '' ),
                'paypalClientId'         => esc_js( $settings['paypal_client_id'] ?? '' ),
                'productRecommendations' => ! empty( $settings['product_recommendations'] ),
            ],
        ];
        if ( ! empty( $settings['endpoint'] ) ) {
            $config['endpoint'] = $settings['endpoint'];
        }
        if ( ! empty( $settings['agent_name'] ) || ! empty( $settings['agent_title'] ) ) {
            $config['widget'] = array_filter( [
                'agentName'  => $settings['agent_name']  ?? '',
                'agentTitle' => $settings['agent_title'] ?? '',
            ] );
        }

        wp_enqueue_script(
            'domos-woocommerce',
            DOMOS_WOO_PLUGIN_URL . 'assets/domos-woocommerce.min.js',
            [],
            DOMOS_WOO_VERSION,
            true
        );
        wp_add_inline_script(
            'domos-woocommerce',
            'DomOSWoo.init(' . wp_json_encode( $config, JSON_UNESCAPED_SLASHES ) . ');'
        );
    } );

    add_action( 'wp_footer', function () use ( $settings ) {
        $context_builder = new Domos_Woo_Context_Builder( $settings );
        $context         = $context_builder->build();

        // 1. JSON context block (read by WooContextBuilder.ts via #domos-woo-context)
        echo '<script id="domos-woo-context" type="application/json">'
            . wp_json_encode( $context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES )
            . '</script>' . "\n";
    }, 20 );

    // Service Worker registration
    $sw = new Domos_Woo_SW_Registrar();
    $sw->init();
} );
