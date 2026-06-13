<?php
/**
 * Text Field — Field type for single-line text input.
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
 * Text field type (single line input).
 *
 * @since 1.0.0
 */
class TextField extends BaseField {

	/**
	 * Construct the native HTML `<input type="text">`.
	 *
	 * Translates min/max length criteria directly into HTML bounds.
	 *
	 * @since 1.0.0
	 * @return string Component HTML payload.
	 */
	protected function render_input() {
		$attrs = array(
			'type'  => 'text',
			'id'    => $this->get_html_id(),
			'name'  => $this->get_name(),
			'class' => 'ob-input ob-input--text',
		);

		$placeholder = $this->get( 'placeholder' );
		if ( ! empty( $placeholder ) ) {
			$attrs['placeholder'] = esc_attr( $placeholder );
		}

		if ( $this->get( 'required' ) ) {
			$attrs['required'] = 'required';
		}

		$max_length = $this->get( 'max_length', 0 );
		if ( $max_length > 0 ) {
			$attrs['maxlength'] = absint( $max_length );
		}

		$min_length = $this->get( 'min_length', 0 );
		if ( $min_length > 0 ) {
			$attrs['minlength'] = absint( $min_length );
		}

		$attr_string = '';
		foreach ( $attrs as $key => $val ) {
			$attr_string .= sprintf( ' %s="%s"', esc_attr( $key ), esc_attr( $val ) );
		}

		return '<input' . $attr_string . ' />';
	}

	/**
	 * Perform strict length validation server-side.
	 *
	 * @since 1.0.0
	 * @param mixed $value User POST data.
	 * @return true|\WP_Error
	 */
	public function validate( $value ) {
		$result = parent::validate( $value );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		if ( ! $this->is_empty_value( $value ) ) {
			$max = $this->get( 'max_length', 0 );
			$min = $this->get( 'min_length', 0 );
			$len = mb_strlen( $value );

			if ( $max > 0 && $len > $max ) {
				smart_product_options_addons_log( "TextField Validation: Value length {$len} exceeds maximum {$max}.", 'WARNING' );
					return new \WP_Error(
						'max_length',
						sprintf(
							/* translators: 1: field label, 2: max length */
							__( '%1$s must be at most %2$d characters.', 'smart-product-options-addons' ),
							$this->get( 'label', $this->get( 'id' ) ),
							$max
						)
					);
			}
			if ( $min > 0 && $len < $min ) {
				smart_product_options_addons_log( "TextField Validation: Value length {$len} is less than minimum {$min}.", 'WARNING' );
					return new \WP_Error(
						'min_length',
						sprintf(
							/* translators: 1: field label, 2: min length */
							__( '%1$s must be at least %2$d characters.', 'smart-product-options-addons' ),
							$this->get( 'label', $this->get( 'id' ) ),
							$min
						)
					);
			}
		}

		return true;
	}
}
