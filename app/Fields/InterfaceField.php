<?php
/**
 * Interface Field — Definition of the field contract.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Fields
 */

namespace SmartProductOptionsAddons\Fields;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Interface for all field types.
 *
 * Every field type must implement these methods to participate
 * in the rendering, validation, and pricing pipeline.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Fields
 */
interface InterfaceField {

	/**
	 * Render the field HTML.
	 *
	 * @since 1.0.0
	 * @return string HTML output.
	 */
	public function render();

	/**
	 * Validate a submitted value.
	 *
	 * @since 1.0.0
	 * @param mixed $value The submitted value.
	 * @return true|\WP_Error True if valid, WP_Error if not.
	 */
	public function validate( $value );

	/**
	 * Sanitize a submitted value for storage.
	 *
	 * @since 1.0.0
	 * @param mixed $value The raw value.
	 * @return mixed Sanitized value.
	 */
	public function sanitize( $value );

	/**
	 * Get a human-readable display value for cart/order display.
	 *
	 * @since 1.0.0
	 * @param mixed $value The stored value.
	 * @return string Display-ready string.
	 */
	public function get_display_value( $value );

	/**
	 * Get the weight adjustment for this field's value.
	 *
	 * @since 1.0.0
	 * @param mixed $value The stored value.
	 * @return float Weight in shop units.
	 */
	public function get_weight( $value );
}
