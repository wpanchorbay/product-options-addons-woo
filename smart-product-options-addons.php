<?php
/**
 * Plugin Name:       OptionBay Product Options and Addons
 * Plugin URI:        https://wpanchorbay.com
 * Description:       Add custom product options, add-ons, and extra fields to WooCommerce products with advanced pricing, inventory, and conditional logic.
 * Requires at least: 6.8
 * Requires PHP:      7.0
 * Requires Plugins:  woocommerce
 * WC requires at least: 6.1
 * Version:           1.0.0
 * Stable tag:        1.0.0
 * Author:            WPAnchorBay
 * Author URI:        https://wpanchorbay.com
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       smart-product-options-addons
 * Domain Path:       /languages
 *
 * @package SmartProductOptionsAddons
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

define( 'SMART_PRODUCT_OPTIONS_ADDONS_PATH', plugin_dir_path( __FILE__ ) );
define( 'SMART_PRODUCT_OPTIONS_ADDONS_DIR', plugin_dir_path( __FILE__ ) );
define( 'SMART_PRODUCT_OPTIONS_ADDONS_URL', plugin_dir_url( __FILE__ ) );
define( 'SMART_PRODUCT_OPTIONS_ADDONS_VERSION', '1.0.0' );
define( 'SMART_PRODUCT_OPTIONS_ADDONS_PLUGIN_NAME', 'smart-product-options-addons' );
define( 'SMART_PRODUCT_OPTIONS_ADDONS_TEXT_DOMAIN', 'smart-product-options-addons' );
define( 'SMART_PRODUCT_OPTIONS_ADDONS_OPTION_NAME', 'smart-product-options-addons' );
define( 'SMART_PRODUCT_OPTIONS_ADDONS_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );
define( 'SMART_PRODUCT_OPTIONS_ADDONS_DEV_MODE', true );

/**
 * Initialize Composer Autoloader.
 */
if ( file_exists( SMART_PRODUCT_OPTIONS_ADDONS_PATH . 'vendor/autoload.php' ) ) {
	require_once SMART_PRODUCT_OPTIONS_ADDONS_PATH . 'vendor/autoload.php';
}

require_once SMART_PRODUCT_OPTIONS_ADDONS_PATH . 'app/functions.php';

register_activation_hook( __FILE__, 'smart_product_options_addons_activate' );
register_deactivation_hook( __FILE__, 'smart_product_options_addons_deactivate' );
if ( ! function_exists( 'smart_product_options_addons_run' ) ) {
	/**
	 * Begins execution of the plugin.
	 *
	 * @since    1.0.0
	 * @return void
	 */
	function smart_product_options_addons_run() {
		$plugin = \SmartProductOptionsAddons\Core\Plugin::get_instance();
		add_action( 'plugins_loaded', array( $plugin, 'run' ) );
	}
}
smart_product_options_addons_run();

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
function smart_product_options_addons_activate() {
	require_once ABSPATH . 'wp-admin/includes/upgrade.php';
	\SmartProductOptionsAddons\Core\Activator::activate();
}

/**
 * Fired during plugin deactivation.
 *
 * @since 1.0.0
 * @return void
 */
function smart_product_options_addons_deactivate() {
	\SmartProductOptionsAddons\Core\Deactivator::deactivate();
}
