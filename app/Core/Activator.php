<?php
/**
 * Activator — Logic to be executed during plugin activation.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Core
 */

namespace SmartProductOptionsAddons\Core;

use SmartProductOptionsAddons\Data\DbManager;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Fired during plugin activation.
 *
 * This class defines all code necessary to run during the plugin's activation.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Core
 */
class Activator {


	/**
	 * The main activation method.
	 *
	 * @since 1.0.0
	 * @access public
	 * @return void
	 */
	public static function activate() {
		opopw_log( 'Activator: Firing OptionBay - Product Options and Addons activation steps.', 'INFO' );

		// Set up the default options if they don't exist.
		/* Default Settings */
		Settings::get_instance()->update_settings( Settings::get_instance()->get_default_settings() );

		// Create custom database tables.
		self::create_custom_tables();

		// Flush rewrite rules.
		flush_rewrite_rules();
		// Add custom capabilities.
		self::add_plugin_roles_and_capabilities();

		// Schedule cron events.
		Cron::get_instance()->schedule_events();

		// Preload demo data
		Preloader::run();

		opopw_log( 'Activator: OptionBay - Product Options and Addons activated successfully.', 'INFO' );
	}

	/**
	 * Instantiates the DB Manager and creates the custom tables.
	 *
	 * @since 1.0.0
	 * @access private
	 * @return void
	 */
	private static function create_custom_tables() {
		DbManager::get_instance()->create_tables();
	}

	/**
	 * Adds custom roles and capabilities required by the plugin.
	 *
	 * @since 1.0.0
	 * @access private
	 * @static
	 */
	private static function add_plugin_roles_and_capabilities() {
		// No custom capabilities needed — plugin uses manage_woocommerce / manage_options.
	}
}
