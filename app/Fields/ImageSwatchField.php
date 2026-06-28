<?php
/**
 * Image Swatch Field — Field type for picking options via images.
 *
 * @since      1.0.0
 * @package    Opopw
 * @subpackage Opopw/Fields
 */

namespace Opopw\Fields;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Image Swatch field type.
 *
 * Single choice visual picker.
 *
 * @since 1.0.0
 */
class ImageSwatchField extends RadioField {

	/**
	 * Render the image swatch markup.
	 *
	 * @since 1.0.0
	 * @return string HTML fragment.
	 */
	protected function render_input() {
		$options       = $this->get( 'options', array() );
		$required      = $this->get( 'required' ) ? ' required="required"' : '';
		$display_style = $this->get( 'display_style', 'swatch_only' );
		$name          = $this->get_name();
		$html          = sprintf(
			'<div class="opopw-swatch-group opopw-swatch-group--image" data-display-style="%s">',
			esc_attr( $display_style )
		);

		foreach ( $options as $i => $option ) {
			$option_id  = $this->get_html_id() . '-' . $i;
			$price_attr = '';
			$price      = floatval( $option['price'] ?? 0 );
			$price_type = $option['price_type'] ?? 'none';

			if ( $price > 0 ) {
				$price_attr = sprintf(
					' data-price-type="%s" data-price="%s"',
					esc_attr( $price_type ),
					esc_attr( $price )
				);
			}

			$weight = floatval( $option['weight'] ?? 0 );
			if ( $weight > 0 ) {
				$price_attr .= sprintf( ' data-weight="%s"', esc_attr( $weight ) );
			}

			$linked_image_url = $option['linked_image_url'] ?? '';
			if ( ! empty( $linked_image_url ) ) {
				$price_attr .= sprintf( ' data-linked-image="%s"', esc_url( $linked_image_url ) );
			}

			$image_url = esc_url( $option['image_url'] ?? '' );
			$label     = esc_html( $option['label'] ?? '' );

			$price_label_html = $this->format_price_label( $price, $price_type, true );
			$price_label_text = $this->format_price_label( $price, $price_type, false );
			$full_label_text  = $label . $price_label_text;

			$html .= sprintf(
				'<div class="opopw-swatch-option">
					<input type="radio" id="%s" name="%s" value="%s" class="opopw-swatch-input"%s%s />
					<label class="opopw-swatch-label" for="%s" title="%s">
						<span class="opopw-swatch-visual">
							%s
							<span class="opopw-swatch-check"></span>
						</span>
						%s
					</label>
				</div>',
				$option_id,
				$name,
				esc_attr( $option['value'] ?? '' ),
				$price_attr,
				$required,
				$option_id,
				esc_attr( $full_label_text ),
				$image_url ? '<img src="' . $image_url . '" alt="' . $label . '" />' : '<span class="opopw-swatch-placeholder"></span>',
				'swatch_label' === $display_style ? '<span class="opopw-swatch-text">' . $label . $price_label_html . '</span>' : ''
			);
		}

		$html .= '</div>';
		return $html;
	}
}
