<?php
/**
 * Radio Field — Field type for single choice radio buttons.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Fields
 */

namespace SmartProductOptionsAddons\Fields;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Radio button field type (single choice, inline display).
 *
 * @since 1.0.0
 */
class RadioField extends BaseField {

	/**
	 * Render the radio array markup.
	 *
	 * Adds granular `data-*` DOM element pricing properties for each child choice.
	 *
	 * @since 1.0.0
	 * @return string Safe radio group HTML fragment.
	 */
	protected function render_input() {
		$options  = $this->get( 'options', array() );
		$required = $this->get( 'required' ) ? ' required="required"' : '';
		$html     = '<div class="ob-radio-group">';
		$name     = $this->get_name();

		foreach ( $options as $i => $option ) {
			$option_id  = $this->get_html_id() . '-' . $i;
			$price_attr = '';
			$price      = floatval( $option['price'] ?? 0 );
			if ( $price > 0 ) {
				$price_attr = sprintf(
					' data-price-type="%s" data-price="%s"',
					esc_attr( $option['price_type'] ?? 'flat' ),
					esc_attr( $price )
				);
			}
			$weight = floatval( $option['weight'] ?? 0 );
			if ( $weight > 0 ) {
				$price_attr .= sprintf( ' data-weight="%s"', esc_attr( $weight ) );
			}

			$html .= sprintf(
				'<label class="ob-radio-option" for="%s"><input type="radio" id="%s" name="%s" value="%s" class="ob-input ob-input--radio"%s%s /> %s%s</label>',
				$option_id,
				$option_id,
				$name,
				esc_attr( $option['value'] ?? '' ),
				$price_attr,
				$required,
				esc_html( $option['label'] ?? '' ),
				$this->format_price_label( $price, $option['price_type'] ?? 'flat' )
			);
		}

		$html .= '</div>';
		return $html;
	}

	/**
	 * Validates radio input safely protecting against parameter tampering.
	 *
	 * @since 1.0.0
	 * @param mixed $value The selected radio button string.
	 * @return true|\WP_Error Evaluation result.
	 */
	public function validate( $value ) {
		$result = parent::validate( $value );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		if ( ! $this->is_empty_value( $value ) ) {
			$allowed = array_column( $this->get( 'options', array() ), 'value' );
			if ( ! in_array( $value, $allowed, true ) ) {
				opopw_log( "RadioField Validation: Submited value '{$value}' not in allowed set.", 'WARNING' );
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
	 * Get the human-readable label for the selected radio value.
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
	 * Compute shipping weight based on single choice selected element.
	 *
	 * @param mixed $value The chosen element payload string.
	 * @return float The localized specific weight definition.
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
