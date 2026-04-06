<?php
/**
 * Domos_Woo_SW_Registrar
 *
 * Registers a Service Worker to persist the DomOS session across page navigations.
 * The SW intercepts navigation events and reattaches the DomOS WebSocket automatically.
 *
 * @package DomOSWooCommerce
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Domos_Woo_SW_Registrar {

    public function init(): void {
        add_action( 'wp_footer', [ $this, 'register_service_worker' ], 5 );
    }

    public function register_service_worker(): void {
        ?>
        <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/domos-sw.js', { scope: '/' })
                .catch(function() {}); // Silent if SW not found (optional feature)
        }
        </script>
        <?php
    }
}
