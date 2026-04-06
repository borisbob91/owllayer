<?php
/**
 * Domos_Woo_Admin_Settings
 *
 * WordPress Admin settings page: Settings > DomOS.
 * Option key: domos_woo_settings
 *
 * Fields:
 *   api_key         — DomOS Cloud API key (required)
 *   endpoint        — DomOS WebSocket endpoint (optional)
 *   agent_name      — Internal agent identifier
 *   agent_title     — Display name shown in the widget header
 *   order_tracking  — Enable OrderTools (bool)
 *   in_chat_payments — Enable PaymentWidget (bool, Sprint 6)
 *
 * @package DomOSWooCommerce
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Domos_Woo_Admin_Settings {

    const OPTION_KEY = 'domos_woo_settings';
    const MENU_SLUG  = 'domos-woocommerce';

    public function init(): void {
        add_action( 'admin_menu', [ $this, 'add_settings_page' ] );
        add_action( 'admin_init', [ $this, 'register_settings' ] );
    }

    // ── Menu ──────────────────────────────────────────────────────────────────

    public function add_settings_page(): void {
        add_options_page(
            __( 'DomOS WooCommerce', 'domos-woocommerce' ),
            __( 'DomOS', 'domos-woocommerce' ),
            'manage_options',
            self::MENU_SLUG,
            [ $this, 'render_page' ]
        );
    }

    // ── Registration ──────────────────────────────────────────────────────────

    public function register_settings(): void {
        register_setting(
            self::OPTION_KEY,
            self::OPTION_KEY,
            [ 'sanitize_callback' => [ $this, 'sanitize' ] ]
        );

        // ── Section: Store Connect ───────────────────────────────────────────
        add_settings_section(
            'domos_store_connect',
            __( 'Store Connect — Cloud DomOS', 'domos-woocommerce' ),
            [ $this, 'render_store_connect_section' ],
            self::MENU_SLUG
        );

        add_settings_field(
            'webhook_secret',
            __( 'Webhook Secret', 'domos-woocommerce' ),
            [ $this, 'field_webhook_secret' ],
            self::MENU_SLUG,
            'domos_store_connect'
        );

        add_settings_field(
            'shop_id',
            __( 'Shop ID', 'domos-woocommerce' ),
            [ $this, 'field_shop_id' ],
            self::MENU_SLUG,
            'domos_store_connect'
        );

        // ── Section: Connection ──────────────────────────────────────────────
        add_settings_section(
            'domos_connection',
            __( 'Connexion DomOS', 'domos-woocommerce' ),
            '__return_false',
            self::MENU_SLUG
        );

        add_settings_field(
            'api_key',
            __( 'API Key', 'domos-woocommerce' ),
            [ $this, 'field_api_key' ],
            self::MENU_SLUG,
            'domos_connection'
        );

        add_settings_field(
            'endpoint',
            __( 'Endpoint WebSocket', 'domos-woocommerce' ),
            [ $this, 'field_endpoint' ],
            self::MENU_SLUG,
            'domos_connection'
        );

        // ── Section: Widget ──────────────────────────────────────────────────
        add_settings_section(
            'domos_widget',
            __( 'Widget', 'domos-woocommerce' ),
            '__return_false',
            self::MENU_SLUG
        );

        add_settings_field(
            'agent_name',
            __( "Nom de l'agent", 'domos-woocommerce' ),
            [ $this, 'field_agent_name' ],
            self::MENU_SLUG,
            'domos_widget'
        );

        add_settings_field(
            'agent_title',
            __( "Titre affiché (widget)", 'domos-woocommerce' ),
            [ $this, 'field_agent_title' ],
            self::MENU_SLUG,
            'domos_widget'
        );

        // ── Section: Features ────────────────────────────────────────────────
        add_settings_section(
            'domos_features',
            __( 'Fonctionnalités', 'domos-woocommerce' ),
            '__return_false',
            self::MENU_SLUG
        );

        add_settings_field(
            'order_tracking',
            __( 'Suivi de commande', 'domos-woocommerce' ),
            [ $this, 'field_order_tracking' ],
            self::MENU_SLUG,
            'domos_features'
        );

        add_settings_field(
            'in_chat_payments',
            __( 'Paiement in-chat (Sprint 6)', 'domos-woocommerce' ),
            [ $this, 'field_in_chat_payments' ],
            self::MENU_SLUG,
            'domos_features'
        );

        add_settings_field(
            'stripe_publishable_key',
            __( 'Stripe Publishable Key', 'domos-woocommerce' ),
            [ $this, 'field_stripe_publishable_key' ],
            self::MENU_SLUG,
            'domos_features'
        );

        add_settings_field(
            'paypal_client_id',
            __( 'PayPal Client ID', 'domos-woocommerce' ),
            [ $this, 'field_paypal_client_id' ],
            self::MENU_SLUG,
            'domos_features'
        );

        add_settings_field(
            'product_recommendations',
            __( 'Recommandations personnalisees', 'domos-woocommerce' ),
            [ $this, 'field_product_recommendations' ],
            self::MENU_SLUG,
            'domos_features'
        );
    }

    // ── Sanitize ──────────────────────────────────────────────────────────────

    /** @param array<string,mixed> $input */
    public function sanitize( array $input ): array {
        $existing = get_option( self::OPTION_KEY, [] );

        // Preserve shop_id + connected_at + webhook_secret if not posted (readonly fields)
        $sanitized = [
            'api_key'          => sanitize_text_field( $input['api_key'] ?? '' ),
            'endpoint'         => esc_url_raw( $input['endpoint'] ?? '' ),
            'agent_name'       => sanitize_text_field( $input['agent_name'] ?? '' ),
            'agent_title'      => sanitize_text_field( $input['agent_title'] ?? '' ),
            'order_tracking'           => ! empty( $input['order_tracking'] ),
            'in_chat_payments'         => ! empty( $input['in_chat_payments'] ),
            'stripe_publishable_key'   => sanitize_text_field( $input['stripe_publishable_key'] ?? '' ),
            'paypal_client_id'         => sanitize_text_field( $input['paypal_client_id'] ?? '' ),
            'product_recommendations'  => ! empty( $input['product_recommendations'] ),
            // Sprint 7: preserve Store Connect fields
            'shop_id'          => $existing['shop_id'] ?? '',
            'connected_at'     => $existing['connected_at'] ?? '',
            'webhook_secret'   => $existing['webhook_secret'] ?? '',
        ];

        // Allow resetting webhook_secret via form (e.g. user manually pastes a new one)
        if ( ! empty( $input['webhook_secret'] ) ) {
            $sanitized['webhook_secret'] = sanitize_text_field( $input['webhook_secret'] );
        }

        return $sanitized;
    }

    // ── Field renderers ───────────────────────────────────────────────────────

    public function field_api_key(): void {
        $opts = get_option( self::OPTION_KEY, [] );
        $val  = esc_attr( $opts['api_key'] ?? '' );
        echo '<input type="text" name="' . self::OPTION_KEY . '[api_key]" value="' . $val . '" class="regular-text" required />';
        echo '<p class="description">' . esc_html__( 'Clé API DomOS Cloud. Obligatoire.', 'domos-woocommerce' ) . '</p>';
    }

    public function field_endpoint(): void {
        $opts = get_option( self::OPTION_KEY, [] );
        $val  = esc_attr( $opts['endpoint'] ?? '' );
        echo '<input type="url" name="' . self::OPTION_KEY . '[endpoint]" value="' . $val . '" class="regular-text" placeholder="wss://cloud.domos.dev/domos" />';
        echo '<p class="description">' . esc_html__( 'Laisser vide pour utiliser le cloud DomOS par défaut.', 'domos-woocommerce' ) . '</p>';
    }

    public function field_agent_name(): void {
        $opts = get_option( self::OPTION_KEY, [] );
        $val  = esc_attr( $opts['agent_name'] ?? '' );
        echo '<input type="text" name="' . self::OPTION_KEY . '[agent_name]" value="' . $val . '" class="regular-text" placeholder="woo-assistant" />';
    }

    public function field_agent_title(): void {
        $opts = get_option( self::OPTION_KEY, [] );
        $val  = esc_attr( $opts['agent_title'] ?? '' );
        echo '<input type="text" name="' . self::OPTION_KEY . '[agent_title]" value="' . $val . '" class="regular-text" placeholder="Assistant boutique" />';
    }

    public function field_order_tracking(): void {
        $opts    = get_option( self::OPTION_KEY, [] );
        $checked = ! empty( $opts['order_tracking'] ) ? 'checked' : '';
        echo '<label><input type="checkbox" name="' . self::OPTION_KEY . '[order_tracking]" value="1" ' . $checked . ' /> ';
        echo esc_html__( "Permettre à l'agent de récupérer le statut des commandes.", 'domos-woocommerce' ) . '</label>';
    }

    public function field_in_chat_payments(): void {
        $opts    = get_option( self::OPTION_KEY, [] );
        $checked = ! empty( $opts['in_chat_payments'] ) ? 'checked' : '';
        echo '<label><input type="checkbox" name="' . self::OPTION_KEY . '[in_chat_payments]" value="1" ' . $checked . ' /> ';
        echo esc_html__( 'Activer la modale de paiement in-chat (Sprint 6).', 'domos-woocommerce' ) . '</label>';
    }

    public function field_stripe_publishable_key(): void {
        $opts = get_option( self::OPTION_KEY, [] );
        $val  = esc_attr( $opts['stripe_publishable_key'] ?? '' );
        echo '<input type="text" name="' . self::OPTION_KEY . '[stripe_publishable_key]" value="' . $val . '" class="regular-text" placeholder="pk_live_..." />';
        echo '<p class="description">' . esc_html__( 'Stripe publishable key (commence par pk_live_ ou pk_test_). Requis pour le paiement in-chat par carte.', 'domos-woocommerce' ) . '</p>';
    }

    public function field_paypal_client_id(): void {
        $opts = get_option( self::OPTION_KEY, [] );
        $val  = esc_attr( $opts['paypal_client_id'] ?? '' );
        echo '<input type="text" name="' . self::OPTION_KEY . '[paypal_client_id]" value="' . $val . '" class="regular-text" placeholder="AaBb..." />';
        echo '<p class="description">' . esc_html__( 'PayPal Client ID (Sandbox ou Production). Requis pour le paiement in-chat PayPal.', 'domos-woocommerce' ) . '</p>';
    }

    public function field_product_recommendations(): void {
        $opts    = get_option( self::OPTION_KEY, [] );
        $checked = ! empty( $opts['product_recommendations'] ) ? 'checked' : '';
        echo '<label><input type="checkbox" name="' . self::OPTION_KEY . '[product_recommendations]" value="1" ' . $checked . ' /> ';
        echo esc_html__( 'Activer le tool get_recommendations (produits similaires, promotions, upsell).', 'domos-woocommerce' ) . '</label>';
    }

    // ── Store Connect field renderers (Sprint 7) ──────────────────────────────

    /**
     * Affiche le statut de connexion Store Connect + bouton de connexion.
     * Appelé comme callback de section 'domos_store_connect'.
     */
    public function render_store_connect_section(): void {
        $opts      = get_option( self::OPTION_KEY, [] );
        $shop_id   = $opts['shop_id'] ?? '';
        $connected = ! empty( $opts['api_key'] ) && ! empty( $shop_id );

        if ( $connected ) {
            $connected_at = $opts['connected_at'] ?? '';
            echo '<p><span style="color:#22c55e;font-weight:600;">● ' . esc_html__( 'Connecté au Cloud DomOS', 'domos-woocommerce' ) . '</span>';
            if ( $connected_at ) {
                echo ' &mdash; ' . esc_html( sprintf( __( 'Depuis le %s', 'domos-woocommerce' ), date_i18n( get_option( 'date_format' ), strtotime( $connected_at ) ) ) );
            }
            echo '</p>';
        } else {
            echo '<p><span style="color:#ef4444;font-weight:600;">● ' . esc_html__( 'Non connecté', 'domos-woocommerce' ) . '</span></p>';

            $connect_url = add_query_arg( [
                'platform' => 'woocommerce',
                'site_url'  => rawurlencode( get_home_url() ),
            ], 'https://cloud.domos.dev/store-connect/authorize' );

            echo '<p><a href="' . esc_url( $connect_url ) . '" class="button button-primary">'
                . esc_html__( 'Connecter au Cloud DomOS', 'domos-woocommerce' )
                . '</a></p>';
            echo '<p class="description">' . esc_html__( 'Connectez votre boutique pour activer les fonctionnalités DomOS Cloud Pro (recommandations, analytics, webhooks).', 'domos-woocommerce' ) . '</p>';
        }
    }

    public function field_webhook_secret(): void {
        $opts = get_option( self::OPTION_KEY, [] );
        $val  = esc_attr( $opts['webhook_secret'] ?? '' );

        // Auto-génère un secret si absent (première activation)
        if ( empty( $val ) ) {
            $generated = wp_generate_password( 32, false );
            $opts['webhook_secret'] = $generated;
            update_option( self::OPTION_KEY, $opts );
            $val = esc_attr( $generated );
        }

        echo '<input type="text" name="' . self::OPTION_KEY . '[webhook_secret]" value="' . $val . '" class="regular-text" />';
        echo '<p class="description">' . esc_html__( 'Secret partagé avec DomOS Cloud pour valider les webhooks entrants (HMAC-SHA256). Généré automatiquement.', 'domos-woocommerce' ) . '</p>';
    }

    public function field_shop_id(): void {
        $opts    = get_option( self::OPTION_KEY, [] );
        $shop_id = esc_attr( $opts['shop_id'] ?? '' );

        if ( $shop_id ) {
            echo '<input type="text" value="' . $shop_id . '" class="regular-text" readonly disabled />';
            echo '<p class="description">' . esc_html__( 'UUID assigné par DomOS Cloud lors de la connexion. Lecture seule.', 'domos-woocommerce' ) . '</p>';
        } else {
            echo '<p class="description" style="color:#6b7280;">' . esc_html__( 'Non attribué — connectez votre boutique au Cloud DomOS pour obtenir un Shop ID.', 'domos-woocommerce' ) . '</p>';
        }
    }

    // ── Page render ───────────────────────────────────────────────────────────

    public function render_page(): void {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }
        ?>
        <div class="wrap">
            <h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
            <form method="post" action="options.php">
                <?php
                settings_fields( self::OPTION_KEY );
                do_settings_sections( self::MENU_SLUG );
                submit_button( __( 'Enregistrer', 'domos-woocommerce' ) );
                ?>
            </form>
        </div>
        <?php
    }
}
