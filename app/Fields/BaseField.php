<?php
/**
 * Abstract base class for all field types.
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
 * Base field class.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Fields
 */
abstract class BaseField implements InterfaceField {

	/**
	 * The group ID this field belongs to.
	 *
	 * @since 1.0.0
	 * @var int
	 */
	protected $group_id;

	/**
	 * The field schema definition (decoded from JSON).
	 *
	 * @since 1.0.0
	 * @var array
	 */
	protected $schema;

	/**
	 * Constructor.
	 *
	 * @since 1.0.0
	 * @param int   $group_id The Option Group post ID.
	 * @param array $schema   The field definition from the JSON schema.
	 */
	public function __construct( int $group_id, array $schema ) {
		$this->group_id = $group_id;
		$this->schema   = $schema;
	}

	/**
	 * Get a schema property with a default fallback.
	 *
	 * @since 1.0.0
	 * @param string $key           The property key.
	 * @param mixed  $default_value Default value.
	 * @return mixed
	 */
	protected function get( $key, $default_value = '' ) {
		return $this->schema[ $key ] ?? $default_value;
	}

	/**
	 * Get the HTML input name attribute.
	 *
	 * Format: smart_product_options_addons_addons[{group_id}][{field_id}]
	 *
	 * @since 1.0.0
	 * @return string
	 */
	protected function get_name() {
		return sprintf(
			'smart_product_options_addons_addons[%d][%s]',
			$this->group_id,
			esc_attr( $this->get( 'id' ) )
		);
	}

	/**
	 * Get the unique HTML element ID.
	 *
	 * @since 1.0.0
	 * @return string
	 */
	protected function get_html_id() {
		return sprintf( 'ob-%d-%s', $this->group_id, esc_attr( $this->get( 'id' ) ) );
	}

	/**
	 * Render the full field HTML (wrapper + label + input + description).
	 *
	 * Builds out the container standard across all Smart Product Options and Addons fields, configuring
	 * HTML `data-*` attributes for JavaScript processing based on pricing and conditions.
	 * Callers like AddonRenderer rely on this abstract layout instead of ad-hoc rendering.
	 *
	 * @since 1.0.0
	 * @return string The escaped safe HTML ready for output buffering.
	 */
	public function render() {
		$field_id   = esc_attr( $this->get( 'id' ) );
		$field_type = esc_attr( $this->get( 'type' ) );
		$conditions = $this->get( 'conditions', array() );
		$class_name = esc_attr( $this->get( 'class_name' ) );

		// Determine initial visibility from conditions to prevent sudden layout shifts
		$is_hidden = false;
		if ( ! empty( $conditions['status'] ) && 'active' === $conditions['status'] ) {
			// If action is 'show', field is hidden by default until condition is met
			// If action is 'hide', field is visible by default until condition is met
			$is_hidden = ( 'show' === $conditions['action'] );
		}

		// Initialize HTML container classes
		$wrapper_classes   = array( 'ob-field' );
		$wrapper_classes[] = 'ob-field--' . $field_type;
		if ( $is_hidden ) {
			$wrapper_classes[] = 'ob-hidden';
		}
		if ( ! empty( $class_name ) ) {
			$wrapper_classes[] = $class_name;
		}

		// Build identifying data attributes for the client JS engine
		$data_attrs = sprintf(
			'data-field-id="%s" data-group-id="%d" data-field-type="%s"',
			$field_id,
			$this->group_id,
			$field_type
		);

		// Expose pricing logic mapping strictly onto the DOM
		$price_type = $this->get( 'price_type', 'none' );
		if ( 'none' !== $price_type ) {
			$data_attrs .= sprintf(
				' data-price-type="%s" data-price="%s"',
				esc_attr( $price_type ),
				esc_attr( $this->get( 'price', 0 ) )
			);
		}

		// Calculate standard weight offset configuration
		$weight = floatval( $this->get( 'weight', 0 ) );
		if ( $weight > 0 ) {
			$data_attrs .= sprintf( ' data-weight="%s"', esc_attr( $weight ) );
		}

		// Tag conditional logic rules for the frontend client SPA event loops
		if ( ! empty( $conditions['status'] ) && 'active' === $conditions['status'] ) {
			$data_attrs .= sprintf(
				' data-condition-status="active" data-condition-action="%s"',
				esc_attr( $conditions['action'] ?? 'show' )
			);
		}

		$html = sprintf(
			'<div class="%s" %s>',
			esc_attr( implode( ' ', $wrapper_classes ) ),
			$data_attrs
		);

		// Dynamically render label HTML safely escaping user settings
		// Skip wrapper label for single_checkbox (label is on the toggle itself)
		// and heading fields (content is rendered directly)
		$label = $this->get( 'label' );
		if ( ! empty( $label ) && ! in_array( $field_type, array( 'single_checkbox', 'heading', 'static_content' ), true ) ) {
			$price_label   = $this->format_price_label( $this->get( 'price', 0 ), $this->get( 'price_type', 'none' ) );
			$required_mark = $this->get( 'required' ) ? ' <abbr class="ob-required" title="' . esc_attr__( 'required', 'smart-product-options-addons' ) . '">*</abbr>' : '';
			$html         .= sprintf(
				'<label class="ob-field__label" for="%s">%s%s%s</label>',
				$this->get_html_id(),
				esc_html( $label ),
				$price_label,
				$required_mark
			);
		}

		// Render the abstract control content handled by the concrete subclass
		$html .= '<div class="ob-field__input">';
		$html .= $this->render_input();
		$html .= '</div>';

		// Inject any custom user descriptions passed via settings
		$description = $this->get( 'description' );
		if ( ! empty( $description ) ) {
			$html .= sprintf(
				'<p class="ob-field__description">%s</p>',
				esc_html( $description )
			);
		}

		$html .= '</div>';

		return $html;
	}

	/**
	 * Render just the input element. Must be implemented by each field type.
	 *
	 * @since 1.0.0
	 * @return string HTML for the input element.
	 */
	abstract protected function render_input();

	/**
	 * Default validation: check required.
	 *
	 * @since 1.0.0
	 * @param mixed $value The submitted value.
	 * @return true|\WP_Error
	 */
	public function validate( $value ) {
		if ( $this->get( 'required' ) && $this->is_empty_value( $value ) ) {
			$label = $this->get( 'label', $this->get( 'id' ) );
			smart_product_options_addons_log( sprintf( 'BaseField: Validation failed. Required field "%s" is empty.', $label ), 'WARNING' );
			return new \WP_Error(
				'required_field',
				sprintf(
					/* translators: %s: field label */
					__( '%s is required.', 'smart-product-options-addons' ),
					$label
				)
			);
		}
		return true;
	}

	/**
	 * Default sanitization.
	 *
	 * @since 1.0.0
	 * @param mixed $value The value to sanitize.
	 * @return mixed
	 */
	public function sanitize( $value ) {
		if ( is_array( $value ) ) {
			return array_map( 'sanitize_text_field', $value );
		}
		return sanitize_text_field( $value );
	}

	/**
	 * Default display value.
	 *
	 * @since 1.0.0
	 * @param mixed $value The value to format for display.
	 * @return string
	 */
	public function get_display_value( $value ) {
		if ( is_array( $value ) ) {
			return implode( ', ', array_map( 'esc_html', $value ) );
		}
		return esc_html( (string) $value );
	}

	/**
	 * Default weight calculation.
	 *
	 * @since 1.0.0
	 * @param mixed $value The value to calculate weight for.
	 * @return float
	 */
	public function get_weight( $value ) {
		if ( $this->is_empty_value( $value ) ) {
			return 0.0;
		}
		return floatval( $this->get( 'weight', 0 ) );
	}

	/**
	 * Check if a value is considered empty.
	 *
	 * @since 1.0.0
	 * @param mixed $value The value to check for emptiness.
	 * @return bool
	 */
	protected function is_empty_value( $value ) {
		if ( is_null( $value ) ) {
			return true;
		}
		if ( is_string( $value ) && trim( $value ) === '' ) {
			return true;
		}
		if ( is_array( $value ) && empty( $value ) ) {
			return true;
		}
		return false;
	}

	/**
	 * Format a price adjustment for display next to a label.
	 *
	 * @since 1.0.0
	 * @param float  $price      The price amount.
	 * @param string $price_type The price type (flat, percentage, etc.).
	 * @param bool   $html       Whether to wrap in HTML tags. Default true.
	 * @return string Formatted price string (e.g., " (+ $10.00)").
	 */
	protected function format_price_label( $price, $price_type, $html = true ) {
		$price = floatval( $price );
		if ( 'none' === $price_type || ( 0.0 === $price && 'formula' !== $price_type ) ) {
			return '';
		}

		$prefix    = $price > 0 ? '+ ' : '- ';
		$abs_price = abs( $price );

		if ( 'percentage' === $price_type ) {
			$formatted = $prefix . number_format( $abs_price, \SmartProductOptionsAddons\Helper\WooCommerce::get_price_decimals(), \SmartProductOptionsAddons\Helper\WooCommerce::get_price_decimal_separator(), \SmartProductOptionsAddons\Helper\WooCommerce::get_price_thousand_separator() ) . '%';
		} elseif ( 'formula' === $price_type ) {
			// For formula, the static amount might be 0, but we want to indicate calculation
			$formatted = __( 'Dynamic', 'smart-product-options-addons' );
		} elseif ( function_exists( 'wc_price' ) ) {
			// For flat, character_count, etc. we use native WooCommerce price formatting
			$formatted = $prefix . wp_strip_all_tags( wc_price( $abs_price ) );
		} else {
			$formatted = $prefix . \SmartProductOptionsAddons\Helper\WooCommerce::get_currency_symbol() . number_format( $abs_price, \SmartProductOptionsAddons\Helper\WooCommerce::get_price_decimals(), \SmartProductOptionsAddons\Helper\WooCommerce::get_price_decimal_separator(), \SmartProductOptionsAddons\Helper\WooCommerce::get_price_thousand_separator() );
		}

		if ( 'character_count' === $price_type ) {
			$formatted .= __( ' / character', 'smart-product-options-addons' );
		}

		if ( $html ) {
			return sprintf( ' <span class="ob-price-adjustment">(%s)</span>', $formatted );
		}

		return sprintf( ' (%s)', $formatted );
	}
}
