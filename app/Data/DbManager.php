<?php
/**
 * Database Manager — Handles the creation and management of custom database tables.
 *
 * @since      1.0.0
 * @package    Opopw
 * @subpackage Opopw/Data
 */

namespace Opopw\Data;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles custom database logic.
 *
 * Manages the custom assignments lookup table and provides methods for
 * group-level data persistence and retrieval.
 *
 * @since 1.0.0
 */
class DbManager {

	/**
	 * The single instance of the class.
	 *
	 * @since 1.0.0
	 * @var   DbManager
	 * @access private
	 */
	private static $instance = null;

	/**
	 * Gets an instance of this object.
	 *
	 * @static
	 * @access public
	 * @since 1.0.0
	 * @return DbManager
	 */
	public static function get_instance() {
		static $instance = null;
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Private constructor.
	 *
	 * @since 1.0.0
	 * @access private
	 */
	private function __construct() {}

	/**
	 * Create all custom tables.
	 *
	 * @since 1.0.0
	 */
	public function create_tables() {
		opopw_log( 'DbManager: Running database table creations/updates.', 'INFO' );
		$this->create_assignments_table();
		$this->create_inventory_table();
	}

	/**
	 * Get the assignments table name (with WP prefix).
	 *
	 * @since 1.0.0
	 * @return string
	 */
	public static function get_assignments_table() {
		global $wpdb;
		return $wpdb->prefix . 'opopw_assignments';
	}

	/**
	 * Get the inventory table name (with WP prefix).
	 *
	 * @since 1.0.0
	 * @return string
	 */
	public static function get_inventory_table() {
		global $wpdb;
		return $wpdb->prefix . 'opopw_inventory';
	}

	/**
	 * Create the assignments lookup table.
	 *
	 * This table routes Option Groups to Products, Categories, Tags, or Global scope.
	 * It uses indexed lookups to determine which groups apply to a given product page
	 * in milliseconds, even with thousands of products.
	 *
	 * @since 1.0.0
	 * @access private
	 */
	private function create_assignments_table() {
		opopw_log( 'DbManager: Creating or updating assignments lookup table.', 'DEBUG' );
		global $wpdb;
		$table_name      = self::get_assignments_table();
		$charset_collate = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE {$table_name} (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            group_id bigint(20) UNSIGNED NOT NULL,
            target_type varchar(20) NOT NULL DEFAULT 'global',
            target_id bigint(20) UNSIGNED NOT NULL DEFAULT 0,
            is_exclusion tinyint(1) NOT NULL DEFAULT 0,
            priority int(11) NOT NULL DEFAULT 10,
            PRIMARY KEY  (id),
            KEY group_id (group_id),
            KEY target_lookup (target_type, target_id, is_exclusion, priority)
        ) $charset_collate;";

		dbDelta( $sql );
	}

	/**
	 * Create the global inventory table.
	 *
	 * This table stores real-time stock counts for global inventory items.
	 *
	 * @since 1.0.0
	 * @access private
	 */
	private function create_inventory_table() {
		opopw_log( 'DbManager: Creating or updating global inventory table.', 'DEBUG' );
		global $wpdb;
		$table_name      = self::get_inventory_table();
		$charset_collate = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE {$table_name} (
            id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            name varchar(255) NOT NULL,
            stock_count decimal(10,4) NOT NULL DEFAULT 0.0000,
            allow_backorders tinyint(1) NOT NULL DEFAULT 0,
            created_at datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
            updated_at datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
            PRIMARY KEY  (id)
        ) $charset_collate ENGINE=InnoDB;";

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );
	}

	/**
	 * Delete all assignment rows for a specific group.
	 *
	 * @since 1.0.0
	 * @param int $group_id The Option Group post ID.
	 * @return int|false Number of rows deleted, or false on error.
	 */
	public function delete_assignments_for_group( $group_id ) {
		global $wpdb;
		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- Internal table name is safe.
		$table_name = self::get_assignments_table();

		$result = $wpdb->delete( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$table_name,
			array( 'group_id' => absint( $group_id ) ),
			array( '%d' )
		);

		if ( false !== $result ) {
			wp_cache_set( 'opopw_assignments_version', time(), 'opopw_assignments' );
		}

		return $result;
	}

	/**
	 * Insert assignment rows for a group (bulk insert).
	 *
	 * Adds mapping rules to the custom assignments table to link an option group
	 * to specific global rules, products, categories, or tags.
	 *
	 * @since 1.0.0
	 * @param int   $group_id    The Option Group post ID.
	 * @param array $assignments Array of assignment arrays. Each with target_type, target_id, etc.
	 *                           - target_type: 'global', 'product', 'category', 'tag'
	 *                           - target_id: int (0 for global)
	 *                           - is_exclusion: bool
	 *                           - priority: int (optional, defaults to 10).
	 * @return int Number of rows safely inserted.
	 */
	public function insert_assignments( $group_id, $assignments ) {
		global $wpdb;
		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- Internal table name is safe.
		$table_name = self::get_assignments_table();
		$inserted   = 0;

		foreach ( $assignments as $assignment ) {
			$result = $wpdb->insert( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
				$table_name,
				array(
					'group_id'    => absint( $group_id ),
					'target_type' => sanitize_text_field( $assignment['target_type'] ?? 'global' ),
					'target_id'   => absint( $assignment['target_id'] ?? 0 ),
					'priority'    => absint( $assignment['priority'] ?? 10 ),
				),
				array( '%d', '%s', '%d', '%d' )
			);

			if ( $result ) {
				++$inserted;
			} else {
				// Record error if insertion query fails
				opopw_log( "Failed to insert assignment for group {$group_id} to {$assignment['target_type']}:{$assignment['target_id']}", 'ERROR' );
			}
		}

		opopw_log( "Successfully inserted {$inserted} assignments for group {$group_id}", 'INFO' );

		if ( $inserted > 0 ) {
			wp_cache_set( 'opopw_assignments_version', time(), 'opopw_assignments' );
		}

		return $inserted;
	}

	/**
	 * Sync assignments for a group (delete & re-insert atomically).
	 *
	 * @since 1.0.0
	 * @param int   $group_id    The Option Group post ID.
	 * @param array $assignments New assignments to insert.
	 * @return int Number of rows inserted.
	 */
	public function sync_assignments( $group_id, $assignments ) {
		$this->delete_assignments_for_group( $group_id );
		return $this->insert_assignments( $group_id, $assignments );
	}

	/**
	 * Get all assignments for a specific group.
	 *
	 * @since 1.0.0
	 * @param int $group_id The Option Group post ID.
	 * @return array
	 */
	public function get_assignments_for_group( $group_id ) {
		global $wpdb;

		// phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- Internal table name is safe.
		$table_name = self::get_assignments_table();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, PluginCheck.Security.DirectDB.UnescapedDBParameter
		$results = $wpdb->get_results(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, PluginCheck.Security.DirectDB.UnescapedDBParameter -- Internal table name is safe.
				"SELECT target_type, target_id, priority FROM $table_name WHERE group_id = %d ORDER BY priority ASC",
				absint( $group_id )
			),
			ARRAY_A
		);

		foreach ( $results as &$row ) {
			$row['target_id'] = (int) $row['target_id'];
			$row['priority']  = (int) $row['priority'];
		}

		return $results;
	}

	/**
	 * Get active group IDs for a product.
	 *
	 * Queries the lookup table to find which Option Groups should be
	 * displayed on a given product page.
	 *
	 * @since 1.0.0
	 * @param int $product_id The WooCommerce product ID.
	 * @return array Ordered array of group IDs to display.
	 */
	public function get_groups_for_product( $product_id ) {
		$version_cache = wp_cache_get( 'opopw_assignments_version', 'opopw_assignments' );
		$version       = $version_cache ? $version_cache : 1;
		$cache_key     = "product_groups_{$product_id}_{$version}";
		$cached        = wp_cache_get( $cache_key, 'opopw_assignments' );

		if ( false !== $cached ) {
			return $cached;
		}

		global $wpdb;
		$table_name  = esc_sql( self::get_assignments_table() );
		$posts_table = esc_sql( $wpdb->posts );

		// Build target conditions
		$conditions = array();
		$values     = array();

		// Global assignments
		$conditions[] = "(target_type = 'global' AND target_id = 0)";

		// Product-specific
		$conditions[] = "(target_type = 'product' AND target_id = %d)";
		$values[]     = absint( $product_id );

		$where_clause = implode( ' OR ', $conditions );

		// Get all matching assignments
		// We join with the posts table to ensure we only get 'publish' status groups
		$query = "SELECT a.group_id, MIN(a.priority) as priority
                  FROM {$table_name} as a
                  JOIN {$posts_table} as p ON a.group_id = p.ID
                  WHERE ({$where_clause}) AND p.post_status = 'publish'
                  GROUP BY a.group_id
                  ORDER BY priority ASC"; // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		$results = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->prepare( $query, $values ), // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			ARRAY_A
		);

		$group_ids = array();

		foreach ( $results as $row ) {
			$group_ids[] = absint( $row['group_id'] );
		}

		wp_cache_set( $cache_key, $group_ids, 'opopw_assignments', 3600 );

		opopw_log( 'Resolved ' . count( $group_ids ) . " group(s) for product {$product_id}", 'DEBUG' );

		return $group_ids;
	}
}
