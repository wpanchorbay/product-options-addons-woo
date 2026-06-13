<?php
/**
 * Character Count Pricing Strategy — Multiplies cost by the length of the submitted text.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Pricing
 */

namespace SmartProductOptionsAddons\Pricing;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Character Count Pricing Strategy
 *
 * Multiplies the configured amount by the number of characters in the user input.
 *
 * @since 1.0.0
 */
class CharacterCountStrategy implements PricingStrategy {

	/**
	 * Calculate the price delta.
	 *
	 * @since 1.0.0
	 * @param float $base_price Product base price.
	 * @param float $amount     Configured price per character.
	 * @param mixed $value      The submitted text.
	 * @param int   $quantity   Cart item quantity.
	 * @param array $config     Field schema configuration.
	 * @return float Total calculated cost.
	 */
	public function calculate( float $base_price, float $amount, $value, int $quantity, array $config = array() ) {
		$len = mb_strlen( (string) $value );
		smart_product_options_addons_log( "CharacterCountStrategy: String length: {$len}, rate per character: {$amount}. Delta: " . ( $len * $amount ), 'DEBUG' );
		return $len * $amount;
	}
}
