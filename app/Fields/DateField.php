<?php
/**
 * Date Field — Field type for picking dates.
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
 * Date field type.
 *
 * @since 1.0.0
 */
class DateField extends BaseField {

	/**
	 * Render the date input HTML.
	 *
	 * @since 1.0.0
	 * @return string HTML fragment.
	 */
	protected function render_input() {
		$attrs = array(
			'type'  => 'date',
			'id'    => $this->get_html_id(),
			'name'  => $this->get_name(),
			'class' => 'opopw-input opopw-input--date',
		);

		$placeholder = $this->get( 'placeholder' );
		if ( ! empty( $placeholder ) ) {
			$attrs['placeholder'] = esc_attr( $placeholder );
		}

		if ( $this->get( 'required' ) ) {
			$attrs['required'] = 'required';
		}

		$min_date = $this->get( 'min_date' );
		if ( ! empty( $min_date ) ) {
			$attrs['min'] = esc_attr( $min_date );
		}

		$max_date = $this->get( 'max_date' );
		if ( ! empty( $max_date ) ) {
			$attrs['max'] = esc_attr( $max_date );
		}

		$attr_string = '';
		foreach ( $attrs as $key => $val ) {
			$attr_string .= sprintf( ' %s="%s"', esc_attr( $key ), esc_attr( $val ) );
		}

		return '<input' . $attr_string . ' />';
	}

	/**
	 * Validate date input value against min/max limits.
	 *
	 * @since 1.0.0
	 * @param mixed $value The date value to validate.
	 * @return true|\WP_Error Evaluation result.
	 */
	public function validate( $value ) {
		$result = parent::validate( $value );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		if ( ! $this->is_empty_value( $value ) ) {
			$d        = \DateTime::createFromFormat( 'Y-m-d', $value );
			$is_valid = $d && $d->format( 'Y-m-d' ) === $value;

			if ( ! $is_valid ) {
				opopw_log( "DateField Validation: Invalid date format '{$value}'.", 'WARNING' );
				/* translators: %s: field label */
				return new \WP_Error( 'invalid_format', sprintf( __( '%s is not a valid date format.', 'optionbay-product-options-addons-woo' ), $this->get( 'label', $this->get( 'id' ) ) ) );
			}

			$min = $this->get( 'min_date' );
			$max = $this->get( 'max_date' );

			if ( ! empty( $min ) && $value < $min ) {
				opopw_log( "DateField Validation: Value '{$value}' is before minimum '{$min}'.", 'WARNING' );
				/* translators: 1: field label, 2: minimum date */
				return new \WP_Error( 'min_date', sprintf( __( '%1$s must be on or after %2$s.', 'optionbay-product-options-addons-woo' ), $this->get( 'label', $this->get( 'id' ) ), $min ) );
			}

			if ( ! empty( $max ) && $value > $max ) {
				opopw_log( "DateField Validation: Value '{$value}' is after maximum '{$max}'.", 'WARNING' );
				/* translators: 1: field label, 2: maximum date */
				return new \WP_Error( 'max_date', sprintf( __( '%1$s must be on or before %2$s.', 'optionbay-product-options-addons-woo' ), $this->get( 'label', $this->get( 'id' ) ), $max ) );
			}
		}
		return true;
	}

	/**
	 * Get formatted display value.
	 *
	 * @since 1.0.0
	 * @param mixed $value The date value to format.
	 * @return string Formatted display value.
	 */
	public function get_display_value( $value ) {
		if ( $this->is_empty_value( $value ) ) {
			return '';
		}
		$timestamp = strtotime( $value );
		if ( ! $timestamp ) {
			return esc_html( $value );
		}
		return esc_html( date_i18n( get_option( 'date_format' ), $timestamp ) );
	}
}
