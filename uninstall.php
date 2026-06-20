<?php
/**
 * Fired when the user clicks "Delete" for the plugin.
 *
 * @since      1.0.0
 * @package    SmartProductOptionsAddons
 */

// If uninstall not called from WordPress, then exit.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

define( 'OPOPW_OPTION_NAME', 'optionbay-product-options-addons-woo' );
define( 'OPOPW_TEXT_DOMAIN', 'optionbay-product-options-addons-woo' );

opopw_run_uninstall();

/**
 * The main controller function for the uninstallation process.
 *
 * @since 1.0.0
 */
function opopw_run_uninstall() {
	$options = get_option( OPOPW_OPTION_NAME );

	// Only proceed if user opted in to delete all data.
	if ( ! empty( $options['advanced_deleteAllOnUninstall'] ) && true === $options['advanced_deleteAllOnUninstall'] ) {
		opopw_drop_custom_tables();
		opopw_delete_custom_posts();
		opopw_delete_plugin_options();
		opopw_remove_capabilities();
	}
}

/**
 * Delete all custom posts of type ob_option_group.
 *
 * @since 1.0.0
 */
function opopw_delete_custom_posts() {
	$posts = get_posts(
		array(
			'post_type'   => 'ob_option_group',
			'post_status' => 'any',
			'numberposts' => -1,
			'fields'      => 'ids',
		)
	);

	if ( ! empty( $posts ) ) {
		foreach ( $posts as $post_id ) {
			wp_delete_post( $post_id, true );
		}
	}
}

/**
 * Drop Custom Database Tables.
 *
 * @since 1.0.0
 */
function opopw_drop_custom_tables() {
	global $wpdb;

	$tables = array(
		$wpdb->prefix . 'wpab_product_options_addons_assignments',
		$wpdb->prefix . 'wpab_product_options_addons_inventory',
	);

	foreach ( $tables as $table ) {
		$wpdb->query("DROP TABLE IF EXISTS {$table}"); // phpcs:ignore
	}
}

/**
 * Delete Plugin Options.
 *
 * @since 1.0.0
 */
function opopw_delete_plugin_options() {
	delete_option( OPOPW_OPTION_NAME );
}

/**
 * Remove Custom Capabilities.
 *
 * @since 1.0.0
 */
function opopw_remove_capabilities() {
	// Remove the legacy custom capability added by older plugin versions (< 1.1.0).
	// New versions use manage_woocommerce instead of this custom capability.
	$editable_roles = get_editable_roles();

	foreach ( $editable_roles as $role_name => $role_info ) {
		$role = get_role( $role_name );
		if ( $role && $role->has_cap( 'manage_wpab_options_addons' ) ) {
			$role->remove_cap( 'manage_wpab_options_addons' );
		}
	}
}
