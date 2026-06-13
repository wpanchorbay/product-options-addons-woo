<?php
/**
 * Formula Pricing Strategy — Calculates price based on a user-defined formula.
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
 * Formula Pricing Strategy
 *
 * Evaluates a mathematical string with placeholders like [char_count].
 *
 * @since 1.0.0
 */
class FormulaStrategy implements PricingStrategy {

	/**
	 * Calculate the price delta.
	 *
	 * @since 1.0.0
	 * @param float $base_price        Product base price.
	 * @param float $configured_amount Not used for formula (placeholder for interface).
	 * @param mixed $field_value       The submitted value.
	 * @param int   $quantity          Cart item quantity.
	 * @param array $config            Field schema containing the 'formula' key.
	 * @return float Calculated cost.
	 */
	public function calculate( float $base_price, float $configured_amount, $field_value, int $quantity, array $config = array() ) {
		$formula = $config['formula'] ?? '';

		if ( empty( $formula ) ) {
			return 0.0;
		}

		$char_count = mb_strlen( (string) $field_value );
		$val_num    = is_numeric( $field_value ) ? (float) $field_value : 0;

		$expr = str_replace(
			array( '[char_count]', '[base_price]', '[price]', '[quantity]', '[value]' ),
			array( $char_count, $base_price, $base_price, $quantity, $val_num ),
			$formula
		);

		// Basic safety: allow only numbers, operators, and spaces
		$expr = preg_replace( '/[^0-9\+\-\*\/\.\(\) ]/', '', $expr );

		// Prevent division by zero
		if ( preg_match( '/\/0(?![0-9\.\(])/', $expr ) ) {
			smart_product_options_addons_log( "FormulaStrategy: Division by zero detected in '{$expr}'", 'WARNING' );
			return 0.0;
		}

		// Evaluate using MathParser
		try {
			$parser    = new \MathParser\StdMathParser();
			$ast       = $parser->parse( $expr );
			$evaluator = new \MathParser\Interpreting\Evaluator();
			$result    = $ast->accept( $evaluator );
			smart_product_options_addons_log( sprintf( 'FormulaStrategy: Formula "%s" evaluated to %f (expr: "%s").', $formula, $result, $expr ), 'DEBUG' );
			return (float) $result;
		} catch ( \Exception $e ) {
			smart_product_options_addons_log( "FormulaStrategy: Error evaluating formula '{$formula}': " . $e->getMessage(), 'ERROR' );
			return 0.0;
		}
	}
}
