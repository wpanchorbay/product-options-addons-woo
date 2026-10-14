<?php
/**
 * Reusable functions.
 *
 * @package    Opopw
 * @since      1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Log messages to the debug log file.
 *
 * @param mixed  $message  The message to log.
 * @param string $level    The log level (e.g., 'DEBUG', 'INFO', 'ERROR').
 * @return void
 */
function opopw_log( $message, $level = 'INFO' ) {
	$enable_logging = Opopw\Core\Settings::get_instance()->get_settings( 'debug_enableMode' );
	$level_upper    = is_string( $level ) ? strtoupper( $level ) : 'INFO';

	if ( ! $enable_logging && 'ERROR' !== $level_upper ) {
		return;
	}

	if ( ! function_exists( 'wc_get_logger' ) ) {
		return;
	}

	$formatted_message = is_string( $message ) ? $message : wp_json_encode( $message );
	$wc_level          = strtolower( $level_upper );

	$valid_levels = array( 'emergency', 'alert', 'critical', 'error', 'warning', 'notice', 'info', 'debug' );
	if ( ! in_array( $wc_level, $valid_levels, true ) ) {
		$wc_level = 'info';
	}

	$logger = wc_get_logger();
	$logger->log( $wc_level, $formatted_message, array( 'source' => 'optionbay-product-options-addons-woo' ) );
}

/**
 * Field types that render presentation only.
 *
 * These submit no value, so they never reach the cart, can never be required,
 * and cannot act as conditional-logic triggers. Filterable so the Pro add-on
 * can register presentational types of its own.
 *
 * @since 1.0.3
 * @return array
 */
function opopw_get_presentational_field_types() {
	return apply_filters( 'opopw_presentational_field_types', array( 'static_content', 'divider', 'heading' ) );
}

/**
 * Calculate how much stock a single reduction intent consumes.
 *
 * Single source of truth for CartManager (which reduces and restores) and
 * InventoryManager (which totals what the cart has reserved). These were
 * previously two private copies, and only CartManager's applied the
 * `opopw_calculate_reduction` filter — so cart-reserved totals silently ignored
 * Pro's 'formula' reduction mode and disagreed with what was actually taken.
 *
 * @since 1.0.3
 * @param array $intent   The stock intent (id, mode, value, amount, ...).
 * @param int   $quantity The line item quantity.
 * @return float
 */
function opopw_calculate_intent_reduction( $intent, $quantity ) {
	$intent = is_array( $intent ) ? $intent : array();
	$mode   = $intent['mode'] ?? 'per_item_qty';

	/**
	 * Filter the calculated reduction amount.
	 *
	 * Return a float to override; return null to fall through to the built-in
	 * per_line_item / per_item_qty modes.
	 *
	 * @since 1.0.0
	 * @param float|null $custom_amount Override amount, or null.
	 * @param int        $quantity      The line item quantity.
	 * @param string     $mode          The reduction mode.
	 * @param array      $intent        The full intent.
	 */
	$custom_amount = apply_filters( 'opopw_calculate_reduction', null, $quantity, $mode, $intent );
	if ( null !== $custom_amount ) {
		return (float) $custom_amount;
	}

	if ( 'per_line_item' === $mode ) {
		return 1.0;
	}

	return (float) $quantity;
}

/**
 * Safely retrieve a value from a nested array or object using dot notation.
 * Returns default if key is missing OR if value is an empty string.
 *
 * @since 1.0.0
 * @param array|object $target        The array or object to search.
 * @param string|array $key           The key path (e.g., 'settings.color').
 * @param mixed        $default_value The default value if key is not found.
 * @return mixed
 */
function opopw_get_value( $target, $key, $default_value = null ) {
	if ( is_null( $key ) || '' === trim( $key ) ) {
		return $target;
	}

	$keys = is_array( $key ) ? $key : explode( '.', $key );

	foreach ( $keys as $segment ) {
		if ( is_array( $target ) && isset( $target[ $segment ] ) ) {
			$target = $target[ $segment ];
		} elseif ( is_object( $target ) && isset( $target->{$segment} ) ) {
			$target = $target->{$segment};
		} else {
			return $default_value;
		}
	}

	if ( '' === $target ) {
		return $default_value;
	}

	return $target;
}
