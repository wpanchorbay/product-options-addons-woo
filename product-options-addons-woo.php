<?php
/**
 * Plugin Name:       OptionBay - Product Options and Addons
 * Plugin URI:        https://wpanchorbay.com/plugins/smart-product-options-addons/
 * Description:       Add custom product options, add-ons, and extra fields to WooCommerce products with advanced pricing, inventory, and conditional logic.
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Requires Plugins:  woocommerce
 * WC requires at least: 8.0
 * Version:           1.1.0
 * Stable tag:        1.1.0
 * Author:            WPAnchorBay
 * Author URI:        https://wpanchorbay.com
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       product-options-addons-woo
 * Domain Path:       /languages
 *
 * @package SmartProductOptionsAddons
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

define( 'PRODUCT_OPTIONS_ADDONS_WOO_PATH', plugin_dir_path( __FILE__ ) );
define( 'PRODUCT_OPTIONS_ADDONS_WOO_DIR', plugin_dir_path( __FILE__ ) );
define( 'PRODUCT_OPTIONS_ADDONS_WOO_URL', plugin_dir_url( __FILE__ ) );
define( 'PRODUCT_OPTIONS_ADDONS_WOO_VERSION', '1.1.0' );
define( 'PRODUCT_OPTIONS_ADDONS_WOO_PLUGIN_NAME', 'product-options-addons-woo' );
define( 'PRODUCT_OPTIONS_ADDONS_WOO_TEXT_DOMAIN', 'product-options-addons-woo' );
define( 'PRODUCT_OPTIONS_ADDONS_WOO_OPTION_NAME', 'product-options-addons-woo' );
define( 'PRODUCT_OPTIONS_ADDONS_WOO_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );
define( 'PRODUCT_OPTIONS_ADDONS_WOO_DEV_MODE', true );

/**
 * Initialize Composer Autoloader.
 */
if ( file_exists( PRODUCT_OPTIONS_ADDONS_WOO_PATH . 'vendor/autoload.php' ) ) {
	require_once PRODUCT_OPTIONS_ADDONS_WOO_PATH . 'vendor/autoload.php';
}

require_once PRODUCT_OPTIONS_ADDONS_WOO_PATH . 'app/functions.php';

register_activation_hook( __FILE__, 'product_options_addons_woo_activate' );
register_deactivation_hook( __FILE__, 'product_options_addons_woo_deactivate' );
if ( ! function_exists( 'product_options_addons_woo_run' ) ) {
	/**
	 * Begins execution of the plugin.
	 *
	 * @since    1.0.0
	 * @return void
	 */
	function product_options_addons_woo_run() {
		$plugin = \SmartProductOptionsAddons\Core\Plugin::get_instance();
		add_action( 'plugins_loaded', array( $plugin, 'run' ) );
	}
}
product_options_addons_woo_run();

/**
 * Declare compatibility with WooCommerce High-Performance Order Storage (HPOS).
 *
 * @since 1.0.0
 */
add_action(
	'before_woocommerce_init',
	function () {
		if ( class_exists( '\Automattic\WooCommerce\Utilities\FeaturesUtil' ) ) {
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
		}
	}
);

/**
 * Fired during plugin activation.
 *
 * @since 1.0.0
 * @return void
 */
function product_options_addons_woo_activate() {
	require_once ABSPATH . 'wp-admin/includes/upgrade.php';
	\SmartProductOptionsAddons\Core\Activator::activate();
}

/**
 * Fired during plugin deactivation.
 *
 * @since 1.0.0
 * @return void
 */
function product_options_addons_woo_deactivate() {
	\SmartProductOptionsAddons\Core\Deactivator::deactivate();
}
