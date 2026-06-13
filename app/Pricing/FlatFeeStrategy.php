<?php
/**
 * Flat Fee Pricing Strategy — Adds a fixed amount to the product price.
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
 * Flat Fee Pricing Strategy
 *
 * A simple addition of a fixed cost to the product base price.
 *
 * @since 1.0.0
 */
class FlatFeeStrategy implements PricingStrategy {

	/**
	 * Calculate the price delta.
	 *
	 * @since 1.0.0
	 * @param float $base_price Product base price.
	 * @param float $amount     Fixed fee amount.
	 * @param mixed $value      Submitted field value.
	 * @param int   $quantity   Cart item quantity.
	 * @param array $config     Field schema configuration.
	 * @return float The fixed fee.
	 */
	public function calculate( float $base_price, float $amount, $value, int $quantity, array $config = array() ) {
		smart_product_options_addons_log( "FlatFeeStrategy: Configured flat fee amount: {$amount}", 'DEBUG' );
		return $amount;
	}
}
