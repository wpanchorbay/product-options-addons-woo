<?php
/**
 * Number Field — Field type for numeric inputs.
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
 * Number field type (with min/max/step).
 *
 * @since 1.0.0
 */
class NumberField extends BaseField {

	/**
	 * Render the browser native `<input type="number">`.
	 *
	 * Reconstructs min, max, and step boundaries into HTML5 constraints.
	 *
	 * @since 1.0.0
	 * @return string HTML <input> string representation.
	 */
	protected function render_input() {
		$attrs = array(
			'type'  => 'number',
			'id'    => $this->get_html_id(),
			'name'  => $this->get_name(),
			'class' => 'ob-input ob-input--number',
		);

		$placeholder = $this->get( 'placeholder' );
		if ( ! empty( $placeholder ) ) {
			$attrs['placeholder'] = esc_attr( $placeholder );
		}

		if ( $this->get( 'required' ) ) {
			$attrs['required'] = 'required';
		}

		$min = $this->get( 'min_value' );
		if ( '' !== $min && null !== $min ) {
			$attrs['min'] = floatval( $min );
		}

		$max = $this->get( 'max_value' );
		if ( '' !== $max && null !== $max ) {
			$attrs['max'] = floatval( $max );
		}

		$step          = $this->get( 'step', 1 );
		$attrs['step'] = floatval( $step );

		$attr_string = '';
		foreach ( $attrs as $key => $val ) {
			$attr_string .= sprintf( ' %s="%s"', esc_attr( $key ), esc_attr( $val ) );
		}

		return '<input' . $attr_string . ' />';
	}

	/**
	 * Validate integer and step rules server-side.
	 *
	 * @since 1.0.0
	 * @param mixed $value Submitted value.
	 * @return true|\WP_Error Validation resolution metric.
	 */
	public function validate( $value ) {
		$result = parent::validate( $value );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		if ( ! $this->is_empty_value( $value ) ) {
			$num = floatval( $value );
			$min = $this->get( 'min_value' );
			$max = $this->get( 'max_value' );

			if ( '' !== $min && null !== $min && $num < floatval( $min ) ) {
				opopw_log( "NumberField Validation: Value {$num} is less than minimum {$min}.", 'WARNING' );
				return new \WP_Error(
					'min_value',
					sprintf(
						/* translators: 1: field label, 2: minimum value */
						__( '%1$s must be at least %2$s.', 'optionbay-product-options-addons-woo' ),
						$this->get( 'label', $this->get( 'id' ) ),
						$min
					)
				);
			}
			if ( '' !== $max && null !== $max && $num > floatval( $max ) ) {
				opopw_log( "NumberField Validation: Value {$num} exceeds maximum {$max}.", 'WARNING' );
				return new \WP_Error(
					'max_value',
					sprintf(
						/* translators: 1: field label, 2: maximum value */
						__( '%1$s must be at most %2$s.', 'optionbay-product-options-addons-woo' ),
						$this->get( 'label', $this->get( 'id' ) ),
						$max
					)
				);
			}
		}

		return true;
	}

	/**
	 * Sanitize numeric content enforcing a strictly float signature.
	 *
	 * @since 1.0.0
	 * @param mixed $value User POST injection.
	 * @return float|string Sanitized float, or empty string if empty.
	 */
	public function sanitize( $value ) {
		if ( $this->is_empty_value( $value ) ) {
			return '';
		}
		return floatval( $value );
	}
}
