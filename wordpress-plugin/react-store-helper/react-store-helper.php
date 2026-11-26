<?php
/**
 * Plugin Name: React Store Helper
 * Description: Small helper for the React storefront. (1) Public /react-store/v1/config endpoint with payment method titles and country/state lists for the checkout form. (2) Optional CORS support so the React app can live on a different domain.
 * Version: 1.0.0
 * Requires Plugins: woocommerce
 *
 * This plugin exposes NO secrets: only information that is already public on your checkout page.
 *
 * CORS (only needed if the React app is on a DIFFERENT domain than WordPress):
 * add this line to wp-config.php (comma-separate several origins):
 *   define( 'REACT_STORE_ALLOWED_ORIGINS', 'https://shop.example.com,https://www.example.com' );
 */

defined( 'ABSPATH' ) || exit;

/* ------------------------------------------------------------------ */
/* 1. Config endpoint                                                  */
/* ------------------------------------------------------------------ */
add_action( 'rest_api_init', function () {
	register_rest_route( 'react-store/v1', '/config', array(
		'methods'             => 'GET',
		'permission_callback' => '__return_true',
		'callback'            => 'react_store_helper_config',
	) );
} );

function react_store_helper_config() {
	if ( ! function_exists( 'WC' ) || ! WC()->countries ) {
		return new WP_Error( 'woocommerce_missing', 'WooCommerce is not active.', array( 'status' => 503 ) );
	}

	$countries = WC()->countries;

	// Payment methods that are switched on in WooCommerce > Settings > Payments.
	$gateways = array();
	foreach ( WC()->payment_gateways()->payment_gateways() as $id => $gateway ) {
		if ( 'yes' !== $gateway->enabled ) {
			continue;
		}
		$gateways[] = array(
			'id'          => $id,
			'title'       => wp_strip_all_tags( $gateway->get_title() ),
			'description' => wp_kses_post( $gateway->get_description() ),
		);
	}

	// Which countries need a state / postcode.
	$state_optional    = array();
	$postcode_optional = array();
	foreach ( $countries->get_allowed_countries() as $code => $name ) {
		$locale = $countries->get_country_locale();
		$fields = isset( $locale[ $code ] ) ? $locale[ $code ] : array();
		if ( isset( $fields['state']['required'] ) && false === $fields['state']['required'] ) {
			$state_optional[] = $code;
		}
		if ( ( isset( $fields['postcode']['required'] ) && false === $fields['postcode']['required'] ) || ( isset( $fields['postcode']['hidden'] ) && $fields['postcode']['hidden'] ) ) {
			$postcode_optional[] = $code;
		}
	}

	$response = rest_ensure_response( array(
		'default_country'   => $countries->get_base_country(),
		'countries'         => $countries->get_allowed_countries(),
		'states'            => $countries->get_states(),
		'state_optional'    => $state_optional,
		'postcode_optional' => $postcode_optional,
		'gateways'          => $gateways,
	) );
	$response->header( 'Cache-Control', 'public, max-age=300' );
	return $response;
}

/* ------------------------------------------------------------------ */
/* 2. Optional CORS for a React app on another domain                  */
/* ------------------------------------------------------------------ */
add_action( 'rest_api_init', function () {
	$origins = react_store_helper_origins();
	if ( empty( $origins ) ) {
		return;
	}

	remove_filter( 'rest_pre_serve_request', 'rest_send_cors_headers' );
	add_filter( 'rest_pre_serve_request', function ( $value ) use ( $origins ) {
		$origin = get_http_origin();
		if ( $origin && in_array( untrailingslashit( $origin ), $origins, true ) ) {
			header( 'Access-Control-Allow-Origin: ' . esc_url_raw( $origin ) );
			header( 'Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS' );
			header( 'Access-Control-Allow-Headers: Content-Type, Nonce, Cart-Token, X-WC-Store-API-Nonce, Authorization' );
			header( 'Access-Control-Expose-Headers: Cart-Token, Nonce, X-WP-Total, X-WP-TotalPages, Link' );
			header( 'Vary: Origin', false );
		}
		return $value;
	}, 20 );
}, 15 );

// Answer browser "preflight" requests quickly.
add_action( 'init', function () {
	if ( 'OPTIONS' !== ( $_SERVER['REQUEST_METHOD'] ?? '' ) ) {
		return;
	}
	$uri = $_SERVER['REQUEST_URI'] ?? '';
	if ( false === strpos( $uri, '/wp-json/' ) && false === strpos( $uri, 'rest_route=' ) ) {
		return;
	}
	$origins = react_store_helper_origins();
	$origin  = get_http_origin();
	if ( $origin && in_array( untrailingslashit( $origin ), $origins, true ) ) {
		header( 'Access-Control-Allow-Origin: ' . esc_url_raw( $origin ) );
		header( 'Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS' );
		header( 'Access-Control-Allow-Headers: Content-Type, Nonce, Cart-Token, X-WC-Store-API-Nonce, Authorization' );
		header( 'Access-Control-Max-Age: 600' );
		header( 'Vary: Origin', false );
		status_header( 204 );
		exit;
	}
} );

function react_store_helper_origins() {
	$raw = defined( 'REACT_STORE_ALLOWED_ORIGINS' ) ? REACT_STORE_ALLOWED_ORIGINS : '';
	$raw = apply_filters( 'react_store_allowed_origins', $raw );
	if ( is_array( $raw ) ) {
		$list = $raw;
	} else {
		$list = explode( ',', (string) $raw );
	}
	return array_values( array_filter( array_map( function ( $o ) {
		return untrailingslashit( trim( $o ) );
	}, $list ) ) );
}
