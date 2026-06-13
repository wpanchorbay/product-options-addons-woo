<?php
/**
 * Reusable functions.
 *
 * @package    SmartProductOptionsAddons
 * @since      1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! function_exists( 'smart_product_options_addons_log' ) ) {
	/**
	 * Log messages to the debug log file.
	 *
	 * @param mixed  $message  The message to log.
	 * @param string $level    The log level (e.g., 'DEBUG', 'INFO', 'ERROR').
	 * @return void
	 */
	function smart_product_options_addons_log( $message, $level = 'INFO' ) {
		$enable_logging = SmartProductOptionsAddons\Core\Settings::get_instance()->get_settings( 'debug_enableMode' );
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
		$logger->log( $wc_level, $formatted_message, array( 'source' => 'smart-product-options-addons' ) );
	}
}


if ( ! function_exists( 'smart_product_options_addons_get_value' ) ) {
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
	function smart_product_options_addons_get_value( $target, $key, $default_value = null ) {
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
}
