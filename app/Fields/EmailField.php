<?php
/**
 * Email Field — Field type for email addresses.
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
 * Email field type.
 *
 * @since 1.0.0
 */
class EmailField extends TextField {

	/**
	 * Construct the native HTML `<input type="email">`.
	 *
	 * @since 1.0.0
	 * @return string Component HTML payload.
	 */
	protected function render_input() {
		$attrs = array(
			'type'  => 'email',
			'id'    => $this->get_html_id(),
			'name'  => $this->get_name(),
			'class' => 'ob-input ob-input--email',
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
	 * Perform email format validation.
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

		if ( ! $this->is_empty_value( $value ) && ! is_email( $value ) ) {
			opopw_log( sprintf( 'EmailField Validation: Invalid email address "%s" submitted.', $value ), 'WARNING' );
			return new \WP_Error(
				'invalid_email',
				sprintf(
					/* translators: %s: field label */
					__( '%s must be a valid email address.', 'optionbay-product-options-addons-woo' ),
					$this->get( 'label', $this->get( 'id' ) )
				)
			);
		}

		return true;
	}
}
