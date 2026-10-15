<?php
/**
 * Divider Field — a presentational horizontal rule.
 *
 * @since      1.0.3
 * @package    Opopw
 * @subpackage Opopw/Fields
 */

namespace Opopw\Fields;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Separator / divider field type.
 *
 * Presentational only: it submits no value, so it never reaches the cart
 * (add_cart_item_data() skips null/empty values) and can never be priced,
 * stocked, required, or used as a conditional-logic trigger.
 *
 * @since 1.0.3
 */
class DividerField extends BaseField {

	/**
	 * Generate the separator markup.
	 *
	 * @since 1.0.3
	 * @return string
	 */
	protected function render_input() {
		return '<hr class="opopw-divider" />';
	}

	/**
	 * Presentational fields are always valid.
	 *
	 * Belt-and-braces against a stray `required` flag on a field the customer
	 * has no way to fill in, which would otherwise block add-to-cart forever.
	 *
	 * @since 1.0.3
	 * @param mixed $value Unused.
	 * @return true
	 */
	public function validate( $value ) {
		return true;
	}

	/**
	 * Presentational fields contribute nothing to the cart.
	 *
	 * @since 1.0.3
	 * @param mixed $value Unused.
	 * @return string
	 */
	public function get_display_value( $value ) {
		return '';
	}
}
