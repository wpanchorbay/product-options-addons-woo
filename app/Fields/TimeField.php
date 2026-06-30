<?php
namespace Opopw\Fields;

if ( ! defined( 'ABSPATH' ) ) { exit; }

class TimeField extends BaseField {

	protected function render_input() {
		$attrs = array(
			'type'  => 'time',
			'id'    => $this->get_html_id(),
			'name'  => $this->get_name(),
			'class' => 'opopw-input opopw-input--time',
		);

		$placeholder = $this->get( 'placeholder' );
		if ( ! empty( $placeholder ) ) {
			$attrs['placeholder'] = esc_attr( $placeholder );
		}

		if ( $this->get( 'required' ) ) {
			$attrs['required'] = 'required';
		}

		$min_time = $this->get( 'min_time' );
		if ( ! empty( $min_time ) ) {
			$attrs['min'] = esc_attr( $min_time );
		}

		$max_time = $this->get( 'max_time' );
		if ( ! empty( $max_time ) ) {
			$attrs['max'] = esc_attr( $max_time );
		}

		$attr_string = '';
		foreach ( $attrs as $key => $val ) {
			$attr_string .= sprintf( ' %s="%s"', esc_attr( $key ), esc_attr( $val ) );
		}

		return '<input' . $attr_string . ' />';
	}

	public function validate( $value ) {
		$result = parent::validate( $value );
		if ( is_wp_error( $result ) ) { return $result; }

		if ( ! $this->is_empty_value( $value ) ) {
			$is_valid = preg_match( '/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/', $value );

			if ( ! $is_valid ) {
				opopw_log( "TimeField Validation: Invalid time format '{$value}'.", 'WARNING' );
				return new \WP_Error( 'invalid_format', sprintf( __( '%s is not a valid time format.', 'optionbay-product-options-addons-woo' ), $this->get( 'label', $this->get( 'id' ) ) ) );
			}

			$min = $this->get( 'min_time' );
			$max = $this->get( 'max_time' );

			if ( ! empty( $min ) && $value < $min ) {
				opopw_log( "TimeField Validation: Value '{$value}' is before minimum '{$min}'.", 'WARNING' );
				return new \WP_Error( 'min_time', sprintf( __( '%1$s must be on or after %2$s.', 'optionbay-product-options-addons-woo' ), $this->get( 'label', $this->get( 'id' ) ), $min ) );
			}

			if ( ! empty( $max ) && $value > $max ) {
				opopw_log( "TimeField Validation: Value '{$value}' is after maximum '{$max}'.", 'WARNING' );
				return new \WP_Error( 'max_time', sprintf( __( '%1$s must be on or before %2$s.', 'optionbay-product-options-addons-woo' ), $this->get( 'label', $this->get( 'id' ) ), $max ) );
			}
		}
		return true;
	}

	public function get_display_value( $value ) {
		if ( $this->is_empty_value( $value ) ) { return ''; }
		$timestamp = strtotime( '2000-01-01 ' . $value );
		if ( ! $timestamp ) { return esc_html( $value ); }
		return esc_html( date_i18n( get_option( 'time_format' ), $timestamp ) );
	}
}
