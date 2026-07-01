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
	add_action(
		'init',
		function () {
			if ( is_admin() && class_exists( '\WPAB\DeactivationFeedback\DeactivationFeedback' ) ) {
				new \WPAB\DeactivationFeedback\DeactivationFeedback(
					array(
						'plugin_file'     => OPOPW_PLUGIN_BASENAME,
						'plugin_slug'     => OPOPW_PLUGIN_NAME,
						'remote_endpoint' => 'https://wpanchorbay.com/wp-json/wpab/v1/feedback',
						'reasons'         => array(
							array(
								'id'          => 'couldnt_get_working',
								'label'       => __( "I couldn't get it working", 'optionbay-product-options-addons-woo' ),
								'has_input'   => true,
								'placeholder' => __( 'What were you trying to configure?', 'optionbay-product-options-addons-woo' ),
							),
							array(
								'id'          => 'missing_feature',
								'label'       => __( "It's missing a feature I need", 'optionbay-product-options-addons-woo' ),
								'has_input'   => true,
								'placeholder' => __( 'What feature?', 'optionbay-product-options-addons-woo' ),
							),
							array(
								'id'          => 'conflict',
								'label'       => __( 'It conflicted with my theme or another plugin', 'optionbay-product-options-addons-woo' ),
								'has_input'   => true,
								'placeholder' => __( 'Which theme/plugin?', 'optionbay-product-options-addons-woo' ),
							),
							array(
								'id'          => 'slowed_site',
								'label'       => __( 'It slowed down my site', 'optionbay-product-options-addons-woo' ),
								'has_input'   => true,
								'placeholder' => __( 'Please describe (we will investigate your site automatically)', 'optionbay-product-options-addons-woo' ),
							),
							array(
								'id'          => 'better_alternative',
								'label'       => __( 'I found a better alternative', 'optionbay-product-options-addons-woo' ),
								'has_input'   => true,
								'placeholder' => __( 'Which plugin?', 'optionbay-product-options-addons-woo' ),
							),
							array(
								'id'          => 'too_complicated',
								'label'       => __( "It's too complicated to set up", 'optionbay-product-options-addons-woo' ),
								'has_input'   => true,
								'placeholder' => __( 'What part was confusing?', 'optionbay-product-options-addons-woo' ),
							),
							array(
								'id'        => 'no_longer_needed',
								'label'     => __( 'I no longer need product options on my store', 'optionbay-product-options-addons-woo' ),
								'has_input' => false,
							),
							array(
								'id'        => 'temporary',
								'label'     => __( "It's temporary — I'm troubleshooting/debugging", 'optionbay-product-options-addons-woo' ),
								'has_input' => false,
							),
							array(
								'id'          => 'other',
								'label'       => __( 'Other', 'optionbay-product-options-addons-woo' ),
								'has_input'   => true,
								'placeholder' => __( 'Please share the reason', 'optionbay-product-options-addons-woo' ),
							),
						),
						'review_notice_enabled' => true,
						'review_delay_days'     => 3,
						'review_snooze_days'    => 7,
						'review_url'            => 'https://wordpress.org/support/plugin/optionbay-product-options-addons-woo/reviews/#new-post',
						'support_url'           => 'https://wordpress.org/support/plugin/optionbay-product-options-addons-woo/',
						'review_notice_title'   => __( 'Enjoying OptionBay?', 'optionbay-product-options-addons-woo' ),
						'review_notice_message' => __( "You've been using OptionBay for a few days now. If it's been helpful, would you mind leaving a quick review? It really helps!", 'optionbay-product-options-addons-woo' ),
					)
				);
			}
		}
	);
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

	// Record activation time for the review notice logic.
	if ( ! get_option( 'wpab_activated_at_optionbay-product-options-addons-woo' ) ) {
		update_option( 'wpab_activated_at_optionbay-product-options-addons-woo', time(), false );
	}
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
