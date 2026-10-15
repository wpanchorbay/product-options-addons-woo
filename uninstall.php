<?php
/**
 * Fired when the user clicks "Delete" for the plugin.
 *
 * @since      1.0.0
 * @package    Opopw
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
		opopw_delete_order_item_meta();
		opopw_delete_plugin_options();
		opopw_remove_capabilities();
	}
}

/**
 * Delete all custom posts of type opopw_option_group.
 *
 * @since 1.0.0
 */
function opopw_delete_custom_posts() {
	$posts = get_posts(
		array(
			'post_type'   => 'opopw_option_group',
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
 * Delete order-item meta written by this plugin.
 *
 * Deleting the option-group posts only cascades to postmeta, so the stock
 * intents and ledger written onto WooCommerce order line items were previously
 * left behind on uninstall. HPOS-safe: order item meta lives in
 * woocommerce_order_itemmeta under both storage engines.
 *
 * @since 1.0.3
 */
function opopw_delete_order_item_meta() {
	global $wpdb;

	$table = $wpdb->prefix . 'woocommerce_order_itemmeta';

	// phpcs:ignore WordPress.DB.DirectDatabaseQuery.SchemaChange
	$exists = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) );
	if ( $exists !== $table ) {
		return;
	}

	$meta_keys = array(
		'_opopw_stock_intents',
		'_opopw_stock_ledger',
		'_opopw_stock_restored',
	);

	foreach ( $meta_keys as $meta_key ) {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->delete( $table, array( 'meta_key' => $meta_key ), array( '%s' ) ); // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
	}

	// Order-level marker written by pre-1.0.3 releases.
	delete_post_meta_by_key( '_opopw_stock_restored' );
}

/**
 * Drop Custom Database Tables.
 *
 * @since 1.0.0
 */
function opopw_drop_custom_tables() {
	global $wpdb;

	$tables = array(
		$wpdb->prefix . 'opopw_assignments',
		$wpdb->prefix . 'opopw_inventory',
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
	// Remove the legacy custom capability added by older plugin versions (< 1.0.0).
	// New versions use manage_woocommerce instead of this custom capability.
	$editable_roles = get_editable_roles();

	foreach ( $editable_roles as $role_name => $role_info ) {
		$role = get_role( $role_name );
		if ( $role && $role->has_cap( 'manage_opopw_options_addons' ) ) {
			$role->remove_cap( 'manage_opopw_options_addons' );
		}
	}
}
