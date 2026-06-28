<?php
/**
 * Select Field — Field type for dropdown selections.
 *
 * @since      1.0.0
 * @package    Opopw
 * @subpackage Opopw/Fields
 */

namespace Opopw\Fields;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Select (dropdown) field type.
 *
 * @since 1.0.0
 */
class SelectField extends BaseField {

	/**
	 * Render the HTML <select> dropdown.
	 *
	 * Adds granular `data-*` pricing properties onto `<option>` elements
	 * to allow dynamic JS re-calculation when selection changes.
	 *
	 * @since 1.0.0
	 * @return string Re-usable dropdown HTML string.
	 */
	protected function render_input() {
		$required = $this->get( 'required' ) ? ' required="required"' : '';
		$options  = $this->get( 'options', array() );

		$html = sprintf(
			'<select id="%s" name="%s" class="opopw-input opopw-input--select"%s>',
			$this->get_html_id(),
			$this->get_name(),
			$required
		);

		// Placeholder option
		$placeholder = $this->get( 'placeholder' );
		if ( ! empty( $placeholder ) ) {
			$html .= sprintf( '<option value="">%s</option>', esc_html( $placeholder ) );
		} else {
			$html .= sprintf( '<option value="">%s</option>', esc_html__( 'Choose an option...', 'optionbay-product-options-addons-woo' ) );
		}

		foreach ( $options as $option ) {
			$price_attr = '';
			$price_type = $option['price_type'] ?? 'flat';
			$price      = floatval( $option['price'] ?? 0 );
			if ( $price > 0 ) {
				$price_attr = sprintf(
					' data-price-type="%s" data-price="%s"',
					esc_attr( $price_type ),
					esc_attr( $price )
				);
			}
			$weight = floatval( $option['weight'] ?? 0 );
			if ( $weight > 0 ) {
				$price_attr .= sprintf( ' data-weight="%s"', esc_attr( $weight ) );
			}

			$linked_image_url = $option['linked_image_url'] ?? '';
			if ( ! empty( $linked_image_url ) ) {
				$price_attr .= sprintf( ' data-linked-image="%s"', esc_url( $linked_image_url ) );
			}

			$html .= sprintf(
				'<option value="%s"%s>%s%s</option>',
				esc_attr( $option['value'] ?? '' ),
				$price_attr,
				esc_html( $option['label'] ?? '' ),
				$this->format_price_label( $price, $price_type, false )
			);
		}

		$html .= '</select>';
		return $html;
	}

	/**
	 * Validate against bounded allowed select options.
	 *
	 * @since 1.0.0
	 * @param mixed $value The selected subset value string.
	 * @return true|\WP_Error Validation results.
	 */
	public function validate( $value ) {
		$result = parent::validate( $value );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		// Validate against allowed options
		if ( ! $this->is_empty_value( $value ) ) {
			$allowed = array_column( $this->get( 'options', array() ), 'value' );
			if ( ! in_array( $value, $allowed, true ) ) {
				opopw_log( "SelectField Validation: Submited value '{$value}' not in allowed options set.", 'WARNING' );
					return new \WP_Error(
						'invalid_option',
						sprintf(
							/* translators: %s: field label */
							__( 'Invalid selection for %s.', 'optionbay-product-options-addons-woo' ),
							$this->get( 'label', $this->get( 'id' ) )
						)
					);
			}
		}

		return true;
	}

	/**
	 * Get the human-readable label for the selected dropdown value.
	 *
	 * @since 1.0.0
	 * @param mixed $value The selected value.
	 * @return string The selected label.
	 */
	public function get_display_value( $value ) {
		$options = $this->get( 'options', array() );
		foreach ( $options as $option ) {
			if ( ( $option['value'] ?? '' ) === $value ) {
				return esc_html( $option['label'] ?? $value );
			}
		}
		return esc_html( (string) $value );
	}

	/**
	 * Lookup and evaluate base shipping weight per configured option element.
	 *
	 * @param mixed $value The active selection.
	 * @return float Option-defined weight schema string or offset.
	 */
	public function get_weight( $value ) {
		$options = $this->get( 'options', array() );
		foreach ( $options as $option ) {
			if ( ( $option['value'] ?? '' ) === $value ) {
				return floatval( $option['weight'] ?? 0 );
			}
		}
		return 0.0;
	}
}
