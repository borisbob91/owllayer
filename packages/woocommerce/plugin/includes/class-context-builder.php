<?php
/**
 * Domos_Woo_Context_Builder
 *
 * Builds the JSON context block injected into the page via #domos-woo-context.
 * This block is read client-side by WooContextBuilder.ts.
 *
 * Fields produced:
 *   pageType, siteUrl, shop, customer, product, category, cart
 *
 * @package DomOSWooCommerce
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Domos_Woo_Context_Builder {

    /** @var array<string,mixed> */
    private array $settings;

    public function __construct( array $settings ) {
        $this->settings = $settings;
    }

    /** @return array<string,mixed> */
    public function build(): array {
        $page_type = $this->detect_page_type();

        return array_filter( [
            'pageType' => $page_type,
            'siteUrl'  => get_site_url(),
            'shop'     => $this->build_shop(),
            'customer' => $this->build_customer( $page_type ),
            'product'  => $this->build_product(),
            'category' => $this->build_category(),
            'cart'     => $this->build_cart( $page_type ),
        ], fn( $v ) => $v !== null );
    }

    // ── Page type ─────────────────────────────────────────────────────────────

    private function detect_page_type(): string {
        if ( is_product() )           return 'product';
        if ( is_product_category() )  return 'category';
        if ( is_cart() )              return 'cart';
        if ( is_checkout() )          return 'checkout';
        if ( is_account_page() )      return 'account';
        if ( is_shop() )              return 'shop';
        return 'home';
    }

    // ── Shop ──────────────────────────────────────────────────────────────────

    /** @return array<string,string> */
    private function build_shop(): array {
        return [
            'name'     => get_bloginfo( 'name' ),
            'currency' => get_woocommerce_currency(),
        ];
    }

    // ── Customer ──────────────────────────────────────────────────────────────

    /**
     * Build customer context. Extra data (orders, addresses) only on account/checkout pages.
     *
     * @return array<string,mixed>
     */
    private function build_customer( string $page_type ): array {
        if ( ! is_user_logged_in() ) {
            return [ 'isLoggedIn' => false ];
        }

        $customer = new WC_Customer( get_current_user_id() );

        $data = [
            'isLoggedIn' => true,
            'id'         => $customer->get_id(),
            'email'      => $customer->get_email(),
            'firstName'  => $customer->get_first_name(),
            'orderCount' => wc_get_customer_order_count( get_current_user_id() ),
        ];

        // On checkout — include saved billing/shipping addresses
        if ( in_array( $page_type, [ 'checkout', 'account' ], true ) ) {
            $data['billingAddress'] = array_filter( [
                'first_name' => $customer->get_billing_first_name(),
                'last_name'  => $customer->get_billing_last_name(),
                'email'      => $customer->get_billing_email(),
                'phone'      => $customer->get_billing_phone(),
                'address_1'  => $customer->get_billing_address_1(),
                'address_2'  => $customer->get_billing_address_2(),
                'city'       => $customer->get_billing_city(),
                'postcode'   => $customer->get_billing_postcode(),
                'country'    => $customer->get_billing_country(),
            ] );
            $data['shippingAddress'] = array_filter( [
                'first_name' => $customer->get_shipping_first_name(),
                'last_name'  => $customer->get_shipping_last_name(),
                'address_1'  => $customer->get_shipping_address_1(),
                'address_2'  => $customer->get_shipping_address_2(),
                'city'       => $customer->get_shipping_city(),
                'postcode'   => $customer->get_shipping_postcode(),
                'country'    => $customer->get_shipping_country(),
            ] );
        }

        return $data;
    }

    // ── Product ───────────────────────────────────────────────────────────────

    /** @return array<string,mixed>|null */
    private function build_product(): ?array {
        if ( ! is_product() ) {
            return null;
        }

        global $product;
        if ( ! $product instanceof WC_Product ) {
            $product = wc_get_product( get_the_ID() );
        }
        if ( ! $product ) {
            return null;
        }

        $categories = [];
        foreach ( $product->get_category_ids() as $cat_id ) {
            $term = get_term( $cat_id, 'product_cat' );
            if ( $term && ! is_wp_error( $term ) ) {
                $categories[] = [
                    'id'   => $term->term_id,
                    'name' => $term->name,
                    'slug' => $term->slug,
                ];
            }
        }

        $data = [
            'id'        => $product->get_id(),
            'name'      => $product->get_name(),
            'price'     => wc_format_decimal( $product->get_price(), 2 ),
            'permalink' => get_permalink( $product->get_id() ),
            'inStock'   => $product->is_in_stock(),
            'sku'       => $product->get_sku() ?: null,
            'categories' => $categories,
        ];

        // Variations for variable products
        if ( $product->is_type( 'variable' ) ) {
            /** @var WC_Product_Variable $product */
            $variation_ids   = $product->get_children();
            $data['variations'] = [];
            foreach ( array_slice( $variation_ids, 0, 20 ) as $var_id ) {
                $variation = wc_get_product( $var_id );
                if ( ! $variation ) continue;
                $data['variations'][] = [
                    'id'         => $variation->get_id(),
                    'price'      => wc_format_decimal( $variation->get_price(), 2 ),
                    'inStock'    => $variation->is_in_stock(),
                    'attributes' => $variation->get_variation_attributes(),
                ];
            }
        }

        return $data;
    }

    // ── Category ──────────────────────────────────────────────────────────────

    /** @return array<string,mixed>|null */
    private function build_category(): ?array {
        if ( ! is_product_category() ) {
            return null;
        }

        $term = get_queried_object();
        if ( ! $term instanceof WP_Term ) {
            return null;
        }

        return [
            'id'    => $term->term_id,
            'name'  => $term->name,
            'slug'  => $term->slug,
            'count' => $term->count,
        ];
    }

    // ── Cart ──────────────────────────────────────────────────────────────────

    /**
     * Build cart context — only on cart and checkout pages.
     * Uses WooCommerce session data (does not call Store API).
     *
     * @return array<string,mixed>|null
     */
    private function build_cart( string $page_type ): ?array {
        if ( ! in_array( $page_type, [ 'cart', 'checkout' ], true ) ) {
            return null;
        }
        if ( ! isset( WC()->cart ) ) {
            return null;
        }

        $cart  = WC()->cart;
        $items = [];

        foreach ( $cart->get_cart() as $key => $line ) {
            $product = $line['data'] ?? null;
            if ( ! $product instanceof WC_Product ) continue;
            $items[] = [
                'key'       => $key,
                'id'        => $line['product_id'],
                'variantId' => $line['variation_id'] ?: null,
                'name'      => $product->get_name(),
                'quantity'  => $line['quantity'],
                'price'     => wc_format_decimal( $product->get_price(), 2 ),
                'lineTotal' => wc_format_decimal( $line['line_total'], 2 ),
            ];
        }

        return [
            'items'    => $items,
            'count'    => $cart->get_cart_contents_count(),
            'total'    => wc_format_decimal( $cart->get_total( 'edit' ), 2 ),
            'currency' => get_woocommerce_currency(),
        ];
    }
}
