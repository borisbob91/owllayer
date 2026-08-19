<?php
/**
 * OwlLayer_Woo_SW_Registrar
 *
 * Registers a Service Worker to persist the OwlLayer session across page navigations.
 * The SW intercepts navigation events and reattaches the OwlLayer WebSocket automatically.
 *
 * @package OwlLayerWooCommerce
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class OwlLayer_Woo_SW_Registrar {

    public function init(): void {
        add_action( 'wp_footer', [ $this, 'register_service_worker' ], 5 );
    }

    public function register_service_worker(): void {
        ?>
        <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/owllayer-sw.js', { scope: '/' })
                .catch(function() {}); // Silent if SW not found (optional feature)
        }
        </script>
        <?php
    }
}
