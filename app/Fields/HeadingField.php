<?php
/**
 * Heading Field — a presentational section heading.
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
 * Heading field type.
 *
 * Presentational only — see DividerField. The heading level is configurable
 * because a WooCommerce product page already owns an <h1> and several <h2>s;
 * hardcoding a level would break the document outline and is an accessibility
 * regression.
 *
 * @since 1.0.3
 */
class HeadingField extends BaseField {

	/**
	 * Heading levels this field may render.
	 *
	 * Re-checked here rather than trusting the stored value: the REST gates
	 * only constrain data written through the API, and a schema can also
	 * arrive from the importer or from a Pro filter.
	 *
	 * @since 1.0.3
	 * @var array
	 */
	const ALLOWED_LEVELS = array( 'h2', 'h3', 'h4', 'h5' );

	/**
	 * Generate the heading markup.
	 *
	 * @since 1.0.3
	 * @return string
	 */
	protected function render_input() {
		$level = strtolower( (string) $this->get( 'heading_level', 'h3' ) );
		if ( ! in_array( $level, self::ALLOWED_LEVELS, true ) ) {
			$level = 'h3';
		}

		$text = $this->get( 'label', '' );
		if ( '' === $text ) {
			return '';
		}

		return sprintf(
			'<%1$s class="opopw-heading">%2$s</%1$s>',
			esc_attr( $level ),
			esc_html( $text )
		);
	}

	/**
	 * Presentational fields are always valid.
	 *
	 * @since 1.0.3
	 * @param mixed $value Unused.
	 * @return true
	 */
	public function validate( $value ) {
		return true;
	}

	/**
	 * Presentational fields contribute nothing to the cart.
	 *
	 * @since 1.0.3
	 * @param mixed $value Unused.
	 * @return string
	 */
	public function get_display_value( $value ) {
		return '';
	}
}
