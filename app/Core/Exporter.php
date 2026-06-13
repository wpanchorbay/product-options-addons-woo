<?php
/**
 * Exporter — Service for extracting data to JSON.
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
 * Exporter class.
 *
 * Handles extracting Option Groups, inventory, and settings to arrays/JSON formats.
 *
 * @since 1.0.0
 */
class Exporter {
	/**
	 * Export Option Groups data.
	 *
	 * Queries and converts all Option Groups and their target assignments to an array format.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	public static function export_groups() {
		$args   = array(
			'post_type'      => AddonGroup::POST_TYPE,
			'posts_per_page' => -1,
			'post_status'    => array( 'publish', 'draft' ),
		);
		$query  = new \WP_Query( $args );
		$groups = array();
		$db     = DbManager::get_instance();

		foreach ( $query->posts as $post ) {
			$schema      = json_decode( get_post_meta( $post->ID, AddonGroup::META_SCHEMA, true ), true );
			$assignments = $db->get_assignments_for_group( $post->ID );

			$groups[] = array(
				'title'       => $post->post_title,
				'status'      => $post->post_status,
				'schema'      => is_array( $schema ) ? $schema : array(),
				'assignments' => is_array( $assignments ) ? $assignments : array(),
			);
		}
		return $groups;
	}

	/**
	 * Export custom inventory stock records.
	 *
	 * Queries and converts all real-time inventory records to an array format.
	 *
	 * @since 1.1.0
	 * @return array
	 */
	public static function export_inventory() {
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$results = $wpdb->get_results(
			$wpdb->prepare(
				'SELECT id, name, stock_count, allow_backorders FROM %i',
				DbManager::get_inventory_table()
			),
			ARRAY_A
		);
		return is_array( $results ) ? $results : array();
	}

	/**
	 * Export system settings records.
	 *
	 * Returns the plugin configurations array.
	 *
	 * @since 1.0.0
	 * @return array
	 */
	public static function export_settings() {
		return Settings::get_instance()->get_settings();
	}
}
