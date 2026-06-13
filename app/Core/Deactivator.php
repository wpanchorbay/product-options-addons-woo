<?php
/**
 * Deactivator — Logic to be executed during plugin deactivation.
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
 * Fired during plugin deactivation.
 *
 * This class defines all code necessary to run during the plugin's deactivation.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Core
 */
class Deactivator {

	/**
	 * Fired during plugin deactivation.
	 *
	 * @since 1.0.0
	 * @access public
	 * @return void
	 */
	public static function deactivate() {
		smart_product_options_addons_log( 'Deactivator: Firing Smart Product Options and Addons deactivation steps.', 'INFO' );

		self::remove_custom_capabilities();

		// Unschedule all plugin cron events.
		Cron::get_instance()->unschedule_all();

		smart_product_options_addons_log( 'Deactivator: Smart Product Options and Addons deactivated successfully.', 'INFO' );
	}

	/**
	 * Removes the custom plugin capabilities from all roles.
	 *
	 * @since 1.0.0
	 * @access private
	 * @return void
	 */
	private static function remove_custom_capabilities() {
		// No custom capabilities to remove — plugin uses manage_woocommerce / manage_options.
	}
}
