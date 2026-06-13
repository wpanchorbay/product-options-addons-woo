<?php
/**
 * Settings — Plugin settings management.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Core
 */

namespace SmartProductOptionsAddons\Core;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The settings functionality of the plugin.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Core
 */
class Settings {

	/**
	 * The single instance of the class.
	 *
	 * @since 1.0.0
	 * @access private
	 * @var   Settings
	 */
	private static $instance = null;

	/**
	 * The default settings of the plugin.
	 *
	 * Customize these defaults for your own plugin.
	 *
	 * @since 1.0.0
	 * @access private
	 * @var   array
	 */
	private $default_settings = array(

		/*
		 * ==================================================
		 * Global Settings
		 * ==================================================
		 */
		'global_optionsOrientation'     => 'vertical',
		'global_fontSizeLabel'          => 'inherit',
		'global_fontSizeInput'          => 'inherit',
		'global_swatchSize'             => '32px',
		'global_swatchImageSize'        => '64px',
		'global_swatchRadius'           => '4px',
		'global_swatchImageRadius'      => '4px',
		'global_isPreloaded'            => false,


		/*
		 * ==================================================
		 * Advanced Settings
		 * ==================================================
		 */
		'advanced_deleteAllOnUninstall' => false,
		'debug_enableMode'              => false,
	);

	/**
	 * The settings of the plugin.
	 *
	 * @since 1.0.0
	 * @access private
	 * @var   array
	 */
	private $settings = null;

	/**
	 * Gets an instance of this object.
	 *
	 * @access public
	 * @return Settings
	 * @since 1.0.0
	 */
	public static function get_instance() {
		static $instance = null;
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Get the settings with caching.
	 *
	 * @since 1.0.0
	 * @access public
	 * @param string $key optional meta key.
	 * @return array|mixed|null
	 */
	public function get_settings( $key = '' ) {
		if ( ! $this->settings ) {
			$this->load_settings();
		}
		if ( ! empty( $key ) ) {
			return isset( $this->settings[ $key ] ) ? $this->settings[ $key ] : false;
		}
		return $this->settings;
	}

	/**
	 * Get the default settings.
	 *
	 * @since 1.0.0
	 * @access public
	 * @return array
	 */
	public function get_default_settings() {
		return $this->default_settings;
	}

	/**
	 * Load the settings.
	 *
	 * @since 1.0.0
	 * @access public
	 * @return void
	 */
	public function load_settings() {
		$options = get_option( SMART_PRODUCT_OPTIONS_ADDONS_OPTION_NAME );
		if ( ! is_array( $options ) ) {
			$options = array();
		}
		$default_settings = $this->get_default_settings();
		$settings         = array_merge( $default_settings, $options );
		$this->settings   = $settings;
		smart_product_options_addons_log( 'Settings: Plugin settings loaded.', 'DEBUG' );
	}

	/**
	 * Update the settings.
	 *
	 * @since 1.0.0
	 * @access public
	 * @param string|array $key_or_data The key or data to update.
	 * @param string       $val         The value to update.
	 * @return void
	 */
	public function update_settings( $key_or_data, $val = '' ) {
		smart_product_options_addons_log( 'Settings: Updating plugin settings option.', 'INFO' );
		if ( is_string( $key_or_data ) ) {
			$options                 = $this->get_settings();
			$options[ $key_or_data ] = $val;
		} else {
			$options = $key_or_data;
		}

		update_option( SMART_PRODUCT_OPTIONS_ADDONS_OPTION_NAME, $options );
		$this->load_settings();
	}

	/**
	 * Register settings.
	 *
	 * @since 1.0.0
	 * @access public
	 * @return void
	 */
	public function register() {
		$defaults = $this->get_default_settings();

		register_setting(
			'smart_product_options_addons_settings_group',
			SMART_PRODUCT_OPTIONS_ADDONS_OPTION_NAME,
			array(
				'type'              => 'object',
				'default'           => $defaults,
				'show_in_rest'      => array(
					'schema' => $this->get_settings_schema(),
				),
				'sanitize_callback' => array( $this, 'sanitize_settings_object' ),
			)
		);
	}

	/**
	 * Get settings schema.
	 *
	 * @since 1.0.0
	 * @access public
	 * @return array settings schema for this plugin.
	 */
	public function get_settings_schema() {
		/**
		 * Filters the settings schema for the plugin.
		 *
		 * @since 1.0.0
		 * @hook smart_product_options_addons_options_properties
		 * @param array $setting_properties The associative array of setting properties.
		 * @return array The filtered array of setting properties.
		 */
		$setting_properties = apply_filters(
			'smart_product_options_addons_options_properties',
			array(
				'global_optionsOrientation'     => array(
					'type'    => 'string',
					'default' => 'vertical',
				),
				'global_fontSizeLabel'          => array(
					'type'    => 'string',
					'default' => 'inherit',
				),
				'global_fontSizeInput'          => array(
					'type'    => 'string',
					'default' => 'inherit',
				),
				'global_swatchSize'             => array(
					'type'    => 'string',
					'default' => '32px',
				),
				'global_swatchImageSize'        => array(
					'type'    => 'string',
					'default' => '64px',
				),
				'global_swatchRadius'           => array(
					'type'    => 'string',
					'default' => '4px',
				),
				'global_swatchImageRadius'      => array(
					'type'    => 'string',
					'default' => '4px',
				),
				'global_isPreloaded'            => array(
					'type'    => 'boolean',
					'default' => false,
				),
				'debug_enableMode'              => array(
					'type'    => 'boolean',
					'default' => false,
				),
				'advanced_deleteAllOnUninstall' => array(
					'type'    => 'boolean',
					'default' => false,
				),
			),
		);

		return array(
			'type'       => 'object',
			'properties' => $setting_properties,
		);
	}

	/**
	 * Custom sanitization callback for the main settings object.
	 *
	 * @since 1.0.0
	 * @access public
	 * @param array $input The raw array of settings data submitted for saving.
	 * @return array The sanitized array of settings data.
	 */
	public function sanitize_settings_object( $input ) {
		$schema           = $this->get_settings_schema();
		$properties       = $schema['properties'] ?? array();
		$default_options  = $this->get_default_settings();
		$sanitized_output = get_option( SMART_PRODUCT_OPTIONS_ADDONS_OPTION_NAME, $default_options );

		foreach ( $properties as $key => $details ) {
			if ( ! isset( $input[ $key ] ) ) {
				continue;
			}

			$value = $input[ $key ];
			$type  = $details['type'] ?? 'string';

			switch ( $type ) {
				case 'boolean':
					$sanitized_output[ $key ] = (bool) $value;
					break;
				case 'integer':
					$sanitized_output[ $key ] = absint( $value );
					break;
				case 'string':
					$sanitized_output[ $key ] = sanitize_text_field( $value );
					break;
				default:
					$sanitized_output[ $key ] = sanitize_text_field( $value );
					break;
			}
		}

		return $sanitized_output;
	}
	/**
	 * Register the hooks for settings.
	 *
	 * @since    1.0.0
	 * @param    \SmartProductOptionsAddons\Core\Plugin $plugin The Plugin instance.
	 * @return   void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_action( 'rest_api_init', $this, 'register' );
		$loader->add_action( 'admin_init', $this, 'register' );
	}
}
