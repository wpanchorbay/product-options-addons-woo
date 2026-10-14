<?php
/**
 * URL Field — Field type for web addresses.
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
 * URL field type.
 *
 * @since 1.0.3
 */
class UrlField extends TextField {

	/**
	 * Schemes accepted by this field.
	 *
	 * Deliberately narrow. esc_url_raw() alone would happily pass a
	 * `javascript:` URL through to the cart, the order emails and the admin
	 * order screen, where it is rendered as a clickable link.
	 *
	 * @since 1.0.3
	 * @var array
	 */
	const ALLOWED_SCHEMES = array( 'http', 'https' );

	/**
	 * Construct the native HTML `<input type="url">`.
	 *
	 * @since 1.0.3
	 * @return string Component HTML payload.
	 */
	protected function render_input() {
		$attrs = array(
			'type'  => 'url',
			'id'    => $this->get_html_id(),
			'name'  => $this->get_name(),
			'class' => 'opopw-input opopw-input--url',
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

		$attr_string = '';
		foreach ( $attrs as $key => $val ) {
			$attr_string .= sprintf( ' %s="%s"', esc_attr( $key ), esc_attr( $val ) );
		}

		return '<input' . $attr_string . ' />';
	}

	/**
	 * Validate that the submitted value is a well-formed http(s) URL.
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

		$url    = trim( (string) $value );
		$scheme = strtolower( (string) wp_parse_url( $url, PHP_URL_SCHEME ) );

		if ( ! filter_var( $url, FILTER_VALIDATE_URL ) || ! in_array( $scheme, self::ALLOWED_SCHEMES, true ) ) {
			opopw_log( sprintf( 'UrlField Validation: Rejected URL "%s".', $url ), 'WARNING' );
			return new \WP_Error(
				'invalid_url',
				sprintf(
					/* translators: %s: field label */
					__( '%s must be a valid URL starting with http:// or https://.', 'optionbay-product-options-addons-woo' ),
					$this->get( 'label', $this->get( 'id' ) )
				)
			);
		}

		return true;
	}

	/**
	 * Sanitize the submitted URL.
	 *
	 * @since 1.0.3
	 * @param mixed $value The value to sanitize.
	 * @return string
	 */
	public function sanitize( $value ) {
		return esc_url_raw( trim( (string) $value ), self::ALLOWED_SCHEMES );
	}
}
