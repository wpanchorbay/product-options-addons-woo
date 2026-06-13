<?php
/**
 * Admin — handles the primary admin UI and menu registration.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Admin
 */

namespace SmartProductOptionsAddons\Admin;

use SmartProductOptionsAddons\Core\Settings;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The admin-specific functionality of the plugin.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Admin
 */
class Admin {



	/**
	 * The single instance of the class.
	 *
	 * @since 1.0.0
	 * @var   Admin
	 * @access private
	 */
	private static $instance = null;

	/**
	 * Menu info.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      array
	 */
	private $menu_info;

	/**
	 * Gets an instance of this object.
	 *
	 * @access public
	 * @return Admin
	 * @since 1.0.0
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Get plugin data (formerly white label options).
	 *
	 * @since 1.0.0
	 * @access private
	 * @return array
	 */
	private function get_plugin_data() {
		return array(
			'plugin_name' => esc_html__( 'Smart Product Options and Addons', 'smart-product-options-addons' ),
			'short_name'  => esc_html__( 'Smart Product Options and Addons', 'smart-product-options-addons' ),
			'menu_label'  => esc_html__( 'Smart Product Options and Addons', 'smart-product-options-addons' ),
			'custom_icon' => SMART_PRODUCT_OPTIONS_ADDONS_URL . 'assets/img/icon.svg',
			'menu_icon'   => 'dashicons-admin-plugins',
			'author_name' => 'WP Anchor Bay',
			'author_uri'  => 'https://wpanchorbay.com',
			'support_uri' => 'https://wpanchorbay.com/support',
			'docs_uri'    => 'https://docs.wpanchorbay.com',
			'position'    => 57,
		);
	}

	/**
	 * Add Admin Page Menu page.
	 *
	 * @since 1.0.0
	 * @access public
	 * @return void
	 */
	public function add_admin_menu() {
		smart_product_options_addons_log( 'Admin: Registering Smart Product Options and Addons menus', 'INFO' );

		// 1. Add "Options" submenu under Products (edit.php?post_type=product)
		add_submenu_page(
			'edit.php?post_type=product',
			__( 'Options', 'smart-product-options-addons' ),
			__( 'Options', 'smart-product-options-addons' ),
			'manage_woocommerce',
			'spoa-options',
			array( $this, 'add_setting_root_div' )
		);

		// 2. Add hidden redirect page for plugin action links if needed,
		// but we'll update action links to point to the new locations.
	}

	/**
	 * Add custom section to WooCommerce Products settings page.
	 *
	 * @since 1.0.0
	 * @param array $sections The existing sections.
	 * @return array
	 */
	public function add_products_section( $sections ) {
		$sections['smart-product-options-addons'] = __( 'Options', 'smart-product-options-addons' );
		return $sections;
	}

	/**
	 * Filter WooCommerce Products settings to insert our custom root field.
	 *
	 * @since 1.0.0
	 * @param array  $settings        Existing settings fields.
	 * @param string $current_section Current section name.
	 * @return array
	 */
	public function filter_products_settings( $settings, $current_section ) {
		if ( 'smart-product-options-addons' === $current_section ) {
			return array(
				array(
					'type' => 'smart_product_options_addons_settings_root',
				),
			);
		}
		return $settings;
	}


	/**
	 * Redirect to the main dashboard.
	 *
	 * @return void
	 */
	public function redirect_to_dashboard() {
		$redirect_url = admin_url( 'admin.php?page=' . SMART_PRODUCT_OPTIONS_ADDONS_PLUGIN_NAME );
		wp_safe_redirect( $redirect_url );
		exit;
	}

	/**
	 * Check if current page is our menu page.
	 *
	 * @access public
	 * @since 1.0.0
	 * @return bool
	 */
	public function is_menu_page() {
		$screen = get_current_screen();
		if ( ! $screen ) {
			return false;
		}

		// Handle Smart Product Options and Addons pages (Option Groups list/builder) under Products
		if ( 'product_page_spoa-options' === $screen->base ) {
			return true;
		}

		// Handle WooCommerce Settings tab
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( 'woocommerce_page_wc-settings' === $screen->base && isset( $_GET['tab'] ) && 'products' === $_GET['tab'] && isset( $_GET['section'] ) && 'smart-product-options-addons' === $_GET['section'] ) {
			return true;
		}

		return false;
	}

	/**
	 * Add has sticky header class.
	 *
	 * @since 1.0.0
	 * @access public
	 * @param string $classes The classes.
	 * @return string
	 */
	public function add_has_sticky_header( $classes ) {
		if ( $this->is_menu_page() ) {
			$classes .= ' at-has-hdr-stky ';
		}
		return $classes;
	}

	/**
	 * Add setting root div.
	 *
	 * @since 1.0.0
	 * @access public
	 * @return void
	 */
	public function add_setting_root_div() {
		echo '<div id="' . esc_attr( SMART_PRODUCT_OPTIONS_ADDONS_PLUGIN_NAME ) . '">
			<div class="spoa-loader-container">
				<p>' . esc_html__( 'Loading...', 'smart-product-options-addons' ) . '</p>
			</div>
		</div>';
	}

	/**
	 * Enqueue resources.
	 *
	 * @since 1.0.0
	 * @access public
	 * @return void
	 */
	public function enqueue_resources() {
		if ( ! $this->is_menu_page() ) {
			return;
		}

		$screen  = get_current_screen();
		$context = ( isset( $screen->base ) && 'woocommerce_page_wc-settings' === $screen->base ) ? 'settings' : 'options';
		$handle  = SMART_PRODUCT_OPTIONS_ADDONS_PLUGIN_NAME . '-' . $context;

		smart_product_options_addons_log( "Admin: Enqueueing resources for context: {$context}", 'DEBUG' );

		$deps_file  = SMART_PRODUCT_OPTIONS_ADDONS_PATH . "build/{$context}.asset.php";
		$dependency = array( 'wp-i18n' );
		$version    = SMART_PRODUCT_OPTIONS_ADDONS_VERSION;
		if ( file_exists( $deps_file ) ) {
			$deps_file  = require $deps_file;
			$dependency = $deps_file['dependencies'];
			$version    = $deps_file['version'];
		}

		$admin_script = apply_filters( "smart_product_options_addons_admin_script_{$context}", SMART_PRODUCT_OPTIONS_ADDONS_URL . "build/{$context}.js" );
		wp_enqueue_script( $handle, $admin_script, $dependency, $version, true );
		wp_enqueue_editor();
		wp_enqueue_media();

		$admin_css = apply_filters( "smart_product_options_addons_admin_css_{$context}", SMART_PRODUCT_OPTIONS_ADDONS_URL . "build/{$context}.css" );
		wp_enqueue_style( $handle, $admin_css, array(), $version );
		wp_style_add_data( $handle, 'rtl', 'replace' );

		// Enqueue WooCommerce admin styles for tooltips and other UI elements
		wp_enqueue_style( 'woocommerce_admin_styles' );

		$localize = apply_filters(
			'smart_product_options_addons_admin_localize',
			array(
				'version'         => $version,
				'root_id'         => SMART_PRODUCT_OPTIONS_ADDONS_PLUGIN_NAME,
				'nonce'           => wp_create_nonce( 'wp_rest' ),
				'store'           => SMART_PRODUCT_OPTIONS_ADDONS_PLUGIN_NAME,
				'rest_url'        => get_rest_url(),
				'pluginData'      => $this->get_plugin_data(),
				'wpSettings'      => array(
					'dateFormat' => get_option( 'date_format' ),
					'timeFormat' => get_option( 'time_format' ),
				),
				'plugin_settings' => \SmartProductOptionsAddons\Core\Settings::get_instance()->get_settings(),
				'products_url'    => admin_url( 'edit.php?post_type=product' ),
				'settings_url'    => admin_url( 'admin.php?page=wc-settings&tab=products&section=smart-product-options-addons' ),
				'context'         => $context,
			)
		);

		wp_localize_script( $handle, 'spoaPlugin_Localize', $localize );

		$path_to_check = SMART_PRODUCT_OPTIONS_ADDONS_PATH . 'languages';
		wp_set_script_translations(
			$handle,
			'smart-product-options-addons',
			$path_to_check
		);
	}

	/**
	 * Add plugin action links.
	 *
	 * @since 1.0.0
	 * @access public
	 * @param string[] $actions Plugin action links.
	 * @return array
	 */
	public function add_plugin_action_links( $actions ) {
		$actions[] = '<a href="' . esc_url( admin_url( 'admin.php?page=wc-settings&tab=products&section=smart-product-options-addons' ) ) . '">' . esc_html__( 'Settings', 'smart-product-options-addons' ) . '</a>';
		$actions[] = '<a href="' . esc_url( 'https://docs.wpanchorbay.com/smart-product-options-addons/' ) . '" target="_blank">' . esc_html__( 'Documentation', 'smart-product-options-addons' ) . '</a>';
		$actions[] = '<a href="' . esc_url( 'https://wpanchorbay.com/support/' ) . '" target="_blank">' . esc_html__( 'Support', 'smart-product-options-addons' ) . '</a>';
		return $actions;
	}

	/**
	 * Register the hooks for the admin area.
	 *
	 * @since    1.0.0
	 * @param    \SmartProductOptionsAddons\Core\Plugin $plugin The Plugin instance.
	 * @return   void
	 */
	public function run( $plugin ) {
		$loader = $plugin->get_loader();
		$loader->add_filter( 'all_plugins', $plugin, 'change_plugin_display_name' );
		$loader->add_action( 'admin_menu', $this, 'add_admin_menu' );
		$loader->add_filter( 'woocommerce_get_sections_products', $this, 'add_products_section' );
		$loader->add_filter( 'woocommerce_get_settings_products', $this, 'filter_products_settings', 10, 2 );
		$loader->add_action( 'woocommerce_admin_field_smart_product_options_addons_settings_root', $this, 'add_setting_root_div' );
		$loader->add_filter( 'admin_body_class', $this, 'add_has_sticky_header' );
		$loader->add_action( 'admin_enqueue_scripts', $this, 'enqueue_resources' );

		$plugin_basename = plugin_basename( SMART_PRODUCT_OPTIONS_ADDONS_PATH . 'smart-product-options-addons.php' );
		$loader->add_filter( 'plugin_action_links_' . $plugin_basename, $this, 'add_plugin_action_links', 10, 1 );
	}
}
