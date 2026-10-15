<?php
/**
 * Telephone Field — Field type for phone numbers.
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
 * Telephone field type.
 *
 * `<input type="tel">` deliberately enforces no format in the HTML spec —
 * it buys a numeric keypad on mobile and nothing else. Validation here is
 * therefore permissive on purpose: a strict pattern would reject
 * "+44 20 7946 0958" or "(555) 123-4567", and wrongly rejecting a valid
 * international number is the only failure mode that generates support
 * tickets.
 *
 * @since 1.0.3
 */
class TelField extends TextField {

	/**
	 * Characters a phone number may contain, beyond digits.
	 *
	 * @since 1.0.3
	 * @var string
	 */
	const ALLOWED_PATTERN = '/^[0-9+\-().\s]+$/';

	/**
	 * Construct the native HTML `<input type="tel">`.
	 *
	 * @since 1.0.3
	 * @return string Component HTML payload.
	 */
	protected function render_input() {
		$attrs = array(
			'type'  => 'tel',
			'id'    => $this->get_html_id(),
			'name'  => $this->get_name(),
			'class' => 'opopw-input opopw-input--tel',
		);

		$placeholder = $this->get( 'placeholder' );
		if ( ! empty( $placeholder ) ) {
			$attrs['placeholder'] = esc_attr( $placeholder );
		}

		if ( $this->get( 'required' ) ) {
			$attrs['required'] = 'required';
		}

		$max_length         = $this->get( 'max_length', 0 );
		$attrs['maxlength'] = $max_length > 0 ? absint( $max_length ) : 32;

		$attr_string = '';
		foreach ( $attrs as $key => $val ) {
			$attr_string .= sprintf( ' %s="%s"', esc_attr( $key ), esc_attr( $val ) );
		}

		return '<input' . $attr_string . ' />';
	}

	/**
	 * Validate the submitted phone number permissively.
	 *
	 * @since 1.0.3
	 * @param mixed $value User POST data.
	 * @return true|\WP_Error
	 */
	public function validate( $value ) {
		$result = parent::validate( $value );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		if ( $this->is_empty_value( $value ) ) {
			return true;
		}

		$phone = trim( (string) $value );

		// Require at least one digit, and nothing outside the allowed set.
		if ( ! preg_match( self::ALLOWED_PATTERN, $phone ) || ! preg_match( '/[0-9]/', $phone ) ) {
			opopw_log( sprintf( 'TelField Validation: Rejected phone number "%s".', $phone ), 'WARNING' );
			return new \WP_Error(
				'invalid_phone',
				sprintf(
					/* translators: %s: field label */
					__( '%s must be a valid phone number.', 'optionbay-product-options-addons-woo' ),
					$this->get( 'label', $this->get( 'id' ) )
				)
			);
		}

		return true;
	}
}
