<?php
/**
 * Inventory Manager — Handles global stock logic and database persistence.
 *
 * @since      1.1.0
 * @package    SmartProductOptionsAddons
 * @subpackage SmartProductOptionsAddons/Data
 */

namespace SmartProductOptionsAddons\Data;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Handles inventory-related database operations.
 *
 * @since 1.1.0
 */
class InventoryManager {


	/**
	 * The single instance of the class.
	 *
	 * @since 1.1.0
	 * @var   InventoryManager
	 * @access private
	 */
	private static $instance = null;

	/**
	 * Gets an instance of this object.
	 *
	 * @static
	 * @access public
	 * @since 1.1.0
	 * @return InventoryManager
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Private constructor.
	 *
	 * @since 1.1.0
	 * @access private
	 */
	private function __construct() {
	}

	/**
	 * Get an inventory item by ID.
	 *
	 * @since 1.1.0
	 * @param int $id Inventory ID.
	 * @return array|null
	 */
	public function get_item( $id ) {
		$cache_key = "item_{$id}";
		$cached    = wp_cache_get( $cache_key, 'spoa_inventory' );
		if ( false !== $cached ) {
			return $cached;
		}

		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$item = $wpdb->get_row(
			$wpdb->prepare(
				'SELECT * FROM %i WHERE id = %d',
				DbManager::get_inventory_table(),
				absint( $id )
			),
			ARRAY_A
		);

		if ( $item ) {
			wp_cache_set( $cache_key, $item, 'spoa_inventory', 3600 );
		}

		return $item;
	}

	/**
	 * Create a new inventory item.
	 *
	 * @since 1.1.0
	 * @param array $data Item data (name, stock_count, allow_backorders).
	 * @return int|false ID of the new item, or false on error.
	 */
	public function create_item( $data ) {
		global $wpdb;
		$table_name = DbManager::get_inventory_table();

		$now = current_time( 'mysql' );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$result = $wpdb->insert(
			$table_name,
			array(
				'name'             => sanitize_text_field( $data['name'] ?? '' ),
				'stock_count'      => floatval( $data['stock_count'] ?? 0 ),
				'allow_backorders' => ! empty( $data['allow_backorders'] ) ? 1 : 0,
				'created_at'       => $now,
				'updated_at'       => $now,
			),
			array( '%s', '%f', '%d', '%s', '%s' )
		);

		return $result ? $wpdb->insert_id : false;
	}

	/**
	 * Update an inventory item.
	 *
	 * @since 1.1.0
	 * @param int   $id   Inventory ID.
	 * @param array $data Data to update.
	 * @return int|false
	 */
	public function update_item( $id, $data ) {
		global $wpdb;
		$table_name = DbManager::get_inventory_table();

		$update_data   = array();
		$update_format = array();

		if ( isset( $data['name'] ) ) {
			$update_data['name'] = sanitize_text_field( $data['name'] );
			$update_format[]     = '%s';
		}

		if ( isset( $data['stock_count'] ) ) {
			$update_data['stock_count'] = floatval( $data['stock_count'] );
			$update_format[]            = '%f';
		}

		if ( isset( $data['allow_backorders'] ) ) {
			$update_data['allow_backorders'] = ! empty( $data['allow_backorders'] ) ? 1 : 0;
			$update_format[]                 = '%d';
		}

		if ( empty( $update_data ) ) {
			return false;
		}

		$update_data['updated_at'] = current_time( 'mysql' );
		$update_format[]           = '%s';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$result = $wpdb->update(
			$table_name,
			$update_data,
			array( 'id' => absint( $id ) ),
			$update_format,
			array( '%d' )
		);

		if ( false !== $result ) {
			wp_cache_delete( "item_{$id}", 'spoa_inventory' );
		}

		return $result;
	}

	/**
	 * Delete an inventory item.
	 *
	 * @since 1.2.0
	 * @param int $id Inventory ID.
	 * @return bool
	 */
	public function delete_item( $id ) {
		global $wpdb;
		$table_name = DbManager::get_inventory_table();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$result = $wpdb->delete(
			$table_name,
			array( 'id' => absint( $id ) ),
			array( '%d' )
		);

		if ( $result ) {
			wp_cache_delete( "item_{$id}", 'spoa_inventory' );
			smart_product_options_addons_log( sprintf( 'InventoryManager: Deleted inventory ID %d.', $id ), 'INFO' );
		} else {
			smart_product_options_addons_log( sprintf( 'InventoryManager: Failed to delete inventory ID %d.', $id ), 'ERROR' );
		}

		return false !== $result;
	}

	/**
	 * Decrement stock atomically.
	 *
	 * @since 1.1.0
	 * @param int   $id     Inventory ID.
	 * @param float $amount Amount to decrement.
	 * @return bool True on success, false if stock is insufficient and backorders are disabled.
	 */
	public function decrement_stock( $id, $amount ) {
		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$result = $wpdb->query(
			$wpdb->prepare(
				'UPDATE %i SET stock_count = stock_count - %f, updated_at = %s WHERE id = %d AND (stock_count >= %f OR allow_backorders = 1)',
				DbManager::get_inventory_table(),
				floatval( $amount ),
				current_time( 'mysql' ),
				absint( $id ),
				floatval( $amount )
			)
		);

		if ( $result ) {
			wp_cache_delete( "item_{$id}", 'spoa_inventory' );
			smart_product_options_addons_log( sprintf( 'InventoryManager: Decrement stock ID %d by amount %f was SUCCESSFUL.', $id, $amount ), 'INFO' );
		} else {
			smart_product_options_addons_log( sprintf( 'InventoryManager: Decrement stock ID %d by amount %f FAILED (possibly insufficient stock).', $id, $amount ), 'ERROR' );
		}

		return (bool) $result;
	}

	/**
	 * Increment stock atomically.
	 *
	 * @since 1.1.0
	 * @param int   $id     Inventory ID.
	 * @param float $amount Amount to increment.
	 * @return bool
	 */
	public function increment_stock( $id, $amount ) {
		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$result = $wpdb->query(
			$wpdb->prepare(
				'UPDATE %i SET stock_count = stock_count + %f, updated_at = %s WHERE id = %d',
				DbManager::get_inventory_table(),
				floatval( $amount ),
				current_time( 'mysql' ),
				absint( $id )
			)
		);

		if ( $result ) {
			wp_cache_delete( "item_{$id}", 'spoa_inventory' );
			smart_product_options_addons_log( sprintf( 'InventoryManager: Increment stock ID %d by amount %f was SUCCESSFUL.', $id, $amount ), 'INFO' );
		} else {
			smart_product_options_addons_log( sprintf( 'InventoryManager: Increment stock ID %d by amount %f FAILED.', $id, $amount ), 'ERROR' );
		}

		return (bool) $result;
	}

	/**
	 * Search inventory items by name.
	 *
	 * @since 1.1.0
	 * @param string $search Search term.
	 * @param int    $limit  Max results.
	 * @return array
	 */
	public function search_items( $search, $limit = 20 ) {
		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return $wpdb->get_results(
			$wpdb->prepare(
				'SELECT id, name, stock_count, allow_backorders FROM %i WHERE name LIKE %s LIMIT %d',
				DbManager::get_inventory_table(),
				'%' . $wpdb->esc_like( $search ) . '%',
				absint( $limit )
			),
			ARRAY_A
		);
	}

	/**
	 * Get stock already reserved in the current user's cart.
	 *
	 * @since 1.1.0
	 * @param int    $inventory_id          The inventory ID.
	 * @param string $exclude_cart_item_key Optional. Cart item key to exclude.
	 * @return float
	 */
	public function get_cart_reserved_stock( $inventory_id, $exclude_cart_item_key = null ) {
		$reserved = 0.0;
		if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
			return 0.0;
		}

		foreach ( WC()->cart->get_cart() as $cart_item_key => $cart_item ) {
			if ( $exclude_cart_item_key && $cart_item_key === $exclude_cart_item_key ) {
				continue;
			}

			if ( isset( $cart_item['smart_product_options_addons_addons']['fields'] ) ) {
				foreach ( $cart_item['smart_product_options_addons_addons']['fields'] as $field ) {
					if ( ! empty( $field['reduction_intents'] ) ) {
						foreach ( $field['reduction_intents'] as $intent ) {
							if ( (int) $intent['id'] === (int) $inventory_id ) {
								$amount    = $this->calculate_intent_reduction( $intent, $cart_item['quantity'] );
								$reserved += $amount;
							}
						}
					}
				}
			}
		}
		return $reserved;
	}

	/**
	 * Internal helper to calculate reduction for a stored intent.
	 *
	 * @param array $intent   The intent data.
	 * @param int   $quantity The line item quantity.
	 * @return float
	 */
	private function calculate_intent_reduction( $intent, $quantity ) {
		$mode = $intent['mode'] ?? 'per_item_qty';

		if ( 'per_line_item' === $mode ) {
			return 1.0;
		}

		if ( 'per_item_qty' === $mode ) {
			return floatval( $quantity );
		}

		if ( 'formula' === $mode ) {
			$formula = $intent['formula'] ?? '';
			$value   = $intent['value'] ?? '';

			try {
				$parser    = new \MathParser\StdMathParser();
				$ast       = $parser->parse( $formula );
				$evaluator = new \MathParser\Interpreting\Evaluator(
					array(
						'qty' => floatval( $quantity ),
						'val' => is_numeric( $value ) ? floatval( $value ) : 0,
					)
				);
				$result    = $ast->accept( $evaluator );
				return max( 0, floatval( $result ) );
			} catch ( \Exception $e ) {
				return floatval( $quantity );
			}
		}

		return floatval( $quantity );
	}
}
