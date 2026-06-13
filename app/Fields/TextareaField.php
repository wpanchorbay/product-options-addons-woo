<?php
/**
 * Textarea Field — Field type for multi-line text input.
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
 * Textarea field type (multi-line input).
 *
 * @since 1.0.0
 */
class TextareaField extends BaseField {

	/**
	 * Render the standard HTML `<textarea>`.
	 *
	 * Translates length configurations into HTML5 limits.
	 *
	 * @since 1.0.0
	 * @return string Component HTML markup.
	 */
	protected function render_input() {
		$placeholder    = esc_attr( $this->get( 'placeholder' ) );
		$required       = $this->get( 'required' ) ? ' required="required"' : '';
		$max_length     = $this->get( 'max_length', 0 );
		$maxlength_attr = $max_length > 0 ? sprintf( ' maxlength="%d"', absint( $max_length ) ) : '';

		return sprintf(
			'<textarea id="%s" name="%s" class="ob-input ob-input--textarea" rows="4" placeholder="%s"%s%s></textarea>',
			$this->get_html_id(),
			$this->get_name(),
			$placeholder,
			$required,
			$maxlength_attr
		);
	}

	/**
	 * Format longform text content securely.
	 *
	 * @param mixed $value The string submission.
	 * @return string Filtered textbox text.
	 */
	public function sanitize( $value ) {
		return sanitize_textarea_field( $value );
	}

	/**
	 * Run checks on length enforcement limitations.
	 *
	 * @since 1.0.0
	 * @param mixed $value User inputted long string.
	 * @return true|\WP_Error Validation array format.
	 */
	public function validate( $value ) {
		$result = parent::validate( $value );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		if ( ! $this->is_empty_value( $value ) ) {
			$max = $this->get( 'max_length', 0 );
			if ( $max > 0 && mb_strlen( $value ) > $max ) {
				smart_product_options_addons_log( "TextareaField Validation: Value length exceeds maximum {$max}.", 'WARNING' );
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
		}

		return true;
	}
}
