<?php
/**
 * Pricing Engine — Orchestrates the calculation of add-on prices using various strategies.
 *
 * @since      1.0.0
 * @package    Opopw
 * @subpackage Opopw/Pricing
 */

namespace Opopw\Pricing;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Pricing Engine
 *
 * Resolves the correct pricing strategy and executes it.
 *
 * @since      1.0.0
 * @package    Opopw
 * @subpackage Opopw/Pricing
 */
class PricingEngine {

	/**
	 * Map of string types to Strategy classes.
	 *
	 * @var array
	 */
	private static $strategies = array(
		'flat'       => FlatFeeStrategy::class,
		'percentage' => PercentageStrategy::class,
	);

	/**
	 * Get the instantiated strategy object.
	 *
	 * Maps a string identifier to a concrete Strategy class using a static lookup table.
	 *
	 * @since 1.0.0
	 * @param string $type The requested pricing type identifier.
	 * @return PricingStrategy The instantiated strategy object.
	 */
	public static function get_strategy( string $type ) {
		$type = $type ? $type : 'flat';

		/**
		 * Filter the map of pricing-strategy identifiers to strategy classes.
		 *
		 * Allows the Pro add-on to register additional strategies such as
		 * 'formula' or 'character_count' without editing Free.
		 *
		 * @since 1.0.2
		 * @param array $strategies Map of type => fully-qualified strategy class name.
		 */
		$strategies = apply_filters( 'opopw_pricing_strategies', self::$strategies );

		if ( ! array_key_exists( $type, $strategies ) ) {
			opopw_log( "Pricing Engine: Unknown strategy '{$type}'. Falling back to 'flat'.", 'WARNING' );
			$type = 'flat';
		}

		$class = $strategies[ $type ];
		return new $class();
	}

	/**
	 * Calculate the price for a given field and value.
	 *
	 * Determines the appropriate pricing strategy based on user configuration
	 * and executes the correct mathematical operation against the product base price.
	 *
	 * @since 1.0.0
	 * @param string $type              The price type (e.g. 'flat', 'percentage').
	 * @param float  $base_price        Product base price from WooCommerce.
	 * @param float  $configured_amount Amount configured in the option schema.
	 * @param mixed  $field_value       The value submitted by the customer.
	 * @param int    $quantity          Cart item quantity.
	 * @param array  $config            Field schema configuration.
	 * @return float The calculated delta to be added to the product price.
	 */
	public static function calculate( string $type, float $base_price, float $configured_amount, $field_value, int $quantity, array $config = array() ) {
		if ( 'none' === $type ) {
			opopw_log( "Pricing Engine: Type 'none'. Price delta is 0.", 'DEBUG' );
			return 0.0;
		}

		// The amount-based short-circuit only applies to strategies whose delta is
		// driven by the configured amount (flat/percentage). Strategies like the
		// Pro 'formula' type legitimately carry an empty configured amount and must
		// still run, so they are exempt from this early return.
		$amount_based = apply_filters( 'opopw_amount_based_price_types', array( 'flat', 'percentage' ) );
		if ( in_array( $type, $amount_based, true ) && 0.0 === $configured_amount ) {
			opopw_log( "Pricing Engine: Amount-based type '{$type}' with amount 0. Price delta is 0.", 'DEBUG' );
			return 0.0;
		}

		// An unregistered type charges nothing, mirroring the client's
		// `opopw_frontend_price_delta` fallback in assets/js/frontend.js.
		//
		// get_strategy() falls back to 'flat', which is confidently wrong: a
		// field saved with a Pro type such as 'character_count' would, once Pro
		// is deactivated, bill its per-character amount as a single flat fee at
		// checkout while the product page showed no charge at all. Silently
		// charging a number nobody configured is worse than charging nothing.
		$registered = apply_filters( 'opopw_pricing_strategies', self::$strategies );
		if ( ! array_key_exists( $type, $registered ) ) {
			opopw_log( "Pricing Engine: Unregistered type '{$type}'. Price delta is 0.", 'WARNING' );
			return 0.0;
		}

		$strategy = self::get_strategy( $type );
		$result   = $strategy->calculate( $base_price, $configured_amount, $field_value, $quantity, $config );

		opopw_log( "Pricing Engine: Calculated {$result} via {$type} strategy.", 'DEBUG' );

		return $result;
	}
}
