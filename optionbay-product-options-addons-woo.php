<?php
/**
 * Plugin Name:       OptionBay - Product Options and Addons
 * Plugin URI:        https://wpanchorbay.com/plugins/smart-product-options-addons/
 * Description:       Add custom product options, add-ons, and extra fields to WooCommerce products with advanced pricing, inventory, and conditional logic.
 * Requires at least: 6.8
 * Requires PHP:      7.4
 * Requires Plugins:  woocommerce
 * WC requires at least: 8.0
 * Version:           1.0.0
 * Stable tag:        1.0.0
 * Author:            WPAnchorBay
 * Author URI:        https://wpanchorbay.com
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       optionbay-product-options-addons-woo
 * Domain Path:       /languages
 *
 * @package Opopw
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

define( 'OPOPW_PATH', plugin_dir_path( __FILE__ ) );
define( 'OPOPW_DIR', plugin_dir_path( __FILE__ ) );
define( 'OPOPW_URL', plugin_dir_url( __FILE__ ) );
define( 'OPOPW_VERSION', '1.0.0' );
define( 'OPOPW_PLUGIN_NAME', 'optionbay-product-options-addons-woo' );
define( 'OPOPW_TEXT_DOMAIN', 'optionbay-product-options-addons-woo' );
define( 'OPOPW_OPTION_NAME', 'optionbay-product-options-addons-woo' );
define( 'OPOPW_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );
define( 'OPOPW_DEV_MODE', true );

/**
 * Initialize Composer Autoloader.
 */
if ( file_exists( OPOPW_PATH . 'vendor/autoload.php' ) ) {
	require_once OPOPW_PATH . 'vendor/autoload.php';
}

require_once OPOPW_PATH . 'app/functions.php';

register_activation_hook( __FILE__, 'opopw_activate' );
register_deactivation_hook( __FILE__, 'opopw_deactivate' );
/**
 * Begins execution of the plugin.
 *
 * @since    1.0.0
 * @return void
 */
function opopw_run() {
	$plugin = \Opopw\Core\Plugin::get_instance();
	add_action( 'plugins_loaded', array( $plugin, 'run' ) );

	// Initialize Deactivation Feedback on init to avoid early translation loading
	add_action( 'init', function() {
		if ( is_admin() && class_exists( '\WPAB\DeactivationFeedback\DeactivationFeedback' ) ) {
			new \WPAB\DeactivationFeedback\DeactivationFeedback(
				array(
					'plugin_file'     => OPOPW_PLUGIN_BASENAME,
					'plugin_slug'     => OPOPW_PLUGIN_NAME,
					'remote_endpoint' => 'http://localhost/wp-json/wpab/v1/feedback',
					'reasons'         => array(
						array(
							'id'        => 'no_longer_needed',
							'label'     => __( 'I no longer need the plugin', 'optionbay-product-options-addons-woo' ),
							'has_input' => false,
						),
						array(
							'id'          => 'found_better_plugin',
							'label'       => __( 'I found a better plugin', 'optionbay-product-options-addons-woo' ),
							'has_input'   => true,
							'placeholder' => __( 'Please share which plugin', 'optionbay-product-options-addons-woo' ),
						),
						array(
							'id'          => 'missing_feature',
							'label'       => __( 'It is missing a feature I need', 'optionbay-product-options-addons-woo' ),
							'has_input'   => true,
							'placeholder' => __( 'What feature is missing?', 'optionbay-product-options-addons-woo' ),
						),
						array(
							'id'        => 'temporary_deactivation',
							'label'       => __( "It's a temporary deactivation", 'optionbay-product-options-addons-woo' ),
							'has_input' => false,
						),
						array(
							'id'          => 'other',
							'label'       => __( 'Other', 'optionbay-product-options-addons-woo' ),
							'has_input'   => true,
							'placeholder' => __( 'Please share the reason', 'optionbay-product-options-addons-woo' ),
						),
					),
				)
			);
		}
	} );
}
opopw_run();

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
function opopw_activate() {
	require_once ABSPATH . 'wp-admin/includes/upgrade.php';
	\Opopw\Core\Activator::activate();
}

/**
 * Fired during plugin deactivation.
 *
 * @since 1.0.0
 * @return void
 */
function opopw_deactivate() {
	\Opopw\Core\Deactivator::deactivate();
}
