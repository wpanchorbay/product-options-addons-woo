<?php
/**
 * File Field — Field type for file uploads.
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
 * File upload field type.
 *
 * Uses standard form submission (multipart/form-data) — no AJAX.
 * File processing happens in the cart pipeline (Stage 2).
 *
 * @since 1.0.0
 */
class FileField extends BaseField {

	/**
	 * Render standard HTML `<input type="file">`.
	 *
	 * Extensively limits submission capabilities based on backend settings
	 * by locking MIME/Extension types into HTML5 accept properties.
	 *
	 * @since 1.0.0
	 * @return string File input DOM tree.
	 */
	protected function render_input() {
		$allowed_types = $this->get( 'allowed_types', '.jpg,.png,.pdf' );
		$max_file_size = absint( $this->get( 'max_file_size', 5 ) ); // MB
		$required      = $this->get( 'required' ) ? ' required="required"' : '';

		return sprintf(
			'<input type="file" id="%s" name="%s" class="ob-input ob-input--file" accept="%s" data-max-size="%d"%s />
			<p class="ob-field__file-info">%s</p>',
			$this->get_html_id(),
			$this->get_name(),
			esc_attr( $allowed_types ),
			$max_file_size,
			$required,
			sprintf(
				/* translators: %1$s: allowed types, %2$d: max size in MB */
				esc_html__( 'Allowed: %1$s. Max size: %2$d MB.', 'smart-product-options-addons' ),
				esc_html( $allowed_types ),
				$max_file_size
			)
		);
	}

	/**
	 * Verify incoming $_FILES data buffer block size and extensions.
	 *
	 * @since 1.0.0
	 * @param mixed $value PHP superglobal upload hash.
	 * @return true|\WP_Error Results object mapping.
	 */
	public function validate( $value ) {
		// For file fields, $value is the $_FILES entry
		if ( $this->get( 'required' ) && ( empty( $value ) || empty( $value['name'] ) ) ) {
			smart_product_options_addons_log( 'FileField Validation: Required file payload missing.', 'WARNING' );
			return new \WP_Error(
				'required_field',
				sprintf(
					/* translators: %s: field label */
					__( '%s is required.', 'smart-product-options-addons' ),
					$this->get( 'label', $this->get( 'id' ) )
				)
			);
		}

		if ( ! empty( $value ) && ! empty( $value['name'] ) ) {
			// Check file size
			$max_bytes = absint( $this->get( 'max_file_size', 5 ) ) * 1024 * 1024;
			if ( $value['size'] > $max_bytes ) {
				smart_product_options_addons_log( "FileField Validation: Uploaded file size {$value['size']} exceeds max bytes {$max_bytes}.", 'WARNING' );
				return new \WP_Error(
					'file_too_large',
					sprintf(
						/* translators: 1: file label, 2: max size in MB */
						__( '%1$s exceeds the maximum file size of %2$d MB.', 'smart-product-options-addons' ),
						$this->get( 'label', $this->get( 'id' ) ),
						$this->get( 'max_file_size', 5 )
					)
				);
			}

			// Check MIME type
			$allowed      = $this->get( 'allowed_types', '.jpg,.png,.pdf' );
			$allowed_exts = array_map( 'trim', explode( ',', $allowed ) );
			$ext          = '.' . strtolower( pathinfo( $value['name'], PATHINFO_EXTENSION ) );
			if ( ! in_array( $ext, $allowed_exts, true ) ) {
				smart_product_options_addons_log( "FileField Validation: Uploaded extension {$ext} not in allowed parameters ({$allowed}).", 'WARNING' );
				return new \WP_Error(
					'invalid_file_type',
					sprintf(
						/* translators: 1: file label, 2: allowed extensions */
						__( '%1$s: File type not allowed. Allowed: %2$s', 'smart-product-options-addons' ),
						$this->get( 'label', $this->get( 'id' ) ),
						$allowed
					)
				);
			}
		}

		return true;
	}

	/**
	 * Sanitize file-based values.
	 *
	 * @since 1.0.0
	 * @param mixed $value The value to sanitize.
	 * @return mixed Sanitized value.
	 */
	public function sanitize( $value ) {
		// File sanitization happens in the cart pipeline
		return $value;
	}

	/**
	 * Provide basic proxying functionality back to the base.
	 * Files are processed asynchronously.
	 *
	 * @param mixed $value Output location URL string or associative array metadata.
	 * @return string Simple frontend label URL element content.
	 */
	public function get_display_value( $value ) {
		if ( is_string( $value ) ) {
			return esc_html( basename( $value ) );
		}
		if ( is_array( $value ) && ! empty( $value['name'] ) ) {
			return esc_html( $value['name'] );
		}
		return '';
	}
}
