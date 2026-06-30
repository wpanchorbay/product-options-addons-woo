<?php
/**
 * Date Time Field — Field type for picking dates and times.
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
 * DateTime field type.
 *
 * @since 1.0.0
 */
class DateTimeField extends BaseField {

	/**
	 * Render the datetime-local input HTML.
	 *
	 * @since 1.0.0
	 * @return string HTML fragment.
	 */
	protected function render_input() {
		$attrs = array(
			'type'  => 'datetime-local',
			'id'    => $this->get_html_id(),
			'name'  => $this->get_name(),
			'class' => 'opopw-input opopw-input--datetime',
		);

		$placeholder = $this->get( 'placeholder' );
		if ( ! empty( $placeholder ) ) {
			$attrs['placeholder'] = esc_attr( $placeholder );
		}

		if ( $this->get( 'required' ) ) {
			$attrs['required'] = 'required';
		}

		$min_date = $this->get( 'min_date' );
		$min_time = $this->get( 'min_time', '00:00' );
		if ( ! empty( $min_date ) ) {
			$attrs['min'] = esc_attr( $min_date . 'T' . $min_time );
		}

		$max_date = $this->get( 'max_date' );
		$max_time = $this->get( 'max_time', '23:59' );
		if ( ! empty( $max_date ) ) {
			$attrs['max'] = esc_attr( $max_date . 'T' . $max_time );
		}

		$attr_string = '';
		foreach ( $attrs as $key => $val ) {
			$attr_string .= sprintf( ' %s="%s"', esc_attr( $key ), esc_attr( $val ) );
		}

		return '<input' . $attr_string . ' />';
	}

	/**
	 * Validate datetime input value against min/max limits.
	 *
	 * @since 1.0.0
	 * @param mixed $value The datetime value to validate.
	 * @return true|\WP_Error Evaluation result.
	 */
	public function validate( $value ) {
		$result = parent::validate( $value );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		if ( ! $this->is_empty_value( $value ) ) {
			$timestamp = strtotime( $value );
			if ( ! $timestamp ) {
				opopw_log( "DateTimeField Validation: Invalid format for '{$value}'.", 'WARNING' );
				/* translators: %s: field label */
				return new \WP_Error( 'invalid_format', sprintf( __( '%s is not a valid date & time format.', 'optionbay-product-options-addons-woo' ), $this->get( 'label', $this->get( 'id' ) ) ) );
			}

			$iso_val = gmdate( 'Y-m-d\TH:i', $timestamp );

			$min_date = $this->get( 'min_date' );
			$min_time = $this->get( 'min_time', '00:00' );
			if ( ! empty( $min_date ) ) {
				$min_iso = $min_date . 'T' . $min_time;
				if ( $iso_val < $min_iso ) {
					opopw_log( "DateTimeField Validation: Value '{$iso_val}' is before minimum '{$min_iso}'.", 'WARNING' );
					/* translators: 1: field label, 2: minimum datetime */
					return new \WP_Error( 'min_datetime', sprintf( __( '%1$s must be on or after %2$s.', 'optionbay-product-options-addons-woo' ), $this->get( 'label', $this->get( 'id' ) ), str_replace( 'T', ' ', $min_iso ) ) );
				}
			}

			$max_date = $this->get( 'max_date' );
			$max_time = $this->get( 'max_time', '23:59' );
			if ( ! empty( $max_date ) ) {
				$max_iso = $max_date . 'T' . $max_time;
				if ( $iso_val > $max_iso ) {
					opopw_log( "DateTimeField Validation: Value '{$iso_val}' is after maximum '{$max_iso}'.", 'WARNING' );
					/* translators: 1: field label, 2: maximum datetime */
					return new \WP_Error( 'max_datetime', sprintf( __( '%1$s must be on or before %2$s.', 'optionbay-product-options-addons-woo' ), $this->get( 'label', $this->get( 'id' ) ), str_replace( 'T', ' ', $max_iso ) ) );
				}
			}
		}
		return true;
	}

	/**
	 * Get formatted display value.
	 *
	 * @since 1.0.0
	 * @param mixed $value The datetime value to format.
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
		$format = get_option( 'date_format' ) . ' ' . get_option( 'time_format' );
		return esc_html( date_i18n( $format, $timestamp ) );
	}
}
