<?php
/**
 * Static Content Field — renders rich text content directly onto the product page.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Fields
 */

namespace SmartProductOptionsAddons\Fields;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Output rich HTML context.
 *
 * It does not render inputs, but provides raw HTML content.
 * Wrapper and label handling is managed by the base class.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Fields
 */
class StaticContentField extends BaseField {

	/**
	 * Generate the static HTML content.
	 *
	 * This satisfies the abstract requirement from BaseField.
	 * The output is rendered inside the standard field input wrapper.
	 *
	 * @since 1.0.0
	 * @return string
	 */
	protected function render_input() {
		$content = $this->get( 'content', '' );
		return sprintf(
			'<div class="ob-static-content">%s</div>',
			wp_kses_post( $content )
		);
	}
}
