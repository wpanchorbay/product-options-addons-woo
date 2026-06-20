<?php
/**
 * Pricing Engine — Orchestrates the calculation of add-on prices using various strategies.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Pricing
 */

namespace SmartProductOptionsAddons\Pricing;

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
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Pricing
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

		if ( ! array_key_exists( $type, self::$strategies ) ) {
			opopw_log( "Pricing Engine: Unknown strategy '{$type}'. Falling back to 'flat'.", 'WARNING' );
			$type = 'flat';
		}

		$class = self::$strategies[ $type ];
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
		if ( 'none' === $type || 0.0 === $configured_amount ) {
			opopw_log( "Pricing Engine: Type 'none' or amount 0. Price delta is 0.", 'DEBUG' );
			return 0.0;
		}

		$strategy = self::get_strategy( $type );
		$result   = $strategy->calculate( $base_price, $configured_amount, $field_value, $quantity, $config );

		opopw_log( "Pricing Engine: Calculated {$result} via {$type} strategy.", 'DEBUG' );

		return $result;
	}
}
